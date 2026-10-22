# SC Web Transitions v3.15.0 — Cinematic Plate Engine

SC Web Transitions is a Windows 10/11 64-bit controller for OBS webcam transitions. The Go application serves an embedded HTML/Canvas2D/WebGL2 renderer and communicates with OBS through obs-websocket. Camera video stays in OBS; the browser renderer receives a captured silhouette for effect choreography and coverage checks.

## Build

Requires Go 1.23.2 or newer. From this directory in PowerShell:

```powershell
$env:GOOS='windows'; $env:GOARCH='amd64'; $env:CGO_ENABLED='0'
go build -trimpath -ldflags='-s -w -H windowsgui' -o SC_Web_Transitions_v3.15.0.exe .
```

The application embeds UI, renderer scripts and `vfx_assets`. Optional installer recipe `SC_Web_Transitions.iss` needs Inno Setup 6. A GitHub Actions workflow builds the portable Windows executable and publishes it as a workflow artifact on pushes.

## Smoke and Toxic renderer

Smoke and Toxic use the WebGL2 3D density ray marcher in `gas-vfx3d.js`, with the Canvas2D engine as its existing fallback. The ray marcher advects multi-scale 3D noise upward, erodes plume boundaries into wisps, adds turbulent side tongues, separates heavy toxic-vapor density from lighter smoke, scatters directional light and dissipates gas before it reaches the top edge. This is a procedural volumetric renderer, not an offline fluid simulation.

The Go controller retains the existing OBS camera visibility synchronization. Before hiding the keyed camera, it requires the renderer's measured composited silhouette coverage to meet the existing 98.5% threshold. This renderer change does not relax that check or the camera-recovery path.

## Validate

- `go test ./...` runs controller and coverage tests.
- `node --check gas-vfx3d.js` checks renderer JavaScript syntax.
- Browser shader tests require Puppeteer/Chromium with WebGL2 enabled; they compile the actual vertex and fragment shaders.
- Use the Dashboard renderer diagnostics for selected quality, resolution, draw count and WebGL context loss.

Live OBS timing and visual quality still require recording on the target PC and checking Program/Preview synchronization. The silhouette comes from a capture and is not continuous alpha tracking. The optional native-filter folder is a feasibility prototype, not a distributable plugin.

## Rollback

Quit SC Web Transitions from Help & Setup before replacing its installed executable. Keep a copy of the previous executable; user settings remain in `%APPDATA%\SCWebTransitions\settings_v2.json`.

## Streamers Center website download

This source is the maintained build input for the Streamers Center Apps download. The parent repository's `.github/workflows/sc-web-transitions-package.yml` runs the Go tests and Windows x64 build when files in this source tree change, then regenerates `public/SC_Web_Transitions.zip` with both the executable and a source archive. Keep future application changes in this tracked source directory so the download workflow can include them automatically.
