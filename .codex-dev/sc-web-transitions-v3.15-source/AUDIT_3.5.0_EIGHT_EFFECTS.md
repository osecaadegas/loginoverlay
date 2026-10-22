# SC Web Transitions v3.5.0 — Individual VFX Audit and Corrective Rebuild

**Review target:** v3.4.1 expansion effects. **Result:** v3.5.0 private test release candidate. **Public release:** **NO-GO** pending real OBS and artistic validation.

## Method and limitations

- Inspected `expansion-effects.js` from v3.4.1, assessed earlier synthetic preview videos and contact sheets.
- Implemented a new material-specific renderer for all eight expansion effects, replacing the original shared `prepare`/`renderCover`/`renderPlay` path. Removed ~23 KB of superseded code instead of layering more dead functions.
- Produced v3.5 synthetic IN/OUT video reviews (640×360, 16 FPS) and before/after filmstrips. These use a geometric synthetic subject, not a real webcam.
- Ran browser tests at 960×540 and isolated 1920×1080 Chromium software rendering. Coverage is based on a captured, **static** alpha silhouette, not continuously sampled OBS frames.
- Executed Go unit, vet and race checks, JavaScript syntax checks, and simulated OBS integration for 16 effect/direction pairs. No Windows workstation with a physical camera was available.

## Individual findings and corrections

### 1. Void Glitch
**v3.4.1 fault:** Basic repeating image tiles and static RGB paint with little coherent corruption. IN reconstructed like a coloured image cutout.

**Implemented:** Material grading preserves subject tones; independent tile streams break apart along horizontal displacement; coloured channel strips and locally time-varying glitch tearing. Procedural, deterministic growth and disintegration fronts replace the single common wipe.

**Still below ideal:** Not true GPU pixel-sorting, texture-space signal reconstruction or per-channel frame displacement. Expect deliberate stylized glitch, not a fully simulated video codec failure.

### 2. Lightning Surge
**v3.4.1 fault:** Repetitive squiggly line particles disconnected from the body, without convincing primary versus secondary electricity.

**Implemented:** Electrical paths generated using the actual body points; when paths leave the keyed body they seek inward instead of endlessly crossing empty background. Layered glow/core arcs, frame-dependent flicker, discharge sparks and radial silhouette growth. Reduced excess arcs and modified release choreography.

**Still below ideal:** Canvas2D glow and geometry, without shader-level branching/timing or real HDR bloom and smoke ionization.

### 3. Shadow Swarm
**v3.4.1 fault:** Purple-tinted person with generic dark strokes, not a believable flock or feather swarm.

**Implemented:** Procedural shaded feather sprites with quill highlights, denser independent movement and angular variation, darkened photograph-derived source material, and swirling upward scatter.

**Still below ideal:** No 3D flocking/neighbor avoidance, particle collisions or occlusion-aware depth ordering; visual remains stylized.

### 4. Holy Ascension
**v3.4.1 fault:** Flat gold silhouette and cross-shaped sparkles. Light source lacked hierarchy and vertical depth.

**Implemented:** Material illumination derived from subject luminance; animated gold rays with independent timing and falloff, additive luminous grains, directional upward assembly/dispersal and organic growth.

**Still below ideal:** Rays are procedural 2D lines rather than actual volumetric light or physically simulated scattering.

### 5. Sand Disintegration
**v3.4.1 fault:** Tiny uniform square pixels with simple outward linear movement, not granular erosion.

**Implemented:** Sand-coloured noise from a multiscale surface, independent fine grains (1,700 at Cinematic), oblique wind transport, turbulent motion and an uneven right-to-left material breakup.

**Still below ideal:** Grains are billboards without clump mechanics, sand pressure, inter-grain collision or sustained particle depth. More work needed for close-up realism.

### 6. Crystal Growth
**v3.4.1 fault:** Uniform tile mosaic and gridlike shards with detached crack detail and performance spikes.

