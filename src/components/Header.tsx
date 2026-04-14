import { Link } from "@tanstack/react-router";

export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b-3 border-black bg-white px-4">
			<nav className="page-wrap flex items-center justify-between py-3">
				<Link to="/" className="flex items-center gap-2 no-underline">
					<span className="text-3xl">🍦</span>
					<span className="text-xl font-bold tracking-tight text-black">
						EISDEALER
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
						to="/stats"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Stats
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
