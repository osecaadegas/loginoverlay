# Current Slot

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `current_slot` |
| Name | Current Slot |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:47` |
| Main component | `src/components/OverlayCenter/widgets/CurrentSlotWidget.jsx:7` |
| Config panel | `src/components/OverlayCenter/widgets/CurrentSlotConfig.jsx` |
| Styles | `v1`, `v2`, `v3`, `v4` through `displayStyle` |
| Data source | `overlay_widgets.config`, active slot updates from `useOverlay.js` |
| Persistence | `overlay_widgets.config`, appearance draft/published tokens |

## Rendering structure

- `CurrentSlotWidget`
  - root surface
  - slot image area
  - slot title
  - provider line
  - bet/RTP/metadata fields depending on style

## Visual layers

- Root background.
- Slot image.
- Title and provider text.
- Metadata badges.
- Border and shadow.

## Styling method

- Mostly inline styles.
- Some `subValue` access for appearance-aware values.
- No broad `data-widget-element` markers.
- Registry declares basic custom appearance tokens.

## Hardcoded values and risks

- Inline dimensions and typography in `CurrentSlotWidget.jsx`.
- Style variants have different structure; compact bar is not the same layout as card styles.
- Image sizing is constrained by slot dimensions and should not be freely edited.

## Animation model

- No major internal keyframe system found in the component.
- Renderer shell animations still apply.

## Layout model

- Fixed widget slot, usually card or compact bar.
- Image and text layout are tightly coupled for compact style.

## State variants

- Empty/no current slot.
- Active slot with image.
- Missing image fallback.

## Customization safety

- Safe: surface color, text color, muted color, border color, simple radius, font family.
- Constrained: font size, image size, padding, widget scale.
- Dangerous: arbitrary width/height without style-specific minimums.
- Not customizable: active slot detection and slot metadata resolution.
