# SC Web Transitions v3.6.0 RC2 — Continued Engine Work

- Rebuilt the Windows executable with all latest v3.6 GPU rendering updates included.
- Cached linked-program shader uniform locations, reducing per-frame WebGL driver queries.
- Added maximum texture-size detection and safe error/fallback when the source exceeds GPU limits.
- Added repeatable WebGL2 renderer API test over all eight effect families and 16 IN/OUT paths, plus cover and release states.
- Repeated Go unit, race and vet checks; verified baseline Money, Ice, Smoke, Toxic and Inferno renderers unchanged.
- Rechecked OBS state transitions through mock WebSocket tests.
- Updated embedded version heartbeat and Windows Inno Setup recipe for v3.6 RC2.
- Explicitly retained public-release blockers for real WebGL pixel review, Windows OBS validation, GPU frame-time tests, live alpha and signing.
