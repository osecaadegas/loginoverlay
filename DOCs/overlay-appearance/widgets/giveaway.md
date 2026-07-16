# Giveaway

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `giveaway` |
| Name | Giveaway |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:129` |
| Main component | `src/components/OverlayCenter/widgets/GiveawayWidget.jsx:198` |
| Config panel | `src/components/OverlayCenter/widgets/GiveawayConfig.jsx` |
| Styles | `v1`, `v2`, `v3`, `v4`, `metal`, `bh_stats`, `v12` through `displayStyle` |
| Data source | `overlay_widgets.config`, chat participant state |
| Persistence | `overlay_widgets.config`; preview sample data in `previewWidgetSamples.js` |

## Rendering structure

- `GiveawayWidget`
  - root card
  - title/prize/keyword section
  - participant count
  - winner/current status
  - style-specific visual shell

## Visual layers

- Root background and border.
- Header/title.
- Prize text.
- Keyword badge.
- Participant counter.
- Winner area.
- Decorative glows/shadows.

## Styling method

- Heavy inline styles.
- `subValue` is used for some values.
- Registry basic appearance tokens.
- Several inline gradients and animation names.
- No broad `data-widget-element` markers.

## Hardcoded values and risks

- `GiveawayWidget.jsx` has many inline font, spacing, gradient, and shadow values.
- Several styles use container-query-like sizing and clamp behavior.
- Internal animation names such as pulse/glow/haptic depend on style variants.

## Animation model

- Active, winner, pulse, glow, and draw-style animations.
- Duration and glow strength can be constrained after style-specific mapping.
- Layout-affecting animation should remain controlled by widget logic.

## Layout model

- Card-based layouts with several style variants.
- Some styles are compact; others are decorative/large.
- Text overflow and prize/keyword length are primary risks.

## State variants

- Inactive.
- Active.
- Winner selected.
- Empty participants.
- Twitch/Kick enabled states.

## Customization safety

- Safe: root surface, title/text colors, accent, border, simple radius.
- Constrained: font sizes, participant badge size, shadow/glow.
- Dangerous: changing draw/winner animation layout or compact dimensions without tests.
- Not customizable: giveaway business logic, participant list, winner selection.

## Production V2 migration

Migrated on 2026-07-16 through `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js` and `src/components/OverlayCenter/appearance/v2/appearanceResolver.js`.

### Runtime mapping

- Simple Mode materials map into `accentColor`, `bgColor`, `cardBg`, `textColor`, `mutedColor`, `borderColor`, `fontFamily`, and `widgetScale`.
- Advanced Mode elements map into `subElements` for `container`, `header`, `prize`, `keyword`, `participantCount`, `statusBadge`, `winnerArea`, `progressSection`, `timer`, `emptyState`, `celebration`, and `footer`.
- Existing inline variants now read V2 values through `subValue` and `subElementStyle` without changing participant/chat persistence.
- Preview sample states are injected by `src/components/OverlayCenter/appearance/previewWidgetSamples.js`.

### State behavior

The V2 mapper keeps separate semantic state colors for:

- `statusBadge.live`
- `statusBadge.closed`
- `statusBadge.winner`
- `winnerCard.winner`
- `winnerCard.drawing`

### Still intentionally locked

- Winner selection.
- Participant collection.
- Draw reel transform geometry.
- Confetti path/timing.
- Winner entrance choreography.
