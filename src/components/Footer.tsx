export default function Footer() {
	return (
		<footer className="mt-16 px-4 py-8 text-center text-sm text-white/70">
			<p className="font-bold">
				Dies ist eine inoffizielle Fan-Seite und steht in keiner Verbindung
				zu{" "}
				<a
					href="https://dieeisdealer.de/"
					target="_blank"
					rel="noopener noreferrer"
					className="text-white underline hover:text-white/90"
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
			<p className="mt-3 flex items-center justify-center gap-3 font-bold">
				<a
					href="https://dieeisdealer.de/"
					target="_blank"
					rel="noopener noreferrer"
					className="text-white underline hover:text-white/90"
				>
					Website
				</a>
				<span className="text-white/40">|</span>
				<a
					href="https://www.instagram.com/die_eisdealer/"
					target="_blank"
					rel="noopener noreferrer"
					className="text-white underline hover:text-white/90"
				>
					Instagram
				</a>
			</p>
		</footer>
	);
}
