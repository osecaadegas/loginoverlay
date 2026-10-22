# Ice Silhouette v3.2.4 RC1 QA

## Completed

- Windows x64 PE GUI executable cross-compiled with embedded UI, shader/overlay, icons and banknote asset.
- `go test ./...`: passed.
- Inline JavaScript `node --check`: passed.
- Headless Chromium synthetic 960x540 rendering succeeded without JavaScript page exceptions using Playwright `page.set_content` and injected `preview=1` parameters.
- At Ice OUT cover=1, opaque keyed silhouette coverage = 100.000% in sampled synthetic pixels; 90 antialiased exterior sample hits out of >57k samples, no webcam-window rectangle.
- At Ice IN p=.55, opaque keyed silhouette coverage = 99.738% in sampled synthetic pixels; exterior alpha confined to the silhouette perimeter.
- Ice IN p=.22 showed 5262 exterior sample hits from moving returning shards, confirming visible entry rather than offscreen-only particles.
- At both Ice OUT and IN p=1, overlay alpha maximum = 0 (fully transparent).
- Verified the original Money and Smoke/Toxic animation code regions remain unchanged.
- Saved synthetic contact sheet and encoded review clips for both Ice OUT and Ice IN.

## Not completed

- Physical webcam source and OBS Program output testing on Windows.
- Actual 1080p60 load/performance capture while gaming.
- Camera alpha tracking when the subject moves during the sequence.
- Full 100-repeat stress test and long-term installer/update validation.
- Code signing.

## Known engineering boundary

Ice IN tries a hidden-source screenshot but can fall back to the previously cached silhouette if OBS will not supply current pixels. This is NOT a guarantee of a newly captured camera frame or continuously tracked silhouette. A native OBS integration is needed for guaranteed live silhouette tracking.

**Decision:** Private test release candidate only. Not approved for public distribution.
