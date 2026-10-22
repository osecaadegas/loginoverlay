# SC Web Transitions v3.13.2 Smoke Toxic Bottom-Up Rise — QA / release gate

## Automated checks completed
- `go test ./...` passed.
- Headless browser sanity check passed without page errors.
- Smoke preview: 72 cloud instances detected.
- Toxic preview: 64 cloud instances detected.
- Updated timing logic for bottom-up reveal and top dissipation compiled cleanly.

## Manual validation recommended
1. Test **Smoke** in OBS and confirm it builds from the bottom instead of appearing as a curtain.
2. Test **Toxic Cloud** with the same focus.
3. Watch the top edge and confirm it dissipates before exiting the camera area.
4. Compare against v3.13.1 for realism and timing feel.
