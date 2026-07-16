# Bonus Hunt

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `bonus_hunt` |
| Name | Bonus Hunt |
| OBS route | `/overlay/:token`, `/overlay/:token?widget=<id>` |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:17` |
| Main component | `src/components/OverlayCenter/widgets/BonusHuntWidget.jsx:15` |
| Variant components | `BonusHuntWidgetV3.jsx`, `BonusHuntWidgetV8.jsx`, `BonusHuntWidgetV9.jsx`, `BonusHuntWidgetV11.jsx`, `BonusHuntWidgetV12.jsx` |
| Config panel | `src/components/OverlayCenter/widgets/BonusHuntConfig.jsx` |
| Main style file | `src/components/OverlayCenter/OverlayRenderer.css` |
| Data source | `overlay_widgets.config`, Bonus Hunt history/player data, optional `slot_requests` in V12 |
| Persistence | `overlay_widgets.config`; draft/published appearance through `overlay_state` |

## Rendering structure

`BonusHuntWidget` is a style router. It chooses internal renderers using `config.displayStyle`.

- `BonusHuntWidget`
  - style branch `v3`
    - `BonusHuntWidgetV3`
  - style branch `v11_fever`
    - `BonusHuntWidgetV11`
  - style branch `v12_classic_sr`
    - `BonusHuntWidgetV12`
      - header/top state
      - stats panel
      - slot cards/list rows
      - request integration
  - fallback/legacy branches
    - V8/V9/default layouts

## Visual layers

- Root tracker surface.
- Header/title area.
- Hunt stats.
- Stop loss/start/average values.
- Slot card or row surface.
- Slot image.
- Slot title/provider text.
- Bet/cost/payout/multiplier values.
- Super/extreme state badges.
- Opened/unopened states.
- Request queue integration in V12.
- Scroll/list/carousel containers.

## Styling method

- Global CSS classes in `OverlayRenderer.css`.
- Inline styles in variant components.
- Widget config values such as `displayStyle`, `currency`, `bonuses`, dimensions, and visual flags.
- `subValue` helpers in `BonusHuntWidget.jsx`, `BonusHuntWidgetV11.jsx`, and limited V12 paths.
- `data-widget-element` markers are extensive only in `BonusHuntWidgetV12.jsx`.
- CSS variables such as `--bht-*` in renderer CSS for progress and list behavior.

## Hardcoded values and risks

| Location | Value type | Affects | Safety |
| --- | --- | --- | --- |
| `OverlayRenderer.css:955-1172` | animation names, scroll timing, transforms | Stack/list/card motion | Dangerous unless animation distances are recalculated. |
| `OverlayRenderer.css:980-991` | drop-shadow colors for super/extreme | Special state badges/cards | Constrained; color can change with readable state mapping. |
| `BonusHuntWidgetV12.jsx:15` | extensive inline/layout values | V12 Classic + Requests | Constrained; use declared V12 element map. |
| `BonusHuntWidget.jsx:15` | style routing and legacy sub-values | All styles | Coupled; generic controls may hit only one style. |

## Animation model

- Renderer shell animations from `.or-anim-in/out-*`.
- Bonus Hunt internal animations include stack float/tilt, list scroll, progress shine, super/extreme highlight effects, and V12 transition effects.
- Duration and color can be constrained, but distances/card widths are layout-coupled.
- Preview does not fully reproduce OBS enter/exit behavior.

## Layout model

- Absolute-positioned slot in OBS.
- Internal layouts vary heavily by `displayStyle`.
- Some styles require visible overflow for 3D/card motion.
- V12 is the safest style for element-level customization because it exposes many `data-widget-element` markers.

## State variants

- Active/inactive hunt.
- Opened/unopened bonus.
- Super/extreme bonus.
- Winning/losing/neutral payout.
- Empty list.
- Request queue connected/empty.

## Customization safety

- Safe: accent color, text color, muted color, state colors, simple root/card surface color in V12.
- Constrained: font size, card radius, glow.
- Widget-owned structural values: card padding, image size/height, row height, root frame, internal gaps, carousel dimensions.
- Coupled: list/card width, carousel distances, overflow, progress animation timing.
- Dangerous: changing 3D transforms, scroll distances, absolute positions inside variants.
- Not customizable: hunt math, payout values, opening state, request logic.

## Production V2 Baseline

`bonus_hunt` is connected to Appearance Engine V2, but its default is the protected `Original` material. Original emits no generic visual overrides and lets the production Bonus Hunt CSS render as the baseline.

Reset, Restore recommended style, no appearance record, and cleared overrides should all return to Original. Material presets such as Matte, Metallic, Glass and Neon are additive: they recolor safe existing variables and text/state colours while preserving the carousel, row dimensions, footer/header spacing, root frame and animations.

Do not reintroduce generic generated sub-element patches for:

- `headerContainer` padding/background/radius.
- `statCell` card surfaces.
- `slotCarouselContainer` gap/padding.
- `slotRow` padding/background/radius.
- `slotImage` height or image size.
- `footerContainer` padding/background/radius.
