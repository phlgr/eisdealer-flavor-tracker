import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Browser, chromium, type Page } from "playwright";
import type { ScrapedImage } from "./types.js";

const DEBUG_DIR = join(import.meta.dir, "../../../debug");
const MAX_RETRIES = 2;

const USER_AGENTS = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
];

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
				"--disable-dev-shm-usage",
				"--disable-gpu",
			],
		});

		const userAgent =
			USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
		const context = await browser.newContext({
			userAgent,
			viewport: { width: 1280, height: 720 },
			locale: "de-DE",
		});

		// Hide webdriver/automation signals
		await context.addInitScript(() => {
			Object.defineProperty(navigator, "webdriver", { get: () => false });
			// @ts-expect-error
			delete navigator.__proto__.webdriver;

			// Fake plugins array
			Object.defineProperty(navigator, "plugins", {
				get: () => [1, 2, 3, 4, 5],
			});

			// Fake languages
			Object.defineProperty(navigator, "languages", {
				get: () => ["de-DE", "de", "en-US", "en"],
			});

			// Override permissions query for notifications
			const originalQuery = window.Permissions.prototype.query;
			window.Permissions.prototype.query = (
				parameters: PermissionDescriptor,
			) =>
				parameters.name === "notifications"
					? Promise.resolve({
							state: Notification.permission,
						} as PermissionStatus)
					: originalQuery(parameters);

			// Fake chrome runtime
			// @ts-expect-error
			window.chrome = { runtime: {} };
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
				try {
					await page?.close();
				} catch {}
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
		const consent = page.locator(
			'.fc-cta-consent, .fc-button-consent, button[aria-label="Consent"]',
		);
		await consent.first().waitFor({ timeout: 5000 });
		await consent.first().click();
		await page.waitForTimeout(1000);
		console.log("[scrape] Dismissed cookie consent");
	} catch {
		console.log("[scrape] No cookie consent dialog");
	}

	// Fill in the username (type slowly to look human)
	const input = page.locator("#search-form-input");
	await input.waitFor({ timeout: 15000 });
	await input.click();
	await page.waitForTimeout(300 + Math.random() * 500);
	await input.pressSequentially(username, { delay: 50 + Math.random() * 80 });
	await page.waitForTimeout(500 + Math.random() * 500);

	// Submit
	await page.locator('button.search-form__button[type="submit"]').click();
	await page.waitForTimeout(1000 + Math.random() * 1000);

	// Dismiss modal if it appears (cookie/ad popup)
	try {
		const modal = page.locator("button.modal__btn[data-micromodal-close]");
		await modal.waitFor({ timeout: 5000 });
		await modal.click();
	} catch {
		console.log("[scrape] No modal to dismiss");
	}

	// Wait for results to load
	await page.waitForTimeout(5000);

	// Click the "stories" tab — abort if not found to avoid scraping posts
	const storiesTab = page.locator(
		'ul.tabs-component li.tabs-component__item:has(button:has-text("stories")) button.tabs-component__button',
	);
	await storiesTab.waitFor({ timeout: 10000 });
	await storiesTab.click();
	await page.waitForTimeout(2000);

	return await extractImages(page);
}

async function extractImages(page: Page): Promise<ScrapedImage[]> {
	const images: ScrapedImage[] = [];

	// Prioritize download buttons (igram-specific), fall back to CDN image URLs
	const imageUrls = await page.evaluate(() => {
		const urls: string[] = [];
		const seen = new Set<string>();

		function addUrl(url: string) {
			if (url?.startsWith("http") && !seen.has(url) && !isVideo(url)) {
				seen.add(url);
				urls.push(url);
			}
		}

		function isVideo(url: string): boolean {
			const l = url.toLowerCase();
			return l.includes(".mp4") || l.includes("video") || l.includes("/v/");
		}

		// 1. Download buttons — most reliable on igram
		for (const a of document.querySelectorAll(
			"a.button.button--filled.button__download, a[download]",
		)) {
			const href = a.getAttribute("href") || "";
			addUrl(href);
		}

		// 2. Images/links pointing to Instagram CDN
		for (const img of document.querySelectorAll("img")) {
			const src = img.src || img.dataset.src || "";
			if (src.includes("cdninstagram") || src.includes("scontent")) {
				addUrl(src);
			}
		}

		for (const a of document.querySelectorAll("a[href]")) {
			const href = a.getAttribute("href") || "";
			if (
				(href.includes("cdninstagram") || href.includes("scontent")) &&
				!isVideo(href)
			) {
				addUrl(href);
			}
		}

		return urls;
	});

	console.log(`[scrape] Found ${imageUrls.length} candidate URLs`);

	for (const url of imageUrls) {
		try {
			const response = await page.request.get(url, {
				maxRedirects: 0,
			});
			const contentType = response.headers()["content-type"] || "";

			if (contentType.startsWith("video/")) {
				console.log(`[scrape] Skipped video: ${url.substring(0, 80)}...`);
				continue;
			}

			if (contentType.startsWith("image/") || !contentType) {
				const buffer = Buffer.from(await response.body());
				if (buffer.length < 5000) {
					console.log(
						`[scrape] Skipped tiny image (${buffer.length} bytes): ${url.substring(0, 80)}...`,
					);
					continue;
				}

				const hash = createHash("sha256").update(buffer).digest("hex");
				images.push({ buffer, hash });
			} else {
				console.log(
					`[scrape] Skipped non-image (${contentType}): ${url.substring(0, 80)}...`,
				);
			}
		} catch {
			// Skip URLs that fail (redirects, broken links, etc.)
		}
	}

	return images;
}

async function debugPage(page: Page, name: string): Promise<void> {
	try {
		mkdirSync(DEBUG_DIR, { recursive: true });
		const screenshot = await page.screenshot({ fullPage: true });
		writeFileSync(join(DEBUG_DIR, `${name}.png`), screenshot);
		const html = await page.content();
		writeFileSync(join(DEBUG_DIR, `${name}.html`), html);
		console.log(`[scrape] Debug screenshot saved as ${name}.png`);
	} catch (err) {
		console.error(`[scrape] Failed to save debug info: ${err}`);
	}
}
