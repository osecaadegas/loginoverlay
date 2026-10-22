# SC Web Transitions 3.2.1 — Money Polish

- Money OUT: render intact golden-sheep notes extending naturally outside the subject silhouette; the alpha mask controls bill placement and coverage verification, not clipping.
- Money IN: falling bills now transition continuously into exactly their own settled pose. Removed the prebuilt silhouette crossfade that made the first note layer vanish and a different silhouette appear.
- Increased IN assembly allocation to 57% of the main animation timeline before the coordinated reveal/blast. The camera-ready gate follows the same boundary.
- No edits to Ice, Smoke or Toxic artistic code.

## Validation
- Go tests passed.
- Money OUT synthetic measured coverage test passed (99.81% at 960x540, 46 bill sprites; transparent exit).
- JS syntax check passed.
- Money IN synthetic browser check did not complete in the execution environment; manual OBS testing is REQUIRED.
- Not production certified or tested with a physical Windows OBS camera.
