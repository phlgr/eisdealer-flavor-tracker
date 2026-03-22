import { scrapeStoryImages } from "./scrape.js";
import { analyzeStoryImage } from "./analyze.js";
import {
	loadSeenHashes,
	saveSeenHashes,
	filterNewImages,
	updateLocationFromAnalysis,
	archiveDailySnapshot,
} from "./store.js";
import type { StoryAnalysis } from "./types.js";

function getUsername(): string {
	const env = process.env.INSTAGRAM_USERNAME || "";
	if (env) return env.trim();

	console.log("[main] No INSTAGRAM_USERNAME configured, using default");
	return "die_eisdealer";
}

async function main() {
	const username = getUsername();
	console.log(`[main] Eisdealer scraper starting for @${username}...`);

	// Step 1: Scrape story images (single account)
	const images = await scrapeStoryImages(username);
	if (images.length === 0) {
		console.log("[main] No images scraped, done.");
		return;
	}
	console.log(`[main] Scraped ${images.length} images`);

	// Step 2: Dedup against seen hashes
	const seenHashes = loadSeenHashes();
	const newImages = filterNewImages(images, seenHashes);
	if (newImages.length === 0) {
		console.log("[main] All images already processed, done.");
		return;
	}
	console.log(
		`[main] ${newImages.length} new images to analyze (${images.length - newImages.length} already seen)`,
	);

	// Step 3: Analyze new images with Gemini
	const analyses: StoryAnalysis[] = [];
	for (const image of newImages) {
		console.log(`[main] Analyzing image (hash: ${image.hash.slice(0, 12)}...)`);
		const result = await analyzeStoryImage(image.buffer);
		if (result) {
			analyses.push(result);
			console.log(
				`[main] Result: isFlavorList=${result.isFlavorList}, flavors=${result.flavors.length}, confidence=${result.confidence}, location=${result.location ?? "unknown"}`,
			);
		}
	}

	// Step 4: Update seen hashes (even for non-flavor images, so we don't re-process them)
	const allHashes = [...seenHashes, ...newImages.map((img) => img.hash)];
	saveSeenHashes(allHashes);

	// Step 5: Sort analyses by AI-detected location and update both
	const mainAnalyses = analyses.filter((a) => !a.location || a.location === "main");
	const bugaAnalyses = analyses.filter((a) => a.location === "buga");

	const mainUpdated = updateLocationFromAnalysis("main", mainAnalyses);
	const bugaUpdated = updateLocationFromAnalysis("buga", bugaAnalyses);

	if (mainUpdated || bugaUpdated) {
		archiveDailySnapshot();
	}

	console.log(
		`\n[main] Done. main=${mainUpdated ? "updated" : "unchanged"}, buga=${bugaUpdated ? "updated" : "unchanged"}`,
	);
}

main().catch((err) => {
	console.error("[main] Fatal error:", err);
	process.exit(1);
});
