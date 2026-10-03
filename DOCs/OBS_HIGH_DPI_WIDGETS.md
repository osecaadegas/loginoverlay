# Crisp standalone widgets in OBS

Standalone widget URLs render their DOM directly at the Browser Source pixel
dimensions. The saved editor size remains the composition's logical size; the
standalone renderer creates a render-only copy at the source size and scales
pixel-based typography and decoration tokens during layout. It does not enlarge
a low-resolution DOM canvas with a CSS transform.

## Recommended Browser Source setup

1. Copy the existing standalone widget URL from Overlay Center.
2. Keep the URL's `scale=fit` parameter. Existing URLs without it also default
   to `fit`.
3. Set the Browser Source width and height to twice the widget's saved editor
   dimensions while preserving its aspect ratio.
4. Resize the source to its intended on-stream size in OBS.
5. Right-click the source and choose **Scale Filtering > Lanczos**.

Do not create a small Browser Source and enlarge it in OBS. A high-resolution
source scaled down produces cleaner type, borders, curves, and slot artwork.

## Reference dimensions

| Widget | Recommended sharp source |
| --- | ---: |
| Tall Bonus Hunt saved at 374 x 947 | **748 x 1894** |
| Slot Bingo (standard preset) | **1200 x 1120** |
| Chat (standard preset) | **670 x 936** |
| Tournament (standard preset) | **640 x 1304** |
| Giveaway (standard preset) | **738 x 406** |
| RTP bar (standard preset) | **2490 x 114** |
| Slideshow (standard preset) | **672 x 454** |
| Full overlay | **1920 x 1080** |

If a widget has been resized in the editor, double its current saved width and
height rather than forcing one of the preset sizes above. `scale=native` remains
available for troubleshooting and renders at the saved dimensions without
fitting to the Browser Source.

## Quality and performance

- **Low** effects quality keeps Pixi at DPR 1.
- **Balanced** and **Ultra** standalone widgets respect the browser's device
  pixel ratio up to DPR 2. OBS normally reports DPR 1, so selecting a 2x Browser
  Source is the primary sharpness control and does not silently create a 4x
  canvas. Editor and full-overlay caps remain lower to avoid extra GPU load.
- The editor preview keeps its existing logical canvas and does not render every
  widget at standalone 2x quality.
- Slot thumbnails still depend on the resolution supplied by the slot/provider
  source. The renderer uses normal browser interpolation and never enables
  `image-rendering: pixelated`.
