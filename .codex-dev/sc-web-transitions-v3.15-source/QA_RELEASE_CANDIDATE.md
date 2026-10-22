# QA checklist for v2.6.4 beta

## Automated verified
- Go compilation and Go test suite.
- Mock OBS WebSocket tests: all four effects IN/OUT, renderer instance binding, source blank safety, invalid alpha detection, and live camera state changes.
- JavaScript parser checks for overlay and GPU renderer.
- Freeze-regression code audit: Smoke/Toxic render branches do not draw captured webcam image in either 2D or GPU mode.

## Needs real OBS sign-off
- Money OUT freeze + full silhouette assembly + falling bills + final lens slide, 1080p60 on a keyed actual webcam.
- Money IN must return to visibly moving live camera with no stale flash.
- Black Smoke and Toxic must show live moving person during gas buildup, switch off invisibly under dense gas, and reveal the moving person early during IN.
- No camera snapping at hide/reveal points, crop/mirror correct for all OBS transforms.
- 60fps actual OBS renderer, acceptable GPU/CPU under streaming workloads.
- Windows installer/shortcut update and Stream Deck hotkeys on a physical Windows machine.

Do not claim Hollywood-quality or publish app to customers before checks pass.
