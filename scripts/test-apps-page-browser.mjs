import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import puppeteer from "puppeteer";

const appsSource = readFileSync(new URL("../src/components/AppsPage/AppsPage.jsx", import.meta.url), "utf8");
const thumbnailPaths = new Set(
  [...appsSource.matchAll(/"\/(apps-tiles\/thumbs\/[^"]+)"/g)].map((match) => match[1]),
);
assert.ok(thumbnailPaths.size >= 15, "Apps should reference the full thumbnail set");
for (const asset of thumbnailPaths) {
  const file = new URL(`../public/${asset}`, import.meta.url);
  assert.ok(existsSync(file), `Missing Apps thumbnail: ${asset}`);
  assert.ok(statSync(file).size < 80_000, `Apps thumbnail is too large: ${asset}`);
}

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:4173/apps", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".apps-grid", { timeout: 15000 });
  assert.equal(await page.$eval("h1", (node) => node.textContent), "Apps");
  const sections = await page.$$eval(".apps-section", (nodes) => nodes.map((node) => ({
    title: node.querySelector("h2")?.textContent,
    tiles: [...node.querySelectorAll(".apps-tile strong")].map((tile) => tile.textContent),
  })));
  assert.ok(sections.every((section) => section.title && section.tiles.length > 0));
  assert.ok(sections.find((section) => section.title === "Downloads")?.tiles.includes("ScreenSplit Browser"));
  assert.ok(sections.find((section) => section.title === "Explore")?.tiles.includes("Deals"));
  assert.ok(sections.find((section) => section.title === "Account")?.tiles.includes("Log in"));
  assert.equal((await page.$$(".apps-page__quick, .apps-page__filter, .apps-page__search")).length, 0);
  assert.ok((await page.$$(".apps-tile")).length > 0);
  const cards = await page.$$eval(".apps-tile", (nodes) => nodes.map((node) => ({
    title: node.querySelector("strong")?.textContent,
    hasIcon: Boolean(node.querySelector(".apps-tile__icon")),
    hasArt: Boolean(node.querySelector(".apps-tile__art") || node.querySelector(".apps-tile__icon img")),
  })));
  assert.ok(cards.every((card) => card.title && card.hasIcon && card.hasArt));
  assert.ok(cards.some((card) => card.title === "ScreenSplit Browser"));
  assert.ok(cards.some((card) => card.title === "SC Web Transitions"));
  await page.waitForFunction(() => [...document.querySelectorAll(".apps-tile__art")]
    .slice(0, 2).every((image) => image.complete && image.naturalWidth > 0));
  assert.ok(await page.$$eval(".apps-tile__art", (images) =>
    images.every((image) => image.getAttribute("loading") === "lazy" &&
      image.getAttribute("src").startsWith("/apps-tiles/thumbs/"))));
  assert.ok(await page.$$eval(".apps-tile__icon img", (images) =>
    images.every((image) => image.getAttribute("src").startsWith("/apps-tiles/thumbs/"))));
  const loadedResources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name));
  assert.ok(!loadedResources.some((url) => /\/assets\/LandingPage-/.test(url)),
    "Apps should not fetch the marketing landing page chunk");
  assert.ok(!loadedResources.some((url) => /\/iconLOGOs\/SC_(?:BROWSER|WEB_TRANSITIONS)\.png/.test(url)),
    "Apps should fetch thumbnail logos instead of full-size app logos");
  if (process.env.SCREENSHOT_PATH) {
    await page.setViewport({ width: 1440, height: 900 });
    await page.screenshot({ path: process.env.SCREENSHOT_PATH, fullPage: true });
  }
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewport({ width, height: 844 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `Horizontal overflow at ${width}px: ${overflow}px`);
    if (width === 1440 || width === 390) {
      const columns = await page.$$eval(".apps-grid", (nodes) =>
        nodes.map((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length));
      assert.ok(columns.every((count) => count === (width === 1440 ? 5 : 2)), `Unexpected column count at ${width}px`);
    }
    if (width === 390 && process.env.SCREENSHOT_MOBILE_PATH) {
      await page.screenshot({ path: process.env.SCREENSHOT_MOBILE_PATH, fullPage: true });
    }
  }
  console.log("Apps page browser checks passed: thumbnail assets, category placement, compact grids and no overflow.");
} finally {
  await browser.close();
}
