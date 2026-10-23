# SC Web Transitions 3.16.0 — Cinematic GPU

Release date: 2026-10-23. Replaces 3.15.0-cinematic-plate-engine-rc1.

## Rendering

- Money preserves the original golden-sheep banknote artwork and OUT blast/lens-contact choreography. Paper now has perspective-correct interpolation, depth-tested instancing, fold-aligned material normals, GGX lighting and selective gold-ink response. Cinematic/Ultra add light-space shadows and local motion/depth filtering. IN receives a longer dispersal and hero exit, and its actual buildup threshold now matches the camera handoff threshold.
- An animated 3D banknote pile continues fluttering over the measured concealment material during delayed camera confirmation. Floating-point boundary guards prevent a still frame at the exact build threshold.
- Ice grows real capped, bevelled crystal geometry over generated frost. It no longer paints a frozen camera portrait over the live feed. Individual pieces have seeded angular momentum, internal fracture detail, Fresnel highlights and view-dependent optical shading during dispersion.
- Black Smoke and Toxic Cloud default to WebGL2 perspective raymarched 3D density fields. Unequal depth emitters, buoyant advection, domain warping, density shadows and continuous extinction replace the hard alpha seal. Toxic uses a distinct heavier volume and green internal scattering. Imported WebM clips remain available in explicit compatibility mode.
- Performance, Balanced, Cinematic and Ultra change actual mesh/volume workloads. Resource lifetimes are bounded; procedural gas shares its compiled shaders/noise across jobs; surface shaders are warmed with real draws during preparation.

## Camera synchronization and reliability

- Exposes PREPARING, COVER_BUILDING, COVER_VERIFIED, CAMERA_SWITCHING, CAMERA_STATE_CONFIRMED, DISPERSING, COMPLETE, RECOVERING and ERROR states alongside the compatible phase protocol.
- Both directions require rendered alpha coverage before the camera request. The controller checks original/live camera silhouettes against two consecutive OBS FX screenshots: at least 99.5% alpha >=254/255, with local occupied tile checks.
- Camera visibility is read back using fresh scene-item IDs. Reveal waits for usable camera pixels and renewed live-silhouette concealment. Rendering stays animated during confirmation.
- Acknowledgements are idempotent and retried; stale job IDs and cancelled work are rejected. Recovery cancels blocked calls and reserves the controller against new triggers. Missing images time out without locking subsequent transitions.
- Completion clears the canvas, waits two compositor frames, then verifies transparent FX output through OBS screenshots.
- Frame P95 now reports animation-frame intervals, separately from CPU submission and gas GPU timer measurements. Adaptive quality changes only the next job.

- The supplied SC Web Transitions icon is embedded in the executable and served in the app header/favicon. Existing Windows shortcut creation uses the same mark.

## Compatibility and installation

IN continues to **show** the camera and OUT continues to **hide** it. Existing settings, names, hotkeys, Stream Deck endpoints, import/export and Recover Camera remain supported. No database migration or settings reset is required.

Close the old app, extract the release ZIP, and run `SC_Web_Transitions_v3.16.0_Cinematic_GPU.exe`. This is the existing self-installing Windows executable: it installs under LocalAppData and updates its shortcut/icon. Refresh or reinstall/realign the OBS Browser Source to load the matching renderer. `--version` prints the binary version without installing or launching the UI. The executable is unsigned. An optional Inno Setup recipe is included in the source; no separately compiled Inno Setup installer is claimed.

See QA_3.16.0_CINEMATIC_GPU.md for measured results and limitations. A browser GPU benchmark is not an OBS recording/encoding certification. Procedural advection is not a physical fluid solver; refraction/filtering is approximate and no actual scene depth or ray-traced reflection is available.
