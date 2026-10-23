# Validation — SC Web Transitions 3.16.0

Date: 2026-10-23. Previous source: 3.15.0-cinematic-plate-engine-rc1.

## Actual hardware renderer playback

Windows, NVIDIA RTX 4070 SUPER (12 GB), driver 617.42, headless Chromium ANGLE D3D11, 1920×1080 output, 144 Hz desktop, Cinematic preset. Moving **synthetic** camera fixture. Whole-event animation-frame intervals, no screenshot capture in measured runs; CPU submission is recorded separately. These numbers are not OBS frame times or encoder measurements.

| Effect | Frames | P95 ms | P99 ms | Maximum ms |
|---|---:|---:|---:|---:|
| Money IN | 443 | 7.1 | 7.1 | 7.1 |
| Money OUT | 718 | 7.0 | 7.1 | 7.2 |
| Ice IN | 444 | 7.1 | 7.1 | 7.2 |
| Ice OUT | 656 | 7.1 | 7.1 | 7.2 |
| Smoke IN | 444 | 7.0 | 7.1 | 7.1 |
| Smoke OUT | 775 | 7.1 | 7.1 | 8.1 |
| Toxic IN | 444 | 7.0 | 7.1 | 7.1 |
| Toxic OUT | 775 | 7.0 | 7.1 | 7.1 |

Every core direction reached coverage 1.0, completed without runtime errors or 2D fallback, and left zero visible effect pixels. No sampled frame interval exceeded 25 ms. `qa/3.16.0/metrics.json` contains measurements, renderer identity and individual preset diagnostics. Representative frames for buildup, full cover, hold, dispersion and idle are beside it.

Independent volumetric tests also exercise Performance/Balanced/Cinematic/Ultra. Gas GPU P95 (ms): Smoke 0.346/0.868/3.038/8.166; Toxic 0.358/0.914/3.707/8.881. These are bounded independent hold benchmarks, not a whole-scene cost guarantee. Ultra frame-interval P99 reached about 20.9 ms on the 144 Hz host.

## Automated checks

- Go controller tests and `go vet ./...`: passed. Includes new alpha/local-hole, invalid/stale/idempotent ACK, cancellation/recovery, and delayed OBS visibility-response tests using in-memory protocol peers.
- `node test_transition_bridge.mjs`: ten production-overlay scenarios passed (four effects × IN/OUT, Inferno IN, cancelled preparation). Requests are intercepted to simulate the controller: lost ready response retries, 500 ms delayed camera confirmation, screenshot hashes verify continuing presented motion, completion verifies transparent canvases, cancelled image loading emits no stale ACK. A further optional-clip regression performs four failed/cancelled preparations and verifies zero abandoned canvases. This is explicitly **simulated OBS**, not a physical camera test.
- `node test_cinematic_surfaces.mjs`: actual WebGL shader compilation and pixel/resource checks across all four profiles; moving output, 3D crystal growth, final transparency, repeated preparation and balanced resource deletion. SwiftShader validation is separate from hardware performance.
- `node test_gas_shader_browser.mjs`: actual shader/pixel checks, 100% alpha >=254 coverage, identical cover/release handoff at the same time, continued held motion, near-final extinction, resource reuse and disposal.
- `node run_gpu_renderer_api_test.mjs`: existing eight expansion effect API regressions passed (mock WebGL; not a pixel test).
- Inline overlay JavaScript parses. Release catalog authorization/private-cache tests and the website production build pass (existing chunk-size warnings).
- Windows amd64 build succeeds; running the compiled executable with `--version` reports `3.16.0-cinematic-gpu` without installing or launching UI.

## Before / after findings

The previous gas shader failed the existing material-variation browser assertion; the rebuilt material passes. Money previously used affine projection and no depth occlusion; the new geometry uses perspective interpolation, depth and shadow passes. Ice previously painted a frozen camera portrait at buildup; the new growth uses generated ice over a live feed. The old Money build gate and render threshold disagreed; they are now shared and tolerate floating-point boundary error. Initial cold-renderer tests showed large frame-time tails; real geometry/material warmup moved driver setup into PREPARING. The final table measures the whole event after that correction.

## Limitations and installation

Live OBS, camera-driver latency, encoder/game contention and repeated hours-long streaming were **not** tested. The safe camera protocol has software coverage; it cannot certify invisible switching on every OBS/source configuration. Fast subject motion outside the prepared cover can correctly reject a switch and trigger recovery. Anti-aliased edges are included in the controller check.

Gas is procedural advection rather than a physical fluid solver. Refraction and motion/depth filtering are local material approximations; no scene-depth capture, full scene temporal motion blur or ray-traced reflections are implemented. Optional imported video clips can hold their final frame in compatibility mode; continuous-motion validation applies to GPU mode.

`go test -race` requires CGO and a configured C toolchain, unavailable in this build environment. No separately compiled Inno Setup artifact exists; the executable uses the app's established self-installer. The binary is unsigned. Install/update was not executed over the user's active installation.

Download `public/SC_Web_Transitions.zip`, extract it, close the old app and run the versioned EXE. Refresh or Install / realign the OBS Browser Source. Keep IN=show and OUT=hide compatibility. No settings migration or database migration.

## Reproduce

Run Go tests/vet and the Node tests above from the source directory. Browser tests require the repository's existing Puppeteer dependency and Chrome (`SC_CHROME_PATH` can select an executable). For hardware playback set `SC_HARDWARE=1`, `SC_CAPTURE=0`, `SC_WIDTH=1920`, `SC_HEIGHT=1080`, then run `node test_cinematic_overlay.mjs money ice smoke toxic`. Inspect recorded GPU identity; requesting hardware does not itself prove that hardware was used. Run GPU benchmarks sequentially. `benchmark_gas_volume.mjs` records independent preset workloads and disjoint-safe GPU timers.
