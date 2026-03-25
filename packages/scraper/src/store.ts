import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
	IceCreamFlavor,
	CurrentData,
	StoryAnalysis,
	HistoryEntry,
	LocationState,
	HistoryLocationEntry,
} from "./types.js";

const DATA_DIR = join(import.meta.dir, "../../../data");
const SEEN_HASHES_PATH = join(DATA_DIR, "seen-hashes.json");
const CURRENT_PATH = join(DATA_DIR, "current.json");
const HISTORY_PATH = join(DATA_DIR, "history.json");
const MAX_HASHES = 200;

function readJson<T>(path: string, fallback: T): T {
	try {
		return JSON.parse(readFileSync(path, "utf-8"));
	} catch {
		return fallback;
	}
}

function writeJson(path: string, data: unknown): void {
	writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

// --- Hash dedup ---

export function loadSeenHashes(): string[] {
	return readJson<string[]>(SEEN_HASHES_PATH, []);
}

export function saveSeenHashes(hashes: string[]): void {
	const pruned = hashes.slice(-MAX_HASHES);
	writeJson(SEEN_HASHES_PATH, pruned);
}

export function filterNewImages<T extends { hash: string }>(
	images: T[],
	seenHashes: string[],
): T[] {
	const seen = new Set(seenHashes);
	return images.filter((img) => !seen.has(img.hash));
}

// --- Current data ---

export function loadCurrentData(): CurrentData {
	return readJson<CurrentData>(CURRENT_PATH, {});
}

export function saveCurrentData(data: CurrentData): void {
	writeJson(CURRENT_PATH, data);
}

// --- Build location update from analyses ---

export function buildLocationUpdate(
	location: "main" | "buga",
	analyses: StoryAnalysis[],
): LocationState | null {
	const flavorAnalyses = analyses.filter(
		(a) => a.isFlavorList && a.flavors.length > 0,
	);

	if (flavorAnalyses.length === 0) {
		console.log(
			`[store] No flavor data found for ${location}, keeping existing`,
		);
		return null;
	}

	// Merge flavors from all analyzed stories in this run, deduplicating by normalized name
	const flavorMap = new Map<string, IceCreamFlavor>();
	for (const analysis of flavorAnalyses) {
		for (const flavor of analysis.flavors) {
			const cleanName = flavor.name
				.replace(/\s*\(v(egan)?\)\s*/gi, "")
				.trim();
			const key = cleanName.toLowerCase();

			const existing = flavorMap.get(key);
			if (existing) {
				const mergedTags = [
					...new Set([...existing.tags, ...flavor.tags]),
				];
				flavorMap.set(key, {
					...existing,
					tags: mergedTags as IceCreamFlavor["tags"],
				});
			} else {
				flavorMap.set(key, { ...flavor, name: cleanName });
			}
		}
	}

	const openUntil = analyses
		.map((a) => a.openUntil)
		.filter(Boolean)
		.pop();

	const update: LocationState = {
		flavors: Array.from(flavorMap.values()),
		lastUpdated: new Date().toISOString(),
		...(openUntil ? { openUntil } : {}),
	};

	console.log(
		`[store] Built ${location} update: ${update.flavors.length} flavors${openUntil ? `, open until ${openUntil}` : ""}`,
	);
	return update;
}

// --- History ---

export function appendHistoryEntry(entry: HistoryEntry): void {
	const history = readJson<HistoryEntry[]>(HISTORY_PATH, []);
	history.push(entry);
	writeJson(HISTORY_PATH, history);
	console.log(`[store] Appended history entry at ${entry.timestamp}`);
}
