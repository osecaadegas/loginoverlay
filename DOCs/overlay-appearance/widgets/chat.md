# Chat

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `chat` |
| Name | Chat |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:226` |
| Main component | `src/components/OverlayCenter/widgets/ChatWidget.jsx:83` |
| Config panel | `src/components/OverlayCenter/widgets/ChatConfig.jsx` |
| Styles | `classic`, `floating`, `bubble`, `stack`, `typewriter`, `sidebar`, `cards`, `metal`, `bh_stats` through `chatStyle` |
| Data source | Twitch, YouTube, Kick, overlay config |
| Persistence | `overlay_widgets.config` |

## Rendering structure

- `ChatWidget`
  - chat shell
  - optional header
  - message list
  - message row/card/bubble
  - badges/name/text
  - raid/card variants

## Visual layers

- Root chat surface.
- Header background/text.
- Message surface.
- Username.
- Badges.
- Message body.
- Raid/card highlight states.

## Styling method

- Heavy inline styles.
- `subValue` used for some values.
- External data fetch/poll/subscription logic.
- Style-specific branches for message layout.
- No broad element markers.

## Hardcoded values and risks

- Width/height/message spacing are config-driven but tightly tied to scroll behavior.
- Message layout uses many inline style branches.
- Native chat colors can override theme colors.

## Animation model

- Message arrival/typewriter/stack/floating style animations.
- Animation should be constrained to motion enabled/duration only after style-specific mapping.

## Layout model

- Scrollable message container.
- Height and max message count determine performance and overflow.
- Sidebar/card styles differ structurally from classic chat.

## State variants

- Empty chat.
- New messages.
- Raid/highlighted messages.
- Native platform color mode.
- Header shown/hidden.

## Customization safety

- Safe: root/header/message colors, text color, font family.
- Constrained: width, height, message spacing, font size, border radius.
- Dangerous: arbitrary animation changes, large message counts, unrestricted transparent text.
- Not customizable: platform connection and message parsing.
