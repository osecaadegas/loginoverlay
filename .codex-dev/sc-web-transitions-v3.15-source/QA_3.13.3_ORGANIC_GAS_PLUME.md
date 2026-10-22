# v3.13.3 QA

- `go test ./...`: passed.
- Browser smoke / toxic static-time render checks: no JS page errors.
- At 78% density, 960×540 synthetic keyed subject: 100% measured optical coverage at OUT handoff for **both** effects.
- Coverage rises progressively instead of appearing all at once: see `QA_3.13.3_ORGANIC_GAS_PLUME.json` for sampled timeline data.
- Final release frame contains no rendered alpha; no leftover opaque rectangle.
- Verified no regression to versioned Money and Ice files by modifying only smoke/toxic renderer code and metadata.

**Limitations:** No real Windows + OBS performance/hand-off validation. In a live OBS recording, confirm webcam visibility, no premature hide, 1080p60 frametime and top dissipation before using on stream. Use the previous v3.13.2 build as rollback.
