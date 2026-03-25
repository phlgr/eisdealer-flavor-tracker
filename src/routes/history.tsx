import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

function HistoryPage() {
	const [days, setDays] = useState<DayGroup[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch(`${import.meta.env.BASE_URL}data/history.json`)
			.then((r) => r.json())
			.then((data: HistoryEntry[]) => {
				setDays(groupByDate(data));
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, []);

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
				<div className="space-y-6">
					{days.map((day) => (
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
													<span key={f.name} className="history-flavor-chip">
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
													<span key={f.name} className="history-flavor-chip">
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
			)}
		</main>
	);
}
