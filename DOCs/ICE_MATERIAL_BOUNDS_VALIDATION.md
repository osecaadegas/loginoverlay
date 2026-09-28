# Ice material and bounds correction

## Causes and fixes

- Bonus Hunt's `.better-hunt-shell` has 18px padding and centers a fitted `.better-hunt-panel`. The effects used the saved editor rectangle, and the generic Ice container CSS also painted the outer `.better-hunt-root`. These produced a separate, oversized shell. Ice now measures the painted panel and leaves the fitting wrapper transparent. No widget sizing or padding was changed.
- Ice target rectangles are converted from screen coordinates using the canvas's measured CSS size and logical dimensions. The panel's rendered border radius is included. ResizeObserver watches the canvas, host and visible panels; batched mutation observation catches movement and content replacement. Geometry is updated without rebuilding particle systems. Canvas resizing occurs before measurement.
- Better RTP and chat use different root markers from the generic widget-element selector. Their actual painted roots are now selected explicitly.
- An opaque gradient covered the previous nearly featureless glass texture. The new crystal material sits below partially transparent shading and DOM content. Top/bottom highlights and lower inset shadows give panels depth.
- The same corner frost asset was used twice. The edge and corner assets are now distinct. Stronger frost is masked to an interior edge band rather than crossing labels. Crack highlights remain restrained; material detail comes primarily from CSS backgrounds.
- Shimmer's pivot previously mixed texture-local units with resized pixel dimensions. Ice uses a normalized sprite anchor.
- Selecting a widget elevated its whole opaque surface above the FX canvas. Only the selection outline, tag and resize handles now occupy the editor UI layer; the widget keeps its saved stacking order and existing interaction handlers.
- The production OBS CSP disallows blob workers. Pixi's default image worker could leave texture loading pending. The existing Pixi texture loader now uses asynchronous non-worker decoding, retaining Assets caching and the existing CSP.
- Overlapping updates during texture/theme transitions could rebuild the same target twice. Matching updates now wait for the pending build; interrupted fades settle their promise, and the latest geometry is then applied.

## Rendering order

The architecture still uses one transparent, pointer-inert Pixi canvas per full overlay or standalone source. The canvas is above widget DOM; its named background/inside/foreground containers describe **Pixi ordering**, not separate DOM compositing planes. Static glass and shading are CSS backgrounds underneath DOM text. Pixi adds masked edge frost, sparse cracks, mist, reflection sweeps and pooled particles above those surfaces. The separate editor selection layer stays above the canvas. No text or controls were moved into canvas.

Icicles now use a compact alpha WebP in deterministic, spaced clusters: four under the top bar, two at selected large panel edges. Only top-bar icicles intentionally extend slightly below their frame. They use normal blending to preserve natural ice luminance; frost, cracks and shimmer retain screen blending. No global canvas-opacity increase, new renderer, bloom filter or particle-count increase was introduced.

## Assets

Generated using the built-in image tool and compressed with Sharp:

- `public/theme-effects/ice/ice-glass.webp`: 512×512, 88,606 bytes. Prompt direction: seamless orthographic dark frozen glass, cloudy crystalline variation, fine branching frost, tiny trapped bubbles, subdued silver detail; no frame, text, HUD or scene. Tile continuity is visually approximate, not a mathematically guaranteed periodic texture.
- `public/theme-effects/ice/icicle-cluster.webp`: 512×205, 20,714 bytes, retained alpha. Prompt direction: seven irregular translucent icicles attached to a narrow frost lip, variable lengths, transparent surroundings, natural refraction; no solid beam or neon.

Existing Ice assets were retained. Other theme palettes/assets and saved configuration were not changed. No dependencies, migrations or settings schema changes were added.

## Validation

`scripts/test-theme-effects.mjs` exercises actual widget components with the shared renderer and strict CSP. It checks one canvas, alpha support, pointer transparency, DPR presets, fitted target bounds, scaled/moved/resized geometry, standalone Bingo/Bonus Hunt/slideshow, repeated Ice/Gladiator switches, and the actual editor selection/resize controls using the repository's isolated test database. Real account data is never modified by these tests.

Set `ICE_SCREENSHOTS` to a local artifact directory to capture 1920×1080 LOW/BALANCED/ULTRA scenes, Bonus Hunt/top-bar close-ups, standalone widgets and editor preview. Generated screenshots are not production assets and are not committed.

Performance: two new compressed textures total about 107 KiB. Particle budgets, FPS/DPR limits and one-renderer architecture are unchanged. Masks redraw only when geometry changes; observers batch measurements. Hardware OBS frame-time and multi-hour GPU-memory testing still require a streamer workstation; headless software-WebGL tests are not an OBS benchmark.

Known unrelated check: `test:appearance-editor` has an exact-source assertion expecting `height: drawerMode === "contain" ? undefined : listHeight`, while existing Bonus Hunt code includes the `panelHeight` alternative. That widget source and assertion were left unchanged. Production build retains its existing large-chunk warning; editor service tests emit existing server-rendered useLayoutEffect warnings.

Final local results (2026-09-28): `npm run build`, `npm run test:theme-effects`, `npm run validate:widgets`, and `npm run test:editor-builds` passed. The final effects run had no browser exceptions, effects errors or missing texture requests. LOW/BALANCED/ULTRA, standalone Bingo, Bonus Hunt close-up, top-bar close-up and actual editor-preview screenshots were visually inspected. The browser regression also confirms that dragging and resizing change the actual editor geometry while FX remain aligned. Screenshots use controlled local layouts, not a production account or an OBS application session.

## Files

Created: this report, `src/effects/ThemeEffects/targetBounds.js`, and the two Ice WebP assets above.

Modified:

- `src/effects/ThemeEffects/ThemeEffectsLayer.jsx`
- `src/effects/ThemeEffects/ThemeEffects.css`
- `src/effects/ThemeEffects/PixiEngine/createPixiThemeEngine.js`
- `src/effects/ThemeEffects/themes/themeDefinitions.js`
- `src/components/OverlayCenter/editor/WidgetEditorPage.jsx`
- `src/components/OverlayCenter/editor/WidgetEditorPage.css`
- `scripts/test-theme-effects.mjs`
