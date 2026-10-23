# Gas volume rendering and validation — 3.16.0

## Implemented

`gas-vfx3d.js` preserves the existing `SCGasVolume.Renderer` interface and renders Smoke and Toxic with WebGL2/GLSL ES 3.0. Both directions use the same continuous density/time field. The controller owns camera state; this renderer never changes OBS visibility.

- Perspective rays integrate extinction and radiance through a three-dimensional procedural density field, using front-to-back Beer–Lambert transmittance.
- Five depth-separated rising emitters feed overlapping, unequally sized and tilted pressure cells. Domain-warped 3D noise creates evolving folds and wisps. The macro silhouette uses smooth unions of these cells rather than an extruded ellipse.
- Directional shadow rays sample volume density. Soot uses cool, low-albedo scattering; Toxic uses slower buoyancy, heavier lower density and restrained green internal emission.
- Coverage is produced by integrated volume density. The previous hard `max(alpha, silhouette)` safety stamp is removed. Actual rendered coverage must still pass the controller's external gate.
- Cover and release produce identical pixels when called at the same time at their shared endpoint. During the covered hold, advection and lighting continue. Release stops emission, advects the volume away and continuously reduces extinction; near-final alpha is zero before final cleanup.
- Static ray jitter reduces banding without a changing noise pattern. It is deliberately restrained to reduce grain.
- Programs, 3D noise, mesh buffers and coverage targets are reused when the renderer is prepared again. Deterministic CPU noise is cached across instances. Representative rendering runs in preparation, before playback.
- Frame submission allocates no geometry or noise textures. GPU timing uses bounded asynchronous timer queries; results are not synchronously waited for.
- Coverage readback copies the real framebuffer to a reusable 192-pixel-wide framebuffer, rather than reading all 1080p pixels. The sampled alpha threshold is 254/255. This sample is not a substitute for the controller's independent OBS screenshot gate.
- Disposal removes its canvas, buffers, textures, framebuffer and timer queries. Context loss makes the renderer unavailable, allowing the existing controller error/fallback path to act.

## Real workload presets

At a 1920×1080 output:

| Preset | Internal buffer | View steps | Shadow steps | Noise octaves |
| --- | --- | --- | --- | --- |
| Performance | 768×432 | 22 | 1 | 2 |
| Balanced | 1056×594 | 30 | 1 | 3 |
| Cinematic | 1382×778 | 42 | 2 | 3 |
| Ultra | 1920×1080 | 60 | 3 | 3 |

Noise remains a procedural volume, not a Navier–Stokes fluid simulation. No third-party gas textures or external asset rights are required. This update does not implement temporal reprojection, a dedicated motion-blur pass or offline CGI simulation.

## Validation performed

`test_gas_shader_browser.mjs` compiles and draws the actual shader in local Chrome SwiftShader, using a 960×540 synthetic silhouette. It checks:

- Bottom-up progression and material variation.
- At least 99.5% of subject samples at alpha 254 or higher; both effects achieved 100%.
- Matching coverage from the renderer's small framebuffer readback.
- Exact pixel equality across cover/release at the same timestamp.
- Continuing motion during a covered wait.
- Zero near-final alpha at progress .999 and zero residual pixels at completion.
- Repeated preparation retaining the same shader program/noise texture and safely reusing coverage resources.
- Canvas removal after disposal.

The original baseline test failed its existing covered-smoke material-variation check before changes. The strengthened suite passes after the update. Six representative frames per effect are saved for building, growing, covered, switch-hold, dispersion and idle; black in a PNG viewer represents transparent areas, not an opaque rectangular backdrop.

### RTX 4070 SUPER measurements

`benchmark_gas_volume.mjs` ran through Chrome ANGLE Direct3D11 and reported `NVIDIA GeForce RTX 4070 SUPER (0x00002783)`. It draws 120 covered-hold frames per effect/preset at 1080p output; frame intervals exclude the first 30 frames. This is independent renderer validation with a synthetic rectangular camera mask, **not OBS, encoding, streaming or combined-game load**.

| Preset | Smoke GPU P95 | Toxic GPU P95 |
| --- | --- | --- |
| Performance | 0.346 ms | 0.358 ms |
| Balanced | 0.868 ms | 0.914 ms |
| Cinematic | 3.038 ms | 3.707 ms |
| Ultra | 8.166 ms | 8.881 ms |

Frame interval P95 was about 7 ms through Cinematic on the host's 144 Hz scheduling. Ultra P95 was 13.9–14 ms and P99 20.8–20.9 ms. No measured interval exceeded 25 ms. All eight cases reported 100% sampled optical coverage and zero final alpha. These short runs are not a sustained-load guarantee. A covered hold is not necessarily the most expensive phase because transparent release may execute more ray steps before early termination.

The production-overlay `test_cinematic_overlay.mjs` also exercised Smoke/Toxic IN and OUT at 1920×1080 in Cinematic. All four completed with coverage 1.0, no runtime errors/fallback and clean idle. The GPU identity was explicitly RTX 4070 SUPER through ANGLE D3D11. Full-cycle frame P95 was 7.0–7.1 ms and P99 7.1 ms across all four cases; the largest recorded interval was 8.1 ms (Smoke OUT). There were no intervals over 25 ms. OUT retained 775 frame intervals, including cover and release, rather than only the last part of playback. Full-cycle frame timing and final GPU query diagnostics are preserved separately in `gas-overlay-hardware-evidence/metrics.json`.

## Reproduce

Install the repository's existing Puppeteer dependencies and set `SC_CHROME_PATH` if the browser is not found automatically.

```powershell
$env:SC_CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
node test_gas_shader_browser.mjs
$env:SC_GAS_HARDWARE='1'
node benchmark_gas_volume.mjs
$env:SC_HARDWARE='1'
$env:SC_CAPTURE='0'
$env:SC_WIDTH='1920'
$env:SC_HEIGHT='1080'
$env:SC_OUTPUT='./gas-overlay-hardware-evidence/'
node test_cinematic_overlay.mjs smoke toxic
```

Use `SC_CAPTURE=1` for overlay screenshots; do not compare screenshot-heavy playback timings with capture-disabled performance measurements. Evidence output folders are local QA artifacts, not application runtime dependencies. Final live OBS switching and streaming-load acceptance require the parent application's integration checks.
