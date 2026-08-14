import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const componentSource = readFileSync(
  new URL("../src/components/LandingPage/LandingPage.jsx", import.meta.url),
  "utf8",
);
const styleSource = readFileSync(
  new URL("../src/components/LandingPage/LandingPage.css", import.meta.url),
  "utf8",
);

assert.match(componentSource, /Math\.min\(3, HOME_WIDGETS\.length\)/);
assert.match(componentSource, /visibleWidgets\.map\(\(widget\) =>/);
assert.doesNotMatch(componentSource, /HOME_WIDGETS\.map\(\(widget\) =>/);
assert.match(componentSource, /moveWidgetCarousel\(-1\)/);
assert.match(componentSource, /moveWidgetCarousel\(1\)/);
assert.match(componentSource, /current \+ direction \+ HOME_WIDGETS\.length/);
assert.match(componentSource, /<HomeWidgetMedia widget=\{widget\} carousel \/>/);
assert.doesNotMatch(componentSource, /setPinnedWidget/);
assert.match(styleSource, /\.lp-home-widget-carousel\s*\{/);
assert.match(styleSource, /grid-template-columns: 48px minmax\(0, 1fr\) 48px/);
assert.match(styleSource, /\.lp-home-widget-media--carousel/);
assert.match(styleSource, /nth-child\(n \+ 2\)/);

console.log("Landing widget carousel checks passed.");
