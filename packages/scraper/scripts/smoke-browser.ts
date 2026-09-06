// Runs during `docker build`: launches the Chromium that the installed
// playwright package expects. Fails the build when the npm package and the
// mcr.microsoft.com/playwright base image don't match (see #174).
import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
console.log(`Chromium ${browser.version()} launched`);
await browser.close();
