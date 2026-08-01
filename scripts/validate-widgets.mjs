import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const packagesSource = readFileSync(
  resolve(root, "src/components/OverlayCenter/editor/BetterWidgetPackages.jsx"),
  "utf8",
);
const registrySource = readFileSync(
  resolve(root, "src/components/OverlayCenter/editor/betterWidgetRegistry.jsx"),
  "utf8",
);
const builtinSource = readFileSync(
  resolve(root, "src/components/OverlayCenter/widgets/builtinWidgets.js"),
  "utf8",
);

const expectedTypes = [
  "bonus_hunt",
  "giveaway",
  "navbar",
  "chat",
  "rtp_stats",
  "background",
  "slideshow_frame",
  "bets",
  "tournament",
  "raid_shoutout",
];

const errors = [];

for (const type of expectedTypes) {
  const quoted = `"${type}"`;
  if (!packagesSource.includes(`type: ${quoted}`)) {
    errors.push(`BetterWidgetPackages is missing ${type}`);
  }
  if (!registrySource.includes(`${type}:`)) {
    errors.push(`betterWidgetRegistry is missing ${type}`);
  }
  if (!builtinSource.includes(`type: ${quoted}`)) {
    errors.push(`builtinWidgets is missing ${type}`);
  }
}

const removedTypes = [
  "current_slot",
  "image_slideshow",
  "spotify_now_playing",
  "slot_requests",
  "bh_stats",
  "bonus_buys",
  "container",
  "coin_flip",
  "point_wheel",
  "predictions",
  "single_slot",
  "random_slot",
  "salty_words",
  "wheel_of_names",
  "ai_chat_bot",
];

for (const type of removedTypes) {
  if (
    builtinSource.includes(`type: "${type}"`) ||
    builtinSource.includes(`type: '${type}'`)
  ) {
    errors.push(`Removed widget type is still registered: ${type}`);
  }
}

if (errors.length) {
  console.error("Better widget validation failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Better widget validation passed");
