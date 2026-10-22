# SC Web Transitions v3.6.0 GPU Engine RC2 — QA and Release Gate

## Scope

Continues the v3.6 GPU-engine work after the interrupted session. The eight expansion effects can use a new WebGL2 renderer. Money, Ice, Smoke, Toxic and Inferno remain on the previously approved 2D renderer. The new renderer uses instanced actual 3D meshes, shader shading, a silhouette-cover texture and GPU readback for measured cover. It is **not** a native OBS GPU plugin and does **not** track live webcam alpha on every frame.

## Verified during this resumed work

- `go test ./...` **passed**.
- `go test -race ./...` **passed**.
- `go vet ./...` **passed**.
- `node --check gpu-vfx3d.js` and `node --check expansion-effects.js` **passed**.
- Added `test_gpu_renderer_api.js`: **passed** for all eight effects and all cover/IN/OUT render API routes using a **mock** WebGL2 interface. It also verifies uniform-location caching, renderer disposal, GPU coverage readback routing and renderer status. These are *not* image-quality/pixel tests.
- Previous environment tests independently compiled **six GLSL shaders and linked three programs** using Mesa OpenGL 4.5 compatibility (see `QA_GPU_SHADER_VALIDATION.txt`). Shaders were unchanged in RC2.
- Source-level function body comparisons against v3.5.0 confirm that `setupMoney`, `drawMoney`, `drawMoneyCover`, `moneyFinalLayer`, `setupIce`, `drawIce`, `drawIceCover`, `setupCloud`, `drawClouds`, `drawSmoke`, `setupInferno`, `drawInferno` are byte-identical.
- An OBS **mock** WebSocket test passes the IN and OUT paths of all eight expansion effects, verifies camera disabled after OUT / enabled after IN, and checks low-coverage safety refusal. This is not a physical OBS test.
- Cross-compiled Windows 64-bit GUI EXE, with `3.6.0-gpu-rebuild-rc2` embedded. Not Windows-launched here.
- Updated `SC_Web_Transitions.iss` to reference RC2 instead of outdated v3.4 packaging names. Installer recipe not compiled into a Setup program here.

## Changes specifically made during resume

- Cache WebGL uniform locations by linked program to avoid repeated driver queries per frame; verified in a mock WebGL2 regression test.
- Check maximum GPU texture size when preparing the 3D renderer. An unsupported frame size now raises a clear fallback error instead of silently rendering incomplete textures.
- Aligned executable version, overlay heartbeat version and installer template with RC2.
- Rebuilt the Windows EXE from the final modified source and verified the new version string is present in its binary.

## Not verified — must block commercial release

1. **Actual WebGL2 pixel output and motion**: this managed Chromium environment exposes no working WebGL2 context, including with software-GL/headful attempts. Mock GPU calls and Mesa shader compilation do not prove correct visual compositing.
2. **Native Windows OBS + real keyed webcam** camera state, masking, scene transforms and latency.
3. **1080p60 game + OBS render frame time, GPU memory** and repeated-cycle durability.
4. **Professional visual approval** for the eight GPU transitions: instanced meshes do not automatically make VFX cinematic.
5. **Signed installer and rollback/uninstall** testing on Windows. The EXE is unsigned.
6. **True continuously tracked camera alpha**: source silhouette is an OBS screenshot at preparation time, not a per-frame GPU frame. A native libobs integration is an experimental separate project only.

## Windows evaluation procedure

1. Fully close the previous SC Web Transitions build. Keep the older known-good EXE.
2. Run `SC_Web_Transitions_v3.6.0_GPU_3D_RC2.exe` on Windows 10/11.
3. Connect OBS WebSocket on 4455, click **Install / realign camera renderer**.
4. Select **Crystal Growth**, set **Expansion rendering engine → WebGL2 Instanced 3D (experimental)**, save.
5. Run OUT and IN in an off-stream recording. Confirm the renderer line reports **WebGL2 instanced 3D**, not **Canvas2D compatibility**. In each OUT verify source OFF and FX fully clear; in IN source ON and FX fully clear.
6. Repeat for Petal, Lightning and the remaining five expansion effects, test with real webcam motion, scene resizing and Program/Preview modes.
7. Run ten or more consecutive cycles per effect, watch OBS rendering lag/dropped frames, then scale toward the 100-cycle release gate.
8. If effects are invisible or faulty, choose **Canvas2D compatibility**, save, and use the known-good release until GPU issues are fixed.

## Decision

**PRIVATE ENGINE TEST CANDIDATE. Public production release: NO-GO.** This is a real WebGL2 3D architecture implementation and packaged Windows binary, but not yet a finished, independently visually approved high-end GPU transition suite.
