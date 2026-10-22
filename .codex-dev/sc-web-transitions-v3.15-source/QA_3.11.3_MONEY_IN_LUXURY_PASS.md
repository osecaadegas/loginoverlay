# SC Web Transitions v3.11.3 Money IN Luxury Pass — QA / release gate

## Automated checks completed
- `go test ./...` passed.
- Headless browser sanity check passed with Money coverage above 99.1%.
- Progressive buildup preserved; final frame transparent.
- Synthetic metrics showed increased torso/core and upper-silhouette note counts versus earlier pass.

## Manual validation recommended
1. Test Money IN in OBS at 1080p60 using **WebGL2 3D**.
2. Repeat in **Canvas2D compatibility**.
3. Compare against v3.11.2 and verify the torso looks fuller, shoulders/head read cleaner, and the reveal feels smoother and more luxurious.
4. Confirm there is no premature webcam exposure.
