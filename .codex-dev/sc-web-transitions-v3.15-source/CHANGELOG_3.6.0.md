# SC Web Transitions v3.6.0 GPU Rebuild

- Integrated working WebGL2/GLSL3 rendering path for eight expansion effects.
- GPU-instanced 3D particle meshes and dedicated volumetric-looking material shading for each expansion family.
- Extruded cube fragments, octahedral crystals/grains, flexible tessellated surface patches and GPU energy ribbon geometry.
- GPU projected perspective and real vertex normal shading.
- Added actual GPU alpha-framebuffer coverage measurement at OUT concealment, preserving the 98.5% camera-off safety threshold.
- Added persistent GPU / 2D compatibility mode selector, with browser-renderer status diagnostics.
- Restored robust fallback if WebGL2 is unavailable and context-loss reload handling.
- Kept Money, Ice, Black Smoke, Toxic Cloud and Inferno rendering function bodies unchanged.
- Added shader/API/fallback test artifacts and detailed production blockers.

This is a **renderer foundation rebuild**. The eight GPU effects need visual review on actual Windows OBS before any AAA-quality or public-release claim.
