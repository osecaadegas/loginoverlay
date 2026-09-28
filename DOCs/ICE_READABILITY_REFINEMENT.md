# Ice readability and integration refinement

## Causes and corrections

- The old `frost-edge.png` has several bright rectangular strokes baked into the asset. Pixi stretched these over each surface, alongside its DOM border. Ice now uses the existing corner frost's natural alpha falloff instead of this full-frame sprite. The asset remains available for compatibility, but this renderer no longer loads it for Ice.
- The frost mask cut a hard inner rounded rectangle through that texture, producing another box boundary. It now clips only the outside, with an inset-adjusted radius. Target registration, positions, dimensions and renderer sizing are unchanged.
- Stretching the remaining corner texture across tall panels produced long branches over labels. Four cached atlas views now retain their aspect ratio and bounded corner size, with deterministic opacity/scale variation. They share the existing GPU texture source and replace the full-panel frost quad; no new bitmap is allocated.
- Bingo's decorative pseudo-element and the slideshow's inner decoration added separate inset strokes. Those strokes/shadows are removed for Ice; the actual DOM frame remains.
- Embedded giveaway retained its standalone pseudo-frame after its outer border was cleared. Its header also inherited a separate material slab. Embedded Ice giveaways now share chat's frame, with a transparent header, quieter metrics, cold gift icon and a clearly emphasized entry keyword. Existing placement, fitting, roulette, participants, state transitions and shoutout hand-off are preserved.
- Completed Bingo tiles inherited `screen` blending over a darkening gradient, making their texture unexpectedly bright. Explicit normal blending restores a dark reading zone. Responsive labels/multipliers can now reach their configured size in shorter boards; the grid geometry is unchanged.

## Layering

The existing canvas remains transparent and non-interactive at z-index 1000000 above the widget DOM. Its background/behind/inside/foreground containers order Pixi content; they do not interleave the DOM. Static panel material remains a DOM background below text. Sparse corner frost and edge shards use the foreground; their transparent centers preserve content. Editor selection/interaction controls remain above the canvas at 1000002. Raising z-index was neither necessary nor used.

## Material and bar details

The top bar and RTP bar each receive two deterministic groups of small crystalline facets, using the cached event-shard texture. Low uses four static sprites per bar; Balanced/Ultra use six. Facets are sized and positioned only during geometry changes, within the narrow material rim. Existing selected icicle clusters remain.

Primary panels have darker central reading zones with brighter material near edges. Chat, tournament cards, Best/Worst/request cards, shoutout and giveaway insets use alpha mist and translucent gradients instead of another opaque photographic texture. Media retains its edge veil with a quieter inner frame. No texture files, dependencies, persistence formats or database migrations changed.

## Cost controls

- Removed one full-surface edge sprite per Ice target and its stroked texture load.
- Removed unnecessary noise layers hidden under opaque material on the primary surfaces.
- Removed Bingo's 14px backdrop blur and permanent sheen animation on every completed Ice cell; finite shared-engine completion events remain.
- Static bar facets add no ticker callbacks, filters or particle systems.
- Existing renderer count, 30/60 FPS caps, DPR caps, pooling, texture caching and hidden/offscreen suspension remain intact.

The seven-target Balanced regression scene retains 91 ambient particles and zero DOM rectangle reads during its idle/animated-child samples. Software-rendered headless Chromium timing fluctuates substantially; this does not establish an OBS hardware GPU/CPU improvement or a long-duration soak result.

## Validation

The existing theme-effects browser suite covers Low/Balanced/Ultra, full overlay, standalone Bingo/Hunt/chat/media/tournament, loaded media, embedded giveaway/shoutout, finite events, repeated theme switching, offscreen pause/resume, exact bounds, actual editor drag/resize and reload. Added dense scenes at 1920x1080, 1280x720 and 960x540 include populated Hunt, tournament, active Bingo, media, role messages and giveaway. Assertions check the keyword remains visible, the embedded header has no separate surface, the inset pseudo-frame is absent, labels reach a readable reference size and completed tiles have no permanent sheen.

Screenshots and performance samples stay untracked in `.codex-dev/ice-integration-review/` and `.codex-dev/ice-integration-perf.json`. Fine secondary text necessarily becomes small when an entire dense 1080p overlay is viewed at half size; larger configured text/widgets remain necessary for very small viewing windows. No universal readability guarantee is made for arbitrary user sizing.

Production build, widget validation, Bingo configuration and theme-effects regression pass. The build retains its existing large-chunk warning. `test:appearance-editor` still fails its unrelated exact-source assertion at line 925: it expects the old Bonus Hunt list-height expression; the different expression already exists in the parent commit and was not changed here. The browser fixture intentionally blocks external catalog requests under its strict CSP, and its Vite-only server has no `/api/slot-ai`; these exercise existing fallback behavior without production data writes.

Broadcast/Community chat regression also passes (roles, IRC, filtering, emotes, layout and reduced motion), as does the cross-theme suite's 168 palette combinations with reload and editor/OBS parity.

## Files

- `src/effects/ThemeEffects/PixiEngine/createPixiThemeEngine.js`
- `src/effects/ThemeEffects/ThemeEffects.css`
- `scripts/test-theme-effects.mjs`
- `DOCs/ICE_READABILITY_REFINEMENT.md` (new)
