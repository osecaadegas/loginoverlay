# 3.17.0 Cinematic GPU — 2026-10-23

Incremental Phase 2 implementation; not final acceptance of the requested AAA visual standard.

- Ice: include soft camera edges in optical mask, dilate the frozen surface, and complete frost growth before requesting the visibility switch.
- Inferno: use a full-resolution WebGL2 raymarched combustion volume, moving multiscale density, temperature-inspired shading and ember meshes instead of the former CPU visual path when GPU mode is available.
- Lightning: branching tubular geometry with depth and a separately shaded plasma concealment event.
- Shadow: animated absorbing volume replaces the feather layer in GPU mode.
- Holy: volumetric angular rays and halo replace rigid beam geometry.
- Sand: wind-directed procedural dust volume accompanies instanced grains.
- Crystal: closed faceted prism geometry and independent crystal-density concealment material.
- Petal: subdivided curved, tapered meshes with vertex deformation and a vortex density field.
- Neon: tubular energy paths and a toroidal volumetric energy field.
- Shared: camera RGB is never used in the new optical seal. Quality presets integrate 16/24/36/56 volume samples. Shaders are exercised during preparation, coverage reads reuse storage, and soft-edge coverage is measured across every sample.
- Existing Money, Smoke, Toxic, UI controls and IN=show / OUT=hide semantics remain intact.

Close the old application, extract the ZIP and run the 3.17.0 executable. It retains the existing self-install workflow and saved settings. Refresh or realign the OBS browser source. Windows signing is not included.

## Remaining visual work

These are procedural real-time approximations, not a fluid simulation or physically traced refraction. Ice retains its existing growth/shard renderer with the coverage repair. Crystal no longer uses the dedicated hero path; review the new material against your preferred art direction. Some shared envelope silhouettes are conspicuous. Petal needs denser overlapping mesh choreography; lightning/neon need further trail shaping. True scene refraction, temporal antialiasing, velocity-buffer motion blur and uniquely redesigned timelines for every direction are not implemented. Live OBS validation is required before production streaming.
