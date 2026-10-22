# SC Web Transitions v3.3.0 Inferno RC1

## New effect: Inferno Disintegration

- Added **Inferno Disintegration** as a fifth option in the Windows app, preview, saved settings, and hotkeys/Stream Deck effect selection.
- **OUT:** Irregular ignition begins from the lower part of the captured keyed silhouette, crawls upward, builds a fully opaque ember shell, and only then requests OBS camera OFF. The shell breaks up from below as flames and glowing embers rise away.
- **IN:** Glowing particles converge as an ember shell builds over the hidden camera. At 61% of the transition timeline the app requests camera ON, holds the cover while the webcam image is checked, and only afterward burns the shell away.
- Added cached fire textures, irregular surface ignition and breakup fields, dark molten surface shading, perimeter flame tongues, glow and independently moving ember particles.
- Inferno uses existing 98.5% foreground occlusion verification and OBS source state read-back, not an unverified direct hide.
- Rendering budget scales with the four existing Performance/Balanced/Cinematic/Ultra quality presets. Density changes ember/flame population.
- Fixed the synthetic preview to show the webcam at Inferno's reveal point.
- Added separate automated tests for Inferno effect coverage, cleanup, browser rendering, and a mock OBS controller sequence.

## Protected effects

The Money, Ice, Black Smoke and Toxic Cloud effect implementation sections were compared against v3.2.7 and remained byte-for-byte identical. The preexisting application-level OBS handoff/recovery code remains intact except for adding Inferno to allowed effect types and coverage checks.

## Known limitations

- This is a **private release candidate**, not commercial VFX quality certification.
- The effect currently uses a Canvas2D cached-raster simulation, not native volume/raymarching or a working libobs plugin. The result is a stylized ember transformation, not yet photorealistic volumetric fire.
- Live moving-person alpha tracking is not supported by the existing Browser Source architecture; source mask is a captured keyed camera still.
- The app has not undergone actual Windows+OBS webcam verification in this test environment, and is unsigned.
- Software-rendering draw-call measurements are not equivalent to actual OBS compositing or streaming frame timings.
