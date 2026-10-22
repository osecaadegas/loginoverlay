# QA — v3.2.6 Cloud Rebuild (synthetic and simulated only)

## Baseline root cause

v3.2.5 `gasRibbon` used `.90` Toxic / `.86` Smoke as a maximum silhouette-opacity target, while `gasOpacityCoverage` counts only pixels whose alpha is >=250 and `main.go` refuses camera-off below 98.5% cover. Consequently Smoke/Toxic could remain in their cover phase with the camera still visible.

## Results obtained in this Linux development container

- `go test ./...` — PASS
- `go vet ./...` — PASS
- `go test -race ./...` — PASS
- Windows x64 GUI EXE cross-compilation — PASS
- Node syntax validation for the full embedded inline JS — PASS
- `python test_clouds_326.py` (Chromium renderer, 640×360): Smoke and Toxic at full cover each measured **100%** silhouette-opacity coverage. Both returned **zero nontransparent output pixels at completion**. No page errors.
- `python test_smoke_motion_v32.py`: Smoke and Toxic both changed during 0.5-second covered holds, and the sampled cover→release boundary difference was **0.0** when the simulated age matched.
- `python test_native_integration.py`: mock OBS source installation, IN/OUT on all four effects, correct camera state, opaque camera cover, reject unsafe cover, and reject transparent FX screenshot — PASS. The mock does not substitute real OBS Browser Source recording.
- 1920×1080 headless Chromium software-only, 15 isolated draws per effect (not a gaming+OBS benchmark): Smoke median **6.8ms** and p95 **17.2ms**; Toxic median **7.0ms** and p95 **20.0ms**. Both measured 100% synthetic cover. A 60FPS OBS claim would be inappropriate from these figures.
- Money and Ice render-function source regions are byte-for-byte unchanged relative to the v3.2.5 source zip.

## Production blockers still open

1. Real Windows OBS Studio with a physical keyed webcam, including actual source screenshot matching the FX image at full cover.
2. Program-output 1080p60 recording under a gaming load, testing frame pacing, correct concealment/reveal, and no cloud stuck onscreen.
3. Native per-frame alpha tracking; Browser Source still begins from a static captured silhouette and widened margin.
4. Windows installer/uninstaller, update rollback and code-signing certification.
5. Independent VFX art-direction approval; new procedural gas is improved relative to the previous full-width curtain but not photorealistic film-simulation quality.

**Release gate: private test candidate only. Do not publish as production-ready.**
