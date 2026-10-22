# v3.13.4 — smoke/toxic actual-render QA

- `go test ./...` passed.
- `node --check` on the actual embedded overlay script passed.
- Chromium synthetic preview render: no script errors for both Smoke and Toxic.
- At COVER 100%, **100% of 2D silhouette probe pixels were opaque** in both smoke/toxic synthetic tests; final RELEASE 100% was fully transparent.
- Frame sequence captured directly from the actual `overlay.html` smoke pipeline with the synthetic moving webcam character composited onto white. See `Smoke_ACTUAL_Render_Contact_Sheet.jpg`, `Toxic_ACTUAL_Render_Contact_Sheet.jpg`.
- Real Windows OBS rendering, 1080p60 frame budget, capture/visibility handoff, and exact camera green-screen boundaries have not been validated in this environment.
- Existing asset-based Money / Ice engines and OBS integration were preserved.

**Candidate status:** private RC for off-stream validation, not a claim of photorealistic smoke or full production readiness.
