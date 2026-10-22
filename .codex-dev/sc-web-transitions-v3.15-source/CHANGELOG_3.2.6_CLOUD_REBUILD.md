# SC Web Transitions v3.2.6 — Cloud Rendering & Camera Cover Fix

## Critical camera-off correction

v3.2.5's Smoke/Toxic renderer capped its central compositing alpha at 86–90%. The application's OUT safety gate requires 98.5% opacity over the camera silhouette, so those effects could never reliably pass the renderer's full-cover check.

v3.2.6 retains the 98.5% fail-safe, but creates a widened, softened organic gas occlusion envelope derived from the keyed camera alpha. By the end of the covering phase, the envelope is fully opaque over the entire sampled silhouette, enabling the existing OBS camera-off sequence after a second confirmation using the OBS FX source screenshot.

## Effects

- Black Smoke: redesigned broad curtain as an advected three-lobe procedural volume with separately animated smoke sprites, varied turbulence, deeper shadows, and rising/dissipating trails.
- Toxic Cloud: separate chemical-gas palette, heavier/fuller clouds and restrained emissive motes. The glow remains separate from the actual opaque coverage.
- Both: no frame-field reset at cover→release; same motion clock continues while OBS responds, and the release field leaves the frame and reaches zero alpha at the end.
- The explicit recovery action is retained if OBS refuses to change source visibility.

## Protected effects

Money and Ice rendering functions were compared against the v3.2.5 release source and are unchanged.

## Limits

This is a Browser Source compatibility renderer, **not** a native OBS GPU plugin, true continuous webcam alpha tracker, or professionally certified physical fluid simulation. Synthetic and mock OBS tests do not replace a Windows OBS Program recording. The EXE is unsigned.
