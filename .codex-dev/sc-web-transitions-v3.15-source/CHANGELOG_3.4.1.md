# SC Web Transitions v3.4.1 VFX Polish RC1

## Changes
- Reworked all eight expansion effects in `expansion-effects.js`; no alterations to the approved Money and Ice animations.
- Removed the shared flat, opaque, single-colour figure treatment. Prepared surfaces now retain some keyed webcam luminance and use smoother material-specific surface noise and silhouette-edge highlights.
- Separated reveal choreography by material: pixel corruption (Glitch), asymmetric radial discharge (Lightning), shadow vortex (Swarm), rising golden illumination (Holy), diagonal wind erosion (Sand), mineral cell assembly (Crystal), descending petal cover (Petal), and magnetic energy field (Plasma).
- Eliminated shared rectangular tile fragmentation for six effects. Crystal now uses seeded, irregular Voronoi-like mineral cells clipped against the actual keyed camera shape, instead of a square grid.
- Effect release begins with the covered surface actively breaking down rather than holding a still opaque image for the first section of the OUT timeline.
- IN now joins the in-flight fragments and continuously assembles the concealment surface rather than revealing a complete solid material via one abrupt opacity crossfade.
- Fixed bevel/glint pixels outside the keyed silhouette in Crystal.
- Updated build/version strings and the optional Inno Setup recipe.

## Known limitations
- This remains Canvas2D cinematic-stylized rendering. It has not reached demonstrated Money/Ice visual parity or photorealistic 3D production quality. The material and simulation models are lightweight approximations, not physically based VFX.
- Effect masks use a static keyed camera snapshot. No native OBS real-time alpha tracking.
- No real Windows OBS Program capture, actual game+OBS 1080p60 test, installer-signature validation, or public-release certification.
- Crystal can exhibit large frame-time spikes in software Chromium. See QA report.
