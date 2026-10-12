# Overlay Editor Widget and Settings Audit

Date: 2026-10-12

## Scope and inventory

The production editor registers 13 widgets and 15 selectable colour themes. The audit used the real `BetterWidgetControls`, `BetterWidgetPreview`, widget registry, shared editor/OBS renderer, and appearance configuration model. It did not write test data to Supabase.

| Widget | Native controls | Numeric controls | Select options | Grouped options |
|---|---:|---:|---:|---:|
| Current Slot | 13 | 1 | 4 | 15 |
| Slot Bingo | 25 | 9 | 2 | 15 |
| Connect Four | 15 | 1 | 6 | 15 |
| Twitch Shoutout | 24 | 9 | 4 | 29 |
| Slideshow Frame | 19 | 9 | 0 | 29 |
| Tournament | 39 | 19 | 4 | 21 |
| Bonus Hunt | 31 | 26 | 0 | 86 |
| Giveaway | 57 | 30 | 18 | 19 |
| Navbar | 26 | 5 | 4 | 15 |
| Chat | 48 | 11 | 9 | 37 |
| RTP Stats | 32 | 15 | 20 | 21 |
| Background | 20 | 12 | 5 | 38 |
| Bets | 20 | 5 | 6 | 27 |

The automated audit exercised 369 visible native controls, 491 numeric boundary and selector-option mutations, 322 grouped preset/layout/theme mutations, and 78 responsive editor/OBS renders. The colour-theme suite separately rendered all 195 widget/theme combinations and compared saved/reloaded editor output with OBS output where the runtime is available.

## Widget/theme audit matrix

Each row represents the widget's complete currently visible setting surface under that theme. Conditional controls are included only when their parent feature is active.

| Widget | Theme | Setting | Test Result | Action |
|---|---|---|---|---|
| Current Slot | Neon | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Metallic | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Sunset | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Cyberpunk | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Crimson | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Emerald | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Gold | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Violet | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Rose | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Arctic | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Lime | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Luxe | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Gladiator | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Old Rome | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Current Slot | Space / Orbital | All 13 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Neon | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Metallic | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Sunset | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Cyberpunk | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Crimson | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Emerald | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Gold | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Violet | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Rose | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Arctic | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Lime | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Luxe | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Gladiator | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Old Rome | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Slot Bingo | Space / Orbital | All 25 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Neon | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Metallic | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Sunset | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Cyberpunk | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Crimson | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Emerald | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Gold | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Violet | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Rose | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Arctic | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Lime | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Luxe | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Gladiator | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Old Rome | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Connect Four | Space / Orbital | All 15 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Neon | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Metallic | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Sunset | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Cyberpunk | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Crimson | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Emerald | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Gold | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Violet | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Rose | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Arctic | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Lime | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Luxe | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Gladiator | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Old Rome | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Twitch Shoutout | Space / Orbital | All 24 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Neon | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Metallic | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Sunset | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Cyberpunk | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Crimson | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Emerald | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Gold | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Violet | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Rose | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Arctic | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Lime | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Luxe | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Gladiator | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Old Rome | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Slideshow Frame | Space / Orbital | All 19 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Neon | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Metallic | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Sunset | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Cyberpunk | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Crimson | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Emerald | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Gold | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Violet | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Rose | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Arctic | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Lime | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Luxe | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Gladiator | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Old Rome | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Tournament | Space / Orbital | All 39 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Neon | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Metallic | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Sunset | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Cyberpunk | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Crimson | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Emerald | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Gold | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Violet | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Rose | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Arctic | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Lime | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Luxe | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Gladiator | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Old Rome | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Bonus Hunt | Space / Orbital | All 31 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Neon | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Metallic | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Sunset | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Cyberpunk | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Crimson | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Emerald | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Gold | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Violet | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Rose | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Arctic | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Lime | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Luxe | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Gladiator | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Old Rome | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Giveaway | Space / Orbital | All 57 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Neon | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Metallic | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Sunset | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Cyberpunk | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Crimson | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Emerald | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Gold | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Violet | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Rose | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Arctic | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Lime | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Luxe | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Gladiator | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Old Rome | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Navbar | Space / Orbital | All 26 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Neon | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Metallic | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Sunset | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Cyberpunk | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Crimson | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Emerald | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Gold | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Violet | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Rose | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Arctic | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Lime | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Luxe | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Gladiator | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Old Rome | All 48 visible native controls plus applicable grouped options | Working | Keep |
| Chat | Space / Orbital | All 48 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Neon | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Metallic | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Sunset | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Cyberpunk | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Crimson | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Emerald | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Gold | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Violet | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Rose | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Arctic | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Lime | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Luxe | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Gladiator | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Old Rome | All 32 visible native controls plus applicable grouped options | Working | Keep |
| RTP Stats | Space / Orbital | All 32 visible native controls plus applicable grouped options | Working | Keep |
| Background | Neon | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Metallic | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Sunset | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Cyberpunk | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Crimson | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Emerald | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Gold | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Violet | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Rose | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Arctic | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Lime | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Luxe | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Gladiator | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Old Rome | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Background | Space / Orbital | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Neon | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Metallic | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Sunset | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Cyberpunk | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Crimson | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Emerald | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Gold | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Violet | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Rose | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Arctic | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Lime | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Luxe | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Gladiator | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Old Rome | All 20 visible native controls plus applicable grouped options | Working | Keep |
| Bets | Space / Orbital | All 20 visible native controls plus applicable grouped options | Working | Keep |

