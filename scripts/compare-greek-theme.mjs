import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import puppeteer from "puppeteer";

const referencePath = resolve(process.argv[2] || "design-references/greek-stoic-reference.png");
const renderedPath = resolve(process.argv[3] || ".codex-dev/greek-theme/greek-full-balanced.png");
const diffPath = resolve(process.argv[4] || ".codex-dev/greek-theme/greek-reference-diff.png");

assert(existsSync(referencePath), `Reference image not found: ${referencePath}`);
assert(existsSync(renderedPath), `Rendered image not found: ${renderedPath}`);

const mime = (path) => extname(path).toLowerCase() === ".webp" ? "image/webp" : "image/png";
const dataUrl = (path) => `data:${mime(path)};base64,${readFileSync(path).toString("base64")}`;

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async ({ referenceUrl, renderedUrl }) => {
    const load = (src) => new Promise((resolveImage, reject) => {
      const image = new Image();
      image.onload = () => resolveImage(image);
      image.onerror = reject;
      image.src = src;
    });
    const [reference, rendered] = await Promise.all([load(referenceUrl), load(renderedUrl)]);
    const width = 960;
    const height = 540;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const pixels = (image) => {
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      return context.getImageData(0, 0, width, height).data.slice();
    };
    const a = pixels(reference);
    const b = pixels(rendered);
    const diff = context.createImageData(width, height);
    let difference = 0;
    let edgeDifference = 0;
    let edgeSamples = 0;
    let warmReference = 0;
    let warmRendered = 0;
    const luminance = (source, index) => source[index] * 0.2126 + source[index + 1] * 0.7152 + source[index + 2] * 0.0722;
    for (let i = 0; i < a.length; i += 4) {
      const delta = (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
      difference += delta;
      diff.data[i] = Math.min(255, delta * 3);
      diff.data[i + 1] = Math.max(0, 112 - delta);
      diff.data[i + 2] = 32;
      diff.data[i + 3] = 255;
      if (a[i] > a[i + 2] * 1.12 && a[i + 1] > a[i + 2] * 0.82) warmReference += 1;
      if (b[i] > b[i + 2] * 1.12 && b[i + 1] > b[i + 2] * 0.82) warmRendered += 1;
      const pixel = i / 4;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x > 0 && y > 0 && x % 3 === 0 && y % 3 === 0) {
        const left = i - 4;
        const up = i - width * 4;
        const edgeA = Math.abs(luminance(a, i) - luminance(a, left)) + Math.abs(luminance(a, i) - luminance(a, up));
        const edgeB = Math.abs(luminance(b, i) - luminance(b, left)) + Math.abs(luminance(b, i) - luminance(b, up));
        edgeDifference += Math.abs(edgeA - edgeB) / 2;
        edgeSamples += 1;
      }
    }
    context.putImageData(diff, 0, 0);
    return {
      pixelSimilarity: 1 - difference / ((a.length / 4) * 255),
      edgeSimilarity: 1 - edgeDifference / (edgeSamples * 255),
      warmSurfaceCoverage: {
        reference: warmReference / (a.length / 4),
        rendered: warmRendered / (b.length / 4),
      },
      comparedAt: `${width}x${height}`,
      diff: canvas.toDataURL("image/png").split(",")[1],
    };
  }, { referenceUrl: dataUrl(referencePath), renderedUrl: dataUrl(renderedPath) });

  mkdirSync(dirname(diffPath), { recursive: true });
  writeFileSync(diffPath, Buffer.from(result.diff, "base64"));
  delete result.diff;
  console.log(JSON.stringify({ referencePath, renderedPath, diffPath, ...result }, null, 2));
} finally {
  await browser.close();
}
