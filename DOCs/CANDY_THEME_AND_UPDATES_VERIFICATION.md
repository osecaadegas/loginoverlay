# Candy theme and Premium updates

## Activation

In `/editor`, select a widget, open **Colour Theme** and choose **Candy**. The toolbar then offers **Candy reference layout**, an undoable arrangement of the existing unique, visible reference widgets on the 1920 × 1080 canvas. Locked foreground widgets, duplicate types, hidden widgets and additional modules keep their positions. The preset does not delete widgets or replace live data; hide or reposition additional modules as needed for your scene.

The Background widget has independent Candy-shop background, decorations and gentle-motion controls. Widgets with decorative artwork expose a decoration toggle; other widgets do not show an ineffective decoration control. Motion defaults off and respects reduced-motion preferences. Frames remain usable over a streamer's own scene with the background disabled.

Save the draft and publish through the existing editor actions. The shared renderer supplies the editor, community previews and browser-source output. No migration or new environment variable is needed.

Premium members can open `/updates` from navigation or Apps. `/api/updates` verifies the session and existing server-side streamer entitlement before returning the release catalog. The catalog stays out of the frontend bundle. Future releases must add entries as described in `AGENTS.md`.

## Implementation files

Created:

- `src/effects/ThemeEffects/candy/candyTheme.js`: assets, settings normalization, widget palettes and material variables.
- `src/effects/ThemeEffects/candy/CandyTheme.jsx` and `CandyTheme.css`: shared frame, environment, transparent decorations, responsive spacing and optional motion.
- `public/theme-effects/candy/candy-shop.png` and `decorations.png`: generated background and transparent artwork; content and controls are separate DOM elements.
- `src/components/OverlayCenter/editor/candyComposition.js`: explicit reference composition.
- `src/components/UpdatesPage/UpdatesPage.jsx` and `UpdatesPage.css`: Premium release timeline, filters, search, responsive states and retry handling.
- `api/_lib/release-notes.js` and `api/_lib/routes/updates.js`: server-only catalog and authenticated endpoint.
- `scripts/test-candy-theme.mjs`, `test-updates.mjs`, `test-updates-browser.mjs`: regression coverage.

Modified:

- `src/components/OverlayCenter/editor/{BetterWidgetPackages.jsx,WidgetEditorPage.jsx,betterWidgetRegistry.jsx,widgetColourThemes.js}`: theme selection, applicable controls, shared rendering and preset action.
- `src/components/OverlayCenter/widgets/shared/{colourThemePalettes.js,betterWidgetStyles.jsx}`: palette, reusable live Bonus Hunt sections, background branch and theme-aware chat/giveaway defaults.
- `src/components/OverlayCenter/widgets/navbar/NavbarWidget.jsx`: glossy command capsules with existing appearance overrides taking precedence.
- `src/App.jsx`, `src/components/AppsPage/AppsPage.jsx`, `src/components/Navigation/TopNavigation.jsx`, `src/utils/seo.js`, `api/[...path].js`: guarded route, links, noindex and existing API dispatcher.
- `package.json`, `scripts/test-global-navigation.mjs`, `scripts/test-widget-colour-themes.mjs`, `AGENTS.md`: test commands, current download assertion, palette inventory and release-note maintenance.

## Executed verification

- `npm.cmd run build`: passed. Existing unresolved custom-font warnings and large-chunk warnings remain.
- `npm.cmd run validate:widgets`: passed.
- `npm.cmd run test:candy`: passed. Real shared components for 12 visual widget types; empty and populated scenes; editor/OBS runtime flags; 1920 × 1080, 2560 × 1440 and 1366 × 768; independent background/decorations; actual toggle interactions; theme switching; configuration serialization and reload; actual font and message-size controls reaching the browser-source renderer; image loading and advancing local video playback; geometry containment and chat/jar separation; no new WebGL canvas.
- `npm.cmd run test:widget-colour-themes`: passed for 208 widget/palette combinations, including reload and available runtime rendering.
- `npm.cmd run test:preview-data-parity`: passed for seven sampled widget types.
- `npm.cmd run test:widget-control-categories`: passed.
- `npm.cmd run test:theme-effects`: passed. Its controlled CSP fixture logs blocked external catalog requests; this does not constitute a verified external integration.
- `npm.cmd run test:updates`: passed, including 15 authorization cases, expired/forged credentials, role and subscription boundaries, HTTP methods and private caching.
- `npm.cmd run test:updates-browser`: passed for the real page/API handler, product filters, search, mobile layout, navigation, logout isolation and non-premium denial.
- `npm.cmd run test:global-navigation`: passed.
- `git diff --check`: passed.

Unresolved repository checks, reported rather than counted as passes:

- `npm.cmd run test:appearance-editor` fails its existing landing-page demo assertion at `scripts/test-appearance-editor.mjs:238` (Connect 4/Bets/Tournament fixture source expectations). The landing preview source was not modified in this change.
- `node scripts/test-appearance-v2.mjs` fails at line 263 because it expects the Tournament `showcase` quick style. That style registry was not modified in this change. The `test:appearance-v2` npm command mentioned in older repository guidance is not currently defined.

## Visual evidence and limits

Generated local screenshots are in `.codex-dev/candy-verification/`, including `reference-empty.png`, `populated-editor.png`, `populated-obs.png`, per-widget images and scaled layouts. They were inspected and used to correct frame depth, request contrast, header contrast and decorative overlap.

The background and detailed decorations are a recreation, not identical pixels from the reference. Gameplay, camera and Slot Window sources remain independent and unobstructed by the theme.

Browser-source rendering was tested in Chromium with the application's OBS runtime flag. Native OBS Studio, a real authenticated production save/publish, real platform chat events and prolonged hardware performance were not exercised. No measured OBS FPS or GPU claim is made. Persistence checks use isolated serialized configurations, not production account writes. There is no standalone Daily Wheel widget registered in this editor; no fake wheel or new widget behavior was introduced.
