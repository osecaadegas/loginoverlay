# SC Web Transitions v3.2.4 Ice Silhouette RC1

## What's changed

- Removed the artificial rectangular webcam-bounds stroke from Ice OUT.
- Constrained frozen camera pixels, frost fronts, perimeter rim, and growing cracks to the source's keyed silhouette.
- Replaced randomly overlapping polygon shards with reusable, nonuniform Voronoi regions that partition the frozen silhouette.
- Ice OUT now captures a frozen subject, grows ice from above and below, closes at the midpoint, develops cracks, and shatters into pieces that travel outside the viewport.
- Ice IN now rewinds the same fragment trajectories into an assembled icy silhouette. It requests OBS camera activation only AFTER the silhouette is assembled, holds the covering body until camera readiness, then cracks and shatters again to reveal the live camera.
- Best-effort fresh keyed camera screenshot attempted for Ice IN when the hidden source can provide it; fallback to previously captured keyed image if unavailable.
- Existing Money OUT, Money IN, Smoke, Toxic and Windows controls were not redesigned.

## Known limitations

- Real-time segmentation/tracking of the person is still unavailable in the Browser Source renderer. A snapshot-based silhouette can lag current subject movement.
- Windows OBS live 1080p60 integration was not tested in this environment. The submitted build is an RC, not a public-release certification.
- Browser-based synthetic review uses a simplified keyed figure, not a genuine webcam/OBS scene.
- Shards use silhouette-textured 2D polygon fragments with rotation/scale as a depth approximation, not fully ray-traced or physically simulated volumetric ice geometry.
