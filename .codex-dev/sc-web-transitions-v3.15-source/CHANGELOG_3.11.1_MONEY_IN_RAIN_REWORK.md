# SC Web Transitions v3.11.1 — Money IN Rain Rework RC1

Base: v3.11.0 Ice Shatter Ultra. No removal of Money CGI Ultra, Ice Shatter Ultra, other effects, settings, OBS bridge, source positioning or hotkey support.

## Focus
Improve **Money IN** so notes rain down progressively and pile into the webcam silhouette instead of arriving as one large chunk. Slight overhang beyond the silhouette is intentionally allowed when it improves aesthetics, while webcam coverage remains protected.

## What changed
- Added a new staggered **Money IN timing model** with wider per-note arrival windows.
- Added a shared **rain → settle → pile** pose calculation used by both the WebGL money path and the 2D fallback.
- Settled notes now appear progressively during Money IN instead of waiting for a sudden near-final block.
- Extended the Money IN build window and delayed the exact final silhouette reveal so the buildup remains readable for longer.
- Preserved the pixel-exact final coverage layer used at the webcam handoff moment.
- Preserved Money OUT behavior, Money CGI Ultra materials and hero bill, Ice Shatter Ultra, and all existing OBS safety controls.

## Expected visual result
- Continuous rainfall of banknotes at mixed speeds/angles.
- Layered accumulation that gradually fills the silhouette.
- A cleaner, more immersive buildup with tasteful overhang outside the body shape.
- Clean transparent final frame after Money IN completes.

## Suggested validation
1. Keep v3.11.0 as rollback.
2. Run `SC_Web_Transitions_v3.11.1_Money_IN_Rain_Rework_RC1.exe`.
3. Test **Money IN** in both `WebGL2 3D` and `Canvas2D compatibility`.
4. Confirm you see gradual rain buildup instead of one large dense falling chunk.
5. Confirm the webcam remains fully covered before reveal.
