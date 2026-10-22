# SC Web Transitions v3.7.0 Crystal Ultra — QA / audit

**Build**: Windows x86-64 PE GUI executable, 7,191,040 bytes. Version `3.7.0-crystal-ultra-rc1`.

## Verified

- Go `go test ./...`, `go vet ./...`, `go test -race ./...`: PASS.
- `node --check` on new renderer and modified GPU module: PASS.
- Geometry audit using actual source JS: 70 mutually fitted, nonuniform crystal facets in a 640×360 example; 2,010 triangles / 6,030 vertices; all geometry attributes finite.
- Mesa EGL OpenGL 4.5 compiled and linked both shader pairs from the actual `crystal-hero3d.js` source: PASS.
- Actual offscreen Mesa OpenGL render: Crystal cover, OUT and IN frames produced; OUT and IN final frames have zero alpha; intermediate IN assembly is physically coherent; OUT fragments travel outward.
- WebGL2 API mock: all eight expansion types pass cover, OUT, IN. Crystal reports tessellated hero diagnostics and correct asset lifetime; 2D compatibility unaffected.
- Backend integration: all 16 expansion camera IN/OUT paths completed against local mock OBS WebSocket; low-coverage rejection passed. The mock server reports harmless socket-close exceptions as the test harness shuts down.
- Protected function checks: byte-for-byte matching `drawMoney`, `drawMoneyCover`, `drawIce`, `drawIceCover`, `drawSmoke`, `drawSmokeCover`, `drawInferno`, `drawInfernoCover` against v3.6 source.
- EXE rebuilt from v3.7 source; `file` identifies x86-64 Windows GUI executable.

## Mesa synthetic preview performance

The test renders a static synthetic, alpha-keyed subject at **640×360 / 24 fps video export**, using software Mesa OpenGL and CPU readback/compositing/encoding. These figures are **not** the OBS GPU render timings and must not be used as 1080p60 certification.

- OUT: 103 frames, 4.29s, median approx. 19.9ms, p95 approx. 63.5ms (end-to-end software preview path).
- IN: 79 frames, 3.29s, median approx. 13.4ms, p95 approx. 22.5ms (end-to-end software preview path).

## Outstanding blockers / release verdict

**NO PUBLIC RELEASE CERTIFICATION.**

1. Browser in this Linux environment cannot establish WebGL2, so the HTML/CSS layering and true OBS Browser Source GPU compositor have not been visually verified.
2. The preview uses offscreen Mesa GL, not Windows OBS or the RTX 4070 Super. Measure real OBS frame times and GPU headroom at 1080p60 while gaming.
3. The app still relies on a single keyed camera snapshot for the effect geometry; there is no continuous live silhouette updating or fully integrated native OBS GPU filter.
4. The 3D material is a convincing stylized real-time approximation, not true optical refraction or physically based shard collisions.
5. Only Crystal Growth is upgraded to the new bespoke VFX path. Lightning, Sand, Shadow, Holy, Petal, Plasma, Glitch, Smoke, Toxic and Inferno are not high-end rebuilt in this version.
6. Unsigned self-install EXE; no completed code-signing / multi-version Windows installation certification.

Accept as a **private Crystal Ultra RC1 evaluation build** pending real OBS video and independent visual approval.
