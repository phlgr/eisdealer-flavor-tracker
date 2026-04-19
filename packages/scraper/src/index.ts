import { analyzeStoryImage } from "./analyze";
import { scrapeStoryImages } from "./scrape";
import {
	appendHistoryEntry,
	buildLocationUpdate,
	filterNewImages,
	loadCurrentData,
	loadSeenHashes,
	saveCurrentData,
	saveSeenHashes,
} from "./store";
import type { HistoryEntry, StoryAnalysis } from "./types";

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
	const seenHashes = await loadSeenHashes();
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
	const analyzedHashes: string[] = [];
	for (const image of newImages) {
		console.log(`[main] Analyzing image (hash: ${image.hash.slice(0, 12)}...)`);
		try {
			const result = await analyzeStoryImage(image.buffer);
			analyzedHashes.push(image.hash);
			if (result) {
				analyses.push(result);
				console.log(
					`[main] Result: isFlavorList=${result.isFlavorList}, flavors=${result.flavors.length}, confidence=${result.confidence}, location=${result.location ?? "unknown"}`,
				);
			}
		} catch (err) {
			console.error(
				`[main] Failed to analyze image (hash: ${image.hash.slice(0, 12)}...):`,
				err instanceof Error ? err.message : err,
			);
		}
	}

	// Step 4: Update seen hashes only for successfully analyzed images
	const allHashes = [...seenHashes, ...analyzedHashes];
	await saveSeenHashes(allHashes);

	// Step 5: Build updates for each location
	const mainAnalyses = analyses.filter(
		(a) => !a.location || a.location === "main",
	);
	const bugaAnalyses = analyses.filter((a) => a.location === "buga");

	const mainUpdate = buildLocationUpdate("main", mainAnalyses);
	const bugaUpdate = buildLocationUpdate("buga", bugaAnalyses);

	if (mainUpdate || bugaUpdate) {
		// Update current.json
		const current = await loadCurrentData();
		if (mainUpdate) current.main = mainUpdate;
		if (bugaUpdate) current.buga = bugaUpdate;
		await saveCurrentData(current);

		// Append history entry with only updated locations
		const historyEntry: HistoryEntry = {
			timestamp: new Date().toISOString(),
			...(mainUpdate
				? {
						main: {
							flavors: mainUpdate.flavors,
							...(mainUpdate.openUntil
								? { openUntil: mainUpdate.openUntil }
								: {}),
						},
					}
				: {}),
			...(bugaUpdate
				? {
						buga: {
							flavors: bugaUpdate.flavors,
							...(bugaUpdate.openUntil
								? { openUntil: bugaUpdate.openUntil }
								: {}),
						},
					}
				: {}),
		};
		await appendHistoryEntry(historyEntry);
	}

	console.log(
		`\n[main] Done. main=${mainUpdate ? "updated" : "unchanged"}, buga=${bugaUpdate ? "updated" : "unchanged"}`,
	);
}

main().catch((err) => {
	console.error("[main] Fatal error:", err);
	process.exit(1);
});
