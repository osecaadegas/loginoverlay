# Money and Ice GPU rendering: 3.16.0 validation

These changes preserve the original golden-sheep banknote artwork and the existing Money OUT trajectory API. No downloaded visual assets or new rendering dependencies were added. Geometry, optics and lighting run in the existing WebGL2 browser renderer.

## Implemented surfaces

`money-vfx3d.js` now uses a depth buffer and separate opaque/depth-writing and sorted translucent passes. Deformed banknote texture coordinates interpolate in perspective instead of using an affine clip-space W. The shader derives a tangent frame from the actual bent geometry, combines the existing normal/roughness maps with GGX specular response, and restricts metallic ink response to gold pixels in the original artwork. Cinematic and Ultra add a directional depth shadow map with nine-tap visibility filtering. Those profiles also use bounded five-tap paper material filtering based on depth and observed prior-frame note motion. This is a local material filter, not full-scene temporal motion blur. CPU instance upload reuses a typed buffer and sort array without mutating the caller's records.

`ice-vfx3d.js` creates closed irregular polygon prisms with back caps, bevels, correctly computed per-triangle normals and quality-dependent facet rings. The new `drawGrowth(progress, clock)` API grows these actual meshes from seeded nucleation sites. Dispersion uses normalized-time angular momentum; incidental rendering wall-clock changes do not change the shard trajectory. Material shading includes an air/ice IOR of 1.31, Snell-law offset refraction of the supplied material texture, Beer-Lambert absorption, dielectric Fresnel/GGX highlights, broad studio highlights and internal procedural fracture lines. Shards become translucent during dispersion while the assembled safety surface remains opaque. The controller supplies procedural ice material rather than a frozen camera RGB portrait.

Both renderers release previous GPU allocations before re-preparing, balance resources on disposal, and delete partial shaders/programs when compilation fails. Preparing performs real representative rendering (Money opaque, fading and shadow paths; Ice growth and dispersion) followed by a 1x1 readback, then hides and clears the canvas. That bounded preparation-time synchronization completes lazy driver work before playback. No synchronous readback was added to the active draw loops.

## Actual quality workloads

| Profile | Money triangles/note | Money shadow map | Money local filter | Ice face rings |
| --- | ---: | ---: | --- | ---: |
| Performance | 80 | Off | Off | 1 |
| Balanced | 192 | Off | Off | 2 |
| Cinematic | 480 | 512 x 512 | Five taps | 3 |
| Ultra | 896 | 1024 x 1024 | Five taps | 4 |

Ice includes side walls, bevels and caps in every profile. Higher profiles add actual face geometry; the procedural internal fracture shader is enabled above Performance. No quality setting changes the camera safety threshold.

## Executed checks

- `node --check money-vfx3d.js` and `node --check ice-vfx3d.js`: passed.
- Existing `test_ice_ultra_gpu.js`, run as CommonJS from this directory: passed real mesh validation plus mocked WebGL resource/timeline checks. The 65-shard fixture produced 1,950/2,600/3,250/3,900 triangles across the four profiles.
- `node test_cinematic_surfaces.mjs`: passed actual Chromium WebGL2 shader compilation/linking, rendered Money motion, caller record order preservation, all four quality profiles, progressive Ice growth, both dispersion directions, zero final visible effect pixels, no GL errors, and balanced create/delete counts after repeated prepare/dispose. Shader, buffer, texture, program, VAO and framebuffer counts all returned to zero. This run used SwiftShader at 640 x 360; it is not a hardware performance result.
- `node test_cinematic_overlay.mjs`: passed the real overlay demo with local production assets for Money/Ice IN and OUT. Tests assert no unexpected 2D fallback, measured rendered coverage at least 99.5%, completion and no visible residual effect pixels. The camera is a moving demonstration silhouette, not OBS.

The integrated harness intercepts local production asset paths in Puppeteer; it is a test runner rather than a new app or server. Supply `SC_HARDWARE=1` to use default ANGLE instead of SwiftShader, `SC_CAPTURE=0` to remove capture overhead, `SC_WIDTH=1920`, `SC_HEIGHT=1080`, `SC_OUTPUT=./chosen-evidence/`, and optional effect arguments. `SC_DURATION` changes demonstration duration. Captured images composite the real renderer canvases on a dark review background within an animation frame; performance measurements must use capture disabled.

## Hardware playback measurements

Final run: Windows, Chromium 145, ANGLE Direct3D11, renderer reported **NVIDIA GeForce RTX 4070 SUPER**, 1920 x 1080, Cinematic profile, three-second playback configuration, screenshot capture disabled. Measurements are browser `requestAnimationFrame` intervals collected by the production overlay, not GPU timer-query durations and not OBS compositor frame times. The diagnostic retains up to 8,192 intervals, covering each entire measured event, including OUT cover and dispersion. No intervals were truncated in this run.

| Effect/direction | Samples | Median | P95 | P99 | Maximum | Above 25 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Money IN | 443 | 6.9 ms | 7.1 ms | 7.1 ms | 7.1 ms | 0 |
| Money OUT | 718 | 6.9 ms | 7.0 ms | 7.1 ms | 7.2 ms | 0 |
| Ice IN | 444 | 6.9 ms | 7.1 ms | 7.1 ms | 7.2 ms | 0 |
| Ice OUT | 656 | 6.9 ms | 7.1 ms | 7.1 ms | 7.2 ms | 0 |

All four final runs reported rendered coverage 1.0, zero unexpected fallback errors, transparent final idle, and no inferred missed 60 Hz frames. Raw intervals and CPU samples are in `final-surface-hardware-evidence/metrics.json`. Earlier pre-warmup Ice runs had P99 tails of 20.9–34.4 ms and individual pauses up to 326.4 ms; keep those observations distinct from the final run. The final measurement is a short sampled validation, not a guarantee against all driver/OS scheduling or concurrent streaming workloads.

## Remaining limits

No live OBS hardware stream was available in this test path. Camera capture, source transform, remote acknowledgement timing and actual streamed composition still need a real OBS rehearsal. The Ice shader refracts its procedural ice texture, not the live scene behind OBS; that scene is not available to this renderer. Transparency uses depth testing and blending, not order-independent physical transmission. Banknote motion filtering is bounded material sampling, not full velocity-buffer camera motion blur. Neither effect is an offline path-traced CGI simulation. Resource accounting validates explicit allocations across re-preparation; it is not a long-running driver-memory soak test.

Recommended next rendering improvement: an optional OBS scene-color/depth bridge plus weighted transparency/refraction for ice, validated under simultaneous OBS capture/encoding. Do not replace the existing safety gate until equivalent rendered-coverage and recovery tests pass.
