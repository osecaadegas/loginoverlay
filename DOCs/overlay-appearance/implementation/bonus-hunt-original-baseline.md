# Bonus Hunt Original Baseline Regression Fix

Date: 2026-07-16

## Problem

The Appearance Engine V2 pilot originally risked making `bonus_hunt` use the same generated material tokens as simpler widgets. That part is now guarded by the protected `Original` material, which emits no generic patch. The remaining verified regression was inside `BonusHuntWidgetV12.jsx`: even with no V2 override, the component used inline blue/purple fallback values for its header, list, summary and root background, so the real widget baseline still looked generic.

## Regression Checklist

| Area | Original ownership | Regressed source | Fix |
| --- | --- | --- | --- |
| Root frame | `BonusHuntWidgetV12.jsx` + `OverlayRenderer.css` | Inline `#1e3a8a`-derived root gradient and earlier generic V2 container/sub-element tokens | V12 now uses a dark original baseline; `Original` material emits no patch and strips inherited generic visual keys |
| Header | Widget CSS and V12 original fallback | Inline blue `headerColor` fallback and earlier generated `headerContainer` background, border, radius and padding | V12 fallback is dark/teal; material presets only recolor existing variables; structural padding is unsupported |
| Stats cards | Widget CSS | Generated `statCell` card surfaces | Removed generated structural stat-card patch for Bonus Hunt presets |
| Carousel | Widget CSS/keyframes | Generic gap/padding and image radius/height mappings | Carousel dimensions, gaps and image height are unsupported for presets |
| Slot rows | Widget CSS/keyframes | Generated `slotRow` background, radius, border and padding | Presets may change safe text colours only; row dimensions stay widget-owned |
| Footer | Widget CSS | Generated `footerContainer` background, radius and padding | Presets recolor total value while preserving footer structure |

## Current Rule

Bonus Hunt defaults are:

1. Original widget base CSS.
2. Original widget state CSS.
3. Original animation CSS.
4. Optional V2 material colour/accent/text overrides.
5. Optional supported Advanced overrides.

The protected `Original` preset is the canonical default. It clears scoped appearance overrides and lets the original production widget render.

## Implementation Points

- `widgetAppearanceRegistry.js` sets `bonus_hunt.defaultAppearance.material` to `original`.
- `materialGenerators.js` includes an `original` material that emits no design-token override surface.
- `appearanceResolver.js` treats `original` as a no-op patch and strips inherited generic visual keys for Bonus Hunt when those keys were not present in the widget config.
- `BonusHuntWidgetV12.jsx` owns the Original baseline through `V12_ORIGINAL_STYLE`, replacing the old blue/purple inline fallbacks and composing root backgrounds safely for hex, rgba and gradients.
- `BonusHuntConfig.jsx` shows V12-compatible dark/teal fallback swatches instead of advertising the old blue/purple defaults in the legacy widget style panel.
- Bonus Hunt material patches avoid structural properties such as carousel dimensions, row padding, slot image height and container gaps.
- `AppearanceCenter.jsx` restores Bonus Hunt to Original by removing the selected widget appearance root.

## Tests

`scripts/test-appearance-v2.mjs` verifies:

- No appearance record leaves Bonus Hunt untouched by V2.
- Explicit Original emits no generic CSS variables.
- Explicit Original does not inject header surfaces, row surfaces, card padding or card gaps.
- V12 Original no longer falls back to generic blue header/list colours.
- Material presets preserve structural spacing and image dimensions.
