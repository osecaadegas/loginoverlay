# QA: Money CGI v3.9.0 RC1

**Classification:** private Windows testing candidate; not OBS/RTX production-certified.

| Test | Result | Evidence |
| --- | --- | --- |
| Go unit tests | PASS | `go test ./...` |
| Go race detector | PASS | `go test -race ./...` |
| Go static analysis | PASS | `go vet ./...` |
| Money WebGL2 JS syntax | PASS | `node --check money-vfx3d.js` |
| GPU shader compilation & real graphics output | PASS | `python qa_money_cgi_gl.py` (offscreen Mesa EGL OpenGL 4.5, real GLSL) |
| 3D Paper geometry animation frames | PASS | `SC_Money_CGI_3D_Shaders_Review.jpg`, Mesa-generated videos |
| Money 3D cover, OUT, IN JS timeline | PASS | `python test_money_cgi_timeline.py` (browser JS path, stubbed WebGL API) |
| Synthetic silhouette final coverage | PASS | 99.81% in browser test, 46 original individual notes |
| Mock OBS Money OUT camera hide | PASS | `python test_money_cgi_obs.py` |
| Mock OBS Money IN camera enable | PASS | `python test_money_cgi_obs.py` |
| Low coverage rejection (80% never hides camera) | PASS | `python test_money_cgi_obs.py` |
| WebGL2-off browser 2D fallback | PASS | headless Chromium ran Money in legacy mode with no page errors |
| GLB 3D model integrity | PASS | GLB assets roundtrip through trimesh |
| Windows x64 executable build | PASS | Go cross-compilation, release binary present |
| Real Windows OBS webcam concealment | NOT TESTED | requires user's Windows OBS and GPU |
| Full 1080p60 quality/performance while gaming | NOT TESTED | requires user's Windows OBS and GPU |
| Subject-tracked true live 3D deformation | NOT IMPLEMENTED | notes are 3D; camera silhouette remains a static preparation snapshot |

### Known caveats

- The existing pixel-verified 2D final composition is used as the actual **opaque handoff layer**. Animated notes are WebGL2 deformable 3D sheets; when they settle, they crossfade onto the exact 2D coverage pose to avoid holes in the webcam.
- Headless Chromium in this environment rejects WebGL2. The GPU shaders were compiled and actually rendered separately via Mesa EGL; JavaScript timing integration was checked with a stubbed GPU API, and the fallback was checked in Chromium.
- The preview video demonstrates shader materials with synthetic positions; it does not prove that OBS compositing is artifact-free.
- The high-end result depends on your source camera dimensions, background removal quality, OBS Browser Source hardware acceleration and remaining available GPU budget while gaming.
