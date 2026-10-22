# SC Web Transitions v3.12.1 Ice Sparkle Crack Flash — QA / release gate

## Automated checks completed
- `go test ./...` passed.
- Headless browser sanity check passed without page errors.
- Synthetic Ice OUT run ended fully transparent.
- Synthetic ice coverage remained above 99.4%.
- Pre-break phase extended and post-break fragments still clear the frame correctly.

## Manual validation recommended
1. Test **Ice OUT** in OBS at 1080p60 using **WebGL2 3D**.
2. Confirm the cracks now build more slowly before the explosion.
3. Confirm you see a brighter flash immediately before the shatter.
4. Confirm the shards retain clear rotating motion in flight.
5. Repeat in **Canvas2D compatibility** and compare against v3.12.0.
