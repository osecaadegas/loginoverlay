# v3.5.0 RC1 — QA Summary

**Build:** Go Windows amd64, compiled successfully.

| Check | Result |
|---|---|
| `go test ./...` | Pass |
| `go vet ./...` | Pass |
| `go test -race ./...` | Pass |
| New expansion renderer JavaScript syntax | Pass |
| Inline browser overlay JavaScript syntax | Pass |
| 8 effects × 2 directions sampled in Chromium | Pass, no browser exceptions |
| End-of-IN/OUT alpha, headless 1920×1080 | All zero |
| Sampled static webcam silhouette coverage | >98.5% for all eight |
| Mock OBS ON/OFF integration | 16 transitions passed |
| Low-coverage refusal | Passed |
| Original Money/Ice/Smoke/Toxic/Inferno renderer source comparisons | Identical |
| Full-motion review movies | Eight generated, 640×360/16 fps synthetic |
| Real Windows OBS Program test | **Not tested** |
| Real-camera 1080p60 gaming benchmark | **Not tested** |
| Public release certified | **No** |

Synthetic frame times fluctuate, with late frame spikes even after optimizing the animated material path. The complete performance traces are in `PERFORMANCE_3.5.0.json`.

Per-effect audit and artistic limitations: `AUDIT_3.5.0_EIGHT_EFFECTS.md`.
