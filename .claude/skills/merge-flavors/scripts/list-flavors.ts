#!/usr/bin/env bun
/**
 * READ-ONLY reporter for the merge-flavors skill. It never edits data — it only
 * surfaces what exists so the LLM can decide the merges.
 *
 *   bun run .claude/skills/merge-flavors/scripts/list-flavors.ts
 *     -> `count  name` table, then near-duplicate candidates split into
 *        HIGH confidence (safe to auto-merge) and LOW confidence (ask the user).
 *
 *   bun run .claude/skills/merge-flavors/scripts/list-flavors.ts --detail "Name"
 *     -> every raw occurrence of that normalized name (date, location, tags, English),
 *        so the LLM can judge borderline cases.
 */
import { normalizeName } from "../../../../packages/scraper/src/normalize.ts";
import { classifyPairs, countByName, readOccurrences } from "./lib.ts";

const occ = await readOccurrences();

const detailArg = process.argv.indexOf("--detail");
if (detailArg !== -1) {
	const target = normalizeName(process.argv[detailArg + 1] ?? "");
	for (const { date, loc, flavor } of occ) {
		if (normalizeName(flavor.name) === target) {
			console.log(
				`${date} ${loc.padEnd(4)} | ${JSON.stringify(flavor.name)} | tags: ${JSON.stringify(flavor.tags ?? [])} | en: ${JSON.stringify(flavor.nameEnglish)}`,
			);
		}
	}
	process.exit(0);
}

const counts = countByName(occ);
const names = [...counts.keys()].sort((a, b) => a.localeCompare(b));
console.log(`distinct normalized flavors: ${names.length}\n`);
for (const n of names) console.log(`${String(counts.get(n)).padStart(4)}  ${n}`);

const { high, low } = classifyPairs(counts);

if (high.length) {
	console.log(`\n✅ HIGH confidence — same words, auto-merge (variant → canonical):`);
	for (const m of high) console.log(`   ${JSON.stringify(m.variant)} → ${JSON.stringify(m.canonical)}   (${m.reason})`);
}
if (low.length) {
	console.log(`\n❓ LOW confidence — ASK the user before merging (often distinct flavors):`);
	for (const m of low) console.log(`   ${JSON.stringify(m.a)}  ↔  ${JSON.stringify(m.b)}   (${m.reason})`);
}
console.log(
	"\nThese are heuristic hints, not decisions — the LLM makes the final call.\n" +
		"Semantic duplicates with entirely different words (e.g. German↔English renderings,\n" +
		'"Kaffee Karamel" vs "Caffé Caramel") are NOT flagged here — scan the table for those too.',
);
