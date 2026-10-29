import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

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
assert.ok(source.includes('logo: "/iconLOGOs/SC_BROWSER.png"'), "ScreenSplit Browser tile must use its dedicated app logo");
assert.ok(source.includes('logo: "/iconLOGOs/SC_WEB_TRANSITIONS.png"'), "SC Web Transitions tile must use its dedicated app logo");
await access(new URL("../public/iconLOGOs/SC_BROWSER.png", import.meta.url));
await access(new URL("../public/iconLOGOs/SC_WEB_TRANSITIONS.png", import.meta.url));

console.log(`App download links are pinned consistently to v${version} and both app-specific logos are present.`);
