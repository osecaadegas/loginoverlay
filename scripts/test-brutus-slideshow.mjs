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
import {
  mergeUserRole,
  reconcileEditingUser,
  removeUserRoleFromState,
} from "../src/components/AdminPanel/userRoleState.js";
import {
  DEFAULT_VIDEO_END_HOLD_MS,
  resolveVideoEndHoldMs,
  shouldAdvanceCompletedVideo,
  shouldLoopVideo,
  shouldUseSlideTimer,
} from "../src/components/OverlayCenter/widgets/slideshow-frame/slideshowPlayback.js";

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

const adminUser = {
  id: "user-1",
  roles: [{ id: "role-admin", role: "admin", is_active: true }],
};
const brutusRole = { id: "role-brutus", role: "brutus", is_active: true };
const withBrutus = mergeUserRole(adminUser, brutusRole);
assert.deepEqual(withBrutus.roles, [adminUser.roles[0], brutusRole]);
assert.equal(
  mergeUserRole(withBrutus, { ...brutusRole, access_expires_at: "2030-01-01" }).roles.length,
  2,
  "saving an existing role must replace it instead of creating a duplicate",
);
assert.deepEqual(removeUserRoleFromState(withBrutus, "brutus").roles, [adminUser.roles[0]]);
assert.deepEqual(
  reconcileEditingUser(
    { ...adminUser, newRole: "brutus", newRoleExpiryDays: "30" },
    [withBrutus],
  ),
  {
    ...withBrutus,
    newRole: "brutus",
    newRoleExpiryDays: "30",
    newRoleModeratorPermissions: {},
  },
  "refreshing the user table must also refresh roles in the open side panel",
);

assert.equal(
  shouldUseSlideTimer({
    autoplay: true,
    connectFourActive: false,
    itemCount: 23,
    activeType: "video",
  }),
  false,
  "video banners must not be cut off by the image-duration timer",
);
assert.equal(
  shouldUseSlideTimer({
    autoplay: true,
    connectFourActive: false,
    itemCount: 23,
    activeType: "image",
  }),
  true,
);
assert.equal(
  shouldAdvanceCompletedVideo({
    autoplay: true,
    connectFourActive: false,
    itemCount: 23,
  }),
  true,
);
assert.equal(shouldLoopVideo({ itemCount: 23, videoLoop: true }), false);
assert.equal(shouldLoopVideo({ itemCount: 1, videoLoop: true }), true);
assert.equal(resolveVideoEndHoldMs(), DEFAULT_VIDEO_END_HOLD_MS);
assert.equal(resolveVideoEndHoldMs(5000), 5000);
assert.equal(resolveVideoEndHoldMs(-50), 0);
assert.equal(resolveVideoEndHoldMs(45_000), 30_000);

const slideshowSource = readFileSync(
  new URL("../src/components/OverlayCenter/widgets/slideshow-frame/SlideshowFrameWidget.jsx", import.meta.url),
  "utf8",
);
assert.match(slideshowSource, /window\.setTimeout\(advanceSlide, videoEndHoldMs\)/);
assert.match(slideshowSource, /className="better-slideshow-frame__slide is-leaving"/);

console.log(`Brutus slideshow library validated (${BRUTUS_VIDEO_LIBRARY.length} videos).`);
