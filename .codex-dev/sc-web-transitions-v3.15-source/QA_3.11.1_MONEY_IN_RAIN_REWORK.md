# SC Web Transitions v3.11.1 Money IN Rain Rework — QA / release gate

## Scope
Money IN buildup pacing and accumulation only.

## Automated checks completed
- `go test ./...` passed.
- Headless browser check: Money coverage remained above 99.7% in the synthetic preview run.
- Headless browser check: Money IN nonzero pixels increased progressively through the buildup instead of remaining flat and then popping.
- Headless browser check: GPU-money timeline exercised with a stubbed renderer; no page errors.

## Manual checks still recommended on Windows + OBS
1. Test Money IN at 1080p60 using `WebGL2 3D` and `Ultra` quality.
2. Repeat in `Canvas2D compatibility`.
3. Confirm the silhouette can slightly overhang aesthetically but never exposes the webcam early.
4. Confirm Money OUT and Ice IN/OUT still behave normally.
5. Confirm `Recover Camera` still clears a stuck state.

## Release decision
Private RC suitable for user-side validation. Final streaming use still requires an actual OBS recording pass on the target machine.
