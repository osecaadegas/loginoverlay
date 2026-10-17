# Volcanic theme — implementation and verification

## Current refinement — 2026-10-18

This section supersedes the historical reference-rim and coarse-surface instructions below.

- The central frame is removed from both editor and published rendering. Old `referenceFrame`/`idleBackground` values remain stored but cannot draw the removed box.
- Scenery now uses `public/theme-effects/volcanic/volcanic-landscape.webp`: a static 1920×1080 background, 242,896 bytes, with an open dark centre and peripheral lava/obsidian landscape. Turning scenery off leaves a transparent background. **Transparent gameplay opening** optionally cuts out the reference region without drawing a border; it is off by default so the scenery is continuous.
- `public/theme-effects/volcanic/obsidian-grain.svg` replaces the coarse cloudy material in navbar/chat rendering. It uses subtle fine grain with restrained directional lighting, and retains the existing surface toggle, colours and custom image backgrounds.
- Navbar identity, balance, ticker, clock and responsible-play modules share compact default heights, while explicit element overrides still take precedence. The preset uses a 56px bar. Existing 70px bars retain their saved height but use 40px module defaults. Default avatars are smaller. Navbar edge motion is attached inside the actual bar, so it follows that surface rather than the surrounding widget bounds.

Created: the two assets above. Modified: this report; `api/_lib/release-notes.js`; `scripts/test-volcanic-theme.mjs`; `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`, `betterWidgetRegistry.jsx`, `volcanicComposition.js`; `src/components/OverlayCenter/widgets/navbar/NavbarWidget.jsx`; and the three source files in `src/effects/ThemeEffects/volcanic/`. No database migrations. Old asset files are retained for compatibility with explicit saved URLs.

Checks passed: `test:volcanic`, `test:widget-colour-themes` (221 combinations), `test:widget-control-categories`, `test:theme-gallery`, `test:updates`, `validate:widgets`, and the production build. Existing missing-font and bundle-size warnings remain.

Regression coverage includes all five navbar module heights with a controlled cached ticker fixture, old 70px layouts, explicit height overrides, edge containment, old rim flags, scenery visibility, fine-grain decoding, the new opening toggle and reload, plus opaque/default and transparent/optional pixel checks through the real published-overlay component. Published fixtures remount the route for each configuration, matching a Browser Source reload. Native OBS Studio and authenticated production account save/publish are not directly tested.

Background created with the built-in image-generation tool, then encoded as WebP for the project. Final prompt:

> Use case: stylized-concept. Asset type: production 16:9 1920x1080 streaming background, scenery ONLY, no UI. Create a premium cinematic volcanic environment: charcoal-black obsidian terrain, sharp fine basalt rock detail, restrained orange molten fissures running mostly along the lower edge and outermost left/right edges, dark volcanic mountains on the distant horizon, subtle local orange reflected light, cool charcoal atmosphere. Composition must leave the entire large central area (x 25%-77%, y 8%-76%) very dark and visually quiet for gameplay placed above it. Sidebars will cover x 0%-25% and x 78%-100%; navigation covers top 8%; concentrate scenery interest in the open lower middle and far perimeter. Make the scene feel continuous, dimensional and photographic, not a flat texture. Absolutely NO rectangular frame, NO border around the center, NO boxes, NO inset panels, NO interface, NO text, NO logos, NO symbols, NO giant volcano, NO huge flames or smoke clouds, NO brown muddy blur. Crisp obsidian detail and sparse luminous lava seams, subdued elegant darkness, professional streaming background. The image must look good behind independent thin orange-outline widgets.

## Historical implementation notes

## Using the theme

Choose **Volcanic** in the existing widget colour-theme selector. Selecting it changes appearance without moving or resizing widgets. The theme uses existing live data, widget logic, instance configuration, access checks, editor persistence and publication routes.

For the reference composition, use **Volcanic reference layout** in the editor toolbar. This explicit, undoable action arranges existing unique, visible, unlocked reference widgets on the 1920×1080 canvas. Duplicate, hidden, locked foreground and additional widgets retain their geometry. It does not add widgets. An existing Background widget is needed for scenery; an existing Chat and configured giveaway source are needed for the in-chat giveaway. Additional standalone widgets remain under the user's visibility controls.

