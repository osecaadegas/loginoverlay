# Space / Orbital

Select **Space / Orbital** in the existing Colour Theme section at `/overlay-center/appearance`. It is available for all 13 existing widget types. The theme changes materials and presentation; widget data, positioning, saved builds, authentication and publications retain their existing paths.

## Configuration and OBS

The **Overlay Background** widget exposes Off (transparent), Earth Orbit, Deep Space, Earth Night and Earth Sunrise. Environment intensity, Earth visibility, atmosphere glow, stars and star intensity remain independent. Background Animation freezes environmental motion without removing the scene.

Other widgets expose HUD glow and rim particles. Low / Medium / High quality and the animated-effects switch are available on both backgrounds and panels. Switching off animated effects preserves the static material. Element appearance overrides and existing widget colour fields still take precedence over theme defaults. Betting ranges, player colours, artwork and financial data retain their meaning.

OBS composites browser sources as whole images: the site cannot detect or reorder an external game capture. Put the background widget's existing standalone Browser Source **below** game capture. For widgets above gameplay, use the full overlay with its Space Environment set to **Off**, or use individual widget sources. A full overlay with the environment enabled belongs below game capture. Off produces zero-alpha pixels across the entire background and effect canvas.

## Rendering and performance

- Earth and its cloud/atmosphere layers live inside the existing background widget's stacking context. They never enter the foreground effect canvas.
- One existing Pixi renderer draws the measured HUD rims, dust and finite event pulses. It also advances paused GSAP timelines for the background DOM layers. There are no new React animation loops or secondary rendering engines.
- Ambient stars use three SVG groups, moving at different speeds. Earth and clouds drift over 120 seconds; HUD scans occur roughly every 24 seconds.
- Quality budgets are capped at 40 / 90 / 150 stars and dust particles across the entire orbital scene, including multiple background instances. Devices reporting four or fewer CPU cores or 4 GB or less device memory use the low budget and renderer quality.
- Visibility/intersection pausing is shared with other themes. Reduced motion and static-only orbital scenes stop continuous Pixi rendering; geometry/configuration changes still paint an updated static frame.
- Bonus opening, super/extreme bonuses, win events, giveaway winners, tournament outcomes and existing shoutout events use the existing event bridge. Major bonus events briefly brighten rims and atmosphere, then settle. Orbital replaces the hunt's legacy confetti and tournament's local shatter animation with pooled effects.
- Preview mode changes reuse the same WebGL context. Reinitializing Pixi on a destroyed canvas previously caused a shader-probing hang during mode transitions.
- Earth WebP: 151,168 bytes. Thumbnail WebP: 8,754 bytes. No additional runtime dependencies or database migrations.
- Real OBS performance depends on browser-source resolution, active widgets and the streaming machine. Chromium regression checks are not a hardware-certified 60 FPS benchmark.

## Files

Created:

- `src/effects/ThemeEffects/orbital/orbitalTheme.js`: tokens, validated settings and shared budgets.
- `src/effects/ThemeEffects/orbital/OrbitalEnvironment.jsx`: background surfaces.
- `src/effects/ThemeEffects/orbital/OrbitalTheme.css`: scoped HUD/glass/metal materials.
- `src/effects/ThemeEffects/orbital/orbitalNode.js`: nodes within the existing Pixi/GSAP engine.
- `public/theme-effects/orbital/earth-orbit.webp`, `public/theme-effects/orbital/preview.webp`: optimized generated artwork.
- `scripts/test-orbital-theme.mjs`: browser, transparency, configuration and motion regression checks.
- `DOCs/SPACE_ORBITAL_THEME.md`: this guide.

Modified:

- `src/components/OverlayCenter/widgets/shared/colourThemePalettes.js`
- `src/components/OverlayCenter/editor/widgetColourThemes.js`
- `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`
- `src/components/OverlayCenter/editor/betterWidgetRegistry.jsx`
- `src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx`
- `src/components/OverlayCenter/widgets/tournament/ShatterEffect.jsx`
- `src/components/OverlayCenter/OverlayControlCenter.jsx` (shared effect layer in its existing inline preview; prior rail-button work retained)
- `src/effects/ThemeEffects/themes/themeDefinitions.js`
- `src/effects/ThemeEffects/themeEffectsConfig.js`
- `src/effects/ThemeEffects/ThemeEffectsLayer.jsx`
- `src/effects/ThemeEffects/PixiEngine/createPixiThemeEngine.js`
- `src/effects/ThemeEffects/targetBounds.js`
- `src/effects/ThemeEffects/emitIceEvent.js` (existing event bridge retained for compatibility)
- `scripts/test-widget-colour-themes.mjs`
- `scripts/test-editor-builds.mjs`
- `package.json`

## Verification

`npm.cmd run test:orbital-theme` covers all widget types, the five environments, actual pixel alpha for Off, 1920×1080 / 2560×1440 / 1366×768, one canvas per overlay, bounded particles, saved-layout normalization, range-colour preservation, event routing, reduced motion, hidden-tab pausing and the settings controls. Screenshots and the result are generated under `.codex-dev/orbital-verification/` only for local testing.

`npm.cmd run test:widget-colour-themes` covers 195 widget/palette combinations, readable colours, customization isolation, reload and editor/OBS parity.

`npm.cmd run test:editor-builds` exercises the existing layout service with an isolated test database, including Orbital configuration save/reload/publication and owner/build isolation. It does not mutate live accounts.

Also run `npm.cmd run test:theme-effects`, `npm.cmd run test:background-editor`, `npm.cmd run validate:widgets`, and `npm.cmd run build`.

The broader `test:appearance-editor` currently stops on its existing static assertion about the landing-page demo source at line 238. Neither that assertion nor the landing page was changed by this theme. Existing missing custom-font files also produce build warnings; unrelated local deletions have been preserved.
