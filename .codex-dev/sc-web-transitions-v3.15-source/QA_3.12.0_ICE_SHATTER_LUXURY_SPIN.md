# SC Web Transitions v3.12.0 Ice Shatter Luxury Spin — QA / release gate

## Automated checks completed
- `go test ./...` passed.
- Headless browser sanity check passed.
- Synthetic Ice OUT run ended fully transparent.
- Synthetic ice coverage remained above 99.4%.
- Shard motion data confirmed larger rotation, plus added lift and wobble parameters.

## Manual validation recommended
1. Test **Ice Shatter** in OBS at 1080p60 using **WebGL2 3D**.
2. Repeat in **Canvas2D compatibility**.
3. Confirm shards now visibly rotate while flying away.
4. Confirm no premature webcam exposure occurs during Ice IN / Ice OUT.
5. Compare against v3.11.3 and judge whether the airborne motion feels premium enough.
