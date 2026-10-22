# Native OBS Filter Feasibility Prototype (not installed)

The production architecture comparison identified that OBS WebSocket screenshots are unsuitable for a continuously updated 1080p60 alpha mask. libobs supports video filters in its GPU `video_render` path. This prototype is a **pass-through frame-probe filter only**: it establishes an integration point for future live-texture tracking, but does not yet expose frame pixels to the controller or implement VFX. No signed or validated DLL is included.

Build on a Windows machine with an OBS SDK/libobs installation and Visual Studio 2022 using a `libobs_DIR` pointing to the CMake libobs configuration. See the official OBS plugin template for development setup. This code is intentionally **not loaded by the Windows application** and is unsafe to distribute until the plugin has been compiled and tested across supported OBS versions.

Do not mistake this prototype for completed live segmentation, real-time mask transport, or certified plugin functionality. The current Windows release candidate still uses the Browser Source compatibility implementation and a captured silhouette.

## Architectural recommendation

Use a hybrid solution in the longer term: the Go desktop controller remains responsible for presets/hotkeys/update UX, while a native OBS filter composites camera textures/effects on the OBS render thread. The source-level mask and frame timestamps should remain inside OBS. IPC should carry only transition state, not raw camera pixels. A fully integrated, validated native renderer is **not yet implemented**.
