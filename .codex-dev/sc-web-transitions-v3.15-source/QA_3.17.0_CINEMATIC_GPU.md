# 3.17.0 validation

Environment: Windows, local Chrome ANGLE D3D11, NVIDIA RTX 4070 SUPER; Go 1.23.12 and Node 24.16.0. Tests use a synthetic camera and simulated OBS responses, not a live stream.

## Reproduction

From this source directory:

```
go test ./...
go vet ./...
node run_gpu_renderer_api_test.mjs
node test_overlay_inline_syntax.mjs
node test_phase2_optical.mjs
node test_transition_bridge.mjs ice-in ice-out inferno-in inferno-out lightning-in lightning-out shadow-in shadow-out holy-in holy-out sand-in sand-out crystal-in crystal-out petal-in petal-out plasma-in plasma-out money-in money-out smoke-in smoke-out toxic-in toxic-out cancel-prepare missing-clips
```

Set SC_CHROME_PATH to an installed Chrome executable when necessary. For frame capture, run `node test_cinematic_overlay.mjs ice inferno lightning shadow holy sand crystal petal plasma`. SC_HARDWARE=1 selects normal ANGLE; SC_WIDTH=1920 and SC_HEIGHT=1080 select output dimensions. SC_CAPTURE=0 disables PNG capture; SC_OUTPUT selects a relative output directory.

## Measurements and scope

The 1080p Cinematic run completed all 18 directions, measured coverage 1.0 and left zero visible effect pixels. P95 browser animation frame intervals were 7.0–7.1 ms. Inferno IN had one 62.4 ms interval. These are requestAnimationFrame intervals, not GPU timestamps, end-to-end OBS latency, or proof of 60 FPS while encoding and gaming. The final material-normal/ember shading correction followed this benchmark and was not separately benchmarked.

The optical test exercises eight shared GPU effects, four presets and two displaced source rectangles with partially transparent edges (64 cases). It compares magenta and green camera images with identical alpha: the fully covered effect pixels must be identical, proving the new seal does not simply repaint camera RGB. It also requires full mask coverage and clean completion. Ice is tested through production overlay lifecycle playback separately.

Captured beginning/build/coverage/dispersal/final frames for all nine effects in both directions. Reviewed representative frames of each effect. Inferno has smooth continuous detail instead of pixel blocks; the review also identified conspicuous volume envelopes and incomplete physically refractive materials. See changelog for outstanding art direction and rendering work. Raw captures remain local and are excluded from the installer/source package.

Live OBS, game/encoder contention, real camera motion beyond a prepared silhouette, long-duration memory-soak tests and signed installer behavior remain unverified. Existing Go controller tests cover state and recovery behavior; simulated bridge tests cover delayed acknowledgement, continuous animation during holds, cancellation and clean completion.
