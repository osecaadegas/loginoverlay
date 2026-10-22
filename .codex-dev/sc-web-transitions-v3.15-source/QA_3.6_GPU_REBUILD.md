# QA: SC Web Transitions v3.6.0 GPU Rebuild RC1

## Results verified in the development environment

| Check | Status | Evidence |
|---|---|---|
| Go unit and integration tests | PASS | `go test ./...` |
| Go race detector | PASS | `go test -race ./...` |
| Go static analysis | PASS | `go vet ./...` |
| JavaScript source syntax | PASS | `node --check` on GPU renderer and both embedded HTML scripts |
| Six GPU shaders compile | PASS | Mesa OpenGL 4.5 compatibility driver, ES 3 shader syntax: `QA_GPU_SHADER_VALIDATION.txt` |
| Three GPU shader programs link | PASS | Same Mesa software OpenGL context |
| 16 3D JavaScript render/animation API paths | PASS (mock) | `QA_3_6_GPU_API_MOCK_RESULTS.json`, simulated WebGL2 API; not pixel output |
| 16 Canvas2D compatibility preview paths | PASS | `QA_3_6_FALLBACK_RESULTS.json`, actual headless Chromium Canvas2D; WebGL2 disabled by environment |
| 16 simulated OBS IN/OUT camera transitions | PASS (mock) | Mock OBS WebSocket; camera state checked, no physical webcam |
| Low-coverage refusal to hide camera | PASS (mock) | Mock OBS WebSocket integration |
| Original five effect families unchanged | PASS (source comparison) | Function-level comparison with v3.5.0 |
| Renderer mode setting | PASS | Go roundtrip test and embedded JS route test |
| Windows x64 EXE compilation | PASS | Cross-built with Go, Windows GUI subsystem |

## Tests NOT completed

- **Real Chrome/CEF WebGL2 pixel or animation review**: WebGL2 contexts are disabled by the managed Chromium environment. GPU draw calls were mocked and shader programs were validated separately. Actual WebGL compositing is not visually certified.
- **Live Windows OBS and webcam state**: no physical Windows OBS with the user's camera and background-removal filters attached.
- **Real GPU (RTX 4070 Super) frame pacing**: not measured. No 1080p60 OBS gaming certification.
- **Production-grade visual effects**: no professional review of GPU output on target hardware. These are instanced 3D materials and motion, not a finished AAA-quality simulation.
- **Full Windows installer/code signing**: unsigned single-executable private test package; upgrade and uninstall not validated on Windows in this run.

## Release decision

**PRIVATE ENGINE TEST CANDIDATE ONLY. PUBLIC RELEASE: NO-GO.**

## Mandatory user's Windows acceptance test

1. Close the previous app, open v3.6 EXE, connect OBS and click **Install / realign camera renderer**.
2. Set **Expansion rendering engine → WebGL2 Instanced 3D**, save.
3. In a local OBS recording, trigger Crystal OUT and IN, then Petal and Lightning.
4. Confirm the dashboard's renderer mode says **WebGL2 instanced 3D**, not **Canvas2D compatibility**.
5. If WebGL fails, choose **Canvas2D compatibility**, save and retry. Do not release publicly.
6. Confirm video quality, silhouette alignment, camera-off/on handoff, final full transparency, and OBS dropped-frame statistics.
