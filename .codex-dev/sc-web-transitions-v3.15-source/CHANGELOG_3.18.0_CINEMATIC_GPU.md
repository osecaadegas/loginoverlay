# SC Web Transitions 3.18.0 Cinematic GPU

Release date: 28 October 2026. Previous maintained version: 3.17.0. This is a release candidate with implemented reliability, rendering and product improvements; it is not certification of cinematic perfection or live OBS streaming performance.

## Controller and recovery

- Replaced the delayed process exit with coordinated shutdown: reject new work, cancel an active transition, reconcile the installed camera and FX visibility using OBS readback, unregister hotkeys and close the local server. Unconfirmed recovery blocks shutdown and remains visible in the UI.
- Added a recovery journal for interrupted transitions. Restart requires reconnection and verified recovery instead of silently assuming the old OBS state.
- Added timestamped transition events, frame-sequence evidence and consecutive coverage confirmations. Camera/scene changes invalidate cached frame data. Installation and recovery reject ambiguous direct source references instead of guessing which instance to change.
- Hotkey changes register new combinations before releasing working combinations. Conflicts retain the previous controls; settings-save failures roll back the shortcut configuration.
- Settings now have a validated schema, atomic writes and a previous-version backup. Import/export and backup restoration are exposed in the application.
- Status and diagnostics require the UI token. Renderer capabilities are not published in general status. Diagnostic exports exclude camera images, credentials, source names and user-entered logs.

- Added a current OBS compositor guard before coverage and immediately before switching. Changed native dimensions, crop, position, scale, rotation, bounds, hidden/lowered FX and non-normal blend modes cause a safe refusal. Recovery bypasses this visual requirement.

## GPU rendering

- Shared effect coverage now reduces the minimum rendered alpha across the camera footprint on the GPU. The final readback is four bytes instead of a full 1080p RGBA image. The live renderer uses pixel-pack buffers and fences to await new results without blocking the animation thread or reusing stale evidence.
- Money IN has more varied depth, drift, outward release and independent paper-bending modes. Approved OUT choreography is preserved. Repeated preparations reuse matching geometry/material resources, and linked shaders survive configuration changes.
- Ice uses thicker convex facets, varied optical path lengths, granular surface normals, trapped inclusions and restrained reflections. Crack-width handling was repaired so seam settings are respected instead of overwritten. Opaque frost remains part of the verified concealment event.
- Smoke and Toxic use nine independently positioned volumetric emitters, bounded curl advection and physical optical-density accumulation. Their release separates the puffs rather than leaving a rigid silhouette. Toxic retains slower, heavier motion and internal green scattering. A strict full-canvas test caught thin Toxic holes and the volume density was corrected.
- Inferno, Lightning, Shadow, Holy, Sand, Crystal, Petal, Neon, Plasma and Glitch received effect-specific GPU geometry, density, lighting or motion changes. Neon is now a distinct selectable effect rather than a Plasma label. See `PRODUCTION_3.18.0.md` for the rendering boundaries and `QA_3.18.0_CINEMATIC_GPU.md` for evidence and test scope.

## Interface and distribution

- Added a persistent Recover Camera control, confirmed camera-visibility status, current transition phase and a Diagnostics & Backups page.
- Diagnostics separate browser animation cadence from unavailable OBS Program/encoder metrics. Synthetic previews are explicitly labelled and remain off until requested.
- Preview direction and effect reset are explicit controls; errors are displayed instead of hidden.
- Added a Windows build/package script with embedded source revision, executable reproducibility comparison, artifact hashes, and an Inno Setup installer recipe. Setup/uninstall refuse to force-close a running engine; upgrades preserve the prior executable and user settings.

Use Quit in the running application before installing. Refresh/reinstall the OBS Browser Source after upgrading to load the matching renderer. Artifacts are unsigned. Build outputs and their final provenance are recorded in `release-manifest.json` and the delivery report; a recipe alone is not evidence that an installer was produced or installed successfully.

## Still unverified or unsupported

Live OBS Program/Preview recording, real webcam motion, game/encoder contention, multi-hour soak, signed distribution and production installation rehearsals remain separate acceptance gates. Only one unambiguous direct camera/scene-source item is controlled at a time. Nested child transforms, grouped cameras and simultaneous independent cameras are not implemented. Captured silhouettes are not continuous live texture access. Rendering remains procedural and does not implement fluid simulation, live-camera ray-traced refraction, or a production native OBS plugin.