## Fix report

| Bug | Root cause | Correction | Verification |
|---|---|---|---|
| Advanced font, spacing, border, radius, glow, image-size, and offset values could render at the wrong physical size in a high-DPI standalone OBS source. | Standalone native-pixel scaling handled root settings for all widgets but scoped advanced appearance values only for RTP Stats. | Added a pure shared OBS configuration scaler that scales all pixel-based scoped element/state values for widgets using native config scaling while preserving unitless opacity, line height, and letter spacing. Bonus Hunt retains its existing CSS-based OBS scale path. | `test:obs-high-dpi` validates root, element, and state values across Chat, Giveaway, Navbar, RTP Stats, and Bets. |
| Connect Four, Twitch Shoutout, and Slideshow settings could show an empty shared configuration preview. | `BetterWidgetPreview` did not route those registered widget types to their existing renderers. | Added the three existing renderers to the shared preview switch with editor-safe preview props. | The control audit requires every registered widget preview to contain rendered output before any control test proceeds. |
| Bets settings preview was blank while no live bet was open. | Bets intentionally returns no DOM in the idle state, but the editor preview passed the idle configuration unchanged. | Added editor-only representative bet data when the saved game state is idle; live data and runtime behavior remain unchanged. | Bets passed the full control, option, grouped-option, and responsive preview audit. |
| Registry validation silently omitted Connect Four. | The expected production widget list in `validate-widgets.mjs` was stale. | Added Connect Four to the required registry/package/builtin consistency check. | `validate:widgets` passes with all 13 widgets. |
| Sample mode could replace live presentation settings with a parallel mock configuration. | Mock fixtures were spread over the complete normalized widget config, including layout and visibility properties. | Added a strict data-only sample capability map. Sample content now overlays the saved instance config without changing fonts, edges, colours, themes, dimensions, sub-elements, effects, or compatible visibility choices. | `test:preview-data-parity` and `test:overlay-editor-audit` verify presentation preservation and editor/OBS rendering. |
| Bonus Hunt could clip vertically when Sample mode preserved the live request-section setting. | At a 1x editor scale, the renderer ignored `__betterInstanceHeight` and allowed the panel's auto height to exceed its widget frame. | Instance width and height are now the sizing source at every render scale, including native 1x editor and OBS rendering. | All 78 responsive editor/OBS renders pass with request visibility preserved. |

## Hidden settings report

No new controls were hidden to mask a defect. The audit found no visible single-option selector and no settings section without an actionable control.

Existing capability-based visibility was retained and verified:

- Current Slot hides backdrop strength when the backdrop is disabled.
- Chat hides viewer-count, BTTV, role glaze, giveaway, shoutout, texture, and fade detail controls until their parent feature is enabled.
- Theme-effect detail controls appear only for their matching Arctic, Gladiator, Old Rome/Greek, or Orbital family.
- Background source controls change with the selected internal, image, video, or external source.
- Controls owned by widget geometry update the instance; appearance and behavior controls update only that widget's configuration.

## Regression suite

Run the complete setting audit with a local Vite server on port 3010:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 3010
npm.cmd run test:overlay-editor-audit
npm.cmd run test:preview-data-parity
```

The reusable suite:

- enumerates all production widgets;
- opens every settings section;
- rejects empty sections and unsupported one-option selectors;
- changes every visible native control;
- tests all numeric minimum, midpoint, and maximum values;
- tests every selector alternative;
- tests every inactive grouped preset/layout/theme choice;
- confirms each action changes widget configuration or geometry;
- confirms the preview survives every change;
- confirms Sample mode preserves live typography, edges, themes, effects, layout, and visibility configuration;
- rejects streamer-specific names in all audited sample configurations;
- renders every widget in editor and OBS mode at 1920×1080, 2560×1440, and 1366×768;
- fails on browser errors or horizontal/vertical widget overflow.

Related suites cover colour-theme parity, conditional visibility, publication/save recovery, background source isolation, theme effects, and high-DPI OBS geometry.

## Completion summary

| Measure | Result |
|---|---:|
| Widgets discovered | 13 |
| Themes discovered | 15 |
| Widget/theme combinations | 195 |
| Visible native controls tested | 369 |
| Numeric/selector boundary mutations | 491 |
| Grouped option mutations | 322 |
| Responsive editor/OBS renders | 78 |
| Working setting mutations | 1,182 |
| Bugs fixed | 6 |
| Unsupported settings newly hidden | 0 |
| Failed audit tests remaining | 0 |
| Unverified visible settings | 0 |

Third-party authentication and live Twitch, Kick, YouTube, Spotify, and StreamElements event delivery were not invoked. Their connection controls and configuration mappings were tested without using production credentials or changing production data; service delivery remains covered by its dedicated integration/runtime tests.
