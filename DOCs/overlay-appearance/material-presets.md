# Material Presets

Material presets should generate tokens, not hardcode per-widget CSS. Widgets should opt into the material through declared capabilities.

## Matte

- Tokens: low `reflectionIntensity`, medium `surfaceOpacity`, soft `borderIntensity`, low `glowStrength`.
- Fully suitable: BH Stats, Bonus Buys, Current Slot, Bets.
- Partially suitable: Bonus Hunt, Slot Requests, Chat, Giveaway, Spotify, Navbar.
- Fallback: solid surface plus readable text and soft border.
- Animation interaction: safe; does not depend on motion.

## Metallic

- Tokens: reflective gradient stops, controlled highlight, darker lower surface, moderate shadow.
- Fully suitable: widgets with card/surface variables or inline gradient support.
- Partially suitable: Tournament, Giveaway, Navbar, Spotify, Bonus Hunt V12, Bets.
- Unsupported without registry mapping: 3D Slot Requests card stack internals, Container child surfaces.
- Fallback: matte dark surface with metallic border if internal gradients cannot be mapped.
- Risk: reflective gradients can reduce text contrast if applied to text-bearing dense lists.

## Gradient

- Tokens: `gradientDirection`, `gradientStops`, readable content surface overlay.
- Fully suitable: Background, Navbar, Spotify, Giveaway, Current Slot.
- Partially suitable: Bonus Hunt, Slot Requests, Bets.
- Fallback: gradient border or header only when full background hurts readability.
- Risk: direct full-surface gradients can fight slot imagery.

## Glass

- Tokens: transparent surface, border highlight, blur strength, muted shadow.
- Fully suitable: Navbar, Spotify, BH Stats, Current Slot.
- Partially suitable: Chat, Slot Requests, Giveaway, Bonus Hunt.
- Fallback: translucent surface without `backdrop-filter` for OBS environments where blur is weak.
- Risk: text can become unreadable on busy stream backgrounds.

## Neon

- Tokens: dark surface, high accent, capped glow, high text contrast.
- Fully suitable: Current Slot, Bets, Spotify, Giveaway, RTP Stats.
- Partially suitable: Bonus Hunt, Slot Requests, Tournament.
- Fallback: accent border and badges rather than all-text glow.
- Risk: large glow blur makes small labels unreadable.

## Minimal

- Tokens: transparent or low-surface UI, minimal borders, no heavy shadows.
- Fully suitable: Current Slot, RTP Stats, BH Stats, Bonus Buys.
- Partially suitable: Chat, Slot Requests, Bonus Hunt.
- Fallback: plain text plus subtle backdrop.
- Risk: empty/low-data states can disappear on transparent backgrounds.

## Transparent OBS

- Tokens: zero or very low surface opacity, high text contrast, optional shadow/outline.
- Fully suitable: text and bar widgets with independent text shadows.
- Partially suitable: Bonus Hunt, Chat, Slot Requests.
- Fallback: very subtle surface behind text.
- Risk: live scene backgrounds determine readability; contrast warning is mandatory.
