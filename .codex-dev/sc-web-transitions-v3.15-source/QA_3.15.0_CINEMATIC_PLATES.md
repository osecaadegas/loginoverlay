# v3.15.0 QA — Cinematic Plate Engine

- Go test suite and Windows x64 build: PASS.
- Node syntax: PASS.
- Browser video decoder: VP9 alpha clip decoded with opaque center and transparent corners. **Actual RGBA video test**, not a movie-quality result.
- Actual alpha readback below required coverage threshold: 97.92% -> **handoff must be rejected**. This deliberately tests the safety condition.
- Final frame clear on release: PASS with synthetic QA clip.
- No video clips included in release. In-app professional plate mode cannot activate without installed clips; procedural fallback expected.
- Windows OBS 1080p60 and real simulated VFX footage: NOT VERIFIED.

- Application local video-asset HTTP endpoint: GET /cinematic-plates/{allowlisted name}.webm, HEAD and Range tests passed; missing/unexpected paths rejected.
- Temporary browser QA clips were generated solely to exercise VP9-alpha decode and pixel coverage. They are intentionally not supplied as professional-looking effects.
- Actual downloaded EmberGen VDB conversion pipeline and target Windows OBS hardware performance: not verified.
