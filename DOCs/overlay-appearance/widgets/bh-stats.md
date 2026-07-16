# BH Stats

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `bh_stats` |
| Name | BH Stats |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:572` |
| Main component | `src/components/OverlayCenter/widgets/BHStatsWidget.jsx:12` |
| Config panel | `src/components/OverlayCenter/widgets/BHStatsConfig.jsx` |
| Styles | `default`, `metal`, `glass` |
| Data source | Bonus hunt widgets/history via config/allWidgets |
| Persistence | `overlay_widgets.config` |

## Rendering structure

- `BHStatsWidget`
  - root panel
  - title
  - stat cards
  - progress bar
  - best/worst values

## Visual layers

- Root surface.
- Stat card surfaces.
- Labels.
- Values.
- Progress background/fill.
- Positive and negative values.

## Styling method

- Inline styles.
- `subValue` support for many values.
- Several gradients for metal/glass styles.
- No broad element markers.

## Hardcoded values and risks

- Stat grid/card spacing is compact and should be range-limited.
- Progress bar radius and height are safe if clamped.

## Animation model

- Minimal internal animation.
- Renderer shell animations apply.

## Layout model

- Card/stat panel.
- Safer than most widgets because it is data-display-only with simple structure.

## State variants

- No hunt.
- Active hunt.
- Positive/negative stats.

## Customization safety

- Safe: surface, card background, text, muted, progress, best/worst colors, border, radius.
- Constrained: font sizes, card padding, progress height.
- Dangerous: none major beyond very small widget sizes.
- Not customizable: stat math.
