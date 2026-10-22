# SC Web Transitions v2.8.0 — Visual overhaul

### Animation
- Money: rebuilt larger 3-tier custom-note placement (large/medium/small), airborne sprite pass, progressively landed silhouette, adaptive gap fill, same-pass measured alpha coverage and backend validation. Final bill now originates from an existing large note and uses a perspective-deformed mesh.
- Smoke/Toxic: rebuilt from an arbitrary-position particle cloud to a bottom-origin rising gas volume, with animated scrolling turbulence, textured wisps, heavier optical density and shaped boundaries. The continuous animation age does not restart after OBS source changes.
- IN Smoke/Toxic: retains full moving cover until the OBS controller marks `camera_ready`, then begins lifting the gas. No fixed-timer hard reveal.
- Ice IN and OUT: preserved existing appearance; regression checked.

### OBS and safety
- New `effectiveFXCoverage` independently compares OBS screenshots of the webcam and FX source, sampling composited alpha at foreground locations. Camera stays ON if visibility is inadequate.
- Backend validates >=98.5% reported coverage on Money, Smoke and Toxic, and remains safe on renderer/OBS errors.
- Added unit tests for total and partial source coverage; mock OBS regressions for all four effects, invalid key and missing FX, plus partial green cloud.

### Performance
- Batched moving Money sprites on adaptive-sized canvas, reserving full-resolution output for hero bill and cached coverage.
- Smoke procedural noise volume generated in a capped reduced-resolution buffer with separate textured particle layers.
- Unrelated 2D/3D extra compositing path disabled for Money, Smoke and Toxic to prevent wasting frame time.

### Compatibility and limitations
- 2D money/gas hybrid + WebGL/2D Ice fallback.
- Saves previous OBS, hotkey, Stream Deck and quality settings.
- Live continuous alpha tracking is not implemented; current silhouette is sampled at transition start.
- 1080p60 inside real OBS on Windows is pending and required before public release.
