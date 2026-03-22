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
					`[scrape] Trying igram.world for @${username} (attempt ${attempt + 1})`,
				);
				page = await context.newPage();
				const images = await scrapeIgram(page, username);

				if (images.length > 0) {
					console.log(`[scrape] Found ${images.length} images`);
					await page.close();
					return images;
				}

				console.log("[scrape] No images found");
				await debugPage(page, `igram-no-results-${attempt + 1}`);
				await page.close();
				break;
			} catch (err) {
				console.error(
					`[scrape] Attempt ${attempt + 1} failed:`,
					err instanceof Error ? err.message : err,
				);
				if (page) await debugPage(page, `igram-error-${attempt + 1}`);
				try { await page?.close(); } catch {}
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

/**
 * Adapted from https://github.com/patermars/StoryScraper
 * Uses igram.world/story-saver with its specific flow:
 * 1. Fill username in #search-form-input
 * 2. Click submit
 * 3. Dismiss modal popup
 * 4. Click "stories" tab
 * 5. Extract image URLs from download links
 */
async function scrapeIgram(
	page: Page,
	username: string,
): Promise<ScrapedImage[]> {
	await page.goto("https://igram.world/story-saver", {
		waitUntil: "domcontentloaded",
	});

	// Wait for page to settle
	await page.waitForTimeout(3000);

	// Dismiss cookie consent dialog if present
	try {
		const consent = page.locator('.fc-cta-consent, .fc-button-consent, button[aria-label="Consent"]');
		await consent.first().waitFor({ timeout: 5000 });
		await consent.first().click();
		await page.waitForTimeout(1000);
		console.log("[scrape] Dismissed cookie consent");
	} catch {
		console.log("[scrape] No cookie consent dialog");
	}

	// Fill in the username
	const input = page.locator("#search-form-input");
	await input.waitFor({ timeout: 15000 });
	await input.fill(username);
	await page.waitForTimeout(500);

	// Submit
	await page.locator('button.search-form__button[type="submit"]').click();
	await page.waitForTimeout(1000);

	// Dismiss modal if it appears (cookie/ad popup)
	try {
		const modal = page.locator('button.modal__btn[data-micromodal-close]');
		await modal.waitFor({ timeout: 5000 });
		await modal.click();
	} catch {
		console.log("[scrape] No modal to dismiss");
	}

	// Wait for results to load
	await page.waitForTimeout(5000);

	// Click the "stories" tab
	try {
		await page.locator(
			'ul.tabs-component li.tabs-component__item:has(button:has-text("stories")) button.tabs-component__button',
		).click();
		await page.waitForTimeout(2000);
	} catch {
		console.log("[scrape] No stories tab found, checking page as-is");
	}

	return await extractImages(page);
}

async function extractImages(page: Page): Promise<ScrapedImage[]> {
	const images: ScrapedImage[] = [];

	// Collect URLs from multiple sources:
	// 1. Download links (igram pattern)
	// 2. img tags with Instagram CDN URLs
	// 3. Any link with Instagram CDN URL
	const imageUrls = await page.evaluate(() => {
		const urls: string[] = [];
		const seen = new Set<string>();

		function addUrl(url: string) {
			if (url && url.startsWith("http") && !seen.has(url) && !isVideo(url)) {
				seen.add(url);
				urls.push(url);
			}
		}

		function isVideo(url: string): boolean {
			const l = url.toLowerCase();
			return l.includes(".mp4") || l.includes("video") || l.includes("/v/");
		}

		function isStoryMedia(url: string): boolean {
			return (
				url.includes("cdninstagram") ||
				url.includes("scontent") ||
				url.includes("media.storiesig") ||
				url.includes("igram")
			);
		}

		// Download buttons (igram specific)
		for (const a of document.querySelectorAll(
			"a.button.button--filled.button__download, a[download]",
		)) {
			const href = a.getAttribute("href") || "";
			if (href && !isVideo(href)) addUrl(href);
		}

		// Images with CDN URLs
		for (const img of document.querySelectorAll("img")) {
			const src = img.src || img.dataset.src || "";
			if (isStoryMedia(src)) addUrl(src);
		}

		// Links with CDN URLs
		for (const a of document.querySelectorAll("a[href]")) {
			const href = a.getAttribute("href") || "";
			if (isStoryMedia(href) && !isVideo(href)) addUrl(href);
		}

		return urls;
	});

	console.log(`[scrape] Found ${imageUrls.length} candidate URLs`);

	for (const url of imageUrls) {
		try {
			const response = await page.request.get(url);
			const contentType = response.headers()["content-type"] || "";

			if (contentType.startsWith("video/")) continue;

			if (contentType.startsWith("image/") || !contentType) {
				const buffer = Buffer.from(await response.body());
				// Skip tiny images (thumbnails/icons)
				if (buffer.length < 10000) continue;

				const hash = createHash("sha256").update(buffer).digest("hex");
				images.push({ buffer, hash });
			}
		} catch (err) {
			console.error(
				`[scrape] Failed to download: ${err instanceof Error ? err.message : err}`,
			);
		}
	}

	return images;
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
