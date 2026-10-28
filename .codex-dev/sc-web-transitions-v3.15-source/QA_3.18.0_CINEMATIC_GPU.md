# SC Web Transitions 3.18.0 validation record

Date: 26 October 2026. Baseline: maintained 3.17.0 source. The supplied 3.16.0 audit was used to identify issues, then checked against the newer source.

## Environment and evidence boundaries

Tests ran on Windows using Chromium ANGLE D3D11 on an NVIDIA RTX 4070 SUPER, Go 1.23.12 and Node 24.16.0. Some shader/resource checks explicitly used SwiftShader. Browser fixtures use synthetic high-contrast camera shapes; controller tests use scripted OBS responses. The UI test launches the actual Go server and Chromium, without connecting to a physical OBS installation.

These results are not a live OBS certification. No real webcam-driver, Program recording, concurrent game/encoding or multi-hour streaming rehearsal was performed. The requested Go race run could not execute because the required C compiler/CGO toolchain was unavailable. CPU/GPU numbers that were not measured are not inferred from FPS.

Final controller/UI revalidation: 28 October 2026. The compositor regression covers changed position, crop, scale, rotation, source dimensions, bounds, disabled/lowered FX and additive blending. It refuses before optical screenshots and again before job-bound camera visibility writes; emergency recovery remains available. WebSocket placement checks are sampled state, not an atomic libobs frame fence. Money/Ice retain downsampled local coverage plus independent OBS checks; the conservative all-output-pixel GPU reduction applies to gas and the shared GPU families.

## Completed checks

| Check | Result and scope |
|---|---|
| `go test ./... -count=1` | PASS: 53 named controller/platform tests, including production-safety, shared-FX ownership, current compositor placement and real Windows hotkey cases |
| `go vet ./...` | PASS |
| Windows hotkey conflict test | PASS using real `RegisterHotKey` conflicts on Ctrl+Alt+Shift+F20–F24; no user keystrokes injected |
| `node test_ice_ultra_gpu.js` | PASS: closed mesh, quality topology and mocked WebGL lifecycle |
| `node test_premium_assets.js` | PASS: 15 existing project meshes validated |
| `node test_cinematic_surfaces.mjs` | PASS: actual WebGL draws across four presets, growth/dispersion, transparent idle, unchanged input ordering and balanced resource creation/deletion |
| `SC_HARDWARE=1 SC_BASELINE_REF=8de8a6e6 node test_core_vfx_production.mjs` | PASS: 34 checks, including 32 gas effect/preset/position combinations at two covered times |
| `node test_gas_shader_browser.mjs` | PASS: actual shaders, rising volume, complete coverage, identical cover/release image at the same time, moving held volume, transparent corners, reused resources and clean final frame |
| `node test_production_ui.mjs <compiled-executable>` | PASS: actual local server and Chromium; private status, versioned export, future-schema rejection, 14 effects, preview direction/teardown, unconfirmed recovery, responsive UI, redacted diagnostics and coordinated Quit |

The Money OUT pixel comparison rendered three deterministic frames against committed baseline `8de8a6e6`. The retained run differs on 151 of approximately 6.22 million channels, each by one 8-bit level. The check allows a one-level driver rounding difference on at most 0.01% of channels; this is not claimed as literal byte identity. IN-specific bend modes produced distinct frames. Matching Money preparation retained its GPU resource identities.

The strict GPU gas reduction found thin full-canvas Toxic/Balanced holes that nearest-pixel sampling had missed. Raising the actual volume optical density resolved them. Tests include center, left, right and full-canvas camera footprints across all four presets. Tests do not substitute for OBS transforms outside the WebGL renderer.

## Performance measurements

The isolated gas benchmark rendered a 1920×1080 logical output using each preset's documented internal resolution. GPU elapsed-time queries measured the following p95 values on the RTX 4070 SUPER:

| Profile | Smoke GPU p95 | Toxic GPU p95 |
|---|---:|---:|
| Performance | 0.43 ms | 0.42 ms |
| Balanced | 1.02 ms | 1.02 ms |
| Cinematic | 3.73 ms | 5.19 ms |
| Ultra | 10.11 ms | 10.01 ms |

CPU submission p95 was at most 0.30 ms in that run. These measurements preceded the final small lighting adjustment and asynchronous probe integration. Retained `qa/3.18.0/gas/benchmark-hardware.json` records the exact tested state and environment; do not advertise these as final OBS output rates.

The synchronous four-byte probe still drained the GPU queue: approximately 6.3–6.6 ms in Cinematic and 41.6–41.8 ms in Ultra. This finding prompted the live-path PBO/fence implementation. Final asynchronous probe and shared-family measurements belong in the retained GPU regression reports; reducing the byte count alone was not accepted as proof that synchronization stalls were fixed.

The initial 960×540 production-overlay baseline completed Money, Ice, Smoke and Toxic in both directions with measured coverage 1.0 and clean idle frames. Its browser frame-interval p95 was approximately 7.0–7.1 ms; these are requestAnimationFrame intervals on the host display cadence, not proof of 60 unique camera frames or OBS delivery.

