# Tournament

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `tournament` |
| Name | Tournament |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:78` |
| Main component | `src/components/OverlayCenter/widgets/TournamentWidget.jsx:47` |
| Child components | `widgets/tournament/PlayerCard.jsx`, `MatchCard.jsx`, `RoundDisplay.jsx`, `ShatterEffect.jsx` |
| Config panel | `src/components/OverlayCenter/widgets/TournamentConfig.jsx` |
| Styles | `grid`, `showcase`, `vertical`, `bracket`, `neon`, `minimal`, `arena`, `futuristic`, `esports` through `layout` |
| Data source | `overlay_widgets.config`, tournament engine state |
| Persistence | `overlay_widgets.config` and saved widget presets |

## Rendering structure

- `TournamentWidget`
  - layout router
  - bracket/grid/showcase sections
  - player cards
  - match cards
  - current round display
  - effects/shatter fragments

## Visual layers

- Root arena/surface.
- Tournament title/header.
- Player card surfaces.
- Player names.
- Slot names/images.
- Score/multiplier/result values.
- Winner/loser states.
- Bracket lines.
- Effects fragments and decorative accents.

## Styling method

- Heavy inline styles in `TournamentWidget.jsx`.
- Many style-specific config tokens declared in registry.
- Child components also use inline styles.
- Embedded or component-level keyframes/animation names.
- No general `data-widget-element` markers.

## Hardcoded values and risks

| Location | Value type | Affects | Safety |
| --- | --- | --- | --- |
| `TournamentWidget.jsx:47` | 170+ inline style objects | Almost all visuals | High risk; only mapped tokens are safe. |
| `TournamentWidget.jsx:2055-2204` | keyframes | Arena/bracket/effects motion | Dangerous. |
| `widgets/tournament/MatchCard.jsx:82` | card state styles and animations | Current match/winner | Constrained. |

## Animation model

- Multiple animations for current match, sword effects, shatter effects, arena/futuristic themes.
- Animation values are layout-dependent and should not be globally edited.

## Layout model

- Multiple unrelated layout models under one widget ID.
- Uses grid, flex, absolute effects, and bracket-specific assumptions.
- Minimum safe sizes differ by layout.

## State variants

- Setup/active/completed.
- Current match.
- Winner/loser/eliminated.
- Tournament type variants.
- Empty/no players.

## Customization safety

- Safe: known registry colors like arena/accent/win/lose and text colors within ranges.
- Constrained: card radius, card gap, simple font sizes for declared tokens.
- Coupled: player card layout, bracket geometry, image sizes.
- Dangerous: animation transforms, bracket dimensions, shatter effects.
- Not customizable: match engine, winner selection, bracket progression.
