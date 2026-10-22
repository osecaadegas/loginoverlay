# SC Web Transitions v3.0.0 RC1 — QA evidence

**Evaluation:** technical release candidate / Windows beta. **Public release: NO-GO.**

## Executed tests

- `go test ./...`, `go test -race ./...`, and `go vet ./...`: passed.
- Windows cross-compilation of one 64-bit GUI `.exe`: passed. Cannot execute a Windows binary here.
- `node --check` on the inline JavaScript extracted from UI and effect pages: passed.
- `test_native_integration.py` with a mock OBS Studio v32.2.2 WebSocket server: passed all four IN/OUT cases, blank effect source rejection, low alpha coverage rejection, unsuitable webcam input rejection, scene alignment and source visibility sequence. The post-enable screenshot availability path is exercised using a synthetic keyed mock frame.
- `test_visual_v28.py`: Money coverage, Smoke/Toxic alpha and continuous handoff variation, Ice static rendering, no page-level JS errors: passed on headless Chromium with software Canvas2D.
- `test_money_visual.py`: Money synthetic silhouette coverage 98.97% at 960×540 with 47 notes, 98.94% at 1280×720 with 66 notes.
- `test_v3_gate.py`: incoming effects start with an opaque covering layer over the synthetic camera figure. All four pass.
- `test_ice_visual_v28.py`: Ice OUT and IN canvas coverage/transparent final frame checks passed.
- Complete Money OUT/IN synthetic recording at 960×540/24 FPS and Smoke/Toxic OUT/IN synthetic recordings at 800×450/20 FPS. Full-motion review identified and corrected repeating diagonal smoke turbulence.
- `security_test.go`: reject unexpected localhost Host/Origin values, accept intended loopback host names.

**The above results do not prove actual OBS performance or live camera-frame tracking.**

## Isolated Chromium software-rendering benchmark

1920×1080, headless Chromium with GPU disabled; 46 frames per effect; Canvas2D draw and forced readback; excludes actual OBS compositor and encoder. Results vary per run.

| Effect | Median | P95 | Max |
|---|---:|---:|---:|
| Money | 13.4 ms | 17.2 ms | 17.6 ms |
| Black Smoke | 15.85 ms | 18.6 ms | 19.8 ms |
| Toxic Cloud | 14.5 ms | 20.8 ms | 29.8 ms |

At 60 FPS the entire frame budget is 16.67 ms. These results are **not a sustained 60 FPS pass**, especially for Smoke and Toxic. Hardware-accelerated OBS Browser Sources could behave differently. Measure real OBS CPU/GPU usage and encoded frames before release.

## Visual assessment

- Money: materially bigger and fewer bills; still a bill-collage silhouette when fully covered and a 2.5D hero, not a real GPU cloth simulation.
- Smoke: natural bottom-up rising, seeded advected noise, visibly irregular material; still a layered 2D volume rather than raymarched physical smoke.
- Toxic: heavier green internal shading; increased density; software frame-time risk.
- Ice: existing approved visual style preserved; native 3D GPU path could not be independently verified on Windows.

## Release blockers

1. Missing true GPU-connected live alpha tracking during camera movement.
2. No real OBS 1080p60 frame pacing, dropped frame and handoff recording on a Windows PC.
3. IN readiness checks only keyed screenshot availability; cannot confirm a new unique camera timestamp.
4. Money and gas visuals not independently rated 9/10 in actual moving-person footage.
5. Native OBS filter probe is not production-integrated or compiled against real OBS SDK.
6. No Windows execution validation, signed binary or compiled Inno Setup installer/uninstaller validation.
7. Need threat-model and pen-test of loopback controls before general public distribution.

## Recommended real-hardware acceptance checklist

- OBS 32.x Windows, keyed physical webcam, 1920×1080 at 60 FPS.
- Program and Studio Mode Preview separately; crop, mirroring, rotation and source scaling.
- Money OUT/IN with head, arms and torso moving at normal streaming speed.
- 100 consecutive OUT/IN cycles without wrong camera state.
- Simulated 100/300/500/800/1500ms OBS request delays while recording the Program output.
- Steam/game/GPU loading while effects run, OBS frame timing graph and recording analysis.
- Windows fresh install, upgrade from v2.8, rollback, uninstall, shortcut and password behavior.
- Independent visual review of the full videos, not just still frames.