The preset uses a 468px hunt column, 960px gameplay opening and 438px right column. The gameplay rim is background decoration with a transparent opening, not a video source. Use existing gameplay/capture sources as usual. In custom layouts disable **Reference gameplay rim**, which has the reference position. **Idle gameplay background** is off by default; enabling it intentionally fills that opening.

Background controls independently manage basalt scenery, the reference rim, idle fill and optional ember motion. Motion uses the existing low/balanced/ultra quality names (2/4/8 small edge embers) and respects reduced motion and `themeEffects.enabled`. No Pixi renderer, animated blur, full-screen fire or additional animation dependency is introduced. Static surfaces remain available with effects off.

Volcanic pins giveaways immediately below the chat header. The giveaway visibility toggle and existing active/drawing/winner rules remain functional; inactive giveaways release their space. The unsupported bottom-position choice is hidden only for this theme. Theme selection and effect settings for an embedded giveaway remain owned by chat, following the existing inheritance fix.

The reference hunt uses the existing Mainstream list with an optional **Compact reference hunt** setting. Turning it off restores the featured-slot monitor and its carousel controls. Compact mode hides those unused carousel controls. Both modes retain hunt data, calculations, list scrolling, result drawer and live updates. The preset uses the existing compact prediction variant; semantic option colours and explicit per-option colour overrides are preserved.

## Created files

- `src/effects/ThemeEffects/volcanic/volcanicTheme.js`: shared palette/material variables, normalized environment settings and reference viewport bounds.
- `src/effects/ThemeEffects/volcanic/VolcanicTheme.jsx`: transparent scenery, optional rim/idle fill and bounded CSS embers.
- `src/effects/ThemeEffects/volcanic/VolcanicTheme.css`: theme-scoped surfaces, typography, compact card layouts and edge effects.
- `src/components/OverlayCenter/editor/volcanicComposition.js`: explicit reference preset.
- `public/theme-effects/volcanic/basalt-perimeter.png`: generated transparent basalt/lava scenery, approximately 794 KiB. No interface or text is flattened into the image.
- `scripts/test-volcanic-theme.mjs`: reusable real-browser verification.
- `DOCs/VOLCANIC_THEME_VERIFICATION.md`: this report.

## Modified files

- `src/components/OverlayCenter/widgets/shared/colourThemePalettes.js`: selectable Volcanic palette.
- `src/components/OverlayCenter/editor/widgetColourThemes.js`: readable default fonts and preservation of semantic prediction overrides.
- `src/components/OverlayCenter/editor/betterWidgetRegistry.jsx`: per-instance material tokens for shared rendering.
- `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`: environment controls and relevant conditional settings.
- `src/components/OverlayCenter/editor/WidgetEditorPage.jsx`: undoable preset action.
- `src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx`: environment branch, compact hunt, chat label and compact RTP fit.
- `src/components/OverlayCenter/widgets/chat/ChatWidget.jsx`: top-pinned Volcanic giveaway.
- `src/components/OverlayCenter/widgets/giveaway/EmbeddedGiveaway.jsx`: native compact Volcanic canvas for active and winner states.
- `src/components/OverlayCenter/widgets/navbar/NavbarWidget.jsx`: restrained dark responsible-play capsule for Volcanic.
- `scripts/test-widget-colour-themes.mjs`: include the new registered palette and its contrast checks.
- `package.json`: `test:volcanic` command.
- `api/_lib/release-notes.js`: factual Premium updates entry.

No migrations, environment variables, services, secrets or dependencies were added. Existing camera and Slot Window rendering is not tinted or processed by this theme.

## Verification evidence

The Volcanic browser suite renders the existing components, not substitute interface mockups. It covers 12 foreground widget families plus Background, three canvas resolutions, populated and empty data, open/drawing/winner giveaways, preset immutability/idempotence and protected geometry, all three hunt cards fitting above the footer, image/video playback, appearance overrides, environment controls and serialized reload, quality counts, reduced motion, theme cleanup and zero additional GPU canvases.

