# Background

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `background` |
| Name | Background |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:401` |
| Main component | `src/components/OverlayCenter/widgets/BackgroundWidget.jsx:86` |
| Config panel | `src/components/OverlayCenter/widgets/BackgroundConfig.jsx` |
| Style file | `src/components/OverlayCenter/widgets/BackgroundWidget.css` |
| Styles | `v1`, `aurora`, `matrix`, `starfield`, `waves`, `geometric` through `displayStyle` |
| Data source | `overlay_widgets.config` |
| Persistence | `overlay_widgets.config` |

## Rendering structure

- `BackgroundWidget`
  - full-canvas root
  - texture/image/video layer
  - optional overlay color
  - optional animated effects

## Visual layers

- Base color/gradient.
- Image/video.
- Pattern/effect layer.
- Overlay tint.
- Particles/fog/glimpse effects.

## Styling method

- Inline styles plus `BackgroundWidget.css`.
- `subValue` for color/effect values.
- Renderer treats background widgets as canvas-filling (`WidgetSlot` sets x/y 0 and canvas width/height).

## Hardcoded values and risks

- Effects and pattern sizes are style-specific.
- Blur/filter values apply to large canvas areas and can be expensive.
- Video/image fit should remain constrained.

## Animation model

- Animated background styles such as aurora/matrix/waves/starfield.
- Animation speed is config-driven but should be clamped.

## Layout model

- Always fills the overlay canvas.
- z-index should stay behind other widgets.

## State variants

- Texture mode.
- Image mode.
- Video mode.
- Empty/fallback mode.

## Customization safety

- Safe: colors, gradient angle, opacity, overlay tint, image fit/position.
- Constrained: blur, filter values, pattern size, animation speed.
- Dangerous: z-index above other widgets, excessive blur/saturation on OBS.
- Not customizable: video/image loading behavior beyond safe config.
