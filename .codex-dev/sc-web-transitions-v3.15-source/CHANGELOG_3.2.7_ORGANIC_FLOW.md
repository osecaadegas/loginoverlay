# SC Web Transitions v3.2.7 — Organic Flow RC

## User-requested fixes
- Rebuilt Smoke and Toxic growth/release in the Canvas renderer around continuous, nonlooping upward cloud trajectories and evolving asymmetrical macro/meso lobes. No repeated modulo-respawn during a transition.
- On OUT, a dense visible cloud core protects the keyed webcam, and the entire mass is advected upward and broken into wisps after OBS reports camera OFF. Final renderer alpha is zero.
- Removed rectangular-axis silhouette expansion; the core is assembled from overlapping circular cloud lobes with soft irregular edges.
- Corrected an anti-aliasing/phase-displacement bug that could leave effective coverage under the 98.5% camera-off threshold. At full cover, the moving ragged-edge displacement is suppressed; release begins pixel-identically and then develops an irregular trailing edge.
- OBS camera state changes now resolve scene item IDs by source name every time, protect against unexpected scene changes, retry with bounded delays, and confirm GetSceneItemEnabled matches the requested state.
- Error recovery and the Recover Camera command now re-resolve the FX source and confirm OBS actually disabled it.
- More explicit Activity-log diagnostics if the real OBS FX screenshot fails optical coverage validation.

## Protected animations
Money OUT, Money IN, Ice OUT, and Ice IN renderer functions and logic are **byte-for-byte unchanged** compared with v3.2.6.

## Honest limits
Synthetic measurements and the mock-OBS controller are not real Windows OBS recordings. This still uses a captured silhouette rather than continuously updated keyed camera alpha. Public production certification is blocked until physical webcam/OBS handoff and gaming+streaming 1080p60 tests pass.
