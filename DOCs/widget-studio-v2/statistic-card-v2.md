# Statistic Card v2

`statistic-card-v2` is the reference implementation for Widget Studio v2.

## Purpose

Displays one primary statistic with a header, optional icon, secondary label, and optional progress bar.

## Data Source

The current implementation uses mock data in Studio preview. A production integration can pass real data to the same renderer through the `data` prop.

## Required Fields

- `value`

## Optional Fields

- `header`
- `secondaryLabel`
- `progressValue`
- `trend`

## Default Appearance

The default card is a dark streaming-style statistic tile with cyan accent, rounded corners, subtle glow, shadow, and readable typography.

## Customization Groups

- Content
- Typography
- Colors
- Background
- Border
- Effects
- Layout
- Images
- Progress
- Animation
- Visibility

## Responsive Limits

- Minimum width: 180px
- Maximum width: 900px
- Minimum height: 120px
- Maximum height: 600px
- Recommended OBS size: 360px by 190px

## Empty State

The empty mock state uses zero value text and an empty progress bar. The renderer still uses the same component and settings.

## Error State

Invalid settings are corrected by schema validation before rendering. Missing content falls back to configured defaults.

## Animation Behavior

Supported animations:

- None
- Fade
- Slide
- Pulse

Animations are scoped to the widget root and respect reduced-motion preferences.

## Accessibility

The widget renders semantic text for the header, value, and label. Decorative icon and progress visuals are marked as hidden from assistive technology.

## Migration Notes

The initial migration is a no-op because this is the first v2 version of the widget. Future versions should add migration functions in `migrations.js`.

## Version History

- v2: Initial Widget Studio v2 reference widget.

