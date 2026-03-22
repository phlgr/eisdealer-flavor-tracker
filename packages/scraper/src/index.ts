import { scrapeStoryImages } from "./scrape.js";
import { analyzeStoryImage } from "./analyze.js";
import {
	loadSeenHashes,
	saveSeenHashes,
	filterNewImages,
	updateLocationFromAnalysis,
	archiveDailySnapshot,
} from "./store.js";
import type { LocationConfig, StoryAnalysis } from "./types.js";

function getLocationConfigs(): LocationConfig[] {
	const usernames = process.env.INSTAGRAM_USERNAMES || "";

	if (!usernames) {
		console.log("[main] No INSTAGRAM_USERNAMES configured, using defaults");
		return [
			{ username: "eisdiele_main", location: "main" },
			{ username: "eisdiele_buga", location: "buga" },
		];
	}

	// Format: "username1:main,username2:buga" or just "username" (defaults to main)
	return usernames.split(",").map((entry) => {
		const [username, loc] = entry.trim().split(":");
		return {
			username,
			location: (loc === "buga" ? "buga" : "main") as "main" | "buga",
		};
	});
}

async function processLocation(config: LocationConfig): Promise<boolean> {
	console.log(
		`\n[main] Processing @${config.username} for ${config.location}`,
	);

	// Step 1: Scrape story images
	const images = await scrapeStoryImages(config.username);
	if (images.length === 0) {
		console.log("[main] No images scraped, skipping");
		return false;
	}
	console.log(`[main] Scraped ${images.length} images`);

	// Step 2: Dedup against seen hashes
	const seenHashes = loadSeenHashes();
	const newImages = filterNewImages(images, seenHashes);
	if (newImages.length === 0) {
		console.log("[main] All images already processed, skipping AI analysis");
		return false;
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
				`[main] Result: isFlavorList=${result.isFlavorList}, flavors=${result.flavors.length}, confidence=${result.confidence}`,
			);
		}
	}

	// Step 4: Update seen hashes (even for non-flavor images, so we don't re-process them)
	const allHashes = [...seenHashes, ...newImages.map((img) => img.hash)];
	saveSeenHashes(allHashes);

	// Step 5: Update location data
	// Check if any analysis hints at a different location
	for (const analysis of analyses) {
		if (analysis.location && analysis.location !== config.location) {
			console.log(
				`[main] AI detected location "${analysis.location}" (configured: "${config.location}")`,
			);
		}
	}

	return updateLocationFromAnalysis(config.location, analyses);
}

async function main() {
	console.log("[main] Eisdealer scraper starting...");

	const configs = getLocationConfigs();
	let anyUpdated = false;

	for (const config of configs) {
		try {
			const updated = await processLocation(config);
			if (updated) anyUpdated = true;
		} catch (err) {
			console.error(
				`[main] Error processing @${config.username}:`,
				err instanceof Error ? err.message : err,
			);
		}
	}

	// Archive daily snapshot if any data was updated
	if (anyUpdated) {
		archiveDailySnapshot();
	}

	console.log(
		`\n[main] Done. ${anyUpdated ? "Data was updated." : "No changes."}`,
	);
}

main().catch((err) => {
	console.error("[main] Fatal error:", err);
	process.exit(1);
});
