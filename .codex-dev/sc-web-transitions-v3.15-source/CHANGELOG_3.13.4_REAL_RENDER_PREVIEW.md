# SC Web Transitions v3.13.4 — Real Renderer Preview & Smoke Wisps RC1

Based on v3.13.3 Organic Gas Plume.

- Added procedural smoke filament textures that wind upward independently from the broad smoke puffs.
- Softened the dark and toxic cloud cards and reduced stacked cards, eliminating flat circular highlight discs and reducing layer count.
- Retained the seeded 2D volumetric gas field and separately measured, webcam-silhouette safe opacity seal.
- Used the **actual application rendering code** to produce smoke/toxic preview sequences, on white over the actual synthetic demo person. No stock illustrations or generated images are used as representations of the app.

## Important visual limitation

These effects remain layered Canvas2D procedural smoke, NOT fluid-simulated, raymarched 3D smoke. During handoff, the engine requires an opaque area covering the camera subject, so the frame **still becomes a dense gas mass** and can resemble the person-shaped silhouette. It does not look identical to photorealistic studio smoke examples. Delivering that distinct look would require replacing the existing visual renderer with a substantially new simulation, shader or professionally authored simulation assets.
