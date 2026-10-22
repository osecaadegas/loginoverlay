# SC Web Transitions — Premium VFX production roadmap

**Scope:** Upgrade visual fidelity effect-by-effect while preserving reliable OBS camera handoff. This document separates effects that should use authored 3D assets from real-time shader/simulation effects. It is a development plan, **not a claim that every effect is production quality**.

## Production standard and gate

Every effect must pass its own visual approval, not just a functional test:

1. Design a clear storyboard with separate IN and OUT choreography, a proper beginning, transformation, impact and cleanup.
2. Author reusable meshes, materials, textures, flipbooks or shader assets as needed. Avoid recolouring the same particle system.
3. Integrate into the OBS Browser Source rendering layer without editing the approved Money and Ice paths.
4. Check the actual composite at 1080p60, foreground mask edge quality, camera enable/disable confirmation and complete transparency.
5. Evaluate visual motion frame-by-frame and record in OBS with games running on a representative target GPU.
6. Pass ≥98.5% *visually rendered* subject concealment before OUT disables the camera. Recover safely on error.
7. Ship independently approved effects; do not present experimental effects as fully polished.

## Effect-by-effect priorities

| Priority | Effect | Art direction and technique | v3.8 progress | Remaining milestone |
|---|---|---|---|---|
| Protected | Money Burst | Keep approved readable banknotes and hero lens note | **Unchanged** | Regression checks only |
| Protected | Ice Shatter | Keep approved organic frost and fracture animation | **Unchanged** | Regression checks only |
| 1 | Crystal Growth Ultra | **Authored 3D geometry + fitted GPU silhouette shell**: mineral shards, thickness, bevels, hard normals, specular lighting and independent reassembly | **New 8-variant crystal GLB meshes integrated into WebGL2** | Hand-directed fracture timings, cinematic lighting/IBL, real OBS evaluation |
| 2 | Petal Bloom | **Authored curved 3D petals**, individual wind/flap dynamics, variant textures | **4 petal GLB variations; geometry integrated into WebGL2** | True multi-body wind solver, aerodynamic motion and colour studies |
| 3 | Shadow Swarm | **Authored feather meshes** plus GPU flock dynamics, motion layering, shadow scattering | **3 feather GLBs; geometry integrated into WebGL2** | Cohesive flight/flocking and stronger dark-material art direction |
| 4 | Lightning Surge | Realtime branching procedural arcs + luminous animated shader and bloom | Existing procedural path | Directed bolt trajectories and secondary arcing, reduced-flash variant |
| 5 | Inferno | GPU fire distortion, authored flame flipbooks, dynamic embers | Existing 2D baseline unchanged | Author fire flipbooks and physically motivated combustion |
| 6 | Black Smoke / Toxic | Layered volume-look density fields / baked simulation flipbooks | Existing baseline unchanged | Fluid field authoring; continuous advection; true OBS cover test |
| 7 | Sand Disintegration | High-density GPU instancing plus surface erosion, directional turbulence | Existing GPU procedural path | Distinct granular mesh/flipbook and physically convincing wind |
| 8 | Neon Plasma | Procedural shader ribbons, post-process bloom, refraction approximation | Existing GPU procedural path | Animated ribbons with varying width and coherent electromagnetic motion |
| 9 | Holy Ascension | Shader-driven golden energy plus authored particles and light shafts | Existing GPU procedural path | Golden material study and compositing |
| 10 | Void Glitch | GPU sample displacement, block corruption and temporal jitter | Existing GPU procedural path | Fragment reconstruction and subject texture remapping |

## Hybrid asset architecture delivered in v3.8

- The original GLB collection is located at `vfx_assets/SC_Premium_VFX_Asset_Collection.glb`.
- Individual GLB models: `crystal_hero.glb`, `petal_hero.glb`, `feather_hero.glb`.
- PBR texture sources: `_albedo.png` and `_normal.png` per material.
- `tools/generate_premium_assets.py` produces the GLBs and `premium-vfx-meshes.js` from the **same** geometry, preventing asset/export drift.
- `premium-crystal-accents.js` GPU-instances the crystal meshes; the existing fitted crystal shell is retained to provide meaningful subject coverage.
- `gpu-vfx3d.js` uses authored curved petal and feather geometry rather than its old flat grid for these two effects.
- The Go executable embeds and serves the asset files and JS modules locally, with path validation and the existing strict localhost policy.
- WebGL2 failure continues to use the older 2D fallback. **GLB source assets are exported; browser runtime currently consumes matching embedded vertex streams, not a general glTF parser.**

## Explicit limitations

- Assets are original procedural geometry authored offline, **not hand-sculpted by an external studio**, and Blender was not installed in this environment. GLB files can be imported and artistically refined in Blender.
- The WebGL2 app's material currently uses an authored-geometry-focused GLSL lighting approximation, **not full physically accurate glTF PBR texture rendering**. GLB exports contain source PBR materials for external editing.
- Geometry is based on a keyed screenshot of the camera, not continuously tracked 3D depth or a live video segmentation filter.
- No film-quality fluid simulation, offline smoke bake, ray tracing, true glass refraction or live native OBS GPU filter is claimed.
- Linux Mesa shader tests and mocked OBS calls do not certify visual fidelity or performance in actual Windows OBS at 1080p60.

## Release gates for future packs

**Pack A (now):** modular asset library, Crystal, Petal and Feather geometry integrated, QA and packager. **Status: technical test candidate.**

**Pack B:** bespoke Lightning + Inferno + Smoke/Toxic material systems, authored flipbooks, temporal test previews and real OBS evaluation.

**Pack C:** Sand + Plasma + Holy + Glitch motion design and PBR/post-processing improvements; audited performance budgets.

**Final certification:** multiple camera types, transformed OBS sources, OBS disconnects, repeated IN/OUT, performance while gaming, 1080p60 frame pacing, feature safety and subjective visual acceptance by the streamer.
