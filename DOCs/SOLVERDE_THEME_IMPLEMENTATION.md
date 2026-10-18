# Solverde theme implementation

Implemented 18 October 2026 in the existing Overlay Center and published Browser Source renderer.

## Using the theme

1. Open `/editor`, select a widget and choose **Solverde** under **Colour theme → Premium**. This changes its visual theme without repositioning it.
2. To reproduce the reference, include Background, Navbar, Current Game, Bonus Hunt, Slideshow, Chat and Bets. Use **Solverde reference layout** in the editor toolbar. An existing Slot Window is fitted into the gameplay opening.
3. The reference action is undoable. It arranges unique, visible, unlocked widgets, preserves extra/duplicate/hidden widgets, and hides an unlocked duplicate RTP strip because the Current Game footer supplies that information. Locked background handling follows the existing composition actions.
4. In **Solverde layout**, configure the horizontal dock, footer, prediction rows, default brand slide, community heading and decorations. Background's idle fill is off by default so an OBS source beneath it remains visible.
5. Save and publish with the existing controls, then refresh the OBS Browser Source. No database migration or ScreenSplit installer update is required.

## Composition and behavior

The reference canvas is 1920 × 1080. The masthead is 86px high; gameplay/frame and its footer occupy the left 1358px, with a 508px right column. The bottom dock and predictions are both 246px tall. The opening is transparent; the optional idle background is explicit.

- Emerald, ivory, champagne and green are shared theme tokens. Decorative CSS/SVG layers do not capture pointer input. No screenshot is used as the widget interface.
- The masthead uses official Solverde vector geometry, preserves its proportions, and retains existing identity, clock, music and responsible-play bindings. Music appears according to the existing integration/settings, not an invented track.
- The replaceable slideshow fallback is an ivory Solverde slide. Configured image/video media take precedence and use the existing playback pipeline.
- Current Game's integrated footer uses the existing catalog and personal-record hook. Missing values remain empty-state dashes.
- The horizontal dock uses existing hunt ordering, active-slot selection, opened counts and break-even calculation. It shows 2–4 cards, follows the active card, and exposes previous/next navigation for long hunts. Actual balance uses live balance when provided, otherwise known stop balance plus recorded payouts; it does not invent a balance from individual spin bets.
- Reference predictions use three configurable ranges when there are no votes/results to preserve. Existing active vote/result options remain intact.
- Giveaway open, drawing and winner states remain inside chat beneath its heading. Inactive giveaways reclaim their space. Open-state ivory notifications use the real title and command; drawing/winner renderers keep their existing behavior.
- Reduced motion has a complete static appearance. Resize observers disconnect when their components unmount.

## Appearance and isolation

`solverde_footer`, `solverde_dock` and `solverde_predictions` declare separate V2 element schemas. Only those schemas use the new strict element-list behavior; other variants keep their existing element resolution. Style-level elements are validated together with inherited declarations.

The footer does not expose backdrop, badge or cover-surface controls it does not render. Dock/prediction variants replace the unrelated legacy carousel, scoreboard and effects controls with their supported options. Fixed top-of-chat placement has no nonfunctional bottom-position control. Values for other variants remain saved.

During testing, fixes connected the dock's surface overrides to its actual frame, respected the footer background input, routed prediction rows from existing list styles, isolated footer title overrides from hunt titles, and removed the legacy horizontal hunt shell's 8px inset from this variant.

## Files

Created:

- `src/effects/ThemeEffects/solverde/solverdeTheme.js` — tokens, settings, variant schemas and geometry.
- `src/effects/ThemeEffects/solverde/SolverdeTheme.jsx` — environment, dock, predictions and giveaway notification.
- `src/effects/ThemeEffects/solverde/SolverdeTheme.css` — scoped materials and layout.
- `src/components/OverlayCenter/editor/solverdeComposition.js` — explicit reference composition.
- `src/components/OverlayCenter/widgets/giveaway/giveawayFonts.js` — existing font mapping shared without a renderer dependency cycle.
- `public/theme-effects/solverde/{solverde-pt-branco-verde.svg,logo.svg,brand-slide.svg,README.md}` — official source, fitted logo, default slide and provenance.
- `scripts/test-solverde-theme.mjs` — reusable real-browser regression fixture.
- `DOCs/SOLVERDE_THEME_IMPLEMENTATION.md` — this report.

