# SC Web Transitions v3.10.0 — Money CGI Ultra (RC1)

Source baseline: v3.9.1 Broadcast Safe. This changes the shipping application; it is not an asset-only preview.

## Implemented

- Upgraded the instanced WebGL2 money renderer with more detailed tessellated, organically curved paper: **32 × 14 quads per bill on Ultra** (896 triangles), 24 × 10 on Cinematic, 16 × 6 on Balanced, 10 × 4 on Performance.
- Dynamic local folds, corner curls, coupled diagonal twist and travelling wind waves, with analytic tangent-space normal derivatives for shading.
- Proper paper lighting with front/back faces, studio fill/key, signed normal-map detail, roughness-map modulation, edge/grazing-angle sheen, subtle microfibers and softly translucent rear ink.
- Selective metallic gold printing response derived from the pixels of the **unchanged golden-sheep $100 note**, plus small animated security-ink glints instead of a generic gold recolor.
- Texture anisotropic filtering when supported (up to 8× on Ultra) to keep the original sheep art legible at oblique camera angles.
- Cached soft under-note contact shadows on the settled bill composition. No per-note real-time blur/shadow rasterization.
- Existing 3D banknote flyby and near-lens hero-bill transition remain driven by the original choreographed timeline.
- Reusable GPU instance payload, cached uniform locations, explicit graphics context loss handling, texture-size guard, quality tiers and permanent Canvas2D fallback.
- Desktop UI named **Money CGI Ultra**; renderer live status and app version updated.

## Intentionally preserved

- Original `bill.png` pixels and sheep face/sunglasses. SHA-256: `d50a1c4e655802bab267bae93d2bd8dcd940b0c0517bb464c6d1236c06c512b0`.
- Measured settled Money OUT silhouette composition and conservative optical-cover handoff (>= 98.5% minimum).
- Separate OBS screenshot verification for Money IN, all 3.9.1 WebSocket fail-safes, source restoration and watchdog.
- Hotkeys, Stream Deck API, existing config, Ice, Smoke, Toxic and eight expansion effects.

## Constraints

- Real-time render engine: NOT physically simulated paper / path-traced offline CGI.
- Hardware acceleration and final visual quality depend on OBS Browser Source WebGL2 availability.
- Money CGI Ultra uses a static OBS silhouette capture, not continuous native webcam-alpha tracking.
- Ultra is the highest visual preset, but Cinematic or Balanced may perform better while gaming. Automatic GPU quality adaptation is preserved.
- Windows app is compiled but Windows/OBS real recording, frame pacing and installer execution are still unverified.
