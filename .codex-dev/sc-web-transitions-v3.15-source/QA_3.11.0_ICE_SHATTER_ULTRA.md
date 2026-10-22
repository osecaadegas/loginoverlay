# SC Web Transitions v3.11.0 Ice Shatter Ultra — QA / release gate

**Decision: PRIVATE ENGINE TEST CANDIDATE. Not certified for live commercial broadcast.**

## Executed tests

| Check | Result | Evidence / boundary |
| --- | --- | --- |
| Linux Go unit tests | PASS | `go test ./...` including embedded ice asset and alpha coverage gate |
| Go race detector | PASS | `go test -race ./...` |
| Go static analysis | PASS | `go vet ./...` |
| JavaScript parse | PASS | Node 22 `node --check ice-vfx3d.js`, parsed inline overlay JS |
| GPU vertex geometry and resource API | PASS | `node test_ice_ultra_gpu.js`; sample 65 Voronoi shards, ~1,625 triangles; WebGL API mocked |
| Real pixel shading (GPU programs) | PASS | Mesa EGL 4.5, actual extracted GLSL shader source compiled/linked and rendered; reference snapshot: 63 real geometry shards / 1,765 triangles (640×360 synthetic webcam) |
| Ice frozen silhouette coverage | PASS | Browser-produced keyed static synthetic image with optical coverage 98.991% at 640×360 |
| 2D Ice fallback IN/OUT | PASS | `python test_ice_silhouette_324.py`; both directions fully clear alpha at completion; early IN has visible flying pieces |
| Real GLSL 3D OUT/IN motion | PASS | Offscreen Mesa render: 16 phase samples and separate 96-frame synthetic 4-second videos; this is not CEF/OBS footage |
| Money CGI timeline regression | PASS | `python test_money_cgi_timeline.py` (mock shader timeline) |
| OBS bridge simulated integration | PASS | `python test_native_integration.py`: Money, Ice, Smoke, Toxic IN/OUT, insufficient alpha, OBS FX transparent failure, scene-item recovery |
| Ice-specific OBS IN/OUT + unsafe-coverage rejection | PASS | `python test_ice_ultra_obs.py`: verified camera visibility control, 80% coverage rejected and camera stays on |
| Full Chromium remote loopback integration | BLOCKED | Local browser navigation is prohibited by the managed Chromium policy (ERR_BLOCKED_BY_ADMINISTRATOR). Does not prove the browser/OBS path fails on normal Windows. |
| Real OBS Windows WebGL2 + webcam @1080p60 | **NOT TESTED** | Environment has no production Windows OBS + user's capture device |
| RTX 4070 Super GPU frame time and stress test | **NOT TESTED** | Needs recording while gaming and streaming; software Mesa results cannot predict GPU performance |
| Installer and signing | **NOT TESTED** | Windows GUI EXE cross-build present. Inno Setup recipe present; no signed setup program or Windows launch evidence |

**Known limitations:** frozen camera snapshot drives ice shatter geometry, not continuously updated libobs alpha frames; physically motivated real-time glass approximation rather than ray tracing or real spectral refraction; GPU path is experimental and falls back to Canvas2D; real webcam movement can differ from the initially captured silhouette. Generated shader motion review is synthetic, not a real OBS recording.

## Physical Windows test procedure

1. Keep v3.10.0 as rollback. Close the prior application completely before launching v3.11.0.
2. In an OBS test scene connect keyed webcam; verify SC FX Browser Source sits above it and scene transform is correct.
3. Select Ice Shatter Ultra, quality Ultra and WebGL2. Install/realign and record 1080p60 OUT/IN. Check status says `Ice Shatter Ultra WebGL2 3D`, not 2D fallback.
4. Scrub the recording during final frost closure, first breakup frame, middle of flight, reassembly, reveal, and last alpha frame. No rectangular shards, black polygon outlines or sudden visibility jumps should appear.
5. Validate no camera OFF until real FX alpha coverage is verified. Simulate OBS delay, failed renderer startup, shader error and lost WebSocket; Recover Camera must restore source.
6. Check OBS Stats: rendering lag, missed frames, FPS while streaming and playing a game, GPU saturation. Try Ultra, Cinematic, Balanced, then fallback 2D if necessary.
7. Run 100 complete IN/OUT cycles including repeated hotkeys, scene changes and transform changes. Verify consistent source IDs and full alpha cleanup before release.

**Do not release commercially until the missing Windows, OBS and performance gates pass.**
