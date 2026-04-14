import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { computeStats, type Rarity, type Stats } from "#/lib/stats";
import type { HistoryEntry } from "#/types";

export const Route = createFileRoute("/stats")({ component: StatsPage });

const RARITY_CONFIG: {
	key: Rarity;
	label: string;
	title: string;
	desc: string;
	badgeClass: string;
	chipClass: string;
	blockClass?: string;
}[] = [
	{
		key: "gewoehnlich",
		label: "Klassiker",
		title: "Immer dabei",
		desc: "Diese Sorten gibt es fast jeden Tag.",
		badgeClass: "badge rarity-gewoehnlich",
		chipClass: "stats-chip rarity-chip-gewoehnlich",
	},
	{
		key: "ungewoehnlich",
		label: "Regelmäßig",
		title: "Nicht alltäglich",
		desc: "An 40–80% aller Tage verfügbar.",
		badgeClass: "badge rarity-ungewoehnlich",
		chipClass: "stats-chip rarity-chip-ungewoehnlich",
	},
	{
		key: "selten",
		label: "Gelegentlich",
		title: "Nicht selbstverständlich",
		desc: "An 10–40% aller Tage verfügbar — wenn sie da ist, zugreifen.",
		badgeClass: "badge rarity-selten",
		chipClass: "stats-chip rarity-chip-selten",
	},
	{
		key: "episch",
		label: "Episch selten",
		title: "Besondere Funde",
		desc: "An weniger als 10% aller Tage verfügbar — ein seltener Genuss.",
		badgeClass: "badge rarity-episch",
		chipClass: "stats-chip rarity-chip-episch",
	},
	{
		key: "legendaer",
		label: "Legendär",
		title: "Einhorn-Sorten",
		desc: "An höchstens 5% aller Tage gesichtet — existieren sie wirklich?",
		badgeClass: "badge rarity-legendaer shiny",
		chipClass: "stats-chip rarity-chip-legendaer",
		blockClass: "stats-block-legendaer",
	},
];

function StatsPage() {
	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch(`${import.meta.env.BASE_URL}data/history.json`)
			.then((r) => r.json())
			.then((data: HistoryEntry[]) => {
				setStats(computeStats(data));
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, []);

	return (
		<main className="page-wrap px-4 pb-12 pt-6">
			<div className="mb-6 text-center">
				<h1 className="text-4xl font-bold text-white uppercase tracking-tight drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] sm:text-5xl">
					Statistiken
				</h1>
				<p className="mt-2 text-white/80 font-medium">
					Alle erfassten Sorten im Überblick
				</p>
			</div>

			{loading ? (
				<p className="text-center py-8 text-lg font-bold text-white">
					Laden...
				</p>
			) : !stats ? (
				<p className="text-center py-8 text-lg font-bold text-white">
					Keine Daten vorhanden.
				</p>
			) : (
				<>
					<div className="stats-grid">
						<div className="stat-card">
							<span className="stat-value">{stats.totalUniqueFlavors}</span>
							<span className="stat-label">Sorten erfasst</span>
						</div>
						<div className="stat-card">
							<span className="stat-value">{stats.totalDays}</span>
							<span className="stat-label">Tage erfasst</span>
						</div>
						<div className="stat-card">
							<span className="stat-value">{stats.avgFlavorsPerDay}</span>
							<span className="stat-label">Sorten / Tag</span>
						</div>
						<div className="stat-card">
							<span className="stat-value">
								{stats.byRarity.legendaer.length}
							</span>
							<span className="stat-label">Legendär</span>
						</div>
					</div>

					{RARITY_CONFIG.map((cfg) => {
						const flavors = stats.byRarity[cfg.key];
						if (flavors.length === 0) return null;
						return (
							<div
								key={cfg.key}
								className={`stats-block ${cfg.blockClass ?? ""}`}
							>
								<h3 className="stats-block-title">
									<span className={cfg.badgeClass}>{cfg.label}</span>
									{cfg.title}
								</h3>
								<p className="stats-block-desc">{cfg.desc}</p>
								<div className="flex flex-wrap gap-1.5">
									{flavors.map((f) => (
										<span key={f.name} className={cfg.chipClass}>
											{f.name}
											<span className="stats-chip-freq">
												{Math.round(f.frequency * 100)}%
											</span>
										</span>
									))}
								</div>
							</div>
						);
					})}
				</>
			)}
		</main>
	);
}
