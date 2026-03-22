import { chromium, type Browser, type Page } from "playwright";
import { createHash } from "node:crypto";
import type { ScrapedImage } from "./types.js";

const VIEWER_SITES = [
	{
		name: "storysaver.net",
		url: "https://storysaver.net",
		scrape: scrapeStorySaver,
	},
	{
		name: "igram.world",
		url: "https://igram.world",
		scrape: scrapeIgramWorld,
	},
];

const MAX_RETRIES = 2;

export async function scrapeStoryImages(
	username: string,
): Promise<ScrapedImage[]> {
	let browser: Browser | undefined;
	try {
		browser = await chromium.launch({ headless: true });

		for (const site of VIEWER_SITES) {
			for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
				try {
					console.log(
						`[scrape] Trying ${site.name} for @${username} (attempt ${attempt + 1})`,
					);
					const page = await browser.newPage();
					const images = await site.scrape(page, username);
					await page.close();

					if (images.length > 0) {
						console.log(
							`[scrape] Found ${images.length} images from ${site.name}`,
						);
						return images;
					}

					console.log(`[scrape] No images found on ${site.name}`);
					break; // No images but no error — try next site
				} catch (err) {
					console.error(
						`[scrape] ${site.name} attempt ${attempt + 1} failed:`,
						err instanceof Error ? err.message : err,
					);
					if (attempt === MAX_RETRIES) {
						console.log(`[scrape] All retries exhausted for ${site.name}`);
					}
				}
			}
		}

		console.log("[scrape] All viewer sites failed or returned no images");
		return [];
	} finally {
		await browser?.close();
	}
}

async function scrapeStorySaver(
	page: Page,
	username: string,
): Promise<ScrapedImage[]> {
	await page.goto("https://storysaver.net", { waitUntil: "domcontentloaded" });

	// Enter username in the search field
	const input = page.locator('input[type="text"], input[name="username"]').first();
	await input.waitFor({ timeout: 10000 });
	await input.fill(username);

	// Submit the form
	await page.locator('button[type="submit"], .search-btn, button:has-text("Download")').first().click();

	// Wait for results to load
	await page.waitForTimeout(3000);
	await page.waitForSelector(".story-item, .media-item, .result-item, img[src*='cdninstagram'], img[src*='scontent']", {
		timeout: 15000,
	}).catch(() => {
		console.log("[scrape] No story items found on storysaver.net");
	});

	return await extractImages(page);
}

async function scrapeIgramWorld(
	page: Page,
	username: string,
): Promise<ScrapedImage[]> {
	await page.goto("https://igram.world/story", { waitUntil: "domcontentloaded" });

	const input = page.locator('input[type="text"], input[name="url"]').first();
	await input.waitFor({ timeout: 10000 });
	await input.fill(`https://www.instagram.com/stories/${username}/`);

	await page.locator('button[type="submit"], .btn-download, button:has-text("Download")').first().click();

	await page.waitForTimeout(3000);
	await page.waitForSelector(".download-item, .media-item, img[src*='cdninstagram'], img[src*='scontent']", {
		timeout: 15000,
	}).catch(() => {
		console.log("[scrape] No story items found on igram.world");
	});

	return await extractImages(page);
}

async function extractImages(page: Page): Promise<ScrapedImage[]> {
	const images: ScrapedImage[] = [];

	// Find all potential story image URLs
	const imageUrls = await page.evaluate(() => {
		const urls: string[] = [];
		const seen = new Set<string>();

		// Look for images that are likely Instagram story content
		for (const img of document.querySelectorAll("img")) {
			const src = img.src || img.dataset.src || "";
			if (
				(src.includes("cdninstagram") || src.includes("scontent")) &&
				!seen.has(src)
			) {
				seen.add(src);
				urls.push(src);
			}
		}

		// Also check for download links that point to images
		for (const a of document.querySelectorAll("a[href]")) {
			const href = a.getAttribute("href") || "";
			if (
				(href.includes("cdninstagram") || href.includes("scontent")) &&
				!href.match(/\.mp4|video/) &&
				!seen.has(href)
			) {
				seen.add(href);
				urls.push(href);
			}
		}

		return urls;
	});

	// Filter out video URLs and download images
	for (const url of imageUrls) {
		if (isVideoUrl(url)) continue;

		try {
			const response = await page.request.get(url);
			const contentType = response.headers()["content-type"] || "";

			// Skip if it's a video
			if (contentType.startsWith("video/")) continue;

			// Only process images
			if (contentType.startsWith("image/") || !contentType) {
				const buffer = Buffer.from(await response.body());
				// Skip tiny images (likely thumbnails/icons)
				if (buffer.length < 10000) continue;

				const hash = createHash("sha256").update(buffer).digest("hex");
				images.push({ buffer, hash });
			}
		} catch (err) {
			console.error(
				`[scrape] Failed to download image: ${err instanceof Error ? err.message : err}`,
			);
		}
	}

	return images;
}

function isVideoUrl(url: string): boolean {
	const lower = url.toLowerCase();
	return (
		lower.includes(".mp4") ||
		lower.includes("video") ||
		lower.includes("/v/") ||
		lower.includes("mime=video")
	);
}
