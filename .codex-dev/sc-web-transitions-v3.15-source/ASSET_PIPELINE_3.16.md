# Reproducible assets and runtime geometry — 3.16

The shipping assets remain inside this source tree and are embedded by Go. No third-party stock footage or replacement banknote artwork was introduced.

- `bill.png`: established SC golden-sheep banknote artwork, supplied by the project. It is used unchanged on all Money geometry. Ownership/licensing is inherited from the existing project; this release does not grant third-party rights.
- `vfx_assets/golden_sheep_paper_normal.png` and `golden_sheep_paper_roughness.png`: existing project paper material inputs.
- `money-vfx3d.js`: deterministic subdivided paper geometry, analytic bending/tangent derivatives and GPU instancing. Performance/Balanced/Cinematic/Ultra use 80/192/480/896 triangles per note; shadow maps are disabled/disabled/512/1024. Procedural generation avoids fetching GLBs during a live transition.
- `ice-vfx3d.js`: capped irregular cells generated from the actual camera silhouette, 1/2/3/4 bevel rings across profiles. Geometry, normals and indices are created in preparation, with motion/growth in vertex shaders. `overlay.html` creates the seeded fracture cells and frost propagation material; the camera screenshot supplies only silhouette geometry, not displayed frozen RGB.
- `gas-vfx3d.js`: seeded 3D noise, perspective ray marching and depth emitters. Noise textures and GPU programs are reusable. `benchmark_gas_volume.mjs` records actual work profiles and GPU timers; the material is procedural rather than a Navier–Stokes simulation.

## Optional offline editing

Existing `create_money_3d_assets.py` reproducibly exports the golden-sheep paper collection to `vfx_assets/*.glb` using NumPy, trimesh and Pillow. These are normal-scale, double-sided PBR reference meshes (paper width 0.156 metres), imported into Blender with glTF import; the shipping runtime uses equivalent procedural geometry. Blender 5.1 is available on the development host but no new offline CGI footage was generated or claimed for this release. Re-exporting the existing collection is unnecessary for shader-only material/geometry changes.

`CINEMATIC_PLATES_GUIDE.md` documents the optional six VP9-alpha clips. GPU mode takes precedence so coverage can remain in motion for an unpredictable OBS acknowledgement interval. Compatibility-mode video can pause at its last covered frame; it is not covered by continuous GPU-motion claims. Assets installed separately are responsible for their own usage rights and coverage.

## Validation

Run `node test_cinematic_surfaces.mjs` for mesh/material/cleanup checks, `node test_gas_shader_browser.mjs` for volumetric alpha and continuity, and `node test_cinematic_overlay.mjs money ice smoke toxic` for the actual overlay. Browser tests use an explicit synthetic camera and distinguish SwiftShader from hardware ANGLE. Capture/output folders are processing evidence; reviewed representative captures and metrics live in `qa/3.16.0`.
