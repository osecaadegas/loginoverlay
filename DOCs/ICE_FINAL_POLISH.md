# Ice material and effects refinement

The existing React widgets, ThemeEffects renderer, editor layout, saved configuration and OBS URLs remain in place. This pass changes Ice materials, finite visual events and effects scheduling. No dependencies, database migrations or texture files were added or replaced.

## Visual work

- Background: quiet cold radial lighting, cloudy texture and existing mist; no panel-shaped frost/cracks around the scene background. Transparency remains supported.
- Bingo: deeper slab shading, quieter incomplete tiles, distinct completed surfaces, cold-white FREE border, dark readable multiplier pills and asymmetric texture placement.
- Bonus Hunt: coherent outer glass and normal list-card surfaces; Super/Extreme retain recognizable gold/red status colours. Best/Worst and request cards share the frozen inset material.
- Top bar: layered specular shading; selected icicle clusters vary in width, length, spacing, mirroring and opacity.
- Chat: darker, less glaring standard/role cards. Slot-request command messages inherit this treatment through the existing message renderer; no new request-parsing feature was introduced.
- Embedded giveaway: remove the nested outer shell visually, retain its existing dimensions/controls/reel behavior, and integrate the header, metrics and winner state with chat.
- Shoutout: frozen inset framing, quieter header/footer, removal of decorative scanlines/corner dots, and an edge-only media veil. Clip sizing and entry/exit behavior remain unchanged.
- Slideshow: edge-masked frost and inner vignette integrate displayed media while keeping its center clear; textured condensation remains in the empty state.
- Tournament: panel/player-card material across six layouts, cold success/loss accents for esports/grid, and a finite crystal impact using the existing engine.

Material transforms use independent deterministic target seeds, computed at setup/resize. Existing assets are mirrored/cropped/offset; opacity and icicle group proportions vary without changing between reloads. The DOM keeps the precise border and radius. Removing three additional Pixi outline strokes per Ice target eliminates parallel inset seams without changing target registration or bounds.

## Event integration

`emitIceEvent` emits a local bubbling DOM event. ThemeEffectsLayer resolves its existing registered widget and maps the source element center into that target's coordinates. The current Pixi engine reuses its shard pool; it does not create a renderer per event.

- Tournament Ice impacts replace the separate 2D tessellated-image shatter (roughly 180 clipped triangles, shadow blur and sparks) with 5/10/14 textured shards for Low/Balanced/Ultra. Varied narrow facets, staggered rotation, restrained opacity and decelerating travel settle in roughly one second. The existing 3.5-second match hand-off is preserved. Theme changes/unmount cancel timers, image callbacks and animation frames.
- Bingo completion and Bonus Hunt wins use properly pixel-sized shards. The old `scale.set(0.7)` overwrote configured pixel dimensions with a size based on the source bitmap; this is corrected. Ice win overlays retain their DOM labels/numbers but omit 26-100 confetti elements and rings. A lifetime timer also clears Ice win badges when widget animations are disabled (CSS `animationend` does not fire in that mode). Super/Extreme opening transitions emit a short pulse/burst; ambient carousel rotation does not repeatedly celebrate.
- Giveaway winners and shoutouts route finite accents to the parent widget's shared pool. Reduced-motion users skip emitted bursts. CSS material remains available if effects are disabled or WebGL fails.

## Performance findings and changes

The two host-wide mutation observers previously treated descendant animation style changes as geometry/event work. Geometry observation now reacts to actual surface/ancestor changes and discovered target roots; ResizeObserver still handles size changes. Event observation filters to state-bearing elements. Removed targets are unobserved and event counters are pruned.

Ice material sprites now share one container mask and frost sprites share one edge mask, reducing repeated stencil boundaries. Additional border draws are removed. Snow budgets scale with target area, avoiding disproportionate snow on tiny bars. Offscreen targets are culled, offscreen canvases pause via IntersectionObserver, document visibility still pauses rendering, and identical renderer resize calls are skipped. All event tweens are killed during destruction. FPS/DPR quality caps and cached texture loading remain unchanged.

The same seven-target 1920x1080 Balanced fixture was profiled for four seconds before and after:

| Metric | Before | After |
| --- | ---: | ---: |
| Ambient particles | 111 | 91 |
| DOM rectangle reads during descendant animation | 32 | 0 |
| DOM rectangle reads in idle sample | 17 | 0 |
| Idle scripting time | 191 ms | 35 ms |
| Animated-child scripting time | 212 ms | 186 ms |

These are local headless Chromium/SwiftShader samples, not hardware OBS benchmarks. Frame rate and aggregate task times were noisy; no reliable GPU percentage or multi-hour memory claim is made. The structural reductions, one-canvas event assertion and offscreen stop/resume are covered directly. Reports are local `.codex-dev/ice-perf-before.json` and `ice-perf-after.json`; temporary artifacts are not committed.

## Files

Created:
- `src/effects/ThemeEffects/emitIceEvent.js`
- `DOCs/ICE_FINAL_POLISH.md`

Modified:
- `src/effects/ThemeEffects/ThemeEffects.css`
- `src/effects/ThemeEffects/ThemeEffectsLayer.jsx`
- `src/effects/ThemeEffects/PixiEngine/createPixiThemeEngine.js`
- `src/effects/ThemeEffects/themes/themeDefinitions.js`
- `src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx`
- `src/components/OverlayCenter/widgets/raid-shoutout/RaidShoutoutWidget.jsx`
- `src/components/OverlayCenter/widgets/tournament/ShatterEffect.jsx`
- `src/components/OverlayCenter/widgets/tournament/TournamentWidget.jsx`
- `scripts/test-theme-effects.mjs`

## Validation

- Production build passes (existing large-chunk warning).
- Theme-effects browser checks pass: Low/Balanced/Ultra, full scene, standalone widgets, loaded local media, embedded giveaway/shoutout, real tournament winner transition, win overlay without DOM confetti, moved/resized bounds, repeated Ice/Gladiator switches, one renderer, pointer transparency, offscreen pause/resume and actual editor resize handles.
- Broadcast/community chat checks pass: role messages, filtering, IRC, emotes, shoutouts, responsive layouts and editor/OBS parity.
- Colour-theme checks pass: 168 palette combinations, isolated settings, reload and editor/OBS parity.
- Mainstream carousel containment passes 60 configurations.
- Editor build/service checks and widget validation pass. Existing server-rendered `useLayoutEffect` warnings remain.
- Appearance-editor check reaches a pre-existing exact-source assertion at line 925 expecting `height: drawerMode === "contain" ? undefined : listHeight`. HEAD already contains the newer `panelHeight` branch; that unrelated assertion was not altered. Runtime containment/resize tests pass.

Screenshots under `.codex-dev/ice-final-review/` cover full 1920x1080 quality modes, Bingo, Bonus Hunt, chat, top bar, media with an image, giveaway, shoutout, tournament layouts/impact, hunt event, Best/Worst and editor. The tournament screenshot uses test-only slowed GSAP timing to make the short shard event inspectable. Normal production timing is unchanged.

The fixture mounts real components with controlled test state and never writes to a production account. Its strict CSP intentionally blocks the Bonus Hunt external slot-catalog lookup, exercising the existing image fallback. Live Twitch video/network behavior and a multi-hour hardware OBS session remain manual validation limits. Optional follow-up: hardware OBS profiling on the streamer's actual source resolution/device, and bespoke additional frost artwork if desired.
