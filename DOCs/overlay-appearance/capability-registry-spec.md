# Capability Registry Specification

## Purpose

The appearance editor needs a registry that describes what each widget actually supports. It should not infer support from names such as "header", "card", or "background" unless the component renders and consumes those mappings.

## Proposed shape

```js
widgetCapabilities = {
  bonus_hunt: {
    schemaVersion: 1,
    renderer: "BonusHuntWidget",
    obsRenderer: "OverlayRenderer.WidgetSlot",
    previewRenderer: "OverlayPreview.PreviewSlot",
    styleKey: "displayStyle",
    styles: ["v3", "v5_horizontal", "v11_fever", "v12_classic_sr"],
    elements: {
      root: {
        label: "Entire widget",
        selector: "[data-widget-type='bonus_hunt']",
        capabilities: ["surface", "border", "shadow", "scale"],
        safeRanges: {
          scale: [0.75, 1.5],
          borderRadius: [0, 24]
        }
      }
    }
  }
}
```

## Required fields

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Version of the capability declaration. |
| `widgetId` | Registry widget type. |
| `name` | User-facing name. |
| `renderer` | Component used in OBS and preview. |
| `previewRenderer` | Preview wrapper or component. |
| `obsRenderer` | OBS wrapper or component. |
| `routes` | OBS routes and route variants. |
| `styleKey` | Config key used to select internal visual style. |
| `styles` | Supported internal styles. |
| `elements` | Editable visual areas actually rendered by the widget. |
| `stateVariants` | Active/opened/empty/error/etc states that change appearance. |
| `styleSources` | CSS classes, inline style, vars, SVG/image/pseudo-elements. |
| `dataSources` | Tables, services, APIs, local state. |
| `safeRanges` | Numeric constraints per capability. |
| `unsupportedSettings` | Controls the editor must hide. |
| `knownProblems` | Mismatches or unsupported combinations. |

## Capability vocabulary

| Capability | Allows |
| --- | --- |
| `surface` | Background color, opacity, simple gradients where supported. |
| `border` | Border color, width, radius, style. |
| `shadow` | Shadow size, intensity, color where not layout-critical. |
| `glow` | Controlled outer glow; disabled for tiny text or dense lists. |
| `text` | Font family, size, weight, color. |
| `image` | Fit, size, radius, fallback; not arbitrary crop unless supported. |
| `spacing` | Padding/gap within safe widget-specific ranges. |
| `scale` | Whole widget scale using slot-safe transforms/dimensions. |
| `animationSafe` | Motion duration multiplier only where layout independent. |
| `stateColor` | Positive/negative/winner/loser state colors. |
| `progress` | Progress fill/background/radius for progress bars. |

## Unsupported property handling

If a setting is not declared for a widget or element:

- Do not render the control in Simple Mode.
- In Advanced Mode, show it only as unavailable with a reason, or hide it.
- Do not write unsupported values into `overlay_state`.
- Do not silently store values that no renderer consumes.

## Validation requirements

Every capability must include:

- Storage path.
- Preview consumer.
- OBS consumer.
- Allowed type and range.
- Fallback value.
- State override behavior.
- Whether it can be safely animated.
