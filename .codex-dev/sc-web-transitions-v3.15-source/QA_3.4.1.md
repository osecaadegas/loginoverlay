# SC Web Transitions v3.4.1 — Independent-style QA Summary

**Status: Private visual test candidate, NOT public-release certified.**

## Tests performed
- `go test ./...`, `go vet ./...`, and `go test -race ./...`: PASS.
- JavaScript syntax checks for the new module and embedded overlay: PASS.
- Chromium/Playwright renderer test for all eight new effects in both OUT and IN, with multiple sampled phases: PASS with no JS page errors.
- Full-motion synthetic review videos, one per new effect covering OUT and IN: rendered, 640x360, 16 fps, with a synthetic person. These are NOT an OBS Program recording.
- Browser pixel readback at the final frame of both OUT and IN for all eight effects: maximum alpha=0, PASS.
- 960x540 keyed subject cached mask coverage: ~99.15%, and 1920x1080 benchmark cached mask coverage ~99.88%. This is measured static subject coverage, NOT moving-person coverage in OBS.
- Mock OBS WebSocket controller: eight OUT and eight IN, each with correct final camera state; insufficient-coverage refusal PASS. It does not prove a real webcam switch.
- Source comparison of `drawMoney`, `drawMoneyCover`, `setupIce`, `drawIce`, `drawIceCover`, `drawClouds`, `drawInferno` with the v3.4.0 baseline: IDENTICAL.
- Windows amd64 GUI PE executable built successfully with source embedded.

## 1920x1080 isolated synthetic performance results
See `performance_v341.json`. Ten discrete Chromium software-rendering samples per effect; low sample count, no GPU OBS workload. Median / sample maximum (milliseconds):

| Effect | Median | Sample maximum |
|---|---:|---:|
| Glitch | 1.70 | 6.80 |
| Lightning | 0.90 | 2.00 |
| Shadow | 1.85 | 4.10 |
| Holy | 2.00 | 4.40 |
| Sand | 4.70 | 12.50 |
| Crystal | 0.45 | **47.30** |
| Petal | 1.00 | 2.60 |
| Plasma | 0.70 | 1.20 |

These values are NOT stable FPS or meaningful p95 estimates; they do not account for live OBS compositing or a game workload. Crystal frame-time spike remains a release-performance blocker until reproduced and optimized on the target system.

## Art-direction verdict
This is a visibly more diverse and technically cleaner expansion, but **not demonstrated at the visual quality of the user's approved Money and Ice effects**. Most expansion effects are still stylized sprites, tinting and lightweight particle animations. Further per-effect cinematography, high-resolution materials, lighting, physically plausible deformation and moving-camera tests are needed before commercial release.

## Release blockers
- Real OBS webcam handoff not tested on Windows, including correct Program source and live frame readiness.
- No continuous live alpha tracking; source movement may reveal stale silhouette gaps.
- Crystal worst-case frame cost and overall streaming performance unverified.
- 100 repeat cycles under real OBS and install/upgrade/uninstall validation not done.
- Code signing absent and commercial visual approval pending.

**Public release verdict: NO-GO.** Safe to use only as a controlled off-stream test candidate.
