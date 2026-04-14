import type { HistoryEntry } from "#/types";

const ALIASES: Record<string, string> = {
	haselnusscrunch: "Haselnuss Crunch",
};

/** Normalize separators so "Buttermilch-Mango" and "Buttermilch Mango" merge */
function normalizeName(name: string): string {
	const normalized = name
		.replace(/\s*-\s*/g, " ")
		.replace(/\s{2,}/g, " ")
		.trim();
	return ALIASES[normalized.toLowerCase()] ?? normalized;
}

export interface FlavorStats {
	name: string;
	daysAppeared: number;
	/** 0–1 ratio of days this flavor appeared vs total tracked days */
	frequency: number;
	lastSeen: string;
	isVegan: boolean;
}

export type Rarity =
	| "neu"
	| "gewoehnlich"
	| "ungewoehnlich"
	| "selten"
	| "episch"
	| "legendaer";

const THRESHOLDS: { min: number; rarity: Rarity }[] = [
	{ min: 0.8, rarity: "gewoehnlich" },
	{ min: 0.4, rarity: "ungewoehnlich" },
	{ min: 0.1, rarity: "selten" },
	{ min: 0.05, rarity: "episch" },
	{ min: 0, rarity: "legendaer" },
];

export function getRarity(frequency: number): Rarity {
	for (const t of THRESHOLDS) {
		if (frequency >= t.min) return t.rarity;
	}
	return "legendaer";
}

export interface StreakInfo {
	name: string;
	streak: number;
	/** Is this streak still active (includes the latest tracked day)? */
	active: boolean;
}

export interface Stats {
	totalDays: number;
	totalUniqueFlavors: number;
	avgFlavorsPerDay: number;
	/** Average % of flavors that change between consecutive days */
	rotationRate: number;
	/** Top flavors by longest consecutive-day streak */
	topStreaks: StreakInfo[];
	byRarity: Record<Rarity, FlavorStats[]>;
	/** All flavors by frequency, descending */
	all: FlavorStats[];
	/** Lookup: flavor name → FlavorStats */
	byName: Map<string, FlavorStats>;
}

export function computeStats(history: HistoryEntry[]): Stats {
	const flavorDays = new Map<string, Set<string>>();
	const flavorLastSeen = new Map<string, string>();
	const flavorIsVegan = new Map<string, boolean>();
	const allDays = new Set<string>();
	const flavorsPerDay = new Map<string, Set<string>>();

	for (const entry of history) {
		const day = entry.timestamp.split("T")[0];
		allDays.add(day);

		for (const loc of ["main", "buga"] as const) {
			const locationData = entry[loc];
			if (!locationData) continue;

			for (const flavor of locationData.flavors) {
				const name = normalizeName(flavor.name);

				if (!flavorDays.has(name)) {
					flavorDays.set(name, new Set());
				}
				flavorDays.get(name)?.add(day);

				if (!flavorsPerDay.has(day)) {
					flavorsPerDay.set(day, new Set());
				}
				flavorsPerDay.get(day)?.add(name);

				const existing = flavorLastSeen.get(name);
				if (!existing || entry.timestamp > existing) {
					flavorLastSeen.set(name, entry.timestamp);
				}

				if (flavor.tags.includes("vegan")) {
					flavorIsVegan.set(name, true);
				}
			}
		}
	}

	const totalDays = allDays.size;

	const all: FlavorStats[] = Array.from(flavorDays.entries())
		.map(([name, days]) => ({
			name,
			daysAppeared: days.size,
			frequency: totalDays > 0 ? days.size / totalDays : 0,
			lastSeen: flavorLastSeen.get(name) ?? "",
			isVegan: flavorIsVegan.get(name) ?? false,
		}))
		.sort((a, b) => b.daysAppeared - a.daysAppeared);

	const byRarity: Record<Rarity, FlavorStats[]> = {
		neu: [],
		gewoehnlich: [],
		ungewoehnlich: [],
		selten: [],
		episch: [],
		legendaer: [],
	};
	for (const f of all) {
		byRarity[getRarity(f.frequency)].push(f);
	}

	const byName = new Map(all.map((f) => [f.name, f]));

	const totalFlavorsAcrossDays = Array.from(flavorsPerDay.values()).reduce(
		(sum, s) => sum + s.size,
		0,
	);

	// --- Streaks ---
	const sortedDays = Array.from(allDays).sort();
	const topStreaks = computeStreaks(flavorDays, sortedDays);

	// --- Rotation rate ---
	let totalChanges = 0;
	let comparisons = 0;
	for (let i = 1; i < sortedDays.length; i++) {
		const prev = flavorsPerDay.get(sortedDays[i - 1]);
		const curr = flavorsPerDay.get(sortedDays[i]);
		if (!prev || !curr) continue;
		const union = new Set([...prev, ...curr]);
		const intersection = new Set([...prev].filter((f) => curr.has(f)));
		if (union.size > 0) {
			totalChanges += (union.size - intersection.size) / union.size;
			comparisons++;
		}
	}
	const rotationRate =
		comparisons > 0 ? Math.round((totalChanges / comparisons) * 100) : 0;

	return {
		totalDays,
		totalUniqueFlavors: all.length,
		avgFlavorsPerDay:
			totalDays > 0 ? Math.round(totalFlavorsAcrossDays / totalDays) : 0,
		rotationRate,
		topStreaks,
		byRarity,
		all,
		byName,
	};
}

function computeStreaks(
	flavorDays: Map<string, Set<string>>,
	sortedDays: string[],
): StreakInfo[] {
	const lastDay = sortedDays[sortedDays.length - 1];
	const dayIndex = new Map(sortedDays.map((d, i) => [d, i]));

	const results: StreakInfo[] = [];

	for (const [name, days] of flavorDays) {
		const indices = Array.from(days)
			.map((d) => dayIndex.get(d) ?? -1)
			.filter((i) => i >= 0)
			.sort((a, b) => a - b);

		let bestStreak = 1;
		let currentStreak = 1;

		for (let i = 1; i < indices.length; i++) {
			if (indices[i] === indices[i - 1] + 1) {
				currentStreak++;
			} else {
				currentStreak = 1;
			}
			if (currentStreak > bestStreak) {
				bestStreak = currentStreak;
			}
		}

		const active = days.has(lastDay);
		results.push({ name, streak: bestStreak, active });
	}

	return results
		.filter((s) => s.streak >= 2)
		.sort((a, b) => b.streak - a.streak)
		.slice(0, 10);
}

export function getFlavorRarity(
	flavorName: string,
	stats: Stats | null,
): Rarity | null {
	if (!stats) return null;
	const info = stats.byName.get(normalizeName(flavorName));
	if (!info) return null;
	if (info.daysAppeared === 1) return "neu";
	return getRarity(info.frequency);
}
