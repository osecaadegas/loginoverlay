# SC Web Transitions 3.18.0 — Cinematic GPU

SC Web Transitions is a standalone Windows x64 controller and local OBS Browser Source renderer. It retains Go, obs-websocket, WebGL2 and the Canvas2D compatibility path. Camera video stays in OBS; preparation uses a captured silhouette, not continuous native texture access.

This is a release candidate. Read [implemented changes](CHANGELOG_3.18.0_CINEMATIC_GPU.md), [operation/build/installation guide](PRODUCTION_3.18.0.md), and [validation and remaining gates](QA_3.18.0_CINEMATIC_GPU.md) before production use. The inspected source baseline was 3.17.0; the source directory's 3.15 name is historical and preserved for repository compatibility.

## Operation

- **OUT** covers and hides the camera. **IN** covers and reveals it. Existing shortcut semantics are unchanged.
- Select one unique direct scene item; nested child/group transforms and simultaneous independent cameras are not supported.
- Configure background removal/chroma key on the camera in OBS for silhouette effects. The renderer's optical gate and independent OBS screenshot checks must pass before visibility changes.
- Use **Recover Camera** for failed transitions and **Quit** for shutdown. Closing the UI window leaves the engine running. Quit requires confirmed recovery; reconnect OBS if shutdown reports an unconfirmed state.
- Diagnostics & Backups exposes portable settings, prior-backup restore, redacted diagnostics and recorded transition phases. Unmeasured OBS metrics show N/A.

## Build

From the Streamers Center repository root, after committing reviewed application source:

```powershell
.\scripts\build-sc-web-transitions.ps1
```

Requires Go 1.23.2+ and Inno Setup 6. The script embeds the committed revision, compares two executable builds, compiles the installer, emits artifact hashes and packages the website download. See the production guide for explicit tool-path options, expected artifact locations and rollback. Unsigned builds are not represented as trusted/signed Windows releases.

For development-only executable builds, from this source directory:

```powershell
$env:GOOS='windows'; $env:GOARCH='amd64'; $env:CGO_ENABLED='0'
go build -trimpath -buildvcs=false -ldflags='-s -w -H windowsgui' -o SC_Web_Transitions_dev.exe .
```

A development build does not contain the release provenance added by the repository build script.

## Validation and assets

Run `go test ./... -count=1`, `go vet ./...`, and the rendering/UI commands in the QA document. Actual WebGL pixel tests, synthetic playback, mocked controller tests and live OBS verification are separate evidence categories. GPU timing cannot certify Program output under game/encoder load.

The original golden-sheep artwork and existing project assets are preserved. Paper, ice, volume and shared-family geometry/material improvements are procedural. See [asset provenance](ASSET_PIPELINE_3.16.md). Optional external WebM plates remain a local compatibility path; they may hold a covered frame and do not inherit GPU continuous-motion claims.

`experimental-native-filter/` is an architectural design sketch with an incomplete CMake recipe; it is not a buildable frame probe or a shipped OBS plugin.

## Website download

The maintained tracked source lives at `.codex-dev/sc-web-transitions-v3.15-source`. The repository packaging workflow supplies `public/SC_Web_Transitions.zip`. Verify its release manifest and deployed version rather than assuming that a source push immediately updates the public download.
