# SC Web Transitions v3.13.2 — Smoke Toxic Bottom-Up Rise RC1

Base: v3.13.1 Smoke Toxic Natural Depth.

## Focus
Fix the remaining issue where Smoke / Toxic could feel like a large curtain appearing too suddenly, and make the plume feel more physically believable.

## What changed
- Reworked the macro smoke volume to reveal **from the bottom upward** instead of broad early activation.
- Delayed and softened the seal/core contribution during cover so it no longer pops in like a wall.
- Added stronger **top dissipation** during release so the top of the plume thins out before leaving the camera area.
- Adjusted individual plume alpha timing so cloud bodies follow the same bottom-up rise logic.
- Kept the more natural smoke shape, stronger toxic glow, and added depth/parallax from v3.13.1.

## Intended result
Smoke and Toxic should now rise more like a believable plume: building from below, covering progressively, and fading off near the top instead of behaving like a sudden curtain.
