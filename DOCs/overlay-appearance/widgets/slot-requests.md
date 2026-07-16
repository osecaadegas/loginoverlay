# Slot Requests

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `slot_requests` |
| Name | Slot Requests |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:518` |
| Main component | `src/components/OverlayCenter/widgets/SlotRequestsWidget.jsx:16` |
| Variant components | `SlotRequestsMinimal.jsx`, `SlotRequestsCardStack.jsx`, `SlotRequestsCompactOverlay.jsx` |
| Config panel | `src/components/OverlayCenter/widgets/SlotRequestsConfig.jsx` |
| Styles | `v1_minimal`, `v2_card_stack`, `v3_compact` |
| Data source | `slot_requests`, chat command config |
| Persistence | `overlay_widgets.config` |

## Rendering structure

- `SlotRequestsWidget`
  - style router
  - minimal queue list
  - 3D card stack
  - compact overlay/marquee

## Visual layers

- Root queue surface.
- Header/title.
- Request rows/cards.
- Slot image.
- Slot title/provider.
- Requester text.
- Queue number/badges.
- Empty state.

## Styling method

- Class-heavy CSS in `OverlayRenderer.css`.
- Widget-specific CSS variables (`--sr-min-*`, `--sr-cs-*`, `--sr-co-*`).
- No broad `data-widget-element` markers.
- Realtime data from `slot_requests`.

## Hardcoded values and risks

- 3D card stack uses transforms and z-depth assumptions.
- Compact overlay uses marquee/scroll timing.
- Minimal list has fixed row density assumptions.

## Animation model

- Infinite scroll, slide-in, card-stack float, badge pulse, ring pulse, compact pop/slide.
- Duration can be constrained only after each style declares safe variables.
- Transform distances are dangerous.

## Layout model

- Minimal list, card stack, and compact overlay are structurally different.
- Image and row heights should be constrained per style.

## State variants

- Empty queue.
- Filled queue.
- Request accepted/denied states through data.
- Duplicate/prevented requests in config.

## Customization safety

- Safe: text, muted, accent, border, row/card surface, queue number colors.
- Constrained: max display, row/card size, image radius.
- Dangerous: 3D transform distances, marquee distances, unrestricted widget width.
- Not customizable: chat command parsing, queue acceptance/refund logic.

## Production V2 migration

Migrated on 2026-07-16 through `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js` and `src/components/OverlayCenter/appearance/v2/appearanceResolver.js`.

### Runtime mapping

- Simple Mode materials map into `accentColor`, `bgColor`, `cardBg`, `textColor`, `mutedColor`, `borderColor`, `fontFamily`, `fontSize`, `fontWeight`, and `widgetScale`.
- Advanced Mode elements map into `subElements` for `container`, `header`, `queueContainer`, `requestCard`, `position`, `slotImage`, `slotTitle`, `viewerName`, `costBadge`, `emptyState`, and `footer`.
- All three variants now expose `data-widget-element` markers and read safe `subElementStyle` or `subValue` values.
- Preview sample states are injected by `src/components/OverlayCenter/appearance/previewWidgetSamples.js`.

### Still intentionally locked

- Slot image dimensions.
- 3D card transform distances.
- Infinite-scroll and marquee distances.
- Chat command parsing and queue persistence.

The V2 resolver filters legacy `slotImage.imageSize`, `slotImage.width`, and `slotImage.height` so existing saved settings are preserved but not applied to animation-sensitive layouts.
