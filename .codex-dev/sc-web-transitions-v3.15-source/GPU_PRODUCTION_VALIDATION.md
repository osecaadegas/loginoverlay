# GPU renderer production changes and validation

This document describes the implemented shared GPU-family work. It is not live OBS certification or a claim of finished AAA art quality. Money, Ice, Smoke and Toxic have separate renderers and separate validation records.

## Optical coverage protocol

`SCGPU3D.CoverageProbe` copies the rendered default framebuffer into a reusable GPU texture. A reduction pyramid evaluates **every output pixel** under the conservative camera mask, taking the minimum rendered alpha. Mask pixels with alpha at least 16/255 require concealment. The final result has four bytes: minimum optical alpha and whether any required camera pixel exists. Coverage passes only when that minimum is at least 254/255. Empty masks fail. Odd-sized targets use neutral out-of-bounds reduction values.

This replaces the previous full-frame CPU readback and sparse pixel checks. The live path uses a four-byte pixel-pack buffer and GPU fence. `sampleAsync(field, width, height)` returns `{ready:false, ratio:null, sequence}` until a zero-timeout fence poll succeeds; only then does it read the four bytes and return a fresh result. Callers must neither count nor reject a pending sample as a completed coverage observation. `invalidate`, `hide` and new-job preparation cancel pending fences so previous-job or preparation samples cannot authorize a new handoff. The synchronous `measure` API remains for offline tests and preparation.

The optical gate cannot prove live camera freshness. It checks the rendered effect against the supplied camera footprint, and the controller must still independently verify the OBS composite and resulting camera visibility. No camera RGB enters the shared concealment shaders, including Glitch; an opaque recoloured webcam image is not used as proof of concealment.

Glitch uses a one-mask-texel digital fringe around the camera footprint. This prevents fractional scaling and MSAA samples from revealing keyed edges. The coverage gate is not relaxed. An actual 256x144 to 1920x1080 curved silhouette exposed 375 missing pixels before this correction and zero after it.

## Rendering changes

| Effect | Implemented behavior |
| --- | --- |
| Inferno | Dedicated 3D combustion integrator, advected multi-scale fuel turbulence, temperature-based emission, soot absorption, irregular boundary and direction-dependent gas release. |
| Lightning | Branching tubular geometry with perspective depth, leader propagation and decaying strikes; animated ionized volume at the concealment climax. |
| Shadow | Six inward helical density flows, independent cloud turbulence, extinction and dim directional rim scattering. |
| Holy | Perspective-dependent light shafts, nonuniform angular scattering, halo and illuminated dust. |
| Sand | Advected dust layers, directional attenuation, granular instanced geometry and turbulent grain motion. |
| Crystal | Hexagonal faceted volume, closed crystal meshes, thickness-dependent colour absorption, dielectric highlights and varied roughness. |
| Petal | Curved meshes with aerodynamic deformation and corresponding animated normals, varied silhouettes, veins, thin-surface backlighting and vortex motion. |
| Plasma | Flowing toroidal emission and depth-varying tube ribbons; retained its existing configuration key. |
| Neon | New independent energy-shield lattice and intersecting 3D tube loops with travelling pulses. |
| Glitch | Procedural signal tearing, RGB corruption and volumetric fragments; no frozen source image. |

The four existing presets control the bounded volumetric iteration count: Performance 16, Balanced 24, Cinematic 36 and Ultra 56. Upstream effect configuration controls particle population. Empty pixels outside the effect bounds now bypass expensive raymarching. Resources are reused per renderer; `dispose()` clears the job, and `destroy()` releases the renderer pool and DOM canvas permanently. Shader compile/link failures release partial resources.

## Executed tests

- `node run_gpu_renderer_api_test.mjs`: all ten GPU families, uniform-cache reuse, four-byte coverage routing and permanent teardown. WebGL API is mocked in this test only.
- `node test_phase2_optical.mjs`: 80 actual Chromium GPU cases; ten families, four presets, two shifted translucent camera footprints. Verified RGB-independent concealment and transparent completion.
- `node test_gpu_production.mjs`: 200 rendered checkpoints across IN/OUT; continuously changing covered frames; six deliberate single-pixel/partial-alpha defects rejected; odd dimensions; fractional Glitch matte; asynchronous fence completion and cancellation; twelve repeated pooled lifecycles with zero outstanding buffers, textures, framebuffers, shaders or programs after teardown.
- `SC_HARDWARE=1 SC_WIDTH=1920 SC_HEIGHT=1080 SC_CAPTURE=0 node test_cinematic_overlay.mjs glitch`: actual production overlay IN and OUT completed at coverage 1 with no runtime errors or remaining effect pixels. Synthetic source and preview controller, not OBS.

Evidence: `qa/production-gpu/metrics.json` and ten per-effect contact sheets. The benchmark compares source revision `8de8a6e6` against the changed renderer using the same fixture. Standalone source archives without Git history can use `SC_GPU_BASELINE_PATH`; otherwise the current tests run without a historical comparison.

## Measured performance

Environment: Windows, Chrome 155, ANGLE Direct3D11, NVIDIA RTX 4070 SUPER. Browser-only 1920x1080 Cinematic fixture; 45 measured rendering frames per effect. No OBS encoding, live webcam, game load, CPU-utilization measurement or long-running soak is represented by these figures.

| Effect | Previous mean GPU ms | Updated mean GPU ms |
| --- | ---: | ---: |
| Inferno | 5.66 | 3.89 |
| Lightning | 3.41 | 2.51 |
| Shadow | 3.27 | 2.62 |
| Holy | 3.40 | 2.52 |
| Sand | 4.94 | 3.41 |
| Crystal | 5.42 | 3.53 |
| Petal | 3.22 | 1.97 |
| Plasma | 3.46 | 2.25 |
| Neon | Not present | 2.27 |
| Glitch | 0.09 | 0.09 |

The live asynchronous coverage calls averaged 0.16–0.34 ms of CPU submission/poll time, with a 0.50 ms maximum in this isolated run. Old synchronous coverage calls averaged 3.07–9.77 ms. GPU work is still required, and fence latency includes the application's polling interval. GPU contention in a separate concurrent run produced longer timings; these values are not a guaranteed streaming frame rate. The host browser scheduled approximately 144 Hz, which is not proof of OBS-presented FPS.

## Visual limitations still requiring art direction

Contact sheets were reviewed. Fire is smoother and has better thermal range, and Neon is distinct from Plasma. However, Holy still reads as bright parallel curtains at its densest point; Shadow's internal motion remains too dark in small presentation; Lightning's opaque plasma climax can dominate its bolt geometry; and several optical safety climaxes remain visually bulky. Crystal and Petal use dimensional geometry, but their dense sealing layers still need a better organic arrangement. Materials approximate scattering/refraction; they do not refract a continuously sampled live camera texture. These are functional rendering improvements, not certification that every effect has reached the requested cinematic standard.
