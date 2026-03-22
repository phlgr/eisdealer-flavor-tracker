import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{ title: "Eisdealer — Aktuelle Eissorten" },
			{
				name: "description",
				content:
					"Welche Eissorten gibt es heute? Aktuelle Sorten unserer Lieblingseisdiele.",
			},
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{
				rel: "icon",
				href: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍦</text></svg>",
			},
		],
	}),
	component: RootLayout,
});

function RootLayout() {
	return (
		<html lang="de">
			<head>
				<HeadContent />
			</head>
			<body className="font-sans antialiased text-[var(--text-primary)] min-h-screen flex flex-col">
				<Header />
				<div className="flex-1">
					<Outlet />
				</div>
				<Footer />
				<Scripts />
			</body>
		</html>
	);
}