Modified:

- `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js`
- `src/components/OverlayCenter/editor/{BetterWidgetPackages.jsx,WidgetEditorPage.jsx,betterWidgetRegistry.jsx,widgetColourThemes.js}`
- `src/components/OverlayCenter/widgets/bets/BetsWidget.jsx`
- `src/components/OverlayCenter/widgets/chat/ChatWidget.jsx`
- `src/components/OverlayCenter/widgets/current-slot/{CurrentSlotWidget.jsx,CurrentSlotAppearanceControls.jsx}`
- `src/components/OverlayCenter/widgets/giveaway/EmbeddedGiveaway.jsx`
- `src/components/OverlayCenter/widgets/navbar/NavbarWidget.jsx`
- `src/components/OverlayCenter/widgets/shared/{betterWidgetStyles.jsx,colourThemePalettes.js}`
- `src/components/OverlayCenter/widgets/slideshow-frame/SlideshowFrameWidget.jsx`
- `scripts/{test-widget-colour-themes.mjs,test-embedded-giveaway-themes.mjs,test-theme-gallery.mjs}`
- `package.json` and `api/_lib/release-notes.js`.

No migrations, secrets, authentication changes or production data writes.

## Verification

Passed:

| Check | Coverage |
|---|---|
| `npm.cmd run test:solverde` | Reference geometry, open/drawing/winner giveaway placement, empty states, 30-slot hunt, active-card tracking, 2/3/4-card controls, heading/text size, variant toggles, LIVE toggle, replaceable slideshow image/video, appearance isolation, settings reload, reduced motion, theme cleanup and the real published overlay component |
| Solverde visual inspection | Screenshots at 1920×1080, 2560×1440 and 1366×768 compared with the supplied composition; corrected dock alignment and text/surface issues |
| `npm.cmd run test:widget-colour-themes` | 234 combinations: 13 widget types × 18 themes, configuration isolation, reload and preview/OBS-runtime parity |
| `npm.cmd run test:embedded-giveaway-themes` | 324 configuration pairs and 162 rendered states across editor, OBS runtime and sample mode |
| `npm.cmd run test:theme-gallery` | Automatic Premium grouping, real asset loading, selection/reload, 320/240px panel layouts |
| `npm.cmd run test:widget-control-categories` | Existing control categorization |
| `npm.cmd run test:preview-data-parity` | Seven sampled widget types |
| `npm.cmd run test:obs-high-dpi` | Existing output geometry and renderer checks |
| `npm.cmd run validate:widgets` | Registry validation |
| `npm.cmd run test:updates` | 15 authorization cases, caching, catalog and route checks |
| `npm.cmd run build` | Vite production build; existing optional-font and large-chunk warnings remain |

The published Browser Source component was loaded with an isolated publication/database fixture. Screenshot alpha at the gameplay center was zero, and the composed scene added no canvas elements. Test fixtures use controlled data and substitute slot artwork; they do not modify production records or establish third-party integration availability.

Six broader suites do not pass. Each failure was reproduced against committed baseline `e2f1db142c54537ec284dd6b9851cae7afc979c4`, using read-only baseline source substitution without replacing working files:

| Suite | Existing failure |
|---|---|
| `test:appearance-editor` | Landing Connect 4/Bets/Tournament preview source assertion |
| `node scripts/test-appearance-v2.mjs` | Tournament `showcase` quick-picker expectation |
| `node scripts/test-appearance-routing.mjs` | Canonical Bonus Hunt V12 document read returns undefined |
| `node scripts/test-widget-pilot.mjs` | Classic + Requests dispatcher source assertion |
| `test:bonus-hunt-orientations` | Mainstream drawer/list/control expectation |
| `test:current-game` | Existing styled Arctic title check times out at line 122, both current and baseline server |

No lint or standalone TypeScript script is configured in the root package. The production compiler and listed checks ran; this report does not claim nonexistent checks passed. Native OBS Studio, long-session GPU/CPU measurements and live third-party account integrations were not tested.

Screenshots are generated locally in `.codex-dev/solverde-verification/`, including `reference-open.png`, `reference-drawing.png`, `reference-winner.png`, the three reference resolutions, widget-family captures and `published-obs-route.png`.
