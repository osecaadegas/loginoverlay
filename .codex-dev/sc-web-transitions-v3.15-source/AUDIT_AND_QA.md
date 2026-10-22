# SC Web Transitions — Cinematic Animation Audit

Release: **2.4.0**
Review target: **2.3.0 → 2.4.0**
Scope: procedural rendering, source-key integrity, choreography, texture fidelity, transition synchronization, CEF/browser performance and distribution.

## Findings and corrections

| Priority | Issue in 2.3 | Risk | 2.4 correction |
|---|---|---|---|
| High | Notes were too small and uniform; the frozen silhouette looked like flat beige halftone | Custom $100 image not legible, weak visual payoff | New mixed-size banknote hierarchy, macro-note sprites + clipped detailed bill mosaic, distinct freeze/assembly/release/lens-contact beats |
| High | Flat cubic interpolation repeated across effects | Mechanical, unmotivated speed changes | Per-effect stagger, hold/anticipation, nonuniform easing, different depth, release timing and gravitational exits |
| High | Ice shards looked like flat colored triangles | Low perceived material quality | Cropped, unscaled original webcam textures inside each triangular shard; baked beveled highlights, refraction tint, directional glint and independent rotations |
| High | Smoke clouds were mostly soft overlapping radial circles | Artificial “puff” appearance | Fractal-noise cloud textures baked once, layered depth, phase-varying flow, keyed smoke matte and contrasting lighter wisps in Black Smoke |
| Medium | Potentially expensive gradient and shadow effects repeated every frame | Frame-time spikes in OBS Browser Source | Cached image sprites, no dynamic per-frame radial gradients, no per-shard shadow blur, deterministic particle initialization |
| Medium | Visual performance was not visible in the desktop UI | Hard to diagnose stutter versus slow OBS capture | Real OBS renderer heartbeat includes measured FPS and 95th-percentile JS drawing time; status bar exposes both |
| Medium | One duration/density combination for all workflows | Poor pacing for fast scene switches | Broadcast, Cinematic and Showcase presets; custom slider remains available |
| Medium | Preview is a synthetic person, not a live OBS camera source | Misleading quality evaluation | UI explicitly labels it as synthetic and retains real OBS camera capture diagnostics |

## Direction by effect

**Money:** Live camera capture freezes; bill pattern assembles into keyed silhouette. Scene camera is hidden **only after** the effect reports covered and OBS source verification. Multiple bill sizes release in waves with individual flutter, velocity and gravity. A final large golden-sheep $100 bill approaches the lens, touches the foreground and slides down last. IN returns the bills to the stored camera silhouette and reveals the live source near the end.

**Ice:** Ice lines propagate over the captured image, then independently textured shards accelerate outward, spin, glint and fall. Shard textures are clipped from the source at native local camera resolution without intermediate resizing. The current implementation is planar (2D pseudo-depth), not ray-traced 3D glass.

**Black Smoke:** Keyed silhouette absorbs into layered dark gas; shaded turbulent clouds displace and fade. Dark centers are framed by lifted grey/cool rims to remain visible on dark streams.

**Toxic:** Gas is green with glow flecks and brighter density, built on the same cached multi-layer turbulent flow. It is a graphic 2D volumetric approximation, not a physical gas simulation.

## Tested

- Go application unit tests (`go test ./...`): pass.
- Static JavaScript parse check for `overlay.html` and `ui.html`: pass.
- Chromium rendering: all four effects inspected at freeze/cover, early release, mid-flight and exit using a **synthetic** transparent silhouette; no page-level JS errors observed.
- Canvas drawing-only benchmark on headless Chromium 1280×720 at 75% density (100-frame sample): Money ~1.1ms P95; Ice ~0.9ms P95; Black Smoke ~0.4ms P95; Toxic ~0.5ms P95. These timings **exclude** OBS capture, Windows compositor, GPU scheduling and app/OBS communication. They are not an OBS FPS guarantee.
- Simulated OBS WebSocket: connect, source install, OUT/IN visibility synchronization, blank-FX safety abort and invalid source-mask handling: pass.
- Win64 PE GUI executable cross-compiled with embedded application icon and local self-install/desktop shortcut code.

## Not verified here

- Actual frame rate in OBS Studio 32.2.2 on your Windows PC.
- Live camera/CEF timing, GPU texture latency, filter or Studio Mode-specific delays in your real scene.
- Physical webcam sharpness, key quality, mouse/keyboard latency, custom monitor refresh or Stream Deck hardware.
- AAA-level volumetric lighting/true 3D refraction or sound design. The current renderer remains performant 2D Canvas animations and **should not be marketed as physically rendered AAA VFX**.

## Suggested real-world verification

1. Quit previous SC Web Transitions using **Help & Setup → Quit**.
2. Install the new v2.4.0 EXE, connect to OBS and **Install / realign camera renderer** in the actual scene.
3. Under OBS Connection, **Capture actual OBS camera & analyze mask** and verify nonzero transparency or chroma green.
4. Verify **OBS FX 2.4.0** and the measured FPS/P95 readout on Dashboard. First frame warm-up or minimized OBS may throttle rendering.
5. Choose **Cinematic** preset and test each of Money/Ice/Smoke/Toxic OUT → IN off-stream, including your Stream Deck bindings. Repeat at **Broadcast** if the system needs shorter effects.
6. If the OBS renderer reports low FPS, lower density, check browser-source GPU acceleration and close heavy apps. Report the FPS/P95 and the OBS activity log if there is a discrepancy.

Recommended recording validation: 1080p60 OBS recording, inspect individual frames near the cover-to-play boundary, mid-flight and the final exit.
