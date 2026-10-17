# Camera relay performance update (0.1.15)

The OBS relay supplies approximately 15 JPEG frames per second at up to 1280x720, JPEG quality 0.78. These settings are unchanged.

## Changes
- Ice Shatter and Money Explosion update the Pixi canvas texture only when a relay frame arrives.
- Visible idle relay cameras stop their continuous Pixi ticker and render incoming frames directly. Existing effect, reconstruction and scrub paths restart the ticker at its existing 60 FPS ceiling.
- Each decoded frame is closed in a finally block.
- ScreenSplit reuses its sender canvas until source dimensions change, rather than reallocating it twice per frame.
- ScreenSplit publishes live status once per connection/recovery, and ignores stale asynchronous UI updates after a source stops.
- Vite ignores generated Electron output, preventing packaging file locks from crashing the development watcher.

## Validation
- ScreenSplit TypeScript, ESLint, all 64 tests, renderer build and Windows installer packaging passed.
- Published OBS-route browser regression passed for both camera styles with a local relay fixture and a CSP forbidding unsafe-eval.
- The regression counts Pixi canvas updates: while relay responses are delayed, no repeated upload loop occurs. It also verifies new frames reach the GPU, forward transitions complete, reconstruction completes, and OBS never requests getUserMedia.
- Full Ice Shatter and Money Explosion browser suites passed. Their obsolete direct-OBS-camera assertions now verify the current inactive-relay behavior; active relay rendering is tested in the OBS-route suite.

Run from the repository root with Vite listening on port 3012:

    $env:TEST_BASE_URL='http://127.0.0.1:3012'
    npm.cmd run test:camera-obs-route
    $env:CAMERA_STYLE='money_explosion'
    npm.cmd run test:camera-obs-route
    npm.cmd run test:freeze-shatter
    npm.cmd run test:money-explosion

These checks use Chromium and controlled camera frames. Actual OBS CPU/GPU usage, real NVIDIA Broadcast capture, and long-session resource measurements were not profiled on the streaming setup. No percentage reduction in total system usage is claimed.