It also mounts the actual `BetterObsOverlay` route component under `/obs/overlay/:publicOverlayId`, using the existing isolated test database helper for published layouts and live source records. The published screenshot's gameplay-center alpha is asserted to be zero. This validates the real publication renderer and layout/data loading path without production account writes. An initial fixture used an unversioned router dependency and therefore had an empty route context; it was corrected to use the application's matching dependency URL.

Screenshots are captured in `.codex-dev/volcanic-verification/`, including reference states, per-widget views, three resolutions and `published-obs-route.png`. Iteration corrected clipped giveaway content, slot-card/footer fit, result readout sizing, the prediction variant's minimum dimensions and the current-game panel proportions.

Checks executed successfully during implementation:

- `npm.cmd run test:volcanic`
- `npm.cmd run test:candy`
- `npm.cmd run test:embedded-giveaway-themes` — 289 palette pairs and 153 render cases after adding the seventeenth theme.
- `npm.cmd run test:widget-colour-themes` — 221 widget/palette combinations, including reload, controls and available runtime rendering.
- `npm.cmd run test:updates` — 15 authorization cases plus catalog/route checks.
- `npm.cmd run test:preview-data-parity` — seven sampled widget families.
- `npm.cmd run test:widget-control-categories`
- `npm.cmd run validate:widgets`
- `npm.cmd run build` — existing missing custom-font and large-chunk warnings remain.
- `git diff --check`

The control-category check initially hit the Windows sandbox's Vite realpath permission restriction; rerunning with the required filesystem permission passed. No checks were disabled.

Native OBS Studio, real third-party chat/casino integrations, authenticated production save/publish, long-session CPU/GPU/FPS measurements and hardware-specific behavior are not directly tested. No native OBS performance guarantee is claimed. The reference is recreated with a new scenery asset, not a pixel-identical copy.


## Living widget edges

Volcanic navbar and chat now share a small decorative DOM layer with a slowly pulsing molten border and edge-only sparks. It uses opacity/transform CSS animations, no timers, listeners, textures or additional canvas. Reduced motion hides this layer; disabling theme effects or Living lava edges removes it. Low/Balanced/Ultra use 2/4/6 sparks per supported widget. Controls are offered only on navbar and chat, and values remain in each instance's existing configuration.

Modified files for this addition: the three files in src/effects/ThemeEffects/volcanic/, editor/betterWidgetRegistry.jsx, editor/BetterWidgetPackages.jsx, scripts/test-volcanic-theme.mjs, api/_lib/release-notes.js and this report. No files or migrations were created.

The regression suite checks changing computed animation opacity, bounded noninteractive effects, reduced motion, independent widget toggles, quality control changes, saved-config reload into the actual published overlay component, disabling effects and theme-switch cleanup. Native OBS Studio remains unverified. The first browser launch was blocked by the sandbox; the rerun uses approved browser-launch permissions. Testing also caught and corrected the shared display-contents wrapper's missing animation bounds.


## Portrait results, RTP rim and basalt surfaces

Best/worst result artwork now keeps a 2:3 portrait aspect ratio within the available card height, including the short reference drawer. The RTP surface draws a continuous inner rim in the configured rim colour even when its outer border width is zero; existing appearance shadow overrides retain precedence. Navbar and chat gain a shared static, tiled basalt-grain asset and warm radial highlights. Existing configured colours remain below the texture, custom image backgrounds remain intact, and the surface can be switched off per widget. Floating/stack chat styles remain transparent and unsupported navbar variants do not expose the texture control.

Created: public/theme-effects/volcanic/basalt-surface.svg. Modified: src/effects/ThemeEffects/volcanic/volcanicTheme.js and VolcanicTheme.css; src/components/OverlayCenter/widgets/chat/ChatWidget.jsx, widgets/navbar/NavbarWidget.jsx and widgets/shared/betterWidgetStyles.jsx; src/components/OverlayCenter/editor/BetterWidgetPackages.jsx; scripts/test-volcanic-theme.mjs; api/_lib/release-notes.js; this report. No database migrations.

Regression assertions cover both result faces' portrait dimensions, computed navbar/chat texture layers, configured orange inner rims, zero-width outer borders, texture controls and texture-off persistence through reload into the published overlay renderer. The existing suite also checks three resolutions, giveaway placement, media, effect cleanup and transparent gameplay. Native OBS Studio and authenticated production save/publish remain manual verification items.
