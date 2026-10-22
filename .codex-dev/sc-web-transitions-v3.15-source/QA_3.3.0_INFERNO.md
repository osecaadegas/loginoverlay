# v3.3.0 RC1 QA and release gate

## Executed checks

| Check | Result | Scope |
|---|---|---|
| `go test ./...` | PASS | Go source/unit tests |
| `go vet ./...` | PASS | Go static checks |
| `go test -race ./...` | PASS | Go race instrumentation |
| JS syntax for inline UI and renderer | PASS | Parser only |
| Chromium synthetic Inferno OUT/IN render | PASS | 960×540, fake keyed silhouette |
| Inferno full-cover mask coverage | 100% on synthetic subject | 98.5% required to request OBS camera OFF |
| Rendered OUT completion opacity | 0 visible FX pixels at last frame | Synthetic |
| Rendered IN completion opacity | 0 visible FX pixels at last frame | Synthetic |
| Mock OBS OUT | PASS | Camera scene item became disabled after cover acknowledgement |
| Mock OBS IN | PASS | Camera scene item enabled after reveal acknowledgement; usable image check |
| Existing Money/Ice/Smoke/Toxic renderer sections | PASS | Exact source-text comparison against v3.2.7 |
| Windows amd64 Go executable | PASS | Cross-compiled in Linux |

The mock OBS tests run against an emulated OBS WebSocket server. They are **not** physical Windows/OBS tests. The direct Chromium navigation to the local app endpoint was blocked by this environment's browser network policy, so live local-browser-to-OBS integration is NOT certified. Separate Chromium render tests and controller tests were run successfully.

## Unverified production gates

- Real OBS Program output with a physical webcam, green-screen/background-removal filter and live movement.
- True live alpha tracking, transform/scene nesting variations and Studio Mode handoff under broadcast conditions.
- RTX 4070 Super and lower-end GPU 1080p60 frame pacing while gaming and streaming.
- 100 consecutive IN/OUT cycles; error-recovery under OBS disconnect/reconnect.
- Signed installer, fresh Windows installation/upgrade/rollback/uninstall.
- Independent expert evaluation of the animation's visual quality. This is a *stylized* ember effect and should not be represented as feature-film VFX.

**Release decision: PRIVATE TEST CANDIDATE ONLY. Do not distribute publicly as a finished production release.**
