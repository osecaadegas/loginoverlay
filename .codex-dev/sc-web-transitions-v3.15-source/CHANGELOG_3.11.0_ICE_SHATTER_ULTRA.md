# SC Web Transitions v3.11.0 — Ice Shatter Ultra RC1

Base: v3.10.0 Money CGI Ultra. No removal of Money CGI, other effects, settings, OBS bridge, source positioning or hotkey support.

## New rendering implementation

- Added `ice-vfx3d.js`: a dedicated, source-local WebGL2 renderer for *real 3D* ice prisms constructed per webcam snapshot.
- Builds convex Voronoi shard geometry with irregular inset front facets, bevel bands and extruded sidewalls. Shard front faces sample the existing, keyed frozen camera texture rather than a generic blue rectangle.
- Perspective-correct translation, per-shard pitch/yaw/roll, depth and individual variable-delay flight curves. IN regathers, OUT disintegrates. Existing frost-front timing and IN camera reveal synchronization are retained.
- Forward plus secondary cool backlighting, reflective highlights, ice translucency approximation, procedurally perturbed refraction and subtle micro-frost in GLSL ES 3.00.
- Source alpha is tested on cap and bevel/side materials; invisible border regions are discarded, preventing out-of-silhouette polygon outlines.
- Entire fracture set is uploaded as one static vertex buffer and drawn as a single call per animation frame. Shared GLSL uniforms use cached locations. GPU textures and buffers are disposed on scene change.
- WebGL context-loss handling, automatic fallback to the unchanged Canvas2D silhouette-safe renderer, and proper idle hiding to avoid unnecessary redraws.
- Quality tiers control sampling/material detail, texture anisotropy and shard thickness. Performance tier uses thinner geometry; Ultra uses the strongest materials. Number of Voronoi cells is determined by the existing silhouette generator.

## OBS safety, reliability and regression

- Precomputes `iceOpticalCoverage()` from actual alpha pixels in the browser image, and sends it with the ice covered event. The Go controller now enforces `>= 98.5%` before trusting the covered signal for Ice (as it already did for Money/Smoke/Toxic).
- The pre-existing real OBS FX-source screenshot coverage verification is preserved and remains decisive before the live camera can be disabled. The WebGL shards are **not** used as the initial camera coverage mask.
- Retains Ice and Money IN handoff, camera recovery, timed-release, WebSocket synchronization, hotkeys, Stream Deck and local-only browser rendering.
- The 2D fallback gains a more deliberate staggered release flight curve, while retaining the old organic frost growth / fracture renderer.
- UI renamed Ice to **Ice Shatter Ultra**, clarifies the experimental 3D renderer and quality/fallback settings, reports the true selected renderer in status heartbeat.

## User-facing quick start

1. Make a copy of the previous working v3.10.0 EXE. Close it before switching versions.
2. Run `SC_Web_Transitions_v3.11.0_Ice_Shatter_Ultra_RC1.exe` (unsigned evaluation build).
3. Configure the OBS camera, select **Ice Shatter Ultra**, choose **Ultra** quality and **WebGL2 3D**.
4. Use an off-stream OBS 1080p60 recording to test Ice OUT and then IN. Confirm status reads `Ice Shatter Ultra WebGL2 3D`; otherwise check logs or set **Canvas2D compatibility** and Save.
5. Verify no scene-item jumps, coverage gaps, source-state mismatch, or stuck transparent/opaque FX. Repeat after toggling scenes and triggering quickly.

**This is an engineering evaluation build, not publicly certified or hardware-tested on the user's actual Windows OBS system.**
