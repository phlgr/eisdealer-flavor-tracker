import { Link } from "@tanstack/react-router";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
			<nav className="page-wrap flex items-center justify-between py-3">
				<Link
					to="/"
					className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)] no-underline"
				>
					<span className="text-2xl">🍦</span>
					Eisdealer
				</Link>

				<div className="flex items-center gap-4 text-sm font-medium">
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
