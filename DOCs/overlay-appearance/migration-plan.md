# Migration Plan

This is a documentation plan only. It should be used in the next implementation phase.

## Stage 1: Extract shared renderer shell logic

- Files: `OverlayRenderer.jsx`, `OverlayPreview.jsx`.
- Goal: share slot sizing, overflow, clipping, shadow, and widget CSS variable logic.
- Risk: background widget and 3D widget overflow behavior.
- Done when preview and OBS slot wrappers produce equivalent dimensions for the same widget/config.

## Stage 2: Introduce documentation-backed capability registry

- Files: new runtime registry derived from `widget-capabilities.json`.
- Goal: expose only verified controls.
- Risk: current editor assumes broader capabilities.
- Done when unsupported controls are hidden per widget.

## Stage 3: Token adapter for one simple widget

- Recommended first widget: `bh_stats`.
- Goal: prove token-to-widget config and CSS var mapping.
- Risk: low.
- Done when preview and OBS match for color, text, radius, and shadow.

## Stage 4: Migrate Bets

- Why: best current `data-widget-element` coverage and state-specific needs.
- Risk: state colors and winner animations.
- Done when direct selection, state colors, and OBS output match.

## Stage 5: Migrate Bonus Hunt V12

- Why: high-value widget with many direct markers.
- Risk: many variants and live slot request integration.
- Done when V12 works; other Bonus Hunt styles can be supported with fallback controls.

## Stage 6: Migrate Slot Requests

- Risk: 3D card stack animation distances and scroll/marquee timing.
- Done when minimal and compact styles are safe; card stack exposes constrained material controls only.

## Stage 7: Migrate remaining widgets by risk

- Current Slot, Bonus Buys, RTP Stats.
- Spotify, Navbar, Giveaway, Chat.
- Background.
- Tournament.
- Container last.

## Stage 8: Rebuild Simple Mode

- Use only material, color, shape, size, text, and publish controls.
- No layers unless advanced mode is active.
- Use capability registry to choose controls.

## Stage 9: Advanced Mode

- Reveal element capabilities only where widget declares support.
- Add "return to preset value" for overridden tokens.
- Keep unsupported controls hidden or disabled with reason.

## Stage 10: Tests and gradual rollout

- Feature flag the new registry-backed editor.
- Add tests for storage, preview/OBS parity, cross-widget isolation, and legacy theme migration.
- Roll out one widget at a time.
