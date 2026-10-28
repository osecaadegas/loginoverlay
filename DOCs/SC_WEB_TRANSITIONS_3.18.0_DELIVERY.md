# SC Web Transitions 3.18.0 delivery — 28 October 2026

This is a release candidate, upgraded from the maintained **3.17.0** source. The supplied audit reviewed 3.16.0. It is not certified for live OBS production or represented as meeting every requested cinematic visual standard.

## A. Completed implementation

Canonical source: `.codex-dev/sc-web-transitions-v3.15-source/` (historical directory name retained).

New implementation modules: `lifecycle.go`, `settings_store.go`, `hotkey_transaction.go`, `scene_scope.go`, `compositor_guard.go`. New regression files cover platform hotkeys, shutdown/settings safety, scene scope, compositor placement, actual product UI and GPU/core rendering. New operation, QA, GPU validation and changelog documents accompany the source.

Modified application modules: `main.go`, `windows.go`, `other.go`, `ws.go`, `ui.html`, `overlay.html`, the Money/Ice/Gas/shared GPU renderers and `expansion-effects.js`. Existing shader, bridge, asset and optical tests were extended. The UI now provides persistent recovery, confirmed visibility, transition history, redacted diagnostics and validated settings import/export/backup restore. Hidden previews release their renderer. Existing IN=show / OUT=hide semantics are preserved.

Release integration: `scripts/build-sc-web-transitions.ps1`, `scripts/package-sc-web-transitions.ps1`, both existing Windows workflows, `SC_Web_Transitions.iss`, `api/_lib/release-notes.js` and `public/SC_Web_Transitions.zip`. No database migration or new service is required. Unrelated app-icon and website edits remain outside these commits.

## B. OBS reliability

Camera switches require consecutive rendered coverage observations, independent OBS coverage checks, current compositor compatibility and confirmed visibility. The compositor guard checks native dimensions, transform, crop, bounds, enabled FX, layer order and normal blending before coverage and again before switching. Stale jobs and renderer sessions cannot acknowledge a replacement job. Shared FX references and ambiguous/grouped camera targets fail closed.

Recovery is independent of renderer placement. Shutdown reconciles camera/FX state and refuses to declare success if OBS is unreachable. A crash journal requires recovery after restart. Hotkey replacement rolls back on registration or settings-persistence failure. Settings use validation, migration and atomic replacement with backup.

These are tested controller guarantees, not atomic libobs frame synchronization. WebSocket checks remain sampled; source screenshots cannot prove live camera freshness. Direct camera items only are supported reliably in this release.

## C. Rendering and visual evidence

| Effect | Actual change from baseline |
|---|---|
| Money IN | Flexible instanced paper gains direction-specific bending, depth arrival and release wind, retaining the golden-sheep artwork. |
| Money OUT | Established choreography preserved; three deterministic baseline frames matched within the documented one-level driver-rounding tolerance. |
| Ice | Closed thick facets, optical absorption, roughness, inclusions and finer cracks replace the weaker surface response. |
| Black Smoke | Multiple rolling 3D emitters and curl advection replace the more column-like density; release expands outward/upward. |
| Toxic | Distinct gas density, internal lighting and motion; strict reduction exposed and corrected thin Balanced-preset coverage holes. |
| Inferno | Dedicated combustion volume with multiscale turbulence, thermal emission, soot and embers. |
| Lightning | Branching tubular arcs with depth, propagation, corona and a designed plasma concealment event. |
| Shadow | Independent helical dark density flows and directional scattering. |
| Holy | Perspective light shafts, angular scattering, halo and dust. |
| Sand | Wind-driven grains plus a separately advected dust volume. |
| Crystal | Closed faceted growth, thickness-dependent absorption and material variation. |
| Petal | Curved deforming meshes, animated normals, thin-surface backlighting and vortex motion. |
| Neon | Independent lattice, intersecting spatial tubes and travelling energy pulses; no longer a Plasma alias. |
| Plasma | Retained distinct toroidal density and energy-ribbon behavior. |
| Glitch | RGB-independent concealment with a corrected fractional-scale matte fringe. |

WebGL2 instancing, procedural geometry, perspective ray marching and approximate optical materials share pooled resources. Gas and shared-family coverage now reduces every output pixel before a four-byte asynchronous PBO/fence readback. Quality presets change geometry, render resolution, volume integration and lighting workloads. Money/Ice retain their downsampled local coverage and independent OBS checks.

Evidence is committed under the canonical source: `qa/production-gpu/` (ten contact sheets), `qa/3.18.0/core-visual/` (four IN/OUT contact sheets), and `qa/core-production-regression/`. Full details are in `GPU_PRODUCTION_VALIDATION.md` and `QA_3.18.0_CINEMATIC_GPU.md`.

## D. Measured performance

Windows, Ryzen 5 7600, RTX 4070 SUPER 12 GB, approximately 32 GB RAM, Chrome 155/ANGLE D3D11; Go 1.23.12 and Node 24.16.0. Hardware measurements used isolated synthetic browser fixtures, not OBS plus game/encoding load.

At 1920×1080 Cinematic, mean isolated GPU render time changed: Inferno **5.66→3.89 ms**, Lightning **3.41→2.51**, Shadow **3.27→2.62**, Holy **3.40→2.52**, Sand **4.94→3.41**, Crystal **5.42→3.53**, Petal **3.22→1.97**, Plasma **3.46→2.25**. New Neon measured **2.27 ms**; Glitch remained **0.09 ms**. The live asynchronous coverage call averaged **0.16–0.34 ms CPU time**, compared with **3.07–9.77 ms** for the former synchronous calls.

