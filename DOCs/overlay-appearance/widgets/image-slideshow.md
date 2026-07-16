# Image Slideshow

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `image_slideshow` |
| Name | Image Slideshow |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:305` |
| Main component | `src/components/OverlayCenter/widgets/ImageSlideshowWidget.jsx:14` |
| Config panel | `src/components/OverlayCenter/widgets/ImageSlideshowConfig.jsx` |
| Styles | `v1`, `metal`, `v12` through `displayStyle` |
| Data source | `overlay_widgets.config.images` |
| Persistence | `overlay_widgets.config` |

## Rendering structure

- `ImageSlideshowWidget`
  - root image frame
  - active image
  - optional gradient overlay
  - optional caption
  - optional dots

## Visual layers

- Root frame.
- Image.
- Gradient overlay.
- Caption text.
- Dot indicators.
- Border/radius.

## Styling method

- Inline styles.
- `subValue` for some appearance-aware values.
- Config-driven image fit/position/radius/border.
- Timers for image rotation.

## Hardcoded values and risks

- Image fit and transition timings are safe only within config-defined modes.
- Caption size/color is safe.
- Freeform layout changes may break image aspect ratio.

## Animation model

- Interval timer.
- Fade/slide transition based on config.
- Transition duration can be constrained; transform distances are internal.

## Layout model

- Fixed image frame.
- `object-fit`/position control.
- Optional overlays.

## State variants

- Empty image list.
- Loading image.
- Caption shown/hidden.
- Dots shown/hidden.

## Customization safety

- Safe: border, radius, caption color/size, gradient color, image fit.
- Constrained: fade duration, interval, overlay opacity.
- Dangerous: arbitrary image crop math or layout transform changes.
- Not customizable: image source list logic.
