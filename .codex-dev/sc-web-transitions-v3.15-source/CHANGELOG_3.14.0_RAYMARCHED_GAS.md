# SC Web Transitions v3.14.0 — Raymarched Gas RC1

Based on v3.13.4. Smoke and Toxic Cloud use a **new WebGL2 GPU raymarched volume** when WebGL2 is available and GPU mode is selected. The old 2D effect remains as a fallback; other transitions remain unchanged.

## Changes

- New `gas-vfx3d.js`: 3D noise texture, animated multi-column emission, 3D density integration along rays, light-scattering approximation, green emission for Toxic, organic rising front and early dissipation.
- GPU scaling presets: Performance, Balanced, Cinematic and Ultra; 20–40 samples per ray. Ultra supports native 1920×1080 internal output when the source is 1080p, with potentially heavy GPU cost.
- Cover completes with an optically measured keyed-subject guard, not a blind OBS camera-off signal.
- OBS coverage is **measured from the actual GPU alpha buffer** when the GPU path is active. If insufficient, the existing controller's safe error path prevents camera-off.
- WebGL2 context failure and runtime errors return to the previous tested 2D gas renderer.
- Actual offscreen Mesa shader-rendered smoke and toxic sequences are included. They are not Windows OBS recordings, and should not be confused with stock/reference images.

## Limitations

This uses 3D procedural density raymarching, **not physically simulated fluid dynamics, not a film-grade VDB cache, and not independently validated at 1080p60 on Windows OBS**. The protected webcam silhouette becomes opaque briefly before camera-off, which necessarily changes the visual appearance at the handoff.
