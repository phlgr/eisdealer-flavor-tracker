import { createFileRoute } from "@tanstack/react-router";
import historyData from "../../data/history.json";

export const Route = createFileRoute("/history")({ component: HistoryPage });

type Flavor = {
	name: string;
	nameEnglish?: string;
	tags: string[];
	available: boolean;
};

type HistoryEntry = {
	date: string;
	main?: Flavor[];
	buga?: Flavor[];
};

function formatDate(dateStr: string): string {
	return new Date(dateStr + "T12:00:00").toLocaleDateString("de-DE", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function HistoryPage() {
	const entries = (historyData as HistoryEntry[]).slice().reverse();

	return (
		<main className="page-wrap px-4 pb-12 pt-6">
			<div className="mb-6 text-center">
				<h1 className="text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
					Sorten-Verlauf
				</h1>
				<p className="mt-2 text-[var(--text-secondary)]">
					Welche Sorten gab es an welchem Tag?
				</p>
			</div>

			{entries.length === 0 ? (
				<p className="text-center text-[var(--text-secondary)] py-8">
					Noch kein Verlauf vorhanden.
				</p>
			) : (
				<div className="space-y-6">
					{entries.map((entry) => (
						<div key={entry.date} className="history-card">
							<h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
								{formatDate(entry.date)}
							</h2>

							{entry.main && entry.main.length > 0 && (
								<div className="mb-3">
									<h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1.5">
										Hauptfiliale
									</h3>
									<div className="flex flex-wrap gap-1.5">
										{entry.main.map((f) => (
											<span key={f.name} className="history-flavor-chip">
												{f.name}
											</span>
										))}
									</div>
								</div>
							)}

							{entry.buga && entry.buga.length > 0 && (
								<div>
									<h3 className="text-sm font-medium text-[var(--text-secondary)] mb-1.5">
										Bunter Garten
									</h3>
									<div className="flex flex-wrap gap-1.5">
										{entry.buga.map((f) => (
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
			)}
		</main>
	);
}
