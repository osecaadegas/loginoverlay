# QA — v3.14.0 Raymarched Gas RC1

## Passed

- `go test ./...`, `go vet ./...`, JS `node --check` and Windows x64 cross-build.
- New Go route test fetches `/gas-vfx3d.js` and checks production shader tokens.
- Exact shipping WebGL2 GLSL `#version 300 es` shaders compiled and linked on Mesa EGL OpenGL 4.5.
- Offscreen real shader execution with exact seeded 64x64x64 JS-generated 3D noise volume for both Smoke and Toxic.
- Safe cover on synthetic keyed subject: 100% opacity at the final GPU cover frame in Mesa simulation.
- Final GPU release frame: transparent for both effects.
- Actual GPU contact sheets created from shader output at 640×360; no web/stock/reference imagery.

## Not verified

- WebGL2 Chromium integration could not run in this restricted container. The browser reported unavailable WebGL2 and exercised the 2D fallback instead. Therefore 3D WebGL2 DOM compositor, hardware decode, and OBS/CEF handoff integration require validation on Windows.
- No measured 1080p60 performance on the user's GPU.
- Full optical correctness of the guard for every webcam crop/pose in real OBS is not proven.

## Release gate

**Private experimental RC. Test off-stream first.** Stop if FPS falls or the camera fails to restore. Keep v3.13.4 as rollback. Use `Canvas2D compatibility` if WebGL2 is unavailable, but that displays the previous 2D visual quality.