**Implemented:** Irregular Voronoi-like facets based on body interior sampling. Each cell stores a silhouetted, textured fragment; shaded edge bevels, variable rotation and divergent fracture velocities replace square tiles. Reduced approximately 130 cells to 32 for the synthetic figure. Material now has differentiated mineral lighting.

**Still below ideal:** Facets are transformed 2D textures with faux bevels rather than actual refractive 3D crystal meshes. Irregular large frame-time outliers occur in headless Chromium; real OBS 60 FPS not validated.

### 7. Petal Bloom
**v3.4.1 fault:** Petals looked like simple pink spots and flat circles, often too small to recognize.

**Implemented:** Cached curved petal sprites with shaded gradients, center veins, varied spin/flutter, layered organic material and independent swirling movement. Increased the size of individual petals to make them readable.

**Still below ideal:** The petals remain 2D billboards. True flexible petal deformation, wind-field simulation and front/back textures remain a future GPU task.

### 8. Neon Plasma
**v3.4.1 fault:** Chaotic electric scratches and uniform spiral coils, overlapping Lightning rather than reading as flowing plasma.

**Implemented:** Six flowing contour-aware spline streams with independent phases, glowing shells and a brighter filament core. Coil/repetition was removed; release uses directional energy trails rather than lightning-only strokes.

**Still below ideal:** A 2D additive approximation, not flowing volumetric plasma, and some streams still need art direction for naturally interacting with complex moving silhouettes.

## Shared improvements

- Replaced identical solid-colour torso matte and shared rectangular/radial wipes with camera-derived material plates and distinct organic growth fields.
- Separated construction, brief camera-readiness hold, and release. IN now begins clearing sooner and no longer keeps most of the silhouette opaque until the final frames.
- Preserved the effective-alpha safety test at **98.5%** for OUT. No invisible logical mask is substituted for actual visible concealment.
- Cached synthetic texture assets and precomputed noise fields at transition preparation time. Moved partial-animation surface compositing to scaled buffers; final full concealment uses full-resolution material.
- Removed ~23 KB of abandoned v3.4 code. All eight effect families retain persistent accent, motion and detail options.
- Money, Ice, Black Smoke, Toxic Cloud and Inferno renderer functions were compared against v3.4.1 and are **unchanged**.

## Results and remaining engineering limitations

**Go:** `go test ./...`, `go vet ./...`, `go test -race ./...` PASS. **JavaScript syntax:** PASS. **Playwright:** all 8 effects rendered OUT and IN at sampled stages with no page errors. **Static keyed coverage:** ~99.08% at 960×540, ~99.64% at 640×360. All 8 effects had zero end-frame alpha for both directions at 1920×1080. **Mock OBS:** 16 ON/OFF transitions and coverage rejection PASS. This verifies only simulated OBS, not real OBS Program output.

**1080p performance:** `PERFORMANCE_3.5.0.json` reports 32 sampled frames/effect in headless Chromium. At Cinematic, median samples are typically 4–6 ms, but tails are inconsistent between repeated passes: individual frames exceeded 20–60 ms. These are not OBS GPU measurements. **Stable 60 FPS is not certified.**

**Artistic status:** This pass is a distinct visual upgrade, especially Glitch, Crystal and Petal, but **still not at the approved Money/Ice level**. Each effect would benefit from deliberate real-subject compositing, animation-directed motion studies, high-resolution texture work and GPU geometry/volume rendering. No 10/10 claim is warranted.

**P0 public-release blockers:** Actual OBS Program on Windows not tested; live moving silhouette is not tracked continuously, webcam activation may still use stale screenshots; 100 consecutive real cycles not run; 1080p60 gaming load and frame pacing unverified; Windows installation/upgrades/signing not production-certified. **Release decision: PRIVATE TEST CANDIDATE ONLY.**

## Next quality gate

Test the eight review videos against a moving, keyed webcam recording in real OBS. Rank the effects by real-world perceptual quality, then migrate the weakest one at a time to GPU texture/shader or 3D instanced geometry. Do not ship all eight as professional cinema-grade until individual visual approval and real OBS switching/performance gates pass.
