# V3 Architecture Decision Record

## Options evaluated

| Approach | Direct live camera alpha | OBS render synchronization | Distribution complexity | Current testability |
|---|---|---|---|---|
| A: Browser Source + OBS WebSocket screenshots | No, only periodic or event screenshots | Asynchronous WebSocket/CEF | Low | Existing tests pass |
| B: Native libobs filter/plugin | Can operate on keyed GPU image without readback | On OBS render callbacks | High (CMake, signed DLL, OBS compatibility) | No OBS SDK available in this environment |
| C: Native filter plus Go controller | Yes, once integrated | Native compositing; Go handles controls | High | Requires real Windows OBS prototype |

**Decision for the delivered candidate:** keep A as stable compatibility architecture while building a clearly isolated frame-path feasibility prototype for C. No native plugin is installed automatically. This avoids breaking OBS installations with an untested DLL.

libobs documents source `video_render`, frame `video_tick`, and the `obs_source_process_filter_begin` / `_end` path for GPU video filters. The included native source is a transparent pass-through demonstration, not an FX implementation and not a compiled plugin.

Official references:
- https://github.com/obsproject/obs-plugintemplate
- https://github.com/obsproject/obs-studio/blob/master/docs/sphinx/reference-sources.rst
- https://github.com/obsproject/obs-studio/blob/master/docs/sphinx/graphics.rst

## Current transition state machine

`prepare → ready → cover → coverage confirmation → OBS camera hide → continuous release → done` for OUT.

`prepare → ready → start with an opaque effect cover → request camera enable → verify keyed screenshot availability → camera_ready → disperse cover → done` for IN.

The effect keeps rendering during OBS handoffs. `camera_ready` is a source-availability heuristic, not a unique frame timestamp. A native OBS filter should replace this handshake with observed GPU frame delivery and alpha information.

## V3 completion work still needed

1. Integrated native alpha tracker with GPU texture and frame timestamp ownership inside OBS.
2. Tested scene/program switching, camera cropping, scaling, filter order and nested scene behavior against real OBS.
3. Optimized GPU smoke volumes and bill meshes with real OBS timing measurements.
4. Signed Windows installer, reliable per-user rollback and an uninstall entry.
5. Full manual visual sign-off using a real keyed moving webcam at 1080p60 during gameplay.
