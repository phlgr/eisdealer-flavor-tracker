export default function Footer() {
	return (
		<footer className="mt-16 border-t border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
			<p>
				Dies ist eine inoffizielle Fan-Seite und steht in keiner Verbindung
				zu{" "}
				<a
					href="https://dieeisdealer.de/"
					target="_blank"
					rel="noopener noreferrer"
				>
					Die Eisdealer
				</a>
				.
			</p>
			<p className="mt-2">
				Alle Angaben ohne Gewähr. Die Sorten werden automatisch aus
				Instagram Stories ausgelesen und können fehlerhaft oder veraltet
				sein.
			</p>
			<p className="mt-3 flex items-center justify-center gap-3">
				<a
					href="https://dieeisdealer.de/"
					target="_blank"
					rel="noopener noreferrer"
				>
					Website
				</a>
				<span className="text-[var(--border)]">|</span>
				<a
					href="https://www.instagram.com/die_eisdealer/"
					target="_blank"
					rel="noopener noreferrer"
				>
					Instagram
				</a>
			</p>
		</footer>
	);
}
