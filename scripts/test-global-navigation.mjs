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
  /const showTopNavigation\s*=\s*!isWidgetRoute\s*&&\s*!isOBSOverlay\s*&&\s*!isBetterOBSOverlay\s*&&\s*!isSystemRoute;/,
  "Shared navigation renders on every normal page while broadcast and OAuth callback routes stay chrome-free",
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

console.log("global navigation tests passed");
