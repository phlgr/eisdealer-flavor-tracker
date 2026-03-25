export default function Footer() {
	return (
		<footer className="mt-16 border-t-3 border-black bg-white px-4 py-8 text-center text-sm">
			<p className="font-bold">
				Dies ist eine inoffizielle Fan-Seite und steht in keiner Verbindung zu{" "}
				<a
					href="https://dieeisdealer.de/"
					target="_blank"
					rel="noopener noreferrer"
				>
					Die Eisdealer
				</a>
				.
			</p>
			<p className="mt-2 text-[var(--text-secondary)]">
				Alle Angaben ohne Gewähr. Die Sorten werden automatisch aus Instagram
				Stories ausgelesen und können fehlerhaft oder veraltet sein. Das
				Sortiment kann sich im Laufe des Tages ändern, da einzelne Sorten je
				nach Verfügbarkeit ausverkauft sein können.
			</p>
			<p className="mt-3 flex items-center justify-center gap-3 font-bold">
				<a
					href="https://dieeisdealer.de/"
					target="_blank"
					rel="noopener noreferrer"
				>
					Website
				</a>
				<span className="text-gray-300">|</span>
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