The integrated capture-disabled run recorded 17,151 browser frame intervals: **6.955 ms mean, 7.0 ms p95, 7.1 ms p99, 27.6 ms maximum**; six intervals exceeded 16.67 ms. This reflects the host's approximately 144 Hz browser cadence, not camera or OBS presentation FPS. CPU utilization, OBS encoding impact and live end-to-end latency are N/A.

## E. Validation

Executed from the canonical source, with the installed Chrome path selected where required:

```powershell
go test ./... -count=1
go vet ./...
npm.cmd test
node test_cinematic_surfaces.mjs
node test_gas_shader_browser.mjs
node test_phase2_optical.mjs
node test_gpu_production.mjs
$env:SC_HARDWARE='1'; $env:SC_BASELINE_REF='8de8a6e6'
node test_core_vfx_production.mjs
$env:SC_WIDTH='1920'; $env:SC_HEIGHT='1080'; $env:SC_CAPTURE='0'
node test_cinematic_overlay.mjs money ice smoke toxic inferno lightning shadow holy sand crystal petal neon plasma glitch
node test_transition_bridge.mjs
node test_production_ui.mjs <compiled-executable>
```

Passed: **53 named Go tests**, vet, ten mocked renderer families, 15 project mesh checks, actual shader/material checks, **80 optical cases**, **200 rendered shared-family checkpoints**, six deliberate alpha defects rejected, 12 pooled lifecycle cleanup cycles, **34 core checks**, **28/28 integrated effect/direction runs**, and **30 simulated bridge scenarios**. Every final integrated case reached coverage 1.0 and clean idle without an unexpected fallback or runtime error. Bridge tests included delayed acknowledgments and moving coverage holds.

The actual Go-server/Chromium UI check passed ten cases, then passed again against the final release EXE using isolated APPDATA and port 18768. A separate launch on port 18769 confirmed its runtime version and source revision against the manifest. The installed user application was not stopped or changed.

Parent checks: `npm.cmd run build` and `npm.cmd run test:updates` passed. The latter passed 15 authorization/method/cache/catalog cases. PowerShell parsing and scoped Git whitespace checks passed. Windows compilation, repeated executable hash equality, Inno compilation, ZIP artifact hashes and source/cache-exclusion checks passed (335 source entries). The Inno compiler emitted a non-failing legacy `FileCopy` naming hint.

Outstanding validation: live OBS, sustained streaming soak, actual install/upgrade/uninstall/rollback and Go race detector (C compiler unavailable). No unexecuted check is counted as passing.

## F. Actual release artifacts

Built from source revision **64bc1079b70720e1e74cf02a4846949abc50948d**.

| Artifact | Repository-relative location | Bytes | SHA-256 |
|---|---|---:|---|
| EXE | `.codex-dev/sc-web-transitions-releases/3.18.0/SC_Web_Transitions_v3.18.0_Cinematic_GPU.exe` | 15,386,112 | `1681779d7623c324bd8bd0d79219f62ede390d046148fcb78d096196a3ed3453` |
| Installer | `.codex-dev/sc-web-transitions-releases/3.18.0/SC_Web_Transitions_v3.18.0_Cinematic_GPU_Setup.exe` | 8,145,402 | `590e7fd5b779cc5efba1619c1435343e1f808518d5bafb652fd0b702bd8f73d1` |
| Website bundle | `public/SC_Web_Transitions.zip` | 44,301,627 | `13cec5d44c2949b2f804024afdc66495c0fea9f7b05e55ba5bfd89194462f7c1` |

The website bundle contains both Windows binaries, the immutable committed-source ZIP, manifest and release documents. Binaries are **unsigned**. Installer compilation succeeded; installation was deliberately not performed over the user's running application. Use the old app's Quit action, export settings, then install and validate off-stream. Actual public website deployment is separate from Git delivery.

## G. Git provenance

Existing branch: `main`; existing remote: `origin` (`osecaadegas/loginoverlay`). Subsystem commits:

- `bf7df943`: OBS lifecycle, compositor safety, recovery, configuration and diagnostics.
- `69a4901a`: GPU rendering, asynchronous coverage and regression/visual evidence.
- `64bc1079`: release workflow, documentation and release-note entry; executable source revision.

The artifact delivery commit follows these source commits. Its hash and verified push status are reported separately after delivery; the binary continues to identify the immutable source revision above.

## H. Remaining priorities

1. Run a real 1080p60 OBS recording rehearsal with moving keyed camera, all effects/directions, scene/crop changes, disconnects, recovery and concurrent gameplay/encoding.
2. Refine the dense artistic climaxes: Holy still resembles parallel light curtains, Lightning's opaque discharge can overpower arcs, Shadow needs clearer internal structure, and Crystal/Petal seals need more organic arrangement. Procedural improvement is not proof of AAA-quality art direction.
3. Implement native live camera texture/matte access if physically meaningful live refraction and atomic compositing become required. `experimental-native-filter/` is still an incomplete design sketch, not a distributable plugin.
4. Complete sustained resource/streaming tests, installer lifecycle validation, race testing and code signing. Nested/grouped/multiple-camera support remains outside the validated scope.
