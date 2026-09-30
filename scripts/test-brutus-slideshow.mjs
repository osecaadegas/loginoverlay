import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  BRUTUS_SLIDESHOW_ROLE,
  BRUTUS_VIDEO_LIBRARY,
  addAllBrutusMedia,
  filterBrutusMediaText,
  hasMediaLine,
  isBrutusVideoUrl,
  toggleBrutusMediaLine,
} from "../src/components/OverlayCenter/widgets/slideshow-frame/brutusVideoLibrary.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const videoDirectory = fileURLToPath(new URL("../public/Banners Videos/", import.meta.url));

assert.equal(BRUTUS_SLIDESHOW_ROLE, "brutus");
assert.ok(existsSync(videoDirectory), "Banners Videos folder must exist");

function listVideos(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return listVideos(`${directory}/${entry.name}`, relativePath);
    return entry.name.toLowerCase().endsWith(".mp4") ? [relativePath] : [];
  });
}

const diskVideos = listVideos(videoDirectory)
  .sort((left, right) => left.localeCompare(right));
const libraryVideos = BRUTUS_VIDEO_LIBRARY.map((item) => item.fileName).sort((left, right) =>
  left.localeCompare(right),
);
assert.deepEqual(libraryVideos, diskVideos, "every bundled MP4 must be represented in the library");

for (const item of BRUTUS_VIDEO_LIBRARY) {
  assert.ok(item.url.startsWith("/Banners%20Videos/"));
  assert.ok(item.mediaLine.includes("|video|"));
  assert.ok(isBrutusVideoUrl(item.url));
  assert.ok(existsSync(`${videoDirectory}/${item.fileName}`));
}

const first = BRUTUS_VIDEO_LIBRARY[0];
const selected = toggleBrutusMediaLine("https://example.com/banner.jpg|image|Banner", first);
assert.ok(hasMediaLine(selected, first));
assert.equal(toggleBrutusMediaLine(selected, first), "https://example.com/banner.jpg|image|Banner");

const allSelected = addAllBrutusMedia("");
assert.equal(allSelected.split("\n").length, BRUTUS_VIDEO_LIBRARY.length);
assert.equal(addAllBrutusMedia(allSelected), allSelected, "Add all must not create duplicates");
assert.equal(filterBrutusMediaText(allSelected, false), "");
assert.equal(filterBrutusMediaText(allSelected, true), allSelected);
assert.ok(
  isBrutusVideoUrl("https://streamerscenter.com/Banners%20Videos/!bacana.mp4|video|Bacana"),
  "absolute protected URLs must be recognized",
);

const editorSource = readFileSync(`${root}/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`, "utf8");
const adminSource = readFileSync(`${root}/src/components/AdminPanel/AdminPanel.jsx`, "utf8");
assert.match(editorSource, /isBrutus\s*\?/);
assert.match(editorSource, /filterBrutusMediaText/);
assert.match(editorSource, /role\.role !== BRUTUS_SLIDESHOW_ROLE/);
assert.match(adminSource, /option value="brutus"/);

console.log(`Brutus slideshow library validated (${BRUTUS_VIDEO_LIBRARY.length} videos).`);
