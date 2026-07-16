# Bets

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `bets` |
| Name | Bets |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:648` |
| Main component | `src/components/OverlayCenter/widgets/BetsWidget.jsx:104` |
| Config panel | `src/components/OverlayCenter/widgets/BetsConfig.jsx` |
| Styles | `v1_list`, `v2_grid`, `v3_grid_2x3` |
| Data source | `overlay_widgets.config`, chat/points betting state |
| Persistence | `overlay_widgets.config` |

## Rendering structure

- `BetsWidget`
  - root panel
  - header/question
  - timer/pool/bets summary
  - options list or grid
  - option card/row
  - progress bar
  - footer/help text

## Visual layers

- Root surface.
- Header/question.
- Stat cards.
- Option cards.
- Option labels.
- Progress bars.
- Winner/loser/open/closed states.
- Footer text.

## Styling method

- Inline styles and class names.
- Strongest current direct-editing support: multiple `data-widget-element` markers.
- Uses `subElementStyle` and `subValue` for selected elements.
- CSS keyframes for open/card/winner animations in `OverlayRenderer.css`.

## Hardcoded values and risks

- Grid option counts and card sizes are coupled.
- Winner pop/pulse animations assume card scale and origin.
- Progress bar dimensions must be constrained.

## Animation model

- `bets-open`, `bets-card-in`, lead pulse, winner pop, and related keyframes.
- Color and glow can be constrained; animation distances should remain internal.

## Layout model

- List or grid.
- Grid 2x3 has fixed expectation for option count.
- Good candidate for early registry migration because direct markers already exist.

## State variants

- Idle.
- Open.
- Locked/closed.
- Winner selected.
- Winning/losing option.
- Empty bets.

## Customization safety

- Safe: root/card surfaces, text, header colors, progress colors, border/radius.
- Constrained: option card gap, progress height, timer/stat font size.
- Dangerous: grid dimensions, winner animation transform, arbitrary option count layout changes.
- Not customizable: betting logic, StreamElements point deduction/payout.
