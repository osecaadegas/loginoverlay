# Raid Shoutout

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `raid_shoutout` |
| Name | Raid Shoutout |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:454` |
| Main component | `src/components/OverlayCenter/widgets/RaidShoutoutWidget.jsx:52` |
| Config panel | `src/components/OverlayCenter/widgets/RaidShoutoutConfig.jsx` |
| Styles | `v1` |
| Data source | Raid event config, optional `/api/clip-video` |
| Persistence | `overlay_widgets.config` |

## Rendering structure

- `RaidShoutoutWidget`
  - alert shell
  - streamer/avatar/game information
  - viewer count
  - optional clip/video
  - timer/visibility lifecycle

## Visual layers

- Alert background.
- Accent border.
- Header/title.
- Raid details.
- Clip container.
- Viewers/game badges.

## Styling method

- Mostly class/inline hybrid.
- `subValue` support for several colors.
- Timers manage alert visibility and clip lifecycle.

## Hardcoded values and risks

- Alert duration and enter/exit animations are functional behavior, not pure appearance.
- Clip sizing must remain stable to avoid OBS jumps.

## Animation model

- Enter/exit animations from config and renderer.
- Alert lifecycle timers.
- Duration changes affect behavior and should not be exposed as a simple visual control.

## Layout model

- Alert card with optional media.
- Size depends on clip enabled state.

## State variants

- Idle/no raid.
- Active raid.
- Clip loading/playing/error.

## Customization safety

- Safe: background color, accent, text/subtext colors, radius, font family.
- Constrained: max clip duration, alert duration, border radius.
- Dangerous: arbitrary media dimensions and lifecycle timers.
- Not customizable: raid detection and clip fetch behavior.
