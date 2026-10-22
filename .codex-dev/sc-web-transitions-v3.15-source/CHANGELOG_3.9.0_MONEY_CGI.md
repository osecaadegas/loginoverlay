# SC Web Transitions v3.9.0 Money CGI — RC1

## Implemented in the Windows application

- A self-contained **WebGL2 instanced, deformable paper mesh** renderer (`money-vfx3d.js`) using original `bill.png` — no AI replacement of the sheep artwork.
- Multi-segment true curved surfaces (depending on preset, 10×4 through 22×9 quads per note) that flex and wave in the GPU vertex shader.
- Dynamic paper normals and studio-style directional lighting, satin-ink sheen, normal-map paper grain and 3D yaw/pitch/roll.
- Existing **Money OUT** blast choreography preserved with physically plausible bill depth, curling, flying and large hero note lens approach, now GPU-rendered.
- Existing **Money IN** bill drop, assembly and release preserved with 3D airborne bills.
- Critical camera safety: the finished opaque silhouette is the **unchanged measured 2D note composition** (verified 98.5%+), guaranteeing a reliable OBS cover even as the moving notes are 3D.
- `renderer_mode=2d` or unavailable WebGL2 automatically retains the previous functional 2D Money effect.
- Four original-banknote GLB paper meshes, normal/roughness maps and a source asset generator included in the editable asset kit.
- Updated renderer/Windows app version and optional installer recipe.

## Unchanged
- Original `bill.png` artwork and sheep face/sunglasses.
- OBS WebSocket v5 camera orchestration and coverage guard.
- Money 2D fallback, Ice and all other existing effects.

## Important limitations
- True real-time GPU rendering, **not offline path-traced CGI**. The paper is a physically inspired deformation shader; not a calibrated cloth simulation.
- Only a static source camera silhouette snapshot is used to plan the opacity cover; no native continuous camera texture tracking.
- OBS on Windows / RTX 4070 Super and streaming performance are not tested in this container. This is a **private test candidate**.
- Offscreen Mesa shader videos are synthetic 3D material reviews without webcam compositing or actual OBS.
