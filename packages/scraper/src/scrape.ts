import { chromium, type Browser, type Page } from "playwright";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ScrapedImage } from "./types.js";

const DEBUG_DIR = join(import.meta.dir, "../../../debug");
const MAX_RETRIES = 2;

const USER_AGENT =
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export async function scrapeStoryImages(
	username: string,
): Promise<ScrapedImage[]> {
	let browser: Browser | undefined;
	try {
		browser = await chromium.launch({
			headless: true,
			args: [
				"--disable-blink-features=AutomationControlled",
				"--no-sandbox",
			],
		});

		const context = await browser.newContext({
			userAgent: USER_AGENT,
			viewport: { width: 1280, height: 720 },
			locale: "de-DE",
		});

		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			let page: Page | undefined;
			try {
				console.log(
					`[scrape] Trying storiesig.info for @${username} (attempt ${attempt + 1})`,
				);
				page = await context.newPage();
				const images = await scrapeStoriesig(page, username);

				if (images.length > 0) {
					console.log(`[scrape] Found ${images.length} images`);
					await page.close();
					return images;
				}

				console.log("[scrape] No images found");
				await debugPage(page, `storiesig-no-results-${attempt + 1}`);
				await page.close();
				break;
			} catch (err) {
				console.error(
					`[scrape] Attempt ${attempt + 1} failed:`,
					err instanceof Error ? err.message : err,
				);
				if (page) await debugPage(page, `storiesig-error-${attempt + 1}`);
				if (attempt === MAX_RETRIES) {
					console.log("[scrape] All retries exhausted");
				}
			}
		}

		return [];
	} finally {
		await browser?.close();
	}
}

async function scrapeStoriesig(
	page: Page,
	username: string,
): Promise<ScrapedImage[]> {
	await page.goto("https://storiesig.info", { waitUntil: "networkidle" });

	// Wait for Vue app to mount
	await page.waitForTimeout(2000);

	const input = page.locator(".search-form__input");
	await input.waitFor({ timeout: 10000 });
	await input.fill(username);

	await page.locator(".search-form__button").click();

	// Wait for results to load
	await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(3000);

	return await extractImages(page);
}

async function extractImages(page: Page): Promise<ScrapedImage[]> {
	const images: ScrapedImage[] = [];

	// storiesig.info proxies images through media.storiesig.info
	// and also references scontent/cdninstagram URLs
	const imageUrls = await page.evaluate(() => {
		const urls: string[] = [];
		const seen = new Set<string>();

		for (const img of document.querySelectorAll("img")) {
			const src = img.src || img.dataset.src || "";
			if (isStoryMedia(src) && !seen.has(src)) {
				seen.add(src);
				urls.push(src);
			}
		}

		for (const a of document.querySelectorAll("a[href]")) {
			const href = a.getAttribute("href") || "";
			if (isStoryMedia(href) && !href.match(/\.mp4|video/) && !seen.has(href)) {
				seen.add(href);
				urls.push(href);
			}
		}

		function isStoryMedia(url: string): boolean {
			return (
				url.includes("cdninstagram") ||
				url.includes("scontent") ||
				url.includes("media.storiesig")
			);
		}

		return urls;
	});

	console.log(`[scrape] Found ${imageUrls.length} candidate URLs`);

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

async function debugPage(page: Page, name: string): Promise<void> {
	try {
		mkdirSync(DEBUG_DIR, { recursive: true });
		const screenshot = await page.screenshot({ fullPage: true });
		writeFileSync(join(DEBUG_DIR, `${name}.png`), screenshot);
		console.log(`[scrape] Debug screenshot saved as ${name}.png`);
	} catch (err) {
		console.error(`[scrape] Failed to save debug info: ${err}`);
	}
}
