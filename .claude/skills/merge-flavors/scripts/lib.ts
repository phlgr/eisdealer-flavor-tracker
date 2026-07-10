#!/usr/bin/env bun
/** Shared helpers for the merge-flavors skill: read occurrences, count, and
 *  classify near-duplicate flavor-name pairs into high/low confidence. */
import { join } from "node:path";
import { normalizeName } from "../../../../packages/scraper/src/normalize.ts";

export const DATA = join(import.meta.dir, "../../../../data");

export interface Flavor {
	name: string;
	tags?: string[];
	nameEnglish?: string;
}
type Loc = { flavors: Flavor[] } | undefined;

export interface Occurrence {
	date: string;
	loc: string;
	flavor: Flavor;
}

/** Every flavor occurrence across history.json (oldest→newest) then current.json. */
export async function readOccurrences(): Promise<Occurrence[]> {
	const history = await Bun.file(join(DATA, "history.json")).json();
	const current = await Bun.file(join(DATA, "current.json")).json();
	const out: Occurrence[] = [];
	for (const e of history as { timestamp: string; main?: Loc; buga?: Loc }[]) {
		for (const loc of ["main", "buga"] as const) {
			if (e[loc]) for (const flavor of e[loc]!.flavors) out.push({ date: e.timestamp.slice(0, 10), loc, flavor });
		}
	}
	for (const loc of ["main", "buga"] as const) {
		const l = (current as Record<string, Loc>)[loc];
		if (l) for (const flavor of l.flavors) out.push({ date: "current", loc, flavor });
	}
	return out;
}

/** normalizedName -> occurrence count. */
export function countByName(occ: Occurrence[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const { flavor } of occ) {
		const n = normalizeName(flavor.name);
		counts.set(n, (counts.get(n) ?? 0) + 1);
	}
	return counts;
}

// Parenthetical/label tokens that are markers, not part of a flavor name.
const JUNK = new Set(["alc"]);

const tokens = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-zäöüß0-9 ]/g, "")
		.split(/\s+/)
		.filter(Boolean);
const collapse = (s: string) => tokens(s).slice().sort().join(" ");

function editDistance(a: string, b: string): number {
	const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
	for (let j = 0; j <= b.length; j++) dp[0][j] = j;
	for (let i = 1; i <= a.length; i++)
		for (let j = 1; j <= b.length; j++)
			dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
	return dp[a.length][b.length];
}

export interface HighMatch {
	variant: string;
	canonical: string;
	reason: string;
}
export interface LowMatch {
	a: string;
	b: string;
	reason: string;
}

/**
 * Classify every pair of distinct normalized names.
 * HIGH (safe to auto-merge, same words): pure case/word-order/separator differences,
 * a single spelling/OCR typo (≤2 edits, same word count), or an extra marker token
 * like "(alc)". LOW (needs a human): one name adds a real word to the other — often a
 * genuinely different flavor ("Schwarzer Sesam" vs "…White Choc"). Semantic duplicates
 * with entirely different words (e.g. German↔English renderings) are NOT auto-detected;
 * spot those from the full list.
 */
export function classifyPairs(counts: Map<string, number>): { high: HighMatch[]; low: LowMatch[] } {
	const names = [...counts.keys()].sort((x, y) => x.localeCompare(y));
	const freq = (n: string) => counts.get(n) ?? 0;
	// More frequent name is canonical; tie broken alphabetically for determinism.
	const canonicalOf = (a: string, b: string) => (freq(a) !== freq(b) ? (freq(a) > freq(b) ? a : b) : a);

	const high: HighMatch[] = [];
	const low: LowMatch[] = [];
	for (let i = 0; i < names.length; i++) {
		for (let j = i + 1; j < names.length; j++) {
			const [a, b] = [names[i], names[j]];
			const [ca, cb] = [collapse(a), collapse(b)];
			const [ta, tb] = [new Set(tokens(a)), new Set(tokens(b))];
			if (!ta.size || !tb.size) continue;

			if (ca && ca === cb) {
				const canonical = canonicalOf(a, b);
				high.push({ variant: canonical === a ? b : a, canonical, reason: "word-order/case" });
			} else if (ta.size === tb.size && ca.length >= 4 && editDistance(ca, cb) <= 2) {
				const canonical = canonicalOf(a, b);
				high.push({ variant: canonical === a ? b : a, canonical, reason: "spelling/OCR typo" });
			} else if (ta.size !== tb.size) {
				const [big, small] = ta.size > tb.size ? [ta, tb] : [tb, ta];
				const [bigName, smallName] = ta.size > tb.size ? [a, b] : [b, a];
				if (![...small].every((t) => big.has(t))) continue; // not a subset -> unrelated
				const extra = [...big].filter((t) => !small.has(t));
				if (extra.every((t) => JUNK.has(t))) {
					high.push({ variant: bigName, canonical: smallName, reason: `marker "${extra.join(",")}"` });
				} else {
					low.push({ a, b, reason: `extra word "${extra.join(",")}"` });
				}
			}
		}
	}
	return { high, low };
}
