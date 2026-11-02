import assert from "node:assert/strict";
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.goto(process.env.TEST_BASE_URL || "http://127.0.0.1:4173/apps", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".apps-page__directory", { timeout: 15000 });
  assert.equal(await page.$eval("h1", (node) => node.textContent), "What would you like to do?");
  assert.ok((await page.$$(".apps-tile")).length > 0);
  await page.locator('input[type="search"]').fill("ScreenSplit");
  assert.equal((await page.$$(".apps-tile")).length, 1);
  assert.match(await page.$eval(".apps-tile", (node) => node.textContent), /ScreenSplit Browser/);
  await page.locator('input[type="search"]').fill("not-a-real-tool");
  assert.equal((await page.$$(".apps-page__empty")).length, 1);
  await page.locator(".apps-page__empty button").click();
  assert.ok((await page.$$(".apps-tile")).length > 1);
  await page.evaluate(() => [...document.querySelectorAll(".apps-page__filter")].find((node) => node.textContent === "Desktop apps").click());
  assert.equal((await page.$$(".apps-section")).length, 1);
  assert.match(await page.$eval(".apps-section h3", (node) => node.textContent), /Desktop apps/);
  await page.evaluate(() => [...document.querySelectorAll(".apps-page__filter")].find((node) => node.textContent === "All tools").click());
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewport({ width, height: 844 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `Horizontal overflow at ${width}px: ${overflow}px`);
  }
  console.log("Apps page browser checks passed: search, categories, empty state, reset and responsive widths.");
} finally {
  await browser.close();
}
