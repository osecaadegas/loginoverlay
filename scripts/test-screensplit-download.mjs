import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/components/AppsPage/AppsPage.jsx", import.meta.url),
  "utf8",
);
const versionMatch = source.match(
  /const SCREEN_SPLIT_VERSION = ["'](\d+\.\d+\.\d+)["'];/,
);

assert.ok(versionMatch, "Apps page must declare the ScreenSplit Browser version");
const version = versionMatch[1];
const downloadUrlTemplate =
  'const SCREEN_SPLIT_DOWNLOAD_URL = `https://github.com/osecaadegas/loginoverlay/releases/download/screensplit-browser-v${SCREEN_SPLIT_VERSION}/StreamersCenterBrowserSetup-${SCREEN_SPLIT_VERSION}.exe`;';

assert.ok(
  source.includes(downloadUrlTemplate),
  `Apps page must download the installer matching v${version}`,
);
assert.ok(
  !source.includes(
    "https://github.com/osecaadegas/loginoverlay/releases/download/screensplit-browser-v0.1.11/StreamersCenterBrowserSetup-0.1.11.exe",
  ),
  "Apps page must not keep the stale v0.1.11 installer link",
);
assert.ok(
  source.includes(`Download the Windows installer (v\${SCREEN_SPLIT_VERSION})`),
  "Apps page must show the version delivered by the download link",
);

console.log(`ScreenSplit Browser download is pinned consistently to v${version}.`);
