# SC Web Transitions v3.16.0 — Cinematic GPU

SC Web Transitions is a Windows 10/11 64-bit controller for OBS webcam transitions. The Go application serves an embedded HTML/Canvas2D/WebGL2 renderer and communicates with OBS through obs-websocket. Camera video stays in OBS; the browser renderer receives a captured silhouette for effect choreography and coverage checks.

Current release: [changes](CHANGELOG_3.16.0_CINEMATIC_GPU.md), [validation and limitations](QA_3.16.0_CINEMATIC_GPU.md), [asset pipeline](ASSET_PIPELINE_3.16.md).

## Build

Requires Go 1.23.2 or newer. From this directory in PowerShell:

```powershell
$env:GOOS='windows'; $env:GOARCH='amd64'; $env:CGO_ENABLED='0'
go build -trimpath -buildvcs=false -ldflags='-s -w -H windowsgui' -o SC_Web_Transitions_v3.16.0_Cinematic_GPU.exe .
```

The application embeds UI, renderer scripts and `vfx_assets`. Optional installer recipe `SC_Web_Transitions.iss` needs Inno Setup 6. A GitHub Actions workflow builds the portable Windows executable and publishes it as a workflow artifact on pushes.

## Smoke and Toxic renderer

Smoke and Toxic use the WebGL2 volume ray marcher in `gas-vfx3d.js`, with the existing Canvas2D fallback. The plume is built from buoyant, domain-warped density with an expanding source, turbulent folds, a thin upper edge and per-effect rise and lighting profiles. Smoke moves faster and catches cool silver light; Toxic rises more slowly, pools low and scatters green light. The release starts from the same textured volume as the cover. A keyed alpha guard preserves the 98.5% visible-coverage handoff; OBS independently verifies the rendered overlay before changing camera state. This is a procedural volumetric renderer, not a fluid simulation or simulated footage.

The Go controller retains the existing OBS camera visibility synchronization. Before hiding the keyed camera, it requires the renderer's measured composited silhouette coverage to meet the existing 98.5% threshold. This renderer change does not relax that check or the camera-recovery path.

The other eight WebGL2 material families now animate their surface response during the transition: drifting glitch scans, electrical leaders, shadow eddies, radiant shafts, granular detail, crystal glints, petal veins and plasma filaments. The Canvas2D fallback also uses varied particle drift and rounded sand grains. Inferno embers now use cached glowing streak sprites with individual flicker and velocity-aligned trails. Money and Ice retain their dedicated deformable-banknote and extruded-shard render paths and existing OBS coverage checks.

`tools/gas-render-review.html` is a local visual test page for Smoke and Toxic Cloud. It uses a synthetic alpha subject and reports measured optical coverage while the cover/release controls are scrubbed. `test_gas_shader_browser.mjs` compiles the production WebGL2 shaders and checks opaque coverage, textured color variation, plume expansion beyond the subject matte, transparent corners and clean release. Browser/OBS visual quality and target-hardware performance still require validation before release.

## Validate

- `go test ./...` runs controller and coverage tests.
- `node --check gas-vfx3d.js` checks renderer JavaScript syntax.
- `node --check gpu-vfx3d.js` and `node --check expansion-effects.js` check the other eight material renderers and their fallback.
- `node run_gpu_renderer_api_test.mjs` exercises all eight GPU families with a mocked WebGL API. This verifies renderer routing and call behavior, not GPU pixels.
- `node test_overlay_inline_syntax.mjs` parses the inline renderer application script.
- `node test_gas_shader_browser.mjs` requires Puppeteer/Chromium with WebGL2 enabled; it compiles the actual vertex and fragment shaders and checks their real pixel output.
- `node test_gpu_shaders_browser.mjs` requires Puppeteer/Chromium with WebGL2 enabled; it renders all eight production GPU effect families and writes phase contact sheets and coverage measurements under `gpu-render-evidence/`.
- Use the Dashboard renderer diagnostics for selected quality, resolution, draw count and WebGL context loss.

Live OBS timing and visual quality still require recording on the target PC and checking Program/Preview synchronization. The silhouette comes from a capture and is not continuous alpha tracking. The optional native-filter folder is a feasibility prototype, not a distributable plugin.

## Rollback

Quit SC Web Transitions from Help & Setup before replacing its installed executable. Keep a copy of the previous executable; user settings remain in `%APPDATA%\SCWebTransitions\settings_v2.json`.

## Streamers Center website download

This source is the maintained build input for the Streamers Center Apps download. The parent repository's `.github/workflows/sc-web-transitions-package.yml` runs the Go tests and Windows x64 build when files in this source tree change, then regenerates `public/SC_Web_Transitions.zip` with both the executable and a source archive. Keep future application changes in this tracked source directory so the download workflow can include them automatically.
