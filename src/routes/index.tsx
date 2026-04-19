import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RarityBadge } from "#/components/RarityBadge";
import {
	computeStats,
	getFlavorRarity,
	type Rarity,
	type Stats,
} from "#/lib/stats";
import type {
	CurrentData,
	FlavorTag,
	HistoryEntry,
	IceCreamFlavor,
	LocationState,
} from "#/types";
import _currentData from "../../data/current.json";

const currentData: CurrentData = _currentData as CurrentData;

export const Route = createFileRoute("/")({ component: HomePage });

const TAG_LABELS: Record<FlavorTag, { label: string; className: string }> = {
	vegan: { label: "Vegan", className: "tag-vegan" },
	milk: { label: "Milch", className: "tag-milk" },
};

/** Rarities worth highlighting on the main page */
const MAIN_PAGE_RARITIES: Set<Rarity> = new Set([
	"neu",
	"gewoehnlich",
	"episch",
	"legendaer",
]);

function isFromToday(lastUpdated: string): boolean {
	const updated = new Date(lastUpdated);
	const now = new Date();
	return (
		updated.getFullYear() === now.getFullYear() &&
		updated.getMonth() === now.getMonth() &&
		updated.getDate() === now.getDate()
	);
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("de-DE", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function FlavorRow({
	flavor,
	stats,
}: {
	flavor: IceCreamFlavor;
	stats: Stats | null;
}) {
	const rarity = getFlavorRarity(flavor.name, stats);
	const showRarity = rarity && MAIN_PAGE_RARITIES.has(rarity);

	return (
		<div className="flavor-row">
			<span className="nail" />
			<div className="flavor-content">
				<span className="flavor-name">{flavor.name}</span>
				{showRarity ? (
					<RarityBadge rarity={rarity} />
				) : (
					flavor.tags.length > 0 && (
						<span className="flavor-tags">
							{flavor.tags.map((tag) => {
								const info = TAG_LABELS[tag];
								return (
									<span key={tag} className={`tag ${info.className}`}>
										{info.label}
									</span>
								);
							})}
						</span>
					)
				)}
			</div>
			<span className="nail" />
		</div>
	);
}

function LocationSection({
	data,
	stats,
}: {
	data: LocationState | undefined;
	stats: Stats | null;
}) {
	const today = data ? isFromToday(data.lastUpdated) : false;
	const flavors = today && data ? data.flavors : [];

	return (
		<section>
			{today && data && (
				<div className="mb-3 flex items-center justify-between">
					<p className="text-sm text-white/70">
						Aktualisiert: {formatDate(data.lastUpdated)}
					</p>
					{data.openUntil && (
						<span className="open-until-badge">Bis {data.openUntil} Uhr</span>
					)}
				</div>
			)}
			{flavors.length > 0 ? (
				<div className="flavor-wall">
					{flavors.map((flavor) => (
						<FlavorRow key={flavor.name} flavor={flavor} stats={stats} />
					))}
				</div>
			) : (
				<div className="flavor-wall">
					<div className="flavor-row">
						<span className="nail" />
						<div className="flavor-content">
							<span className="flavor-name">
								Heute noch keine Sorten gepostet — schau später nochmal vorbei!
							</span>
						</div>
						<span className="nail" />
					</div>
				</div>
			)}
		</section>
	);
}

function HomePage() {
	const [activeTab, setActiveTab] = useState<"main" | "buga">("main");
	const [stats, setStats] = useState<Stats | null>(null);

	useEffect(() => {
		fetch(`${import.meta.env.BASE_URL}data/history.json`)
			.then((r) => r.json())
			.then((data: HistoryEntry[]) => setStats(computeStats(data)))
			.catch(() => {});
	}, []);

	return (
		<main className="page-wrap px-4 pb-12 pt-6">
			<div className="mb-6 text-center">
				<h1 className="text-4xl font-bold text-white uppercase tracking-tight drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] sm:text-5xl">
					Heutige Eissorten
				</h1>
				<p className="mt-2 text-white/80 font-medium">
					Automatisch von Instagram Stories abgelesen
				</p>
			</div>

			<div className="tab-bar">
				<button
					type="button"
					className={`tab ${activeTab === "main" ? "tab-active" : ""}`}
					onClick={() => setActiveTab("main")}
				>
					Hauptfiliale
				</button>
				<button
					type="button"
					className={`tab ${activeTab === "buga" ? "tab-active" : ""}`}
					onClick={() => setActiveTab("buga")}
				>
					Bunter Garten
				</button>
			</div>

			{activeTab === "main" ? (
				<LocationSection data={currentData.main} stats={stats} />
			) : (
				<LocationSection data={currentData.buga} stats={stats} />
			)}
		</main>
	);
}
