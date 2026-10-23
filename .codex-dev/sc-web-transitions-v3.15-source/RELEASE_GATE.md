# Release validation — 3.16.0

This release contains implemented WebGL2 rendering and OBS synchronization improvements, a rebuilt Windows executable, repeatable automated checks and recorded RTX 4070 SUPER browser measurements. See `QA_3.16.0_CINEMATIC_GPU.md` for the exact final validation results.

The Windows executable retains the existing self-install/update behavior and is unsigned. No claim is made that simulated OBS checks establish physical-camera behavior. A real OBS session at 1080p60 under concurrent encoding/game load remains the release's hardware validation limitation. Do not represent this release as an offline CGI render or as a certified zero-drop streaming benchmark.

IN/OUT naming remains compatible: IN shows the camera; OUT hides it. An incomplete optical seal must reject the camera switch and recover rather than expose a cut.
