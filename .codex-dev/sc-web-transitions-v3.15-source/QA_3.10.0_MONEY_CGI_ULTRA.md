# SC Web Transitions — v3.10.0 Money CGI Ultra RC1

## Executed checks

| Test | Outcome | Context |
| --- | --- | --- |
| Go application unit tests (`go test ./...`) | PASS | Linux |
| Go race detector (`go test -race ./...`) | PASS | Linux |
| Go static analysis (`go vet ./...`) | PASS | Linux |
| Money module JavaScript syntax (`node --check`) | PASS | Node 22 |
| Original GLSL shader pair compile/link and render | PASS | Offscreen Mesa EGL OpenGL 4.5, actual shader, real pixels |
| Ultra tessellation video, OUT + IN | PASS | Synthetic 640×360, 32×14 grids, *not OBS* |
| Browser Money OUT/IN JS choreography, 2D safety composition | PASS | Mock WebGL, Chromium synthetic subject |
| Measured money subject coverage | PASS | 99.84% on synthetic subject in timeline test |
| Money mock OBS OUT and IN | PASS | Real Go server, simulated OBS WebSocket |
| 80% insufficient-coverage rejection | PASS | OBS mock never turns webcam OFF |
| Broadcast safety regressions | PASS | Duplicate OUT, early DONE, failed opacity, lost heartbeat, recovery, adaptive detail, busy settings |
| Ice, Smoke, Toxic mock OBS IN/OUT | PASS | Existing native integration suite |
| Eight expansion effects, IN and OUT | PASS | Sixteen simulated OBS handoffs |
| Windows x64 GUI EXE cross-build | PASS | Go cross-compilation; PE32+ verified and version string embedded |
| Real Windows OBS WebGL2 playback + green screen | **NOT VERIFIED** | No live OBS/Windows in build environment |
| RTX 4070 Super 1080p60 gaming / GPU frame time | **NOT VERIFIED** | Must be recorded and measured on user's PC |
| Windows setup, signing and rollback | **NOT VERIFIED** | EXE unsigned; Inno Setup script provided, installer not compiled |

Mock test runners sometimes report `ConnectionClosedError` when test websocket sockets close abruptly. All required assertions above passed; such errors do not establish a real OBS drop.

## Real-machine go/no-go gate

1. Keep your older v3.9.1 executable as rollback. Close it completely.
2. Run the new EXE off stream, connect OBS WebSocket on port 4455, choose scene and camera, select **Money CGI Ultra**.
3. Set **Rendering quality → Ultra** and **GPU rendering engine → WebGL2**; install or realign the FX browser source.
4. Confirm the OBS renderer status says **Money CGI Ultra WebGL2 3D**, not Canvas2D fallback.
5. Record Money OUT and IN at 1080p60 with your real webcam; verify gold design, bending/flutters, readable hero note and that camera is not hidden before complete visible concealment.
6. Repeat for Cinematic / Balanced while OBS records with a game running; inspect OBS Statistics for missed/dropped frames, renderer P95 and GPU usage.
7. Verify source/state handoff, transparent final frames, repeated triggers, scene changes and **Recover Camera** in a private scene.
8. If any money scene fails, set rendering engine to **Canvas2D compatibility** and save; retain the earlier EXE for rollback.

## Decision

**Private test candidate only, not certified for commercial live production.** Shader rendering and backend integration checks are real; actual Windows OBS output and GPU budget are not verified.
