# v2.6.4 QA notes

## Problems corrected
1. Money: the v2.6.2 design produced too many tiny notes; adjusted the geometry to a smaller number of mixed-size readable sheep notes.
2. Money: no webcam screenshot drawn at any point during OUT cover; the camera remains live until a banknote-only mask and falling bills occupy its silhouette.
3. Money: after the controller hides the OBS camera, individual notes scatter under radial impulses and gravity; the hero note completes the transition with a smoothly changing perspective scale and controlled slide.
4. Smoke/Toxic: previous cover animations clamped to the last frame until OBS toggled camera visibility. Continuous oscillator time is now used beyond the completion signal and carried into playback.
5. Smoke/Toxic: keep approved smoke sprites and colors, preserve live camera visibility under the cloud until the OBS handoff.
6. Demo: use the same renderer as production with a moving demo figure shown underneath it to make timing easier to assess.

## Tests performed
- Windows build + Go unit tests: passed.
- Simulated OBS all OUT/IN, blank-FX safety, missing-mask: passed.
- Real Chromium 2D renderer with synthetic subject, 9 stages per effect: passed, no page JS errors.
- Smoke and Toxic test measured significant visual changes in cover stage after the 100% threshold, proving no frozen terminal frame.

## Remaining release criteria
- Windows user hardware: actual OBS source alignment, playback FPS and end-to-end 1080p60 video.
- Mask remains sampled at transition start; rapid silhouette movement cannot be tracked continuously.
- Windows executable is unsigned and can trigger publisher warnings.
- This is not a certified Hollywood VFX pipeline, and quality must be evaluated in a recording before any public launch.
