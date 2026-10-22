# SC Web Transitions v3.2.0 RC1 — animation correction

- Preserves the existing approved Money OUT code and golden-sheep bill asset.
- Replaces Money IN's bottom/upward approach with banknotes arriving from above, assembling over the masked subject, waiting for OBS camera readiness, then bursting away.
- Separates Money IN's camera activation acknowledgement from the initial falling/assembly action; requests camera activation once 37% of the animation timeline has formed full coverage.
- Changes Black Smoke and Toxic Cloud's main density field from a broad rectangular curtain to a narrower subject-centred turbulent plume with variable width and negative space at the edges.
- Changes smoke dispersal to use a rising trailing boundary and blends the former cover shape into early release frames.
- Preserves the existing camera recovery mechanism and backend visibility verification.

## Limitations / release status

This is a **private RC**, not a public release. The OBS Browser Source still uses a snapshot silhouette, not continuous tracking. The native OBS plugin remains experimental, and true 1080p60 OBS performance, source handoff on physical webcams, and the visual VFX quality have not been certified.

## Test status

- Go unit tests: PASS.
- Windows AMD64 EXE cross-compilation: PASS.
- Inline JavaScript syntax parsing: PASS.
- Earlier strict smoke frame continuity test: FAILS in this environment at a 0.15 mean pixel difference limit, reporting about 1.46 out of 255 (this is not zero). No clean repeatable browser-validation pass after adjustments.
- Real OBS hardware: NOT TESTED.
- Native integration test invocation: BLOCKED in this container (the mock backend WebSocket listener was unavailable; ConnectionRefusedError), so it is not marked passed.
