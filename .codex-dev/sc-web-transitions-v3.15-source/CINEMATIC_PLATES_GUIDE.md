# SC Web Transitions — v3.15.0 Cinematic Simulation Plate Engine

## What this actually does

This release is a **professional simulation footage playback and safe OBS-compositing engine**, not an EmberGen license or a real-time fluid solver. It can display high-quality smoke **when you install compatible professionally simulated footage**. No third-party footage is included. Without those files, existing v3.14.0 GPU raymarching/2D fallback is used and **will not look significantly different from v3.14.0**.

## Recommended legal asset source

JangaFX provides **CC0 free EmberGen VDB simulations** at:
https://jangafx.com/software/embergen/download/free-vdb-animations

Recommended: **High-Res Smoke Plume** (167 frames, 2.8 GB), **Industrial Chimney Smoke** (250 frames, 1.2 GB), and **Cloud Pack** (104 MB). They are VDB volumes, **not** ready-to-use transparent video. Import and render them in Blender/Houdini or EmberGen. JangaFX states the files are CC0; always verify the asset's license at the source before redistributing.

For creating your own footage, EmberGen has a free trial at https://jangafx.com/software/embergen/try. Do not embed/redistribute the EmberGen program itself with this package.

## Asset folder

On Windows, copy the rendered clips to:

`%LOCALAPPDATA%\SCWebTransitions\CinematicPlates\`

The six required filenames are:

```
smoke_cover.webm
smoke_release.webm
smoke_in.webm
toxic_cover.webm
toxic_release.webm
toxic_in.webm
```

Each effect requires its own three clips (cover, release, in), though you can color-grade the same physically simulated source differently for toxic. All three need **transparent alpha**, not a black background; use VP9-alpha WebM with standard RGBA PNG frames as the source.

`COVER`: starts empty, rises from below camera, and ends fully covering all opaque webcam pixels. The streamer is not hidden until coverage is optically verified. Ideal duration 2.2 seconds.

`RELEASE`: starts with the lens fully concealed, then the smoke dissipates and rises away naturally. Duration controlled by the UI.

`IN`: starts with the lens fully concealed, then progressively unveils the webcam as the camera source activates. Duration controlled by the UI.

Export frame rate: **60 fps**. Recommended preview size 960×540, final plate 1920×1080 or 2560×1440. Include realistic self-shadowing, rim backlight, internal green emission for Toxic, and distant/near smoke layers in the **same offline render**. Maintain exactly the same alpha matte through color grading.

## Encoding (FFmpeg)

If your renderer produces `0000.png, 0001.png, ...` transparent RGBA frames in each sequence directory:

```bash
ffmpeg -framerate 60 -i cover/%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 12M smoke_cover.webm
ffmpeg -framerate 60 -i release/%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 12M smoke_release.webm
ffmpeg -framerate 60 -i in/%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 12M smoke_in.webm
```

Repeat for Toxic or encode the toxic-grade PNG frames. For transparent video playback to work inside OBS, its embedded Chromium version must support VP9 alpha. Test in OBS before broadcasting. `ffprobe` reports `TAG:alpha_mode=1` for a correctly tagged alpha clip, but always verify actual transparent pixels.

## How the new engine works

1. When preparing Smoke/Toxic, it checks that all three local clips exist.
2. If installed, it preloads them with the browser's hardware-supported VP9 decoder, and draws the actual decoded RGBA frames to a transparent Canvas source.
3. It aligns video playback rate to the selected transition duration and freezes the last COVER frame while waiting for OBS.
4. It checks the actual frame alpha against the keyed webcam before camera-off. If the coverage falls below 98.5%, it refuses camera-off rather than expose a gap.
5. No clip / unsupported VP9 / decode failure: fall back to v3.14.0 procedural GPU smoke or Canvas2D.

## Limits and risks

- **Does not include the professional asset footage:** until assets are installed, the visual result remains the old one.
- Full opacity at handoff is unavoidable if the camera must remain covered. Plan a **natural lens-filling smoke billow**, not a visible human-shaped mask.
- A single unkeyed MP4 with black background is **not suitable**; it will show a rectangle.
- Transparent VP9 video might decode on the CPU in some OBS configurations. Profile 1080p60 and GPU usage on the target PC.
- Three separate video clips must have compatible matching end/start visual frames to avoid jumps.
- No import of raw OpenVDB directly in the app. Convert VDB simulations to RGBA footage in an offline renderer.
