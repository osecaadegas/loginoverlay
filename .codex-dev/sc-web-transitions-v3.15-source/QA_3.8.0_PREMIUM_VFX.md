# SC Web Transitions v3.8.0 Premium VFX RC1 — Verification record

**Classification:** Windows private test candidate; not a commercial VFX quality approval or a real Windows OBS certification.

## Source baseline

- Based on SC Web Transitions v3.7.0 Crystal Ultra RC1.
- Original `drawMoney`, `drawMoneyCover`, `drawIce`, `drawIceCover`, `drawSmoke`, `drawSmokeCover`, `drawInferno`, `drawInfernoCover` JS function bodies were checked for exact equivalence with the v3.7 baseline.
- Existing OBS WebSocket camera enable/disable backend and coverage threshold were not reworked.

## Completed implementation

1. Original source meshes authored offline: eight crystal variants, four curved petal variants and three curved feather variants.
2. Combined glTF GLB collection and individual category hero GLBs.
3. Source material PNGs, including diffuse/albedo and normal-map source files for each category.
4. Matching WebGL-ready Float32 triangle streams embedded via generated `premium-vfx-meshes.js`. These are derived from the same geometry as the GLBs.
5. Instanced 3D premium crystal accent shader and independent growth/dispersal/reassembly movement.
6. Authored curved geometry integrated in GPU Shadow and Petal render paths.
7. Go routes for embedded JS, GLB, PNG and manifest resources, restricted to the local embedded asset directory.
8. Dynamic 2D compatibility fallback retained if the WebGL2 renderer cannot prepare.

## Verified in this environment

- Go tests (`go test ./...`), race tests (`go test -race ./...`) and `go vet`: PASS.
- JavaScript syntax checks for all modified renderer modules: PASS.
- Original 3D asset collection loaded successfully through trimesh: **15 geometries / 2310 triangles** before GPU instancing; winding consistent.
- All 15 authored WebGL vertex arrays decode, have finite values and reuse cached buffers: PASS.
- New embedded HTTP resource endpoint tests, including invalid path rejection and content type: PASS.
- Crystal fitted shell geometry test: **70 facets / 2010 triangles** in the 640×360 example: PASS.
- All eight WebGL2 rendering API paths, mocked GLSL driver and uniform cache behaviour: PASS.
- New premium crystal shader: compiled/linked and rendered through **real Mesa EGL OpenGL 4.5** with GPU instancing (software OpenGL); final OUT and IN alpha both zero.
- Simulated OBS WebSocket suite: all 16 expansion IN/OUT camera state handoffs passed, including reject-camera-OFF on low coverage. Teardown can emit socket-close stack traces in test logs; tests still complete.
- Cross-compiled Windows x86-64 GUI binary from final source: PASS.

## Not verified / artistic limitations

- The web browser in the Linux test container cannot establish WebGL2; shader quality on an actual Windows OBS Browser Source was **not verified**.
- Offscreen OpenGL output is software-rendered, not a benchmark of the user's RTX 4070 Super at 1080p60 with gaming/OBS load.
- GPU showcases preview only the new authored meshes; **they do not represent a final composite of all Crystal effect layers and a real person**.
- Original meshes are created programmatically, not hand-sculpted in Blender. Blender is not installed in the build environment; exported GLB assets can be refined there.
- The GLB material export carries base-colour maps and metallic/roughness settings. Normal maps are supplied as sources; the application's crystal shader approximates lighting and does not yet implement complete glTF PBR/IBL.
- Silhouette is sampled from a keyed OBS frame, not a live continuously updated native GPU segmentation buffer.
- No film-grade volume/fluids, accurate optical refraction or physically simulated collisions are claimed.
- Smoke, Toxic, Inferno, Lightning, Sand, Plasma, Holy and Glitch have not received new dedicated authored-effect designs here.
- This private build is not code signed or tested across multiple Windows versions and camera devices.

## Recommended acceptance procedure

1. Back up v3.7 and run v3.8 using the normal OBS connection and *Install / realign camera renderer* procedure.
2. Choose **WebGL2 3D + authored VFX assets (experimental)** and test Crystal OUT and IN in an OBS local recording.
3. Verify body concealment is complete before camera OFF, and no opaque pixels remain after final frames.
4. Test Petal and Shadow against v3.7 in the same lighting and camera configuration.
5. Test repeated transitions, interrupted OBS connection, camera ID changes, Stream Deck/hotkeys and recover camera.
6. Measure real OBS GPU/headroom and frame pacing at 1080p60 while running a typical game.
7. Collect subjective feedback on materials, motion, silhouette readability and visual identity; prioritize remaining individual effect work from the roadmap.

**Release gate: private RC, NOT public release.**
