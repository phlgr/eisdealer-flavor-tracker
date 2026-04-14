import type { HistoryEntry } from "#/types";

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

export interface Stats {
	totalDays: number;
	totalUniqueFlavors: number;
	avgFlavorsPerDay: number;
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
				const name = flavor.name;

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

	return {
		totalDays,
		totalUniqueFlavors: all.length,
		avgFlavorsPerDay:
			totalDays > 0 ? Math.round(totalFlavorsAcrossDays / totalDays) : 0,
		byRarity,
		all,
		byName,
	};
}

export function getFlavorRarity(
	flavorName: string,
	stats: Stats | null,
): Rarity | null {
	if (!stats) return null;
	const info = stats.byName.get(flavorName);
	if (!info) return null;
	if (info.daysAppeared === 1) return "neu";
	return getRarity(info.frequency);
}
