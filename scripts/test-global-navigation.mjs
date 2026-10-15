import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const appSource = readSource("../src/App.jsx");
const navigationSource = readSource(
  "../src/components/Navigation/TopNavigation.jsx",
);
const landingSource = readSource(
  "../src/components/LandingPage/LandingPage.jsx",
);
const toolLandingSource = readSource(
  "../src/components/LandingPage/ToolLandingPage.jsx",
);
const overlayCenterSource = readSource(
  "../src/components/OverlayCenter/OverlayControlCenter.jsx",
);

assert.match(
  appSource,
  /const showTopNavigation\s*=\s*!isWidgetRoute\s*&&\s*!isOBSOverlay\s*&&\s*!isBetterOBSOverlay\s*&&\s*!isSystemRoute\s*&&\s*!isMarketingHome;/,
  "Shared navigation stays on app pages; the homepage owns its marketing navigation and broadcast routes remain chrome-free",
);
assert.ok(
  navigationSource.includes('to="/"') &&
    navigationSource.includes("<AudienceToggle") &&
    navigationSource.includes('to="/apps"') &&
    navigationSource.includes('label: "Gamblers"') &&
    navigationSource.includes('label: "Streamers"'),
  "Shared navigation owns the home logo, Gambler/Streamer toggle, and Apps link",
);
assert.ok(
  !landingSource.includes("StreamerCenterLogo.png") &&
    !toolLandingSource.includes("StreamerCenterLogo.png") &&
    !overlayCenterSource.includes("StreamerCenterLogo.png") &&
    !landingSource.includes("<AudienceToggle") &&
    !toolLandingSource.includes("<AudienceToggle") &&
    !overlayCenterSource.includes("oc2-audience-switch") &&
    !overlayCenterSource.includes('to="/apps" className="oc2-btn"'),
  "Page-local headers do not duplicate the shared navigation controls",
);

const headerSource = readSource('../src/components/LandingPage/LandingHeader.jsx');
assert.ok(landingSource.includes('<LandingHeader') && headerSource.includes('StreamerCenterLogo.png'), 'Homepage owns one branded marketing header');
assert.match(appSource, /const isMarketingHome = location.pathname === ["']\/["'];/);
console.log("global navigation tests passed");
