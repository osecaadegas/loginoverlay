# v3.9.1 RC1 — QA and Release Gate

**Status: private OBS test candidate, not a certified commercial production release.**

## Tests performed

| Test | Outcome | Verification method |
|---|---|---|
| Go unit tests | PASS | `go test ./...` |
| Go race detector | PASS | `go test -race ./...` |
| Go static checks | PASS | `go vet ./...` |
| JS syntax | PASS | `node --check` on the extracted UI and overlay scripts and GPU modules |
| Existing Money CGI OUT / IN | PASS | Mock OBS websocket and simulated Browser Source acknowledgements |
| Existing Ice / Smoke / Toxic IN+OUT | PASS | `test_native_integration.py` against mock OBS |
| Eight expansion effects, sixteen IN/OUT flows | PASS | `test_gpu_obs_controller.py` against mock OBS |
| Duplicate OUT when already hidden | PASS | Hidden camera stays OFF |
| IN completion before reveal | PASS | Rejected, FX cleared, camera restored ON |
| IN reveal when actual FX is transparent | PASS | Rejected, FX cleared, camera restored ON |
| Renderer freeze after OUT camera is hidden | PASS | Watchdog detects missing heartbeat, restores camera ON and clears FX |
| Manual recovery while transition in progress | PASS | Aborts active transition, clears FX, confirms camera ON |
| Changes to effect/settings while a transition is running | PASS | Mutations rejected |
| Adaptive GPU quality | PASS | Simulated slow cover heartbeat reduces *next* job's quality |
| Insufficient (<98.5%) OUT visual coverage | PASS | Does not hide camera |
| Money and Ice visual code comparison | PASS | Exact code section equality against v3.9.0 |
| WebGL2 visual playback in OBS | NOT VERIFIED | No actual Windows OBS available |
| Chromium browser render integration | BLOCKED | Browser reports `ERR_BLOCKED_BY_ADMINISTRATOR` for localhost and local-file URLs |
| Actual 1080p60 streaming/game GPU budget | NOT VERIFIED | Requires user hardware and OBS stats |

Mock websocket test servers can emit `ConnectionClosedError` traces on abrupt socket closure even when the assertions pass. This is not evidence of a real OBS disconnect.

## Acceptance test on Windows
1. Make a backup of your current v3.9.0 EXE. Close it completely, then run v3.9.1.
2. In OBS, enable the WebSocket server, select the active Program scene and camera. Install/realign the FX Browser Source (the source ID changes with each installation).
3. Verify camera chroma key/alpha using **Capture actual OBS camera & analyze mask**.
4. Keep preview OFF. Run Money OUT then IN; check cam hide only after full cover, camera enable only while the effect is opaque, and complete transparency at the end.
5. With OBS recording, repeat Money, Ice and Crystal at Balanced, Cinematic, Ultra. Observe OBS View > Docks > Stats: missed frames, rendering lag, encoding lag, and GPU utilization in Task Manager.
6. Disable OBS WebSocket during a test only while *not live* and verify manual Recovery and logs. Never run deliberate failure tests on a live audience.
7. Check each effect after scene changes, source removal/re-addition, and streamer webcam filters/crops; install/realign after changing placement.

**Production gate remains OPEN:** a human must approve the actual recorded camera handoff, missing/stuck layers, and dropped-frame performance on the RTX 4070 Super before public release.
