# SC Web Transitions v2.6.4 — Continuous Gas Motion Fix

## What was happening
The Smoke and Toxic OUT transition reached full coverage and sent OBS a ready signal. While OBS verified the Browser Source and hid the camera, the cover animation stopped advancing its growth value. The renderer kept producing frames, but only a small oscillation was animated; most clouds stayed still. When the dispersal phase began, their main movement suddenly resumed. This created the visible stall reported at the camera-off handoff.

## What changed
- All individual smoke puffs now keep moving upward and laterally while full coverage is held. Their turbulence, size and opacity also continue changing.
- COVER and PLAY share exactly the same animation coordinates, ensuring the first release frame matches the last cover frame without restarting the cloud pose.
- The controller can take longer to verify/hide the webcam without visually freezing the smoke. The renderer clock continues independently of OBS WebSocket processing.
- Smoke/Toxic never draw a frozen snapshot of the webcam. The camera remains live until actual OBS handoff.
- Money and Ice transition designs remain unchanged from v2.6.3.

## Verification
- Go unit tests and mock OBS integration suite passed (all effects OUT/IN and safety cases).
- `test_smoke_motion.py` uses Chromium to render actual canvas frames. Both Smoke and Toxic had measurable motion throughout the 100% coverage hold, and exactly matched between the final cover and first release frame at equal timestamps.
- Windows x64 GUI EXE cross-compilation passed.
- Not tested against the user's live Windows OBS configuration, so public-release certification is still pending.
