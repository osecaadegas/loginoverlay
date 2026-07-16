# Container

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `container` |
| Name | Container |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:712` |
| Main component | `src/components/OverlayCenter/widgets/ContainerWidget.jsx:21` |
| Config panel | `src/components/OverlayCenter/widgets/ContainerConfig.jsx` |
| Styles | none |
| Data source | `overlay_widgets.config.children` plus child widgets |
| Persistence | `overlay_widgets.config` |

## Rendering structure

- `ContainerWidget`
  - root group
  - child widget renderer
  - vertical/horizontal layout
  - optional scroll behavior

## Visual layers

- Container surface.
- Child layout gap.
- Child widgets.
- Optional scroll container.

## Styling method

- Inline styles.
- `subValue` for some container values.
- Recursively renders other registered widgets as children.

## Hardcoded values and risks

- Container appearance directly affects child widget placement.
- It is easy to confuse container-level surface/radius/spacing with child widget appearance.

## Animation model

- No major internal animation.
- Child widgets keep their own animations.

## Layout model

- Vertical or horizontal flex group.
- Optional scrollable behavior.
- Children are excluded from top-level OBS render and rendered inside the container.

## State variants

- Empty container.
- Vertical/horizontal layouts.
- Scrollable/non-scrollable.

## Customization safety

- Safe: container background, opacity, gap, padding, align items.
- Constrained: scrollable behavior, dimensions.
- Dangerous: applying global style tokens to children through broad selectors.
- Not customizable: child widget business logic from the container control.
