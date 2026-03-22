import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
	IceCreamFlavor,
	LocationData,
	StoryAnalysis,
	HistoryEntry,
} from "./types.js";

const DATA_DIR = join(import.meta.dir, "../../../data");
const HISTORY_DIR = join(DATA_DIR, "history");
const SEEN_HASHES_PATH = join(DATA_DIR, "seen-hashes.json");
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
	// Prune to last MAX_HASHES entries
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

// --- Location data ---

export function loadLocationData(location: "main" | "buga"): LocationData {
	const path = join(DATA_DIR, `${location}.json`);
	return readJson<LocationData>(path, {
		location,
		lastUpdated: new Date().toISOString(),
		flavors: [],
	});
}

export function saveLocationData(data: LocationData): void {
	const path = join(DATA_DIR, `${data.location}.json`);
	writeJson(path, data);
}

export function updateLocationFromAnalysis(
	location: "main" | "buga",
	analyses: StoryAnalysis[],
): boolean {
	const flavorAnalyses = analyses.filter((a) => a.isFlavorList && a.flavors.length > 0);

	if (flavorAnalyses.length === 0) {
		console.log(`[store] No flavor data found for ${location}, keeping existing`);
		return false;
	}

	// Merge flavors from all analyzed stories, deduplicating by name
	const flavorMap = new Map<string, IceCreamFlavor>();
	for (const analysis of flavorAnalyses) {
		for (const flavor of analysis.flavors) {
			flavorMap.set(flavor.name.toLowerCase(), flavor);
		}
	}

	const existingData = loadLocationData(location);
	const newData: LocationData = {
		location,
		lastUpdated: new Date().toISOString(),
		flavors: Array.from(flavorMap.values()),
	};

	saveLocationData(newData);
	console.log(
		`[store] Updated ${location} with ${newData.flavors.length} flavors`,
	);
	return true;
}

// --- History ---

export function archiveDailySnapshot(): void {
	const today = new Date().toISOString().split("T")[0];
	const main = loadLocationData("main");
	const buga = loadLocationData("buga");

	// Update the flat history file
	const history = readJson<HistoryEntry[]>(HISTORY_PATH, []);

	// Replace today's entry if it exists, or append
	const existingIndex = history.findIndex((h) => h.date === today);
	const entry: HistoryEntry = {
		date: today,
		main: main.flavors,
		buga: buga.flavors,
	};

	if (existingIndex >= 0) {
		history[existingIndex] = entry;
	} else {
		history.push(entry);
	}

	// Keep last 90 days
	const trimmed = history.slice(-90);
	writeJson(HISTORY_PATH, trimmed);

	// Also write a daily snapshot file
	if (!existsSync(HISTORY_DIR)) {
		mkdirSync(HISTORY_DIR, { recursive: true });
	}
	writeJson(join(HISTORY_DIR, `${today}.json`), entry);

	console.log(`[store] Archived snapshot for ${today}`);
}
