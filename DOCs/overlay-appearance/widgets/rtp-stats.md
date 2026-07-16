# RTP Stats Bar

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `rtp_stats` |
| Name | RTP Stats Bar |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:340` |
| Main component | `src/components/OverlayCenter/widgets/RtpStatsWidget.jsx:150` |
| Config panel | `src/components/OverlayCenter/widgets/RtpStatsConfig.jsx` |
| Styles | `v1`, `vertical`, `neon`, `minimal`, `glass` through `displayStyle` |
| Data source | `slots`, active/current slot config, optional slot AI endpoint |
| Persistence | `overlay_widgets.config` |

## Rendering structure

- `RtpStatsWidget`
  - bar/root
  - provider/slot label
  - RTP section
  - potential/max win section
  - volatility section
  - best win section

## Visual layers

- Bar background.
- Provider/slot text.
- Section labels and values.
- Icons.
- Dividers.
- Spinner/loading state.

## Styling method

- Class-heavy rendering with config tokens.
- `subValue` is used for multiple values.
- Registry exposes specific `barBgFrom`, `barBgVia`, `barBgTo`, icon colors, padding, font values.

## Hardcoded values and risks

- Bar height and divider spacing are layout-coupled.
- Vertical style differs from horizontal style.
- Some data states depend on available slot metadata.

## Animation model

- Spinner/loading and renderer shell animations.
- No major custom keyframe system in the component body.

## Layout model

- Horizontal/vertical bar depending on style.
- Compact text density; overflow is likely with long provider or slot names.

## State variants

- Loading.
- Slot found.
- No slot data.
- Best-win present/absent.

## Customization safety

- Safe: bar gradients, text/icon colors, border/radius, font family.
- Constrained: padding, font size, provider font size.
- Dangerous: arbitrary width shrink without overflow handling.
- Not customizable: slot lookup and RTP calculations.
