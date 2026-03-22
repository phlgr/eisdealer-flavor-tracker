import { chromium, type Browser, type Page } from "playwright";
import { createHash } from "node:crypto";
import type { ScrapedImage } from "./types.js";

const VIEWER_SITES = [
	{
		name: "storysaver.net",
		scrape: scrapeStorySaver,
	},
	{
		name: "storiesig.info",
		scrape: scrapeStoriesig,
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
					break;
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

	// storysaver.net: input[name="text_username"], submit is #StoryButton
	const input = page.locator('input[name="text_username"]');
	await input.waitFor({ timeout: 10000 });
	await input.fill(username);

	await page.locator("#StoryButton").click();

	// Wait for story results to load (AJAX-driven)
	await page.waitForTimeout(3000);
	await page.waitForSelector(
		"img[src*='cdninstagram'], img[src*='scontent'], .story-image, .story-item img",
		{ timeout: 15000 },
	).catch(() => {
		console.log("[scrape] No story items appeared on storysaver.net");
	});

	return await extractImages(page);
}

async function scrapeStoriesig(
	page: Page,
	username: string,
): Promise<ScrapedImage[]> {
	await page.goto("https://storiesig.info", { waitUntil: "domcontentloaded" });

	// storiesig.info: Vue.js app, input is .search-form__input, button is .search-form__button
	// Wait for Vue app to mount
	const input = page.locator(".search-form__input");
	await input.waitFor({ timeout: 10000 });
	await input.fill(username);

	await page.locator(".search-form__button").click();

	// Wait for results
	await page.waitForTimeout(3000);
	await page.waitForSelector(
		"img[src*='cdninstagram'], img[src*='scontent'], .search-result img",
		{ timeout: 15000 },
	).catch(() => {
		console.log("[scrape] No story items appeared on storiesig.info");
	});

	return await extractImages(page);
}

async function extractImages(page: Page): Promise<ScrapedImage[]> {
	const images: ScrapedImage[] = [];

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

	for (const url of imageUrls) {
		if (isVideoUrl(url)) continue;

		try {
			const response = await page.request.get(url);
			const contentType = response.headers()["content-type"] || "";

			if (contentType.startsWith("video/")) continue;

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
