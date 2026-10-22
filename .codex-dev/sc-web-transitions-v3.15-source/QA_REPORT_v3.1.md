# SC Web Transitions v3.1.0 RC1 — Verified Scope

## Changes implemented
- Preserved Money OUT renderer and golden-sheep image unmodified.
- Added Recover Camera button with token-protected endpoint: waits for active transition to exit, clears FX scene item, restores camera visible, verifies camera state.
- Failed transition cleanup now disables the FX scene item, preventing indefinitely opaque Smoke or Toxic after coverage/timeouts.
- OUT and IN now verify final OBS scene-item visibility before reporting success.
- Ice IN no longer gathers drawn triangular shards into a cyan silhouette; uses progressively retreating baked frost instead. Ice OUT remains baseline.
- Kept all existing hotkeys, OBS integration and user configuration paths.

## Tests executed
- `go test ./...`: passed.
- `go vet ./...`: passed.
- JavaScript syntax checks (UI and overlay): passed.
- Existing simulated OBS integration suite: passed for Money/Ice/Smoke/Toxic IN/OUT and several failure cases.
- Cross compilation: Windows amd64 GUI EXE succeeded.

## Critical pending items — NOT PRODUCTION-READY
- Real Windows OBS 1080p60 and actual camera test not possible here.
- Native OBS plugin remains experimental, not integrated; no continuous live alpha tracking.
- Ice OUT still uses original breakup renderer; full premium material/geometry redesign incomplete.
- Smoke and Toxic use 2D procedural buffers, not physically volumetric GPU rendering.
- Failure cleanup clears FX immediately; graceful withdrawal animation is not yet implemented.
- Recover Camera has not been validated against a real OBS disconnect or hardware camera failure.
- Real frame freshness cannot be proven from WebSocket screenshots.
- Installation, uninstall, rollback, Windows signing, and security review remain incomplete for commercial release.
- Full-motion art-director quality acceptance and stress test of 100 cycles not completed.

## Release decision
**NO-GO for public release.** This is a targeted reliability / Ice IN prototype RC to test privately.
