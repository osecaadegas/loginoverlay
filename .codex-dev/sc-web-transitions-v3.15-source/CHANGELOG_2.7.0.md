# v2.7.0 Cinematic Money Release Candidate

**Baseline:** v2.6.5. The existing Go backend, OBS WebSocket workflow, Windows bootstrapper, desktop shortcut, hotkey manager, original golden-sheep bill, Ice, Black Smoke and Toxic Cloud are retained.

## Rebuilt: Money Burst
- 45/40/15 initial large/medium/small banknote mix, randomized composition instead of uniform rows.
- Alpha silhouette coverage measured by rasterized banknote geometry. Adaptive *individual-note* gap filling. No frozen webcam image drawn during cover.
- OBS camera-off protocol now requires at least 98.5% measured coverage; backend rejects low or absent coverage data.
- Physical-feeling staged bill drop and directional blast with independent rotational motion.
- Replaced simple final-hero scaling with a 12-strip UV-textured, piecewise perspective bill ribbon including flexible depth and camera-lens slide.
- Clean-exit test ensures frame is fully transparent at Money OUT completion.
- Money IN has distinct assembly and reveal choreography.

## Application controls
- Rendering quality presets: Performance, Balanced, Cinematic, Ultra. Preserve older users' settings by defaulting absent values to Cinematic.
- OBS-ready checks and local hotkey/Stream Deck behavior preserved.

## Regression coverage
- Added synthetic browser visual-coverage, timing, rendering and Ice regression tests.
- Backend integration tests now reject 80% Money cover signals before camera-off.
- Smoke/Toxic frame-continuity and 720p/1080p software-render performance tests passed without visual rewrites.

## Unresolved
- No real Windows OBS capture hardware or GPU 1080p60 sign-off was possible in the test environment.
- The local Chromium sandbox blocked direct localhost navigation during combined Chromium + mock OBS playback, although separate browser renderer and Go mock-OBS tests passed.
- Continuous live-silhouette tracking is not implemented. A cached start-of-transition alpha mask is used.
- Software-rendered Money 1080p performance is above the 16.67 ms 60fps budget in one test; GPU-backed Windows validation and additional optimization are required before public release.
