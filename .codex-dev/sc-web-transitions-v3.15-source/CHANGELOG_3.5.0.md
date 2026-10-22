# SC Web Transitions v3.5.0 RC1 — Audited Expansion VFX

## Eight separate material and animation corrections

- **Void Glitch:** reworked RGB digital material, horizontal tearing and block motion.
- **Lightning Surge:** surface-guided branching electrical arcs and restrained discharge.
- **Shadow Swarm:** shaded feather sprites and independent, moving shadow fragments.
- **Holy Ascension:** subject-derived gold illumination, ascending dust and luminous rays.
- **Sand Disintegration:** multiscale granular surface and varied wind-carried grains.
- **Crystal Growth:** Voronoi-like mineral facets, bevelled edges and mixed-size breakup.
- **Petal Bloom:** readable, curved and shaded petals with independent flutter.
- **Neon Plasma:** contour-flowing ribbons replacing repetitive spring-like spirals.

## Shared system changes

- Removed obsolete expansion render code and rebuilt a single effect API with material-specific paths.
- Precomputed noise-based growth fields replace generic plain wipes.
- Full optical cover before OUT camera switch, with static-mask coverage check preserved.
- IN sequence now clears earlier and holds the camouflaging shell while camera readiness is pending.
- Quality-scaled rendering buffers for better synthetic frame cost; high-resolution final concealment.
- App and renderer version updated to `3.5.0-effect-audit-rc1`.
- Original Money, Ice, Smoke, Toxic and Inferno renderers not modified.

Full findings: `AUDIT_3.5.0_EIGHT_EFFECTS.md`.

**Release is NOT production-certified.** Real OBS and native webcam tests, continuous alpha tracking, Windows installer signing, and professional art review are not complete.
