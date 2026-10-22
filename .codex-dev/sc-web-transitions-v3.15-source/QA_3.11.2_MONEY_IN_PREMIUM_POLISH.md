# SC Web Transitions v3.11.2 Money IN Premium Polish — QA / release gate

## Automated checks completed
- `go test ./...` passed.
- Headless browser sanity check passed with Money coverage above 99.5%.
- Progressive Money IN buildup still verified.
- Final frame remains transparent.
- Stubbed GPU timeline check passed without page errors.

## Manual validation recommended
1. Test Money IN in OBS at 1080p60 using **WebGL2 3D**.
2. Repeat using **Canvas2D compatibility**.
3. Confirm the new front-layer notes, soft settling and peel-away reveal feel better live than v3.11.1.
4. Confirm no premature webcam exposure occurs.
