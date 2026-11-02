import assert from "node:assert/strict";
import puppeteer from "puppeteer";

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
  console.log("Apps page browser checks passed: category placement, compact grids and no overflow.");
} finally {
  await browser.close();
}
