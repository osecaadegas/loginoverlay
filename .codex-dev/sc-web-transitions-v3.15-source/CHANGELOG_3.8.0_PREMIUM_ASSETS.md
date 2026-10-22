# SC Web Transitions v3.8.0 Premium VFX RC1 — change log

- Added offline model creation pipeline using `trimesh`/NumPy/Pillow. Produces real `.glb` meshes plus PBR source maps.
- Created 15 original 3D meshes: eight mineral crystal spikes, four curved rose petal variants and three dark feather variants.
- Added 3D instanced authored crystal accent renderer with GLSL surface lighting, particle travel and timeline-controlled IN/OUT.
- Replaced the old generic GPU grid with source-exported 3D petal/feather geometry for Petal Bloom and Shadow Swarm.
- Added resource-safe Go embedding and readonly loopback asset routes.
- Kept the fitted Crystal shell so shader-rendered visual occlusion is measured before OBS camera OFF.
- Kept existing Money, Ice, Smoke, Toxic and Inferno render functions unchanged.
- Added automatic asset integrity, HTTP route and shader/render tests.
- The new asset/lighting pipeline is experimental; further effect-specific artistic iteration is required.
