# SC Web Transitions 2.7.0 — Release Candidate QA

Date: 2026-10-18. This report distinguishes **executed** tests from **pending** on-device sign-off.

## Executed checks
| Category | Verification | Result |
|---|---|---|
| Go unit tests | `go test ./...` | PASS |
| Native build | Go Windows amd64, GUI, PE32+ | PASS |
| OBS WebSocket handoff | Simulated OBS for Money, Ice, Smoke, Toxic both OUT/IN | PASS |
| Money safety | 80% spoofed coverage rejected, live camera remains enabled | PASS |
| Money silhouette coverage | Real Chromium 2D canvas rendered over a synthetic figure | PASS, 98.99% at 960×540; 98.92% at 1280×720; 98.90% at 1920×1080 |
| Money OUT last frame | Actual final canvas alpha scanned | PASS, 0 visible pixels at sampled resolution |
| Money cover progression | Synthetic browser mask coverage measured across 7 stages | PASS, near zero initially and >98.5% at completion |
| Hero bill | Full-motion synthetic preview with perspective-mapped image strips | RENDERED, qualitative judgement still requires user review |
| Smoke continuity | Real Chromium raster comparison after cover saturation and during handoff | PASS, continued frame changes and no boundary jump in test |
| Toxic continuity | Same continuous timing and transparency test | PASS |
| Smoke / Toxic 2D perf | Forced-rasterization Chromium software test at 720p and 1080p | PASS as benchmark collection; not OBS FPS proof |
| Ice 2D fallback | Synthetic render of cover, OUT and IN | PASS |
| Actual OBS + real Chromium end-to-end | Localhost navigation denied by testing environment | BLOCKED, NOT PASSED |
| Actual Windows OBS 1080p60 | RTX 4070 Super physical client unavailable here | PENDING |
| Installer / desktop shortcut on Windows | Cross-compilation verified, GUI installation not run under Windows | PENDING |
| Multi-scene + hotkey rapid trigger on physical Windows | Existing logic unchanged; no physical test | PENDING |

## Measured browser timings (forced canvas raster, Chromium software GPU)

The money test measures a real frame draw and reads one pixel back to force rasterization. Results are NOT actual OBS FPS, and include software-rendering limitations. Density was 85% on a synthetic alpha figure.

| Effect | Resolution | Approximate P95 draw time | Assessment |
|---|---|---:|---|
| Money cover | 960×540 | 8 ms | Under 16.7 ms in isolated test |
| Money cover | 1280×720 | 15–16 ms | Near 16.7 ms in isolated test |
| Money cover | 1920×1080 | 20–21 ms | Over 16.7 ms software test; must validate GPU and optimize if needed |
| Black Smoke | 1280×720 | 7.9 ms | Isolated 2D benchmark |
| Black Smoke | 1920×1080 | 9.9 ms | Isolated 2D benchmark |
| Toxic Cloud | 1280×720 | 7.8 ms | Isolated 2D benchmark |
| Toxic Cloud | 1920×1080 | 9.7 ms | Isolated 2D benchmark |

Additional GPU/OBS compositor time, streaming load and game rendering are not measured. Do not interpret these numbers as 60 FPS proof.

## Motion and artifact review
- A 244-frame synthetic full-motion Money OUT+IN review was rendered at 24 FPS, 960×540. View `SC_v2.7_Money_Review.mp4`.
- A companion original v2.6.5 review was rendered with an equivalent synthetic figure and timing. View `SC_v2.6.5_Money_Before.mp4`.
- The new design uses much larger visible notes, alpha-verified completion and a perspective UV-mapped sheep bill close-up.
- Synthetic preview proves the renderer draws; it does not prove OBS's Browser Source stacks, cropping, frame pacing or live camera motion on a physical Windows computer.
- The live camera is visible and moving underneath Money OUT; **the coverage shape remains based on the silhouette captured at transition start**.

## Recommended Windows acceptance plan
1. Install the EXE on Windows 10 and Windows 11; verify a single desktop shortcut and update from existing v2.6.5 while preserving settings.
2. Launch OBS 32+ and verify connection, source alignment, hotkeys and Stream Deck.
3. Record every effect OUT and IN at 1920×1080 60 FPS for at least 5 repetitions (including camera movement and subject edge cases).
4. Watch the OBS recording frame-by-frame: no frozen frames, black flashes, unexpected bill pops, stale camera image or incorrect scene state.
5. Review real OBS renderer FPS/P95 and OBS stats for rendering lag and skipped frames while a game is running on the RTX 4070 Super.
6. Test rapid hotkeys, switching scenes, Studio Mode, OBS reconnect, source removal and error recovery.
7. If acceptable, sign the EXE and run security/installer checks before broad distribution.

## Public release readiness
**NOT APPROVED YET.** The app is a testable release candidate. Physical Windows OBS 1080p60 validation, source alignment with real moving subjects, and end-to-end installation QA are essential blockers. Do not market the visuals as offline ray-traced or "Hollywood verified." They are realtime 2D/2.5D perspective animation.
