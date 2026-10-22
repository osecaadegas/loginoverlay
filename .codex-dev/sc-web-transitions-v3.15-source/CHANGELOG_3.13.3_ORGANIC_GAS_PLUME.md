# SC Web Transitions v3.13.3 — Organic Gas Plume RC1

Base: v3.13.2. This addresses the user's observed smoke curtain/wall effect.

## Root cause and fix
The previous smoke opacity envelope and the camera-protection seal did not rise together. At 85% of the buildup the measured silhouette was nearly uncovered, and by 94% the seal was fully opaque, resulting in a sudden solid smoke wall.

- Replaced late seal activation with **a shared, noise-shaped front** used by both smoke density and the OBS concealment seal.
- Added **independent eddy density thresholds** so clouds form in patches and merge over time rather than a rectangular wall.
- Increased Smoke/Toxic OUT pre-concealment growth from 1.76 to **2.20 seconds** to make the rising motion easier to read.
- Gave the smoke front local turbulence across its width rather than a flat horizontal edge.
- Changed the post-camera-off release: the opaque protective core dissipates sooner while lighter plumes continue rising and fading near the top of the camera area.
- Kept the v3.13.1 organic cloud sprites, toxic internal green glow, layered pseudo-3D motion and all previous Money CGI / Ice Shatter features.
- Slightly reduced the smoke/toxic particle count and per-cloud layer cap to control 2D performance cost.

**Important:** The smoke renderer remains layered 2D pseudo-volume, not a true voxel simulation. For safe camera switching it must become optically opaque briefly at the end of OUT growth.
