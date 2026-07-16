# Bonus Buys

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `bonus_buys` |
| Name | Bonus Buys |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:608` |
| Main component | `src/components/OverlayCenter/widgets/BonusBuysWidget.jsx:33` |
| Config panel | `src/components/OverlayCenter/widgets/BonusBuysConfig.jsx` |
| Styles | `v1`, `v2_neon`, `v3_minimal` |
| Data source | `overlay_widgets.config` |
| Persistence | `overlay_widgets.config` |

## Rendering structure

- `BonusBuysWidget`
  - root panel
  - current slot image/name/provider
  - buy list/stat values
  - session totals

## Visual layers

- Root background.
- Slot image.
- Slot text.
- Stat labels/values.
- Buy rows.
- Positive/negative values.

## Styling method

- Inline styles.
- `subValue` used extensively.
- Registry basic appearance tokens.
- Minimal class usage.

## Hardcoded values and risks

- Slot image and row sizes are compact.
- Neon style may include glow that needs clamping.

## Animation model

- No major internal keyframe system found.
- Renderer shell animations apply.

## Layout model

- Card/list/stat panel.
- Similar to BH Stats but with slot imagery.

## State variants

- Empty session.
- Active session.
- Positive/negative result.

## Customization safety

- Safe: surface, text, muted, accent, border, radius.
- Constrained: image size, row height, font size.
- Dangerous: unrestricted width/height.
- Not customizable: buy/session calculations.
