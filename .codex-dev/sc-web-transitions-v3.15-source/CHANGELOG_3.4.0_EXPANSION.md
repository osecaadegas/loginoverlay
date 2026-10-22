# SC Web Transitions 3.4.0 Expansion RC1 — Changelog

## New renderer families
- Void Glitch: digitized silhouette, channel-noise accents and pixel breakup.
- Lightning Surge: branched electrical arcs, discharge and sparks.
- Shadow Swarm: curved dark fragments and flock-like dispersion.
- Holy Ascension: luminous silhouette, ascending light rays and dust.
- Sand Disintegration: granular coating with wind-driven particulate breakup.
- Crystal Growth: faceted purple-mineral breakup and crystalline highlights.
- Petal Bloom: individually moving petal geometry and wind motion.
- Neon Plasma: glowing ribbons and flowing energy trails.

All eight include dedicated silhouette cover, OUT dispersal, IN reconstruction, and IN reveal phases. None requires replacement of existing money or ice choreography.

## Windows application and backend
- Added selectors for eight new effects (13 total).
- Added `expansion-effects.js` as separate renderer module; bundled into Windows executable and served locally.
- Added per-effect accent, motion and detail settings, persisted with existing settings file.
- Added effect-name and tuning validation in Go.
- Retained OBS camera-state handoff, scene-item verification, Recover Camera, keyboard controls and Stream Deck-compatible actions.
- Improved accent use for the additional particle categories during the final QA pass.

## Important limitations
- All new effects currently use Canvas2D and snapshot-based alpha. This is a functional extension, not film-grade 3D VFX.
- The IN/OUT camera safety logic is tested against a simulated OBS WebSocket server. Real Windows OBS and physical webcam validation remain outstanding.
- 1080p Chromium measurements are synthetic isolated draw calls; they are NOT gaming/OBS performance certification.
- Executable is unsigned. Installation/upgrade/rollback testing on production Windows machines is outstanding.