## Integrated and visual review

Evidence directories are relative to this source tree:

- `qa/core-production-before/metrics.json`: initial eight core-effect playback measurements. Raw baseline and intermediate comparison captures are local working evidence, omitted from the distribution.
- `qa/core-production-regression/`: deterministic material frames and 34-case core results.
- `qa/3.18.0/ui/result.json`: actual Go/Chromium product check.
- `qa/3.18.0/integrated-performance/metrics.json`: integrated 1080p playback measurements.
- `qa/production-gpu/`: shared-family optical, asynchronous readback, material and capture evidence.
- `qa/3.18.0/gas/regression.json`: final gas continuity/material regression.

The final integrated 1080p run passed **28/28** effect/direction cases: coverage 1.0, no runtime errors, no unexpected GPU fallback and no residual effect pixels. It supersedes an intermediate Glitch failure: the strict gate caught 375 fractional-scale matte-edge pixels, corrected by expanding the actual digital effect fringe without relaxing verification. `test_transition_bridge.mjs` passed all 28 directions with a simulated 500 ms OBS acknowledgment delay, dropped initial-ready response, changing held pixels, positive frame IDs, two confirmations and clean completion, plus cancellation and missing-media cleanup (30 scenarios total). These are simulated controller tests, not live OBS tests.

The final capture-disabled run recorded 17,151 browser frame intervals: mean 6.955 ms, p95 7.0 ms, p99 7.1 ms, maximum 27.6 ms, six intervals over 16.67 ms and one over 25 ms. Browser average cadence was 143.78 FPS and the slowest one-percent interval mean corresponds to 122.80 FPS. This host schedules near 144 Hz; these values do not certify source-camera or OBS output FPS. CPU utilization, OBS encoder impact and live end-to-end latency are N/A. See `qa/3.18.0/performance-summary.json` and `GPU_PRODUCTION_VALIDATION.md` for the isolated GPU comparisons and their limits.

Four final core contact sheets and actual sampled timestamps are in `qa/3.18.0/core-visual/`. Ten shared-family sheets contain 200 deterministic IN/OUT checkpoints including coverage holds. The core captures are sampled lifecycle frames, not a claim that every requested exact percentage was captured. The old Python fixtures for versions 3.0–3.11 use obsolete authentication/coverage protocols and were not counted as passing current tests.

The distributed evidence includes contact sheets, selected material frames and JSON results. Raw core PNG sequences and temporary Chromium/application profiles are omitted; rerun the capture scripts to regenerate those. UI validation runs on a separate diagnostic port and test profile without altering an installed application's session.

Visual inspection found improved independent gas lobes and dispersion, more substantial ice facets and refined paper deformation. Dense clouds remain procedural; clear-ice refraction is not sampled from live OBS. Shared materials and silhouettes still require the streamer's artistic approval at actual webcam scale. No claim of AAA or physically simulated final quality is made.

## Reproduction

From the maintained source directory:

```powershell
go test ./... -count=1
go vet ./...
node run_gpu_renderer_api_test.mjs
node test_overlay_inline_syntax.mjs
node test_ice_ultra_gpu.js
node test_premium_assets.js
node test_cinematic_surfaces.mjs
node test_gas_shader_browser.mjs
node test_phase2_optical.mjs
node test_gpu_production.mjs
$env:SC_HARDWARE='1'
$env:SC_BASELINE_REF='8de8a6e6'
node test_core_vfx_production.mjs
$env:SC_WIDTH='1920'; $env:SC_HEIGHT='1080'; $env:SC_CAPTURE='0'
node test_cinematic_overlay.mjs money ice smoke toxic inferno lightning shadow holy sand crystal petal neon plasma glitch
```

`SC_CHROME_PATH` selects an installed browser when required. `SC_OUTPUT` selects overlay/core evidence output, `SC_GPU_QA_DIR` selects shared-family evidence output. The baseline comparison requires the named commit to be present; omit `SC_BASELINE_REF` in an exported source archive to run the current-state checks. Run hardware performance measurements serially, with other test renderers closed. PNG capture changes workload and must be reported separately from capture-disabled performance runs.

## Release gates not covered by the automated fixtures

1. Record actual OBS Program output at 1080p60 with a keyed webcam moving into and out of its prepared silhouette, and inspect every transition in both directions.
2. Exercise scene selection/deletion, changed source transforms/crops, lost WebSocket connection, webcam-driver restart, Quit mid-transition and reconnect/recovery on OBS itself.
3. Run gameplay plus recording/streaming contention and a sustained multi-hour cycle while observing OBS render/encoder lag and memory.
4. Rehearse installer upgrade, uninstall and rollback against a real installed application. Confirm that active-engine refusal and settings preservation behave correctly.
5. Provision code signing separately and rerun race-enabled tests when a supported C compiler is available.

Release executable/installer existence, SHA-256 and source revision are recorded by the build manifest and final delivery report. This document does not assert installation, signing, deployment or live streaming tests that were not performed.
