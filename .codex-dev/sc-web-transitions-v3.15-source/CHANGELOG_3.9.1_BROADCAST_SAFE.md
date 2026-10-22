# SC Web Transitions v3.9.1 RC1 — Broadcast Safety and Performance

Based directly on **v3.9.0 Money CGI**. No changes to bill artwork, 3D paper shaders, approved Money choreography, Ice rendering, or other 3D materials.

## OBS / camera reliability
- IN cannot finish successfully before the renderer has requested a reveal and OBS has confirmed an enabled webcam.
- Before an IN enables the camera, the controller independently captures the actual OBS FX Browser Source and checks at least **98.5% effective optical coverage** over the previously captured silhouette. A renderer ACK alone is insufficient.
- A failed transition that passed the camera-state preflight clears its FX source and attempts to restore camera **ON**, including failures in an IN where the camera was previously hidden.
- Rejected duplicate OUT requests while the camera is already hidden **do not** toggle the camera back ON or disable the FX source.
- A renderer watchdog checks elapsed time since the latest heartbeat/validated ACK while waiting in preparation, cover and playback stages; if lost for **4.5 seconds**, the transition fails and attempts camera recovery.
- Unexpected Go panics in a transition goroutine invoke the same best-effort FX/camera cleanup.
- Settings, effect changes and OBS reconnect requests are rejected during an active transition, avoiding mid-animation configuration races.
- OBS WebSocket RPCs are bounded to **5 seconds** (normal requests) or **9 seconds** (source screenshot), using a single write+read deadline rather than 15-second reads per call. Connections that time out are not repeatedly retried on the same broken socket.
- Bounded HTTP server read/write/idle timeouts added.

## GPU and CPU performance
- App's synthetic 3D preview is **OFF by default**, opt-in from the dashboard. It stops automatically when a transition starts, so a looping preview no longer competes with OBS for GPU cycles.
- Browser Source idle mode stops repeatedly clearing full-resolution Canvas2D frames and limits idle render scheduling to roughly 10 Hz rather than matching a monitor's full refresh rate. Active transitions keep requestAnimationFrame.
- Browser Source state polling is serialized, uses an AbortController request timeout, and adapts to approximately **3 requests/second idle / 10 requests/second active**, instead of fixed ~15 requests/second. Compatible with OBS CEF browsers without AbortSignal.timeout.
- Desktop UI status polling is serialized and adaptive (~0.8 idle / ~2.2 active requests/second instead of fixed 2).
- **Adaptive GPU quality** is enabled by default. Sustained slow active frames lower geometry/detail from Ultra -> Cinematic -> Balanced -> Performance for a **subsequent** transition. It never changes a mesh halfway through a running effect. Active-stage measurement avoids mistakenly downshifting for intentionally throttled idle frame rate. Users can disable this in settings.
- UI differentiates active measured frame performance from intentional idle low-power mode.

## Unchanged
- Approved Money and Ice rendering blocks are byte-identical to v3.9.0.
- money-vfx3d.js, crystal-hero3d.js, gpu-vfx3d.js, premium assets and sheep bill.png are unchanged.
- Existing Stream Deck/hotkey API routes and transition names remain compatible.

## Known limitations
- Source screenshot readiness is not cryptographic proof of a temporally new live frame. Native frame-level OBS integration is not part of this release.
- Best-effort camera recovery cannot work if OBS itself is unavailable or the selected scene has changed. In that situation use OBS directly.
- No verified physical Windows/OBS capture or 1080p60 gaming benchmark in this environment. Real Chromium local navigation was blocked by the sandbox administrator.
