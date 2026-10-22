# SC Web Transitions v2.6.5 — Rendering performance QA

## Root cause
Dense Smoke and Toxic layers issued around 180 full-resolution alpha-blended smoke sprites per frame. This caused expensive large-surface pixel compositing on software/limited Chromium render paths. The previous WebGL canvas was also unnecessarily cleared every frame while 2D smoke was active.

## Rendering changes
- Offscreen reduced-resolution alpha buffer, composited once per frame at native OBS source size.
- Particle positions, opacity variations and turbulence remain evaluated each frame with monotonic animation time; the animation is not a prerendered or static video.
- Smoke sprite transformations avoid costly per-sprite context save/rotate/restore.
- Reused cloud flow data; idle WebGL canvas remains hidden instead of clearing each frame.
- The full camera remains live until the OBS controller hides it; no frozen webcam screenshot is drawn for Smoke/Toxic.

## Approximate isolated performance
Headless Chromium software path, smoke intensity 85%, ~182 particles, after warmup. Timings include a forced `getImageData` read to flush canvas drawing, so they are more revealing than JavaScript draw-command timing alone:

| Native output | Before 2.6.4 (P95) | New 2.6.5 (P95) |
|---|---:|---:|
| 1280×720 | ~32 ms | ~8–11 ms |
| 1920×1080 | ~58 ms | ~10–15 ms |

Cloud alpha coverage was approximately unchanged (36.9% vs 36.9% of canvas in a synthetic 720p silhouette scene). The cloud appearance is deliberately softer due to reduced internal resolution.

These results are **not OBS FPS readings**, GPU benchmarks, or guarantees of 60 FPS on other machines. OBS, other sources and webcam filters add their own work. Camera source alignment and the existing OBS safety checks remain unchanged.

## Regressions
- Test smoke at 100% cover at ages 2.0s, 2.5s and 3.0s: every frame visibly changes.
- Test cover→play at the same age: zero pixel-difference at the boundary.
- Simulated OBS: camera visibility and safety checks pass for all four effects in both directions.
- Verify both 2D smoke and GPU Ice after a renderer reinstall in real OBS.

Optional repeatable smoke benchmark: `python test_smoke_perf.py` (requires Playwright/Chromium). The benchmark is deliberately a software Chromium scenario; OBS hardware output can differ.
