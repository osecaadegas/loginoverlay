# SC Web Transitions 3.18.0: operation and release guide

## Source of truth

The maintained application is the tracked `.codex-dev/sc-web-transitions-v3.15-source` directory in the Streamers Center repository. Its directory name is historical; `main.go` supplies the application version. The inspected baseline was **3.17.0**, not the 3.16.0 archive reviewed in the supplied audit. The existing location is retained to preserve repository and download-workflow references.

The Go executable embeds the UI, WebGL2/Canvas2D renderers and project assets. It controls OBS over the local WebSocket connection and serves the Browser Source locally. No new rendering framework, external media server or online runtime dependency is required. Existing optional WebM plates are local compatibility inputs.

## Camera semantics and supported setup

Existing application semantics are preserved: **OUT conceals then hides the camera; IN conceals then reveals it**. The interface states this explicitly. The active camera remains in OBS; the application does not replace it with a frozen photo during the transition.

Install against one unique, direct item in the chosen scene. A containing scene can itself be selected as a source. Arbitrary child traversal through groups/nested transforms is deliberately rejected: changing all references to a shared source could alter unrelated scenes. This release does not control several independently placed cameras in one transition.

For silhouette effects, configure chroma key/background removal directly on the camera in OBS. The preparation screenshot provides a mask, not a continuously updated matte or a timestamped live frame. OBS screenshots independently check composited coverage, but this cannot certify fresh camera-driver frames. A moving person crossing the prepared silhouette can still cause a conservative refusal/recovery. Inspect the actual Program output before a broadcast.

## Coverage, timing and failure behavior

The controller records transition phases through preparation, frame readiness, building, verified coverage, camera switching/readback, dispersion and completion. Jobs and renderer sessions have separate identities; frame sequences and repeated confirmations prevent stale coverage acknowledgments from advancing a new job.

The expansion and gas renderers use conservative GPU alpha reduction over the prepared camera footprint, including partially transparent source pixels. This evaluates the actual rendered effect instead of assuming elapsed animation time means safe coverage. The live path submits a pixel-pack-buffer read and waits for its fence in later frames. A result is consumed only once. Independent OBS screenshot validation remains necessary because Browser Source transforms and compositing happen outside this WebGL context. Current placement, crop, native size, bounds, FX visibility, normal blend and layer order are checked before coverage and again immediately before switching. A mismatch requires Install / realign; these sampled checks cannot eliminate all external edits between RPCs.

Recover Camera remains available independently of the VFX renderer. It cancels active work, targets the installed scene item, asks OBS to show the camera and clear FX, then verifies the resulting state. Failed readback is reported as unconfirmed rather than success. Quit uses the same bounded reconciliation policy. If OBS is unavailable, Quit remains blocked so the user can reconnect and recover. A forced operating-system kill or power loss cannot execute shutdown code; the on-disk journal instead requires recovery after restart.

## Materials and workloads

| Effect | Implemented approach | Boundary |
|---|---|---|
| Money | Instanced subdivided paper, analytic bending, paper normal/roughness, selective metallic ink, depth/shadow passes, motion filtering | Local material blur is not full velocity-buffer motion blur; existing banknote identity retained |
| Ice | Closed thick prisms, convex facet rings, optical absorption, normal grain, microfractures/inclusions and angular motion | Refraction samples generated frozen material, not a live OBS texture |
| Smoke / Toxic | Perspective ray marching, seeded 3D noise, rolling emitters, optical extinction, self-shadow approximation and effect-specific advection/light | Procedural volume, not a fluid solver |
| Inferno | GPU combustion volume, multiscale turbulence, temperature-inspired emission, smoke and ember geometry | No physically solved combustion or live-camera heat refraction |
| Lightning | Branching tubular electrical geometry, leader propagation, corona and plasma concealment | Designed optical discharge, not electrical simulation |
| Shadow / Holy | Distinct absorbing darkness and scattering light-shaft density fields with moving geometry | Approximate volumetric lighting |
| Sand | Instanced grains with wind and a separate dust volume | No granular collision solver |
| Crystal | Closed faceted geometry, optical material variation and dense sealing event | No ray-traced internal reflections |
| Petal | Curved/tapered deforming meshes, flutter and vortex motion | Aerodynamic approximation, no cloth solver |
| Neon / Plasma | Separate spatial energy structures and density/material paths | Procedural emissive fields |
| Glitch | Deliberate signal displacement, digital tearing and opaque concealment | Stylized digital effect; it is not intended to look physically realistic |

