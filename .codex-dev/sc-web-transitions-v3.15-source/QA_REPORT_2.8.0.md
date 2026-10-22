# SC Web Transitions v2.8.0 — QA and release gate

## Executed checks

| Test | Result | Environment |
| --- | --- | --- |
| Go tests (settings, hotkeys, coverage) | Passed | Go 1.23.2 Linux |
| Windows amd64 executable cross-compilation | Passed | GOOS=windows, CGO_ENABLED=0 |
| JS renderer syntax | Passed | Node 22 |
| Money alpha coverage | 99.04% in 960×540 synthetic test; >=98.5 required | Chromium headless synthetic silhouette |
| Smoke OUT effective alpha coverage | 100% sample points | Chromium synthetic mask |
| Toxic OUT effective alpha coverage | 100% sample points | Chromium synthetic mask |
| Smoke/Toxic motion during 550ms post-cover delay | Changed substantially; no held pixel frame | Chromium frame comparison |
| Smoke/Toxic IN opaque cover then transparent exit | Passed | Chromium synthetic test |
| Ice OUT/IN final transparency | Passed | Chromium synthetic test |
| Mock OBS OUT/IN all four effects | Passed | WebSocket simulator, not real OBS |
| Mock OBS blank FX camera safety | Passed | Webcam kept enabled |
| Mock OBS 80% Money coverage rejection | Passed | Webcam kept enabled |
| Mock OBS 65% Toxic coverage rejection | Passed | Webcam kept enabled |
| Mock OBS invalid camera key | Passed | Error, camera kept enabled |

## Isolated performance sampling

Last run: Chromium headless Linux `--disable-gpu` Canvas2D rendering with forced readback. 46 measured frames per test, after warmup. These are **not** OBS composition or GPU timings, and OS jitter can cause outliers.

See `PERFORMANCE_RESULTS.json` for exact median, P95 and maximum. Target total frame budget at 60 FPS is 16.67 ms. No verified claim of sustainable 1080p60 is made; the camera stream, compositor and game add additional work.

## Visual review materials

- `QA_MONEY_OUT_IN.mp4`, synthetic 800×450 at 20fps, full OUT and IN.
- `QA_SMOKE_OUT_IN.mp4`, synthetic 800×450 at 20fps, bottom-up OUT and IN.
- `QA_TOXIC_OUT_IN.mp4`, synthetic 800×450 at 20fps, bottom-up OUT and IN.
- `QA_contact_sheet.jpg`, sampled synthetic frames, not a real OBS capture.
- Baseline `SC_v2.6.5_Money_Before.mp4` is available separately as a historical comparison.

## Pending public-release gate (NOT PASSED OR CLAIMED)

1. Install/update/rollback on a real Windows 10/11 PC with OBS 32.x, including desktop shortcut creation and retention.
2. Record all 8 IN/OUT effects at 1920×1080 60 FPS, while a real green-screen webcam is visibly moving.
3. Verify apparent cut is invisible with 300ms/800ms OBS delay under real browser compositing.
4. Ensure no frozen camera frame after enabling a suspended source; verify with Nikon/capture card and USB webcams.
5. Measure OBS CPU/GPU FPS and encode frame drops on RTX 4070 Super and an AMD GPU; choose default quality level accordingly.
6. Verify shifted/cropped/mirrored scene items, Studio Mode preview/program and nested scenes on real OBS.
7. Sign Windows installer/EXE (unsigned release may trigger SmartScreen); vulnerability/security review before distribution.
8. Artistic sign-off for claimed 9/10 Hollywood-style VFX; this renderer remains a real-time approximation, not offline film compositing.

**Status: private release candidate. Do not label this build Hollywood-certified or public production-ready yet.**
