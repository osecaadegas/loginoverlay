# Native OBS integration: design sketch only

No native filter implementation or distributable DLL is present in this directory. The existing CMake recipe references `sc-native-probe.c`, which is absent; the recipe therefore cannot currently build. Earlier documentation describing a pass-through frame-probe prototype overstated the available source.

The production application continues to use the standalone Go controller and local Browser Source renderer. No native plugin is loaded, installed or required. No live GPU texture sharing, native frame counters, continuous alpha segmentation or native VFX compositor is claimed.

## Proposed integration boundary

A future OBS video filter could retain camera textures and alpha inside OBS's render thread, with explicit frame identity and the same transition state protocol. The Go application would continue to handle settings, hotkeys, connection/recovery and diagnostics. IPC would carry state rather than camera frames. The existing Browser Source implementation would remain a compatibility path.

This may reduce screenshot uncertainty, expose source frame freshness and permit refraction/compositing against actual live textures. It also requires OBS SDK compatibility, device-loss handling, source ownership rules, a real implementation, build tooling, packaging and recorded tests across supported OBS versions. None of those native integration release gates is completed by the 3.18.0 standalone changes.

Do not distribute this directory as a working plugin or cite it as evidence of native camera tracking. Implement and validate the module before enabling the CMake recipe in a production build.
