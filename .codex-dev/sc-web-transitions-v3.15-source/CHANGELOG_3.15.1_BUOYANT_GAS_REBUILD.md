# v3.15.1 — Buoyant Smoke and Toxic rebuild

- Replaced the Smoke/Toxic plume density and lighting model in `gas-vfx3d.js` with a buoyant, domain-warped volumetric plume, expanding from a lower source with turbulent folds and a thinning upper edge.
- Gave Smoke a faster rise and cool scattered highlights. Toxic uses slower buoyancy, greater low-level density and restrained green scattering.
- Kept the renderer API, transparent canvas, transition timing, keyed alpha guard and the OBS controller's 98.5% rendered-coverage check.
- Updated renderer diagnostics and README architecture notes.

Validation in this environment: JavaScript syntax, overlay inline-script parsing, renderer API mock checks and `git diff --check` pass. Production WebGL shader compilation, visual preview review, OBS handoff and performance measurements remain unverified because the available Chromium process fails to launch and Go/OBS are unavailable.
