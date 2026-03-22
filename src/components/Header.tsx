import { Link } from "@tanstack/react-router";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--header-bg)] px-4 backdrop-blur-xl">
			<nav className="page-wrap flex items-center justify-between py-3">
				<Link
					to="/"
					className="flex items-center gap-2 no-underline"
				>
					<span className="text-3xl">🍦</span>
					<span className="font-[var(--font-display)] text-xl font-extrabold tracking-tight text-[var(--accent)]" style={{ fontFamily: "var(--font-display)" }}>
						Eisdealer
					</span>
				</Link>

				<div className="flex items-center gap-4 text-sm">
					<Link
						to="/"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
						activeOptions={{ exact: true }}
					>
						Heute
					</Link>
					<Link
						to="/history"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Verlauf
					</Link>
				</div>
			</nav>
		</header>
	);
}
