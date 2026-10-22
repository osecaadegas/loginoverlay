# SC Web Transitions 3.4.0 Expansion RC1 — QA and release gate

Date: 19 October 2026. Status: **private test release candidate**; **NOT production certified**.

## Coverage of deliverables
- Eight new effects with IN and OUT paths: Glitch, Lightning, Shadow, Holy, Sand, Crystal, Petal, Plasma.
- Integrated selectors in the existing Windows UI; saves per-effect accent, motion speed, detail.
- Existing Money, Ice, Smoke, Toxic and Inferno paths retained.
- `expansion-effects.js` is embedded in the Windows executable (no external asset copy required for normal operation).

## Executed tests
- `go test ./...` — PASS.
- `go vet ./...` — PASS.
- `go test -race ./...` — PASS.
- Node.js syntax check of `expansion-effects.js` — PASS.
- Chromium browser renderer QA for all eight effects, each OUT and IN, multiple steps — PASS, no page errors.
- Simulated OBS WebSocket integration: eight OUT and eight IN with correct camera state and low-coverage rejection — PASS. This does not validate real physical-camera timing.
- 960×540 synthetic silhouette: coverage ≈99.10% in all eight effects, based on static keyed-image mask. No real-camera measurement.
- 1920×1080 isolated Chromium renderer benchmark: measured seal coverage ≈99.86% in all eight effects. See `PERFORMANCE_3.4.0.json` for timings and sampling limitations.
- Generated eight synthetic IN/OUT review videos and a contact sheet. Individual visual styles distinguish the effects, although the overall VFX quality remains prototype-level.
- Protected baseline check: `drawMoney`, `setupIce`, `gasRibbon`, and `drawClouds` source sections matched prior v3.3 baseline during review.

## Release blockers / non-verified items
1. Physical Windows OBS Program output and 1080p60 streaming/gameplay tests not performed.
2. Native OBS real-time alpha tracking not integrated; source snapshot limitations apply.
3. Real webcam frame readiness and source-transform tolerance need device testing.
4. 100 consecutive IN/OUT cycles per effect not performed on actual OBS hardware.
5. Visual art direction is not yet professional film-quality; these are stylized Canvas2D passes.
6. Installer/uninstaller/update/rollback and certificate signing not comprehensively validated on Windows.

## Safety logic
The backend will not turn the camera off when reported coverage is below the threshold. Camera state is verified after a normal successful simulated switch; on failure it attempts effect cleanup and recovery. The measured coverage is of a prepared keyed snapshot, not a continuous live-camera alpha stream.

## Production verdict
**NO-GO** for a signed/public commercial release. **GO** for local, non-live Windows OBS testing and additional visual iterations.
