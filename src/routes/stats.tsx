import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RARITY_CONFIG, RarityBadge } from "#/components/RarityBadge";
import { computeStats, type Rarity, type Stats } from "#/lib/stats";
import type { HistoryEntry } from "#/types";

export const Route = createFileRoute("/stats")({ component: StatsPage });

function daysAgoLabel(lastSeen: string): string {
	const last = new Date(lastSeen);
	const now = new Date();
	const diff = Math.floor(
		(now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
	);
	if (diff <= 0) return "heute";
	if (diff === 1) return "vor 1 Tag";
	return `vor ${diff} Tagen`;
}

const STATS_SECTIONS: {
	key: Rarity;
	title: string;
	desc: string;
}[] = [
	{
		key: "gewoehnlich",
		title: "Immer dabei",
		desc: "Diese Sorten gibt es fast jeden Tag.",
	},
	{
		key: "ungewoehnlich",
		title: "Nicht alltäglich",
		desc: "An 40–80% aller Tage verfügbar.",
	},
	{
		key: "selten",
		title: "Nicht selbstverständlich",
		desc: "An 10–40% aller Tage verfügbar — wenn sie da ist, zugreifen.",
	},
	{
		key: "episch",
		title: "Besondere Funde",
		desc: "An weniger als 10% aller Tage verfügbar — ein seltener Genuss.",
	},
	{
		key: "legendaer",
		title: "Einhorn-Sorten",
		desc: "An höchstens 5% aller Tage gesichtet — existieren sie wirklich?",
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

					{stats.topStreaks.length > 0 && (
						<div className="stats-block">
							<h3 className="stats-block-title">Längste Serien</h3>
							<p className="stats-block-desc">
								Wie viele Tage in Folge eine Sorte verfügbar war.
							</p>
							<div className="streak-list">
								{stats.topStreaks.map((s) => (
									<div key={s.name} className="streak-row">
										<span className="streak-name">{s.name}</span>
										<span className="streak-bar-wrap">
											<span
												className={`streak-bar ${s.active ? "streak-bar-active" : ""}`}
												style={{
													width: `${(s.streak / stats.topStreaks[0].streak) * 100}%`,
												}}
											/>
										</span>
										<span className="streak-value">
											{s.streak} Tage
											{s.active && " ▸"}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{STATS_SECTIONS.map((section) => {
						const cfg = RARITY_CONFIG[section.key];
						const flavors = stats.byRarity[section.key];
						if (flavors.length === 0) return null;
						return (
							<div
								key={section.key}
								className={`stats-block ${cfg.blockClass ?? ""}`}
							>
								<h3 className="stats-block-title">
									<RarityBadge rarity={section.key} />
									{section.title}
								</h3>
								<p className="stats-block-desc">{section.desc}</p>
								<div className="flex flex-wrap gap-1.5">
									{flavors.map((f) => (
										<span
											key={f.name}
											className={`${cfg.chipClass}${(section.key === "episch" || section.key === "legendaer") && f.lastSeen ? " has-tooltip" : ""}`}
											{...((section.key === "episch" ||
												section.key === "legendaer") &&
											f.lastSeen
												? {
														"data-tooltip": `Zuletzt: ${daysAgoLabel(f.lastSeen)}`,
													}
												: {})}
										>
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
