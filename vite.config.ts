import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const config = defineConfig({
	base: "/eisdealer-flavor-tracker/",
	plugins: [
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart({
			pages: [
				{ path: "/", prerender: { enabled: true } },
				{ path: "/history", prerender: { enabled: true } },
			],
			prerender: {
				enabled: true,
				crawlLinks: true,
			},
		}),
		viteReact(),
	],
});

export default config;
