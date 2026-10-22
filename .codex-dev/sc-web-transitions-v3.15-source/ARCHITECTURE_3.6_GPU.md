# SC Web Transitions v3.6: WebGL2 3D Rendering Architecture

## What changed

The prior `webgl3d.js` was loaded but deliberately hidden in `overlay.html`. All eight expansion transitions were rendered with Canvas2D. Version 3.6 replaces that disabled path with a **working conditional WebGL2 pipeline** in `gpu-vfx3d.js`.

- One WebGL2 context, created only for supported expansion effects.
- GPU vertex transformation and perspective projection, not `ctx.drawImage` per fragment.
- Static instanced per-particle buffers generated once per transition.
- 3D cube geometry for Void Glitch, faceted octahedra for Crystal and Sand, subdivided flexible meshes for Petal, Shadow, Holy and energy particles.
- Vertex-shader rotation, bending, depth displacement, and per-type trajectories.
- Material-specific GLSL fragment shading and separate lightning, plasma and light ribbon mesh passes.
- Camera-specific keyed silhouette uploaded as a GPU texture; one full-resolution protective opacity layer composited with GPU particles.
- Opacity measured using a one-time GPU framebuffer readback at the OUT concealment boundary, before acknowledging OBS camera-off.
- Context-loss safety: falls back to 2D; reloads the source to recreate GPU resources after restoration.
- GPU 3D / 2D compatibility selection is saved in the app settings and sent in the transition job. Browser preview respects the same choice.

## Transition control

OBS websocket remains in the Go backend. WebGL cannot directly hide or enable a webcam. The browser reports `covered`, `reveal` and `done`; the backend resolves scene-item IDs, checks actual visible coverage and verifies final camera state. IN holds the concealing silhouette until the camera is reported ready.

## What has not changed

All current Money, Ice, Smoke, Toxic and Inferno effect-rendering function bodies are identical to v3.5.0. The eight expansion effect definitions, tuning, particle seeds and 2D fallback are retained.

## Architectural limitations

1. The live subject alpha is still a snapshot from OBS, not a native live camera texture. Moving webcam silhouettes may mismatch.
2. `gpu-vfx3d.js` uses 3D meshes and material shaders; it does **not** perform offline ray tracing, fluid simulation, physically based refraction or full volumetric raymarching.
3. Black Smoke, Toxic and Inferno remain on their existing 2D paths. This version proves a reusable WebGL2 path for the eight expansion effects; it does not yet migrate all effects.
4. GPU framebuffer readback and `preserveDrawingBuffer` can affect frame pacing. Benchmark in OBS with the actual GPU.
5. A native OBS plugin has not been completed or integrated.
6. WebGL2 hardware rendering was not available for real visual review in this development environment. Shader compilation/linking passed on Mesa OpenGL with ES 3.0 compatibility, and JS calls were exercised through a mock, but this is not equivalent to a Windows OBS test.

## QA acceptance for advancing to production

- Verify `Renderer: WebGL2 instanced 3D` in the Windows app when running an expansion effect.
- Verify no visual silhouette inversion, background boxes or camera flashes.
- Record each of the eight effects in both directions at 1080p60, during gaming.
- Confirm coverage handoff, camera OFF after OUT, camera ON after IN, and complete final transparency.
- Benchmark 95th and 99th percentile OBS render frame times and repeated-cycle memory use.
- Conduct artistic review of each material/animation. A functioning 3D renderer is not automatically professional film-quality VFX.
