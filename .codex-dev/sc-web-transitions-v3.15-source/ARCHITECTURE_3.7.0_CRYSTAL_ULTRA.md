# Crystal Ultra rendering architecture

`overlay.html` loads `crystal-hero3d.js` before `gpu-vfx3d.js` and the expansion fallback renderer. The 3D renderer chooses the independent `CrystalHero` path only when `fx.type === 'crystal'` and WebGL2 is available.

- **Prepare:** keyed source snapshot is uploaded to a GPU texture. Deterministic nonuniform Voronoi seeds produce fitted polygons. Each cell is triangulated into a raised main facet, bevel faces and side walls. Positions, normals, UVs, center, explosion velocity and seed/delay are stored in one static buffer.
- **Cover:** a moving, seeded mineral-growth front combines with individually growing 3D facets. At full coverage the body samples the exact source alpha and meets the application's measured concealment threshold.
- **OUT:** static shell fractures then separates into deterministic 3D rotations, translations and perspective movement. Final alpha returns to zero.
- **IN:** the same facets move inward and lock exactly to their original cells; the full GPU seal conceals the source during camera ON verification. Then it cracks and shatters outward, revealing the live OBS camera.
- **Fallback:** on GPU preparation failure the app uses the older 2D expansion renderer; approved Money/Ice render independently.
- **OBS:** Go backend still resolves scene-item IDs, verifies concealment and performs camera changes via WebSocket. The 3D shader does not hide the camera or access native live textures.

Quality tuning controls the target number of facets (Performance/Balanced/Cinematic/Ultra), while per-effect detail adjusts the density. The result uses a GPU reference camera-space animation and simplified lighting, not offline ray tracing or PBR optical simulation.
