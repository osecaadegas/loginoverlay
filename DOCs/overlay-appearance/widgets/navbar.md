# Navbar

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `navbar` |
| Name | Navbar |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:167` |
| Main component | `src/components/OverlayCenter/widgets/NavbarWidget.jsx:93` |
| Config panel | `src/components/OverlayCenter/widgets/NavbarConfig.jsx` |
| Styles | `v1`, `metallic`, `glass`, `retro` through `displayStyle` |
| Data source | `overlay_widgets.config`, clock, crypto/music/profile integrations |
| Persistence | `overlay_widgets.config` and saved navbar presets |

## Rendering structure

- `NavbarWidget`
  - root top bar
  - streamer/name/avatar/motto section
  - casino/start/CTA sections
  - music section
  - crypto/clock sections
  - optional badge/casino image

## Visual layers

- Bar surface.
- Left/middle/right zones.
- Avatar/badge image.
- Streamer name and motto.
- Music text/art.
- Crypto up/down values.
- CTA pill.
- Borders and highlights.

## Styling method

- Heavy inline styles.
- Widget config tokens for colors, sizes, max width, bar height, border/radius.
- `subValue` used for some appearance values.
- Timers/state update hooks for clock/music/crypto.
- No broad element markers.

## Hardcoded values and risks

- `NavbarWidget.jsx` contains many gradient and sizing branches.
- `barHeight`, `maxWidth`, avatar size, and badge size are constrained by section layout.
- Renderer wrapper skips slot-level clipping and shadow for navbar, so navbar handles its own overflow/clipping.

## Animation model

- Music/crypto transition behavior and timers.
- Renderer shell animations apply.
- Internal animation values are not universally safe.

## Layout model

- Horizontal bar with dynamic sections.
- Flex layout with optional section ordering in config.
- Risk increases when many sections are enabled at small widths.

## State variants

- Connected/disconnected music.
- Crypto up/down.
- Avatar/badge present or absent.
- CTA shown/hidden.

## Customization safety

- Safe: colors, font family, border color, muted text, CTA color.
- Constrained: bar height, max width, avatar/badge sizes, border radius.
- Dangerous: changing internal section order/layout from appearance editor.
- Not customizable: live clock/crypto/music fetch logic.
