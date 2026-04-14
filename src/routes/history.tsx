import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HistoryEntry } from "#/types";

export const Route = createFileRoute("/history")({ component: HistoryPage });

type DayGroup = {
	date: string;
	entries: HistoryEntry[];
};

function formatDate(dateStr: string): string {
	return new Date(`${dateStr}T12:00:00`).toLocaleDateString("de-DE", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function formatTime(timestamp: string): string {
	return new Date(timestamp).toLocaleTimeString("de-DE", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function groupByDate(entries: HistoryEntry[]): DayGroup[] {
	const groups = new Map<string, HistoryEntry[]>();
	for (const entry of entries) {
		const date = entry.timestamp.split("T")[0];
		const group = groups.get(date);
		if (group) {
			group.push(entry);
		} else {
			groups.set(date, [entry]);
		}
	}
	return Array.from(groups.entries())
		.map(([date, entries]) => ({ date, entries }))
		.sort((a, b) => b.date.localeCompare(a.date));
}

function matchesFlavor(entry: HistoryEntry, query: string): boolean {
	const q = query.toLowerCase();
	for (const loc of ["main", "buga"] as const) {
		const locationData = entry[loc];
		if (!locationData) continue;
		for (const f of locationData.flavors) {
			if (f.name.toLowerCase().includes(q)) return true;
		}
	}
	return false;
}

function HistoryPage() {
	const [days, setDays] = useState<DayGroup[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const wrapRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		fetch(`${import.meta.env.BASE_URL}data/history.json`)
			.then((r) => r.json())
			.then((data: HistoryEntry[]) => {
				setDays(groupByDate(data));
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, []);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
				setShowSuggestions(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const allFlavors = useMemo(() => {
		const names = new Set<string>();
		for (const day of days) {
			for (const entry of day.entries) {
				for (const loc of ["main", "buga"] as const) {
					const locationData = entry[loc];
					if (!locationData) continue;
					for (const f of locationData.flavors) {
						names.add(f.name);
					}
				}
			}
		}
		return Array.from(names).sort((a, b) => a.localeCompare(b, "de"));
	}, [days]);

	const suggestions = useMemo(() => {
		if (search.length < 3) return [];
		const q = search.toLowerCase();
		return allFlavors.filter((n) => n.toLowerCase().includes(q));
	}, [search, allFlavors]);

	const filteredDays = search
		? days.filter((day) => day.entries.some((e) => matchesFlavor(e, search)))
		: days;

	return (
		<main className="page-wrap px-4 pb-12 pt-6">
			<div className="mb-6 text-center">
				<h1 className="text-4xl font-bold text-white uppercase tracking-tight drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)] sm:text-5xl">
					Sorten-Verlauf
				</h1>
				<p className="mt-2 text-white/80 font-medium">
					Welche Sorten gab es an welchem Tag?
				</p>
			</div>

			{loading ? (
				<p className="text-center py-8 text-lg font-bold">Laden...</p>
			) : days.length === 0 ? (
				<p className="text-center py-8 text-lg font-bold">
					Noch kein Verlauf vorhanden.
				</p>
			) : (
				<>
					<div className="search-wrap" ref={wrapRef}>
						<input
							type="text"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setShowSuggestions(true);
							}}
							onFocus={() => setShowSuggestions(true)}
							placeholder="Sorte suchen..."
							className="history-search"
							autoComplete="off"
						/>
						{showSuggestions && suggestions.length > 0 && (
							<ul className="search-suggestions">
								{suggestions.map((name) => (
									<li key={name}>
										<button
											type="button"
											className="search-suggestion-item"
											onMouseDown={() => {
												setSearch(name);
												setShowSuggestions(false);
											}}
										>
											{name}
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
					{search && (
						<p className="text-center text-white/80 font-bold text-sm mb-4 uppercase tracking-wide">
							{filteredDays.length} Tage mit Ergebnissen
						</p>
					)}
					<div className="space-y-6">
						{filteredDays.map((day) => (
							<div key={day.date} className="history-card">
								<h2 className="text-lg font-bold text-black mb-3 uppercase">
									{formatDate(day.date)}
								</h2>

								{day.entries.map((entry) => (
									<div key={entry.timestamp} className="mb-3 last:mb-0">
										{day.entries.length > 1 && (
											<p className="text-xs text-[var(--text-secondary)] mb-1.5">
												{formatTime(entry.timestamp)} Uhr
											</p>
										)}

										{entry.main && entry.main.flavors.length > 0 && (
											<div className="mb-2">
												<h3 className="text-sm font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
													Hauptfiliale
												</h3>
												<div className="flex flex-wrap gap-1.5">
													{entry.main.flavors.map((f) => (
														<span
															key={f.name}
															className={`history-flavor-chip${search && f.name.toLowerCase().includes(search.toLowerCase()) ? " history-flavor-highlight" : ""}`}
														>
															{f.name}
														</span>
													))}
												</div>
											</div>
										)}

										{entry.buga && entry.buga.flavors.length > 0 && (
											<div>
												<h3 className="text-sm font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
													Bunter Garten
												</h3>
												<div className="flex flex-wrap gap-1.5">
													{entry.buga.flavors.map((f) => (
														<span
															key={f.name}
															className={`history-flavor-chip${search && f.name.toLowerCase().includes(search.toLowerCase()) ? " history-flavor-highlight" : ""}`}
														>
															{f.name}
														</span>
													))}
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						))}
					</div>
				</>
			)}
		</main>
	);
}
