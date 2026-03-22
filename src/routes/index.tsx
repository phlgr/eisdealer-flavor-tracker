import { createFileRoute } from "@tanstack/react-router";
import mainData from "../../data/main.json";
import bugaData from "../../data/buga.json";
import { useState } from "react";

export const Route = createFileRoute("/")({ component: HomePage });

type Flavor = {
	name: string;
	nameEnglish?: string;
	tags: string[];
	available: boolean;
};

type LocationData = {
	location: string;
	lastUpdated: string;
	flavors: Flavor[];
};

const TAG_LABELS: Record<string, { label: string; className: string }> = {
	vegan: { label: "Vegan", className: "tag-vegan" },
	sorbet: { label: "Sorbet", className: "tag-sorbet" },
	contains_nuts: { label: "Nüsse", className: "tag-nuts" },
	contains_dairy: { label: "Milch", className: "tag-dairy" },
	sugar_free: { label: "Zuckerfrei", className: "tag-sugar-free" },
	seasonal: { label: "Saison", className: "tag-seasonal" },
	new: { label: "Neu!", className: "tag-new" },
};

function isStale(lastUpdated: string): boolean {
	const diff = Date.now() - new Date(lastUpdated).getTime();
	return diff > 48 * 60 * 60 * 1000;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("de-DE", {
		day: "numeric",
		month: "long",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function FlavorCard({ flavor }: { flavor: Flavor }) {
	return (
		<div className="flavor-card">
			<div className="flex items-start justify-between gap-2">
				<div>
					<span className="text-base font-extrabold text-[var(--text-primary)]">
						{flavor.name}
					</span>
					{flavor.nameEnglish && (
						<span className="ml-2 text-sm font-medium text-[var(--text-secondary)]">
							{flavor.nameEnglish}
						</span>
					)}
				</div>
			</div>
			{flavor.tags.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-1.5">
					{flavor.tags.map((tag) => {
						const info = TAG_LABELS[tag];
						if (!info) return null;
						return (
							<span key={tag} className={`tag ${info.className}`}>
								{info.label}
							</span>
						);
					})}
				</div>
			)}
		</div>
	);
}

function LocationSection({ data }: { data: LocationData }) {
	const stale = isStale(data.lastUpdated);

	return (
		<section>
			{stale && (
				<div className="stale-banner">
					Daten evtl. veraltet — zuletzt aktualisiert {formatDate(data.lastUpdated)}
				</div>
			)}
			<div className="mb-3 flex items-center justify-between">
				<p className="text-sm text-[var(--text-secondary)]">
					Aktualisiert: {formatDate(data.lastUpdated)}
				</p>
				<span className="text-sm font-bold text-[var(--accent)]">
					{data.flavors.length} Sorten
				</span>
			</div>
			<div className="flavor-grid">
				{data.flavors.map((flavor) => (
					<FlavorCard key={flavor.name} flavor={flavor} />
				))}
			</div>
			{data.flavors.length === 0 && (
				<p className="text-center text-white/80 py-8 text-lg font-bold">
					Keine Sorten verfügbar.
				</p>
			)}
		</section>
	);
}

function HomePage() {
	const [activeTab, setActiveTab] = useState<"main" | "buga">("main");

	return (
		<main className="page-wrap px-4 pb-12 pt-6">
			<div className="mb-6 text-center">
				<h1
					className="text-4xl font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] sm:text-5xl"
					style={{ fontFamily: "var(--font-display)" }}
				>
					Heutige Eissorten
				</h1>
				<p className="mt-2 font-bold text-white/80">
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
				<LocationSection data={mainData as LocationData} />
			) : (
				<LocationSection data={bugaData as LocationData} />
			)}
		</main>
	);
}
