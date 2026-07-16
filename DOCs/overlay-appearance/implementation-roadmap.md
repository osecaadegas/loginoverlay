# Implementation Roadmap

## 1. Unify preview and OBS rendering

- Files likely affected: `OverlayRenderer.jsx`, `OverlayPreview.jsx`, new shared slot utility.
- Tests: compare computed slot sizes, overflow, radius, and CSS variable output.
- Backward compatibility: no route changes.
- Completion: same widget/config produces equivalent wrapper styles in preview and OBS.

## 2. Introduce scoped appearance tokens

- Files: `appearanceModel.js`, `themeVarsBuilder.js`, widgets using `appearanceStyles.js`.
- Tests: token validation, fallback behavior, legacy theme fallback.
- Compatibility: `overlay_themes` remains read.
- Completion: token output is stable and versioned.

## 3. Add capability registry

- Files: new registry module plus docs-backed JSON.
- Tests: unsupported controls hidden; supported controls mapped.
- Completion: editor does not expose universal controls.

## 4. Migrate one simple widget

- Candidate: `bh_stats`.
- Tests: preview/OBS parity and no style leakage.
- Completion: first real widget uses registry tokens end to end.

## 5. Migrate Bonus Hunt

- Start with V12. Keep older styles constrained.
- Tests: live hunt states, opened/unopened states, slot imagery, request integration.
- Completion: Bonus Hunt has explicit element and state mappings.

## 6. Migrate Slot Requests

- Tests: empty queue, filled queue, card stack, compact overlay, realtime updates.
- Completion: safe material tokens without breaking carousel/marquee layouts.

## 7. Migrate Giveaways and Alerts

- Tests: empty/active/winner states, animations, external clips.
- Completion: state-safe colors and typography.

## 8. Migrate remaining widgets

- Current Slot, RTP Stats, Bonus Buys, Spotify, Navbar, Chat, Background.
- Tournament and Container last due complexity.

## 9. Rebuild Simple Mode

- Tests: beginner flow under one minute, no layers, no CSS terms.
- Completion: users can choose widget, style, color, size, publish.

## 10. Connect Advanced Mode

- Tests: layer selection only where supported, overrides isolated, reset behavior.
- Completion: advanced controls edit same config as Simple Mode.

## 11. Add preset generator

- Tests: material/color combos produce readable tokens.
- Completion: Matte, Metallic, Gradient, Glass, Neon, Minimal, Transparent OBS map to widget capabilities.

## 12. Migrate existing user themes

- Tests: existing saved theme renders the same before and after migration.
- Completion: no destructive writes, no theme loss.

## 13. Publish gradually behind a feature flag

- Tests: old editor fallback, feature flag state, role/access checks.
- Completion: rollout can be enabled per user or environment.