Performance, Balanced, Cinematic and Ultra change actual mesh/particle/volume workloads. Gas uses render scales 0.40/0.55/0.72/1.00, 22/30/42/60 volume steps and 1/1/2/3 light samples. Money uses increasing subdivided paper grids and enables 512/1024 shadow maps in Cinematic/Ultra. Ice uses 1/2/3/4 facet rings. Shared families use increasing instancing/volume budgets. Effective quality is displayed separately from the selected setting; adaptation is applied between jobs. Coverage requirements are not lowered by the performance preset.

## Configuration, diagnostics and privacy

Settings remain in `%APPDATA%\SCWebTransitions\settings_v2.json`; the filename is retained for compatibility, while the document schema is version 3. Valid previous settings are backed up alongside the file. Startup repairs supported legacy values; explicit imports reject invalid/future schemas. Settings changes are refused during active work. OBS passwords remain in memory and are excluded from exports.

Diagnostics & Backups offers settings export, validated import, backup restore and a redacted diagnostics JSON. The dashboard shows the last confirmed camera state, target, renderer and transition phase. Browser animation FPS and frame interval P95 describe the browser loop only; OBS Program FPS, encoder lag and live end-to-end latency are not invented when unavailable.

HTTP binds to loopback and retains Host/Origin safeguards. Sensitive API reads and mutations require the UI token; renderer operations use their own capability. This protects the browser control plane against unrelated web origins. It is not a sandbox against malicious software already running as the same Windows user, which can access the local UI and user files. No camera footage or OBS credentials are uploaded.

Isolated UI validation uses `--serve` with `SC_DIAGNOSTIC_PORT` (1024–65535) and a separate `APPDATA` directory. The diagnostic port is honored only with `--serve`; normal installed operation remains on 18767. Host and Origin checks follow the selected port. `test_production_ui.mjs` defaults to 18768 and refuses an occupied listener, so it does not stop or control an existing installed app. Set `SC_UI_QA_OUTPUT` to a separate output directory when validating a committed release binary.

## Build and package

Requirements: Windows x64, Go 1.23.12 (validated toolchain), Node with the repository's Puppeteer dependency for browser QA, and Inno Setup 6 for the installer. A C compiler is not needed for the executable; it is needed for the Go race detector on Windows. Signing requires a separately provisioned trusted certificate and signing process.

From the repository root, after reviewing, testing and committing the intended source:

```powershell
.\scripts\build-sc-web-transitions.ps1
```

Optional explicit tool paths:

```powershell
.\scripts\build-sc-web-transitions.ps1 -GoBinary 'C:\tools\go\bin\go.exe' -InnoCompiler 'C:\tools\Inno Setup 6\ISCC.exe'
```

The script refuses uncommitted tracked application source, embeds the Git revision, builds the Windows executable twice and compares SHA-256, compiles the installer, and records artifacts in `release-manifest.json`. It invokes the package script to refresh `public/SC_Web_Transitions.zip` with the executable, installer, release documents and committed source archive. Source identity and artifact hashes are authoritative; version text alone is not proof that a deployed ZIP is current.

Expected output directory: `.codex-dev/sc-web-transitions-releases/3.18.0/`. Actual existence and hashes must be checked before reporting a completed release. Neither executable nor installer is code-signed by this workflow.

## Installation and rollback

Use the application's Quit control and wait for verified shutdown before replacing files or running Setup. The installer does not force-stop an active transition. Standard uninstall removes the installed application/shortcuts while settings remain separate. Upgrades retain a previous executable for manual rollback. Export settings first; reinstall/realign the Browser Source after changing application versions. Do not downgrade a future settings schema blindly: use a matching backup/export.

Production gates still required are listed in the QA document. A native OBS render-thread filter is the recommended next architectural improvement for live texture/matte access, but `experimental-native-filter/` currently contains a design sketch and an incomplete CMake recipe, not a buildable or distributable plugin.

## Assets and rights

`bill.png` is the existing project-supplied golden-sheep banknote. It and the existing paper material maps were preserved; this release does not grant ownership or redistribution rights beyond the project's established rights. Runtime paper/crystal/petal geometry and gas noise are generated procedurally in source. Existing GLB assets retain their manifests and reproducible generation scripts. No new third-party stock video, downloaded banknote design or generated CGI plate is included. Optional externally installed plates require their own rights verification; they are not evidence of this release's renderer quality. See `ASSET_PIPELINE_3.16.md` for the existing asset provenance and editing workflow.
