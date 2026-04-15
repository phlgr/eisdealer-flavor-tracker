import type { Rarity } from "#/lib/stats";

export const RARITY_CONFIG: Record<
	Rarity,
	{ label: string; rarityClass: string; chipClass: string; blockClass?: string }
> = {
	neu: {
		label: "Neu!",
		rarityClass: "rarity-neu",
		chipClass: "stats-chip rarity-chip-neu",
	},
	gewoehnlich: {
		label: "Klassiker",
		rarityClass: "rarity-gewoehnlich",
		chipClass: "stats-chip rarity-chip-gewoehnlich",
	},
	ungewoehnlich: {
		label: "Regelmäßig",
		rarityClass: "rarity-ungewoehnlich",
		chipClass: "stats-chip rarity-chip-ungewoehnlich",
	},
	selten: {
		label: "Gelegentlich",
		rarityClass: "rarity-selten",
		chipClass: "stats-chip rarity-chip-selten",
	},
	episch: {
		label: "Episch",
		rarityClass: "rarity-episch shiny",
		chipClass: "stats-chip rarity-chip-episch",
	},
	legendaer: {
		label: "Legendär",
		rarityClass: "rarity-legendaer shiny",
		chipClass: "stats-chip rarity-chip-legendaer",
		blockClass: "stats-block-legendaer",
	},
};

export function RarityBadge({ rarity }: { rarity: Rarity }) {
	const cfg = RARITY_CONFIG[rarity];
	return <span className={`tag ${cfg.rarityClass}`}>{cfg.label}</span>;
}
