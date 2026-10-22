# SC Web Transitions v3.13.1 Smoke Toxic Natural Depth — QA / release gate

## Automated checks completed
- `go test ./...` passed.
- Headless browser sanity check passed without page errors.
- Smoke preview: 72 cloud instances detected.
- Toxic preview: 64 cloud instances detected.
- Verified new cloud attributes in live state: parallax, skew, swirl, stronger innerGlow.

## Manual validation recommended
1. Test **Smoke** in OBS and compare against v3.13.0.
2. Test **Toxic Cloud** in OBS and compare against v3.13.0.
3. Confirm the clouds feel less shaped / more natural.
4. Confirm the toxic version has enough glow without becoming too neon.
5. Confirm performance is still acceptable on your OBS setup.
