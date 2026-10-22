# SC Web Transitions v3.13.0 Smoke Toxic Volumetric — QA / release gate

## Automated checks completed
- `go test ./...` passed.
- Headless browser sanity check passed without page errors.
- Live page debug confirmed new volumetric cloud attributes are present.
- Smoke preview: 72 cloud instances detected.
- Toxic preview: 64 cloud instances detected.

## Manual validation recommended
1. Test **Smoke** in OBS at 1080p60.
2. Test **Toxic Cloud** in OBS at 1080p60.
3. Compare this build against the previous one and confirm the clouds look fuller and more 3D.
4. Confirm the webcam remains fully hidden at the handoff moment.
5. Judge performance in both normal usage and repeated trigger use.
