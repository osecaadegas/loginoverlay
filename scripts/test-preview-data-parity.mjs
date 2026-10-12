import assert from "node:assert/strict";
import {
  applyPreviewWidgetSamples,
} from "../src/components/OverlayCenter/appearance/previewWidgetSamples.js";

const visualConfig = {
  fontFamily: "Georgia, serif",
  borderColor: "#123456",
  borderRadius: 19,
  colourTheme: "rose",
  theme: "rose",
  layout: "compact",
  showRequests: true,
  showSlotRequests: true,
  showCounter: false,
  showNowPlaying: false,
  subElements: {
    container: {
      fontFamily: "Verdana, sans-serif",
      borderColor: "#654321",
      borderRadius: 23,
    },
  },
  themeEffects: {
    orbital: { hudGlow: 37 },
  },
};

const widgetTypes = [
  "bets",
  "navbar",
  "giveaway",
  "chat",
  "bonus_hunt",
  "tournament",
  "slot_requests",
];
const input = widgetTypes.map((widget_type, index) => ({
  id: `preview-${index}`,
  widget_type,
  width: 640,
  height: 360,
  config: structuredClone(visualConfig),
}));
const original = structuredClone(input);
const sampled = applyPreviewWidgetSamples(input, {
  now: Date.UTC(2026, 9, 12),
  expandFrames: false,
});

assert.deepEqual(input, original, "Preview sampling does not mutate saved widget config");
assert.equal(sampled.length, widgetTypes.length);
for (const widget of sampled) {
  for (const key of [
    "fontFamily",
    "borderColor",
    "borderRadius",
    "colourTheme",
    "theme",
    "layout",
    "showRequests",
    "showSlotRequests",
    "showCounter",
    "showNowPlaying",
    "subElements",
    "themeEffects",
  ]) {
    assert.deepEqual(
      widget.config[key],
      visualConfig[key],
      `${widget.widget_type}: preview content preserves ${key}`,
    );
  }
  assert.doesNotMatch(
    JSON.stringify(widget.config),
    /brutuspolus|www\.brutuspolus|osecaadegas95/i,
    `${widget.widget_type}: preview contains no streamer-specific fixture`,
  );
}

assert.equal(
  sampled.find((widget) => widget.widget_type === "tournament").config.layout,
  "compact",
  "Tournament preview no longer forces its layout",
);
assert.equal(
  sampled.find((widget) => widget.widget_type === "bonus_hunt").config.showRequests,
  true,
  "Bonus Hunt preview keeps configured request visibility",
);

console.log(
  `Preview data parity passed for ${sampled.length} sampled widget types.`,
);
