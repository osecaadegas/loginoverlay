# SC Web Transitions v3.7.0 RC1 — Crystal Ultra (private test)

## Implemented

- Added `crystal-hero3d.js`, a standalone GPU Crystal Growth render path.
- Replaced old disjointed octahedron sprites for Crystal with an irregular, mutually fitted 3D Voronoi crystal shell. Each facet has a raised center, bevelled outer ring and side-wall thickness.
- Material shader uses directional highlights, faceted normal response, edge tint, animated mineral bands, crack light and partial source-image tonal information.
- Crystal OUT: irregular growth nuclei develop into raised facets; later the fitted body fractures and the same pieces explode with 3D depth/rotation.
- Crystal IN: scattered 3D pieces fly back into the silhouette, form a complete coherent shell before camera activation, then crack and shatter again to reveal the webcam.
- Configured the Crystal geometry density to respond to Performance/Balanced/Cinematic/Ultra quality settings and effect detail tuning.
- Added new shader/mesh route in Go, embedded JS asset, and Crystal-specific GPU diagnostics.
- Updated app, renderer heartbeat and installer source recipe to 3.7.0 RC1.
- Added deterministic GPU geometry test, actual offscreen Mesa EGL shader rendering test and synthetic videos.
- Preserved existing Money and Ice implementations. Existing Smoke, Toxic, Inferno and other expansion effects are unchanged.

## What this does not implement

- No native OBS plugin or live per-frame alpha tracking.
- No path-traced refraction, physical volumetric simulation, HDR material pipeline, or native-camera texture access.
- The Crystal GPU pipeline is only used when **Expansion rendering engine: GPU** and WebGL2 is available. Selecting Canvas2D compatibility uses the older 2D Crystal implementation.
- Real Windows OBS 1080p60 performance and visual camera handoff remain unverified.

## Install/rollback

Close previous application, back up the EXE, run v3.7 RC1, connect OBS and click **Install / realign camera renderer**. Test Crystal Growth only. If necessary, set Expansion rendering engine to Canvas2D compatibility and restore the earlier v3.6 RC2 EXE.
