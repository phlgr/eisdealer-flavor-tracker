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
					`[scrape] Trying storysaver.net for @${username} (attempt ${attempt + 1})`,
				);
				page = await context.newPage();
				const images = await scrapeStorySaver(page, username);

				if (images.length > 0) {
					console.log(`[scrape] Found ${images.length} images`);
					await page.close();
					return images;
				}

				console.log("[scrape] No images found");
				await debugPage(page, `storysaver-no-results-${attempt + 1}`);
				await page.close();
				break;
			} catch (err) {
				console.error(
					`[scrape] Attempt ${attempt + 1} failed:`,
					err instanceof Error ? err.message : err,
				);
				if (page) await debugPage(page, `storysaver-error-${attempt + 1}`);
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
 * Uses storysaver.net to fetch Instagram stories:
 * 1. Fill username in the form
 * 2. Submit — triggers AJAX to /storyProcesstcf.php
 * 3. Response injects Cloudflare Turnstile challenge
 * 4. Turnstile auto-solves and auto-submits with token
 * 5. Story results appear in #sonucc
 * 6. Extract image URLs from results
 */
async function scrapeStorySaver(
	page: Page,
	username: string,
): Promise<ScrapedImage[]> {
	await page.goto("https://www.storysaver.net/en", {
		waitUntil: "domcontentloaded",
	});

	// Wait for page to settle
	await page.waitForTimeout(2000 + Math.random() * 1000);

	// Fill in the username
	const input = page.locator('input[name="text_username"]');
	await input.waitFor({ timeout: 15000 });
	await input.click();
	await page.waitForTimeout(300 + Math.random() * 500);
	await input.pressSequentially(username, { delay: 50 + Math.random() * 80 });
	await page.waitForTimeout(500 + Math.random() * 500);

	// Submit the form
	console.log("[scrape] Submitting username...");
	await page.locator("#StoryButton").click();

	// Wait for the Turnstile challenge HTML to be injected (first AJAX response)
	console.log("[scrape] Waiting for Turnstile challenge to appear...");
	try {
		await page.waitForSelector("#StoryDataMax", { timeout: 15000 });
	} catch {
		console.log("[scrape] Turnstile form never appeared — first AJAX may have failed");
		throw new Error("StoryDataMax form not found after submit");
	}

	// Give Turnstile a chance to auto-solve (works in real browsers)
	console.log("[scrape] Giving Turnstile a chance to auto-solve...");
	const solved = await page
		.waitForFunction(
			() => {
				const el = document.querySelector("#user_data_id") as HTMLInputElement;
				return el && el.value.length > 0;
			},
			{ timeout: 8000 },
		)
		.then(() => true)
		.catch(() => false);

	if (solved) {
		console.log("[scrape] Turnstile solved automatically");
	} else {
		// Turnstile didn't solve — trigger the cf_migrate fallback which
		// computes a UA hash and submits without a Turnstile token.
		console.log("[scrape] Turnstile didn't solve, triggering cf_migrate fallback...");
		await page.evaluate(() => {
			// @ts-expect-error — global function injected by storysaver.net
			if (typeof setCfErrorLog === "function") {
				// @ts-expect-error
				setCfErrorLog();
			}
		});
	}

	// Wait for story results to load after submission
	console.log("[scrape] Waiting for story results...");
	try {
		await page.waitForFunction(
			() => {
				const containers = document.querySelectorAll("#sonucc");
				// The second #sonucc (inside the injected HTML) gets the results
				for (const container of containers) {
					const links = container.querySelectorAll(
						'a[href*="cdninstagram"], a[href*="scontent"], a[download], img[src*="cdninstagram"], img[src*="scontent"]',
					);
					if (links.length > 0) return true;
				}
				return false;
			},
			{ timeout: 20000 },
		);
	} catch {
		console.log("[scrape] Timed out waiting for results");
		await debugPage(page, "storysaver-no-results-after-submit");
	}

	console.log("[scrape] Extracting images from results...");
	return await extractImages(page);
}

async function extractImages(page: Page): Promise<ScrapedImage[]> {
	const images: ScrapedImage[] = [];

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

		const container = document.querySelector("#sonucc") || document;

		// Download buttons/links
		for (const a of container.querySelectorAll("a[download], a[href*='cdninstagram'], a[href*='scontent']")) {
			const href = a.getAttribute("href") || "";
			addUrl(href);
		}

		// Images pointing to Instagram CDN
		for (const img of container.querySelectorAll("img")) {
			const src = img.src || img.dataset.src || "";
			if (src.includes("cdninstagram") || src.includes("scontent")) {
				addUrl(src);
			}
		}

		// Any other links to Instagram CDN
		for (const a of container.querySelectorAll("a[href]")) {
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
