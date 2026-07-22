# STREAMERS CENTER STRICT WIDGET EDITOR DEVELOPMENT RULES

You are working on the Streamers Center codebase.

Your task is to build and maintain a fully functional, scalable widget appearance editor where every widget, every widget style, and every internal visual element can be edited independently.

You must make precise, minimal, production-safe changes.

Do not redesign, rewrite, replace, or refactor unrelated systems unless explicitly required.

---

# 1. Core Objective

The appearance editor must provide two modes:

* Simple Mode
* Advanced Mode

Advanced Mode must provide full control over every editable visual element contained inside the selected widget and selected widget style.

The available controls must be generated dynamically from the actual structure and capabilities of the selected element.

Do not display controls that are not relevant to that element.

Examples:

* An image control must not appear when the selected element has no image.
* Font controls must not appear for elements that contain no text.
* Border controls must not appear for elements that cannot display a border.
* Grid controls must not appear for elements that are not grids.
* Progress-fill controls must not appear for elements that are not progress bars.
* Icon controls must not appear when the selected element contains no icon.
* Position controls must only appear where positioning is supported.

The editor must not show the same options for every element.

---

# 2. Investigate Before Editing

Before making any code changes, you must:

1. Inspect the relevant widget files.
2. Inspect the selected widget style implementation.
3. Inspect the appearance editor.
4. Inspect state management.
5. Inspect the preview rendering system.
6. Inspect the saved configuration structure.
7. Inspect OBS or published widget rendering.
8. Trace the complete appearance configuration data flow.
9. Identify the exact root cause of the current limitation or bug.
10. List the smallest safe changes required.

Do not guess.

Do not assume that a component, selector, store, schema, hook, API, table, configuration key, or rendering path exists.

Verify everything before editing.

---

# 3. Advanced Mode Requirements

Advanced Mode must allow independent editing of every visual element inside every widget style.

For each applicable element, Advanced Mode must support controls for:

## Dimensions

* Width
* Height
* Minimum width
* Maximum width
* Minimum height
* Maximum height
* Aspect ratio
* Automatic size
* Fixed size
* Percentage-based size

## Position

* Horizontal position
* Vertical position
* X offset
* Y offset
* Alignment
* Justification
* Absolute or relative positioning where supported
* Image focal position
* Object position
* Layer order or z-index where supported

## Spacing

* Padding
* Padding top
* Padding right
* Padding bottom
* Padding left
* Margin
* Margin top
* Margin right
* Margin bottom
* Margin left
* Gap
* Row gap
* Column gap

## Shape

* Border radius
* Individual corner radius:

  * Top left
  * Top right
  * Bottom right
  * Bottom left
* Shape presets:

  * Square
  * Rounded
  * Pill
  * Circle
  * Custom
* Overflow behavior
* Clipping behavior

Border radius must support:

* Pixels
* Percentages
* Presets
* Individual corners

The user must be able to control the exact percentage or pixel value of rounded edges.

## Background

* Background color
* Background opacity
* Gradient
* Gradient direction
* Background image where supported
* Background image size
* Background image position
* Background image repeat
* Background blur where supported

## Border

* Border color
* Border opacity
* Border width
* Border style
* Individual border sides
* Border radius
* Outline where supported

## Shadow and Effects

* Box shadow
* Shadow X offset
* Shadow Y offset
* Shadow blur
* Shadow spread
* Shadow opacity
* Inner shadow
* Glow
* Blur
* Element opacity
* Backdrop blur where supported

## Typography

For elements containing text, support:

* Font family
* Font size
* Font weight
* Font style
* Text color
* Text opacity
* Line height
* Letter spacing
* Text alignment
* Text transform
* Text decoration
* Text shadow
* Text stroke where supported
* Text wrapping
* Maximum lines
* Text overflow
* Ellipsis
* Word spacing

## Images

For elements containing images, support:

* Image width
* Image height
* Minimum image size
* Maximum image size
* Image aspect ratio
* Object fit
* Object position
* Horizontal image position
* Vertical image position
* Image X offset
* Image Y offset
* Image scale
* Image rotation where supported
* Image opacity
* Image border radius
* Image border
* Image shadow
* Image crop
* Image mask where supported

Image controls must only appear if the selected element contains or supports an image.

## Icons

For elements containing icons, support:

* Icon size
* Icon color
* Icon opacity
* Icon position
* Icon offset
* Icon rotation
* Icon container size
* Icon container background
* Icon container radius

Icon controls must only appear if the selected element contains or supports an icon.

## Layout

Where applicable, support:

* Display mode
* Flex direction
* Flex wrap
* Align items
* Justify content
* Grid columns
* Grid rows
* Grid gap
* Item order
* Item alignment
* Item span
* Container orientation

Layout controls must only appear for elements that support layout configuration.

## Animation

Where supported, allow:

* Entry animation
* Exit animation
* Loop animation
* Animation duration
* Animation delay
* Animation easing
* Hover animation
* Transition duration
* Transition easing

Do not show animation controls when the element or widget does not support animation.

---

# 4. Every Element Must Be Independently Editable

Every visible element must have a unique stable identifier.

Examples:

```ts
widget.root
widget.background
widget.frame
widget.header
widget.title
widget.subtitle
widget.content
widget.footer
widget.card
widget.statCard
widget.value
widget.label
widget.slotCard
widget.slotImageContainer
widget.slotImage
widget.progressContainer
widget.progressTrack
widget.progressFill
widget.playerAvatarContainer
widget.playerAvatar
widget.playerName
widget.badge
widget.iconContainer
widget.icon
```

A setting applied to one element must affect only that element.

Examples:

* Changing `widget.background.borderRadius` must not change internal cards.
* Changing `widget.statCard.backgroundColor` must not change the widget background.
* Changing `widget.title.fontSize` must not change labels or values.
* Changing `widget.slotImage.width` must not change the slot card width.
* Changing `widget.slotImageContainer.padding` must not change the main widget padding.
* Changing one widget style must not change another widget style.
* Changing one widget instance must not change another widget instance.
* Changing a shared default must not mutate existing saved widgets.

Do not link properties unless the user explicitly chooses to link them.

---

# 5. Element Capability System

Every editable element must declare which control categories and properties it supports.

Example:

```ts
type ElementCapability =
  | "dimensions"
  | "position"
  | "spacing"
  | "background"
  | "border"
  | "radius"
  | "shadow"
  | "typography"
  | "image"
  | "icon"
  | "layout"
  | "animation"
  | "opacity";

type EditableElementSchema = {
  id: string;
  label: string;
  type:
    | "container"
    | "text"
    | "image"
    | "icon"
    | "card"
    | "progress"
    | "grid"
    | "list"
    | "badge"
    | "button"
    | "custom";
  capabilities: ElementCapability[];
  properties: EditablePropertyDefinition[];
};
```

Each property must define:

```ts
type EditablePropertyDefinition = {
  key: string;
  label: string;
  control:
    | "color"
    | "number"
    | "slider"
    | "select"
    | "toggle"
    | "spacing"
    | "radius"
    | "position"
    | "font"
    | "imageFit"
    | "shadow"
    | "gradient";
  unit?: "px" | "%" | "rem" | "em" | "auto" | "unitless";
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: unknown;
  options?: Array<{
    label: string;
    value: string;
  }>;
};
```

The Advanced Mode control panel must be generated from this schema.

Do not hardcode one generic panel containing every possible control.

---

# 6. Conditional Control Visibility

Controls must only appear when supported by the selected element.

Examples:

## Text element

Show:

* Font family
* Font size
* Font weight
* Text color
* Line height
* Letter spacing
* Text alignment
* Text shadow
* Dimensions
* Position
* Margin
* Padding where applicable

Hide:

* Image size
* Image fit
* Image crop
* Icon settings
* Grid columns
* Progress fill

## Image element

Show:

* Image width
* Image height
* Object fit
* Object position
* Scale
* Border radius
* Opacity
* Position
* Shadow
* Crop where supported

Hide:

* Font family
* Font size
* Line height
* Text alignment
* Progress fill
* Grid columns unless the image container is a grid

## Container element

Show:

* Dimensions
* Background
* Border
* Radius
* Padding
* Margin
* Gap
* Shadow
* Layout
* Position

Hide:

* Font controls unless the container directly renders text
* Image controls unless the container supports a background image or contained image
* Icon controls unless the container contains an editable icon

## Progress bar

Show separate controls for:

* Progress container
* Progress track
* Progress fill
* Progress label
* Progress value

Do not treat the entire progress bar as one style target.

## Card

Show:

* Dimensions
* Background
* Border
* Radius
* Padding
* Margin
* Shadow
* Position
* Internal layout

Do not automatically apply card settings to nested cards.

---

# 7. Widget Schema Requirements

Every widget style must define its own element schema.

Example:

```ts
const betsGrid2x3AppearanceSchema = {
  widgetType: "bets-grid",
  styleId: "grid-2x3",
  elements: [
    {
      id: "root",
      label: "Widget Container",
      type: "container",
      capabilities: [
        "dimensions",
        "position",
        "spacing",
        "background",
        "border",
        "radius",
        "shadow",
        "opacity",
        "layout",
      ],
    },
    {
      id: "header",
      label: "Header",
      type: "container",
      capabilities: [
        "dimensions",
        "spacing",
        "background",
        "border",
        "radius",
        "layout",
      ],
    },
    {
      id: "title",
      label: "Title",
      type: "text",
      capabilities: [
        "typography",
        "dimensions",
        "position",
        "spacing",
        "opacity",
      ],
    },
    {
      id: "statCard",
      label: "Stat Cards",
      type: "card",
      capabilities: [
        "dimensions",
        "spacing",
        "background",
        "border",
        "radius",
        "shadow",
        "layout",
      ],
    },
    {
      id: "statLabel",
      label: "Stat Labels",
      type: "text",
      capabilities: [
        "typography",
        "dimensions",
        "spacing",
        "opacity",
      ],
    },
    {
      id: "statValue",
      label: "Stat Values",
      type: "text",
      capabilities: [
        "typography",
        "dimensions",
        "spacing",
        "opacity",
      ],
    },
  ],
};
```

A widget style that has no image element must not declare image capabilities.

As a result, no image controls should appear in Advanced Mode.

A different style of the same widget may have different elements and different controls.

Do not assume all styles of one widget contain the same structure.

---

# 8. Widget Style Isolation

Each widget style must have its own schema and style configuration.

Examples:

```ts
bets-grid:grid-2x3
bets-grid:horizontal
bets-grid:compact
bets-grid:neon
bets-grid:minimal
```

Each style may contain:

* Different elements
* Different nesting
* Different layout controls
* Different image containers
* Different supported features

The Advanced Mode panel must update when the user changes widget style.

Controls from the previous style must not remain visible when they are not supported by the new style.

Saved values from one style must not incorrectly overwrite another style.

---

# 9. Configuration Structure

Appearance settings must be stored by:

* Widget instance
* Widget type
* Widget style
* Element ID
* Property

Recommended structure:

```ts
type WidgetAppearanceConfig = {
  widgetId: string;
  widgetType: string;
  styleId: string;
  elements: {
    [elementId: string]: {
      [propertyName: string]: string | number | boolean | null;
    };
  };
};
```

Example:

```ts
{
  widgetId: "widget-123",
  widgetType: "bets-grid",
  styleId: "grid-2x3",
  elements: {
    root: {
      width: 720,
      height: 420,
      backgroundColor: "#10131a",
      borderRadius: 24,
      paddingTop: 20,
      paddingRight: 20,
      paddingBottom: 20,
      paddingLeft: 20
    },
    statCard: {
      backgroundColor: "#1a1f2b",
      borderRadius: 12,
      padding: 14
    },
    statValue: {
      fontFamily: "Inter",
      fontSize: 28,
      fontWeight: 700,
      color: "#ffffff"
    }
  }
}
```

Do not store unrelated elements inside one shared style object.

Do not mutate shared default objects.

Do not share nested object references between widgets.

Use immutable updates.

---

# 10. Required Update API

Appearance updates must identify the exact target.

Recommended API:

```ts
updateElementProperty({
  widgetId,
  widgetType,
  styleId,
  elementId,
  property,
  value,
});
```

For multi-value controls:

```ts
updateElementProperties({
  widgetId,
  widgetType,
  styleId,
  elementId,
  properties,
});
```

Avoid broad APIs such as:

```ts
updateAllCards(...)
updateWidgetTheme(...)
updateGlobalBackground(...)
updateAllText(...)
applyStyleToEverything(...)
```

unless the user intentionally selects a global action.

---

# 11. DOM Targeting Rules

Every rendered editable element must expose stable identifiers.

Example:

```tsx
<div
  data-widget-id={widgetId}
  data-widget-type="bets-grid"
  data-widget-style="grid-2x3"
  data-element-id="root"
>
  <div data-element-id="header">
    <h2 data-element-id="title">Bets</h2>
  </div>

  <div data-element-id="statGrid">
    <div data-element-id="statCard">
      <span data-element-id="statLabel">Total Bets</span>
      <strong data-element-id="statValue">24</strong>
    </div>
  </div>
</div>
```

Do not depend on:

* DOM position
* `nth-child`
* Generic class names
* Shared `.card`
* Shared `.title`
* Shared `.container`
* Shared `.image`
* Broad descendant selectors

---

# 12. CSS and Style Isolation

Use scoped and element-specific styling.

Preferred approaches:

* CSS Modules
* Typed inline styles
* Element-specific CSS variables
* Scoped selectors using widget and element IDs
* Style maps generated from saved appearance configuration

Example:

```css
[data-widget-id="widget-123"][data-element-id="root"] {
  border-radius: var(--root-border-radius);
}

[data-widget-id="widget-123"] [data-element-id="statCard"] {
  border-radius: var(--stat-card-border-radius);
}
```

Never reuse the same CSS variable for unrelated elements.

Incorrect:

```css
--card-radius: 20px;
```

when it controls:

* Widget container
* Stat cards
* Slot cards
* Image containers
* Header panel

Correct:

```css
--widget-root-radius: 20px;
--widget-stat-card-radius: 12px;
--widget-slot-card-radius: 8px;
--widget-image-container-radius: 50%;
```

Avoid:

* Global CSS overrides
* Broad selectors
* `!important` as a normal fix
* Style leakage
* Shared state between widget instances
* Shared state between widget styles

---

# 13. Simple Mode

Simple Mode must provide safe grouped controls.

Examples:

* Main background
* Main text
* Accent color
* Global font
* General scale
* General spacing
* General roundness
* Basic shadow
* Theme presets

Simple Mode must still write into the same underlying element configuration used by Advanced Mode.

Simple Mode must not use a separate incompatible styling system.

When a Simple Mode control affects several elements, the affected elements must be explicitly defined.

Example:

```ts
simpleControlTargets: {
  accentColor: [
    { elementId: "progressFill", property: "backgroundColor" },
    { elementId: "badge", property: "backgroundColor" },
    { elementId: "icon", property: "color" },
  ],
}
```

Do not use vague global updates.

---

# 14. Advanced Mode Element Navigator

Advanced Mode must include a clear element navigator.

The user must be able to select individual editable parts such as:

* Main widget container
* Header
* Title
* Subtitle
* Cards
* Card labels
* Card values
* Images
* Image containers
* Icons
* Progress bar track
* Progress bar fill
* Footer
* Buttons
* Badges
* Decorative elements

The navigator must be generated from the selected widget style schema.

Elements not present in the selected style must not appear.

The selected element must be visually highlighted in the preview.

Hovering an element in the navigator should highlight the corresponding preview element where practical.

Clicking an editable element in the preview should select it in Advanced Mode where practical.

---

# 15. Preview Requirements

Changes must appear immediately in the live preview.

The preview must use the same rendering logic and appearance configuration as the real widget.

Do not maintain a separate fake preview implementation.

The following must remain synchronized:

* Editor state
* Live preview
* Pop-out preview
* Saved appearance
* Reloaded appearance
* Published widget
* OBS browser source

The preview must identify the selected element without changing the published widget appearance.

Selection outlines and editor overlays must never appear in OBS output.

---

# 16. Save and Persistence Requirements

Appearance settings must:

* Save per user
* Save per widget instance
* Save per widget style
* Save per element
* Save per property
* Reload correctly
* Preserve unsupported style values safely
* Migrate older appearance configuration where necessary

Changing widget style must not destroy another style’s saved configuration.

Switching back to a previously edited style must restore its settings.

Reset options must support:

* Reset property
* Reset selected element
* Reset selected widget style
* Reset complete widget appearance

Do not implement only one destructive global reset.

---

# 17. Validation Requirements

Every configurable property must be validated.

Examples:

* Width cannot be negative.
* Height cannot be negative.
* Opacity must remain between 0 and 1 or 0% and 100%.
* Border radius must remain within supported limits.
* Font size must remain readable.
* Padding and margins must remain within safe configurable limits.
* Image scale must remain within supported limits.
* Invalid CSS values must not be saved.
* Unsupported properties must not be applied to an element.

The UI must show valid ranges and units.

---

# 18. No Fake Controls

Every control shown in the panel must work.

Do not show:

* Disabled controls with no implementation
* Controls connected only to local temporary state
* Controls that do not update the preview
* Controls that do not persist
* Controls that affect the wrong element
* Controls that reset after reload
* Controls that are ignored by OBS output

If a property is not supported, do not show it.

---

# 19. Testing Requirements

Every implementation or bug fix must include automated or clearly documented regression verification.

For each editable element, verify:

1. The selected property changes the intended element.
2. Unrelated elements remain unchanged.
3. Other widget instances remain unchanged.
4. Other widget styles remain unchanged.
5. The value appears in live preview.
6. The value saves correctly.
7. The value reloads correctly.
8. The value appears in pop-out preview.
9. The value appears in OBS output where applicable.
10. No console errors are introduced.
11. No TypeScript errors are introduced.
12. No invalid CSS is produced.

Required regression examples:

> Changing the main widget border radius must not change internal cards.

> Changing stat card background color must not change the widget background.

> Changing title font size must not change value or label font sizes.

> Changing image size must not change the image container size unless explicitly linked.

> A widget style without images must not display image controls.

> Changing from a style with images to a style without images must immediately remove image controls.

> Settings for one widget style must remain saved when switching to another style.

---

# 20. Performance Requirements

The editor must remain responsive even when a widget has many editable elements.

Avoid:

* Re-rendering every widget on every property change
* Rebuilding the entire schema unnecessarily
* Saving to the backend on every slider movement
* Deep cloning the entire application state
* Recalculating unrelated widgets
* Re-rendering all control groups when only one value changes

Use:

* Memoized schemas
* Scoped state selectors
* Debounced persistence
* Immediate local preview updates
* Batched save operations
* Immutable targeted updates

---

# 21. Accessibility Requirements

Editor controls must include:

* Clear labels
* Keyboard support
* Visible focus states
* Numeric inputs where appropriate
* Slider and manual input pairing
* Accessible color controls
* Tooltips for complex properties
* Reset control labels
* Unit labels

Do not rely only on icons.

---

# 22. Required Development Workflow

For every task, follow this exact sequence.

## Phase 1: Investigation

Report:

```md
## Investigation

### Selected widget
...

### Selected widget style
...

### Relevant files
- ...

### Existing element structure
- ...

### Existing configuration flow
...

### Root cause
...

### Unsupported or missing capabilities
...

### Minimal safe solution
...

### Regression risks
...
```

## Phase 2: Implementation Plan

Report:

```md
## Implementation Plan

### Files to change
- `path/to/file`
  - Exact purpose

### Schema changes
...

### State changes
...

### Rendering changes
...

### Persistence changes
...

### Tests to add
...

### Protected behavior
...
```

## Phase 3: Implementation

Make only the required changes.

Do not modify unrelated features.

## Phase 4: Verification

Report:

```md
## Verification

### Files changed
- ...

### Controls implemented
- ...

### Conditional controls verified
- ...

### Element isolation verified
- ...

### Persistence verified
- ...

### Preview verified
- ...

### OBS rendering verified
- ...

### Tests performed
- ...

### Remaining risks
- ...
```

---

# 23. Stop Conditions

Stop and clearly report the issue before editing when:

* The element structure is unclear.
* The selected widget has no stable element identifiers.
* The preview and OBS renderer use different implementations.
* The current configuration cannot safely support element-level settings.
* A database migration is required.
* Existing saved appearance data may be lost.
* A requested property cannot be supported by the current rendering system.
* The task requires a large architectural rewrite.
* Authentication or permissions may be affected.
* External services or credentials are unavailable.
* The result cannot be verified.

Do not hide uncertainty.

Do not claim unsupported behavior works.

---

# 24. Scope Protection

For each task:

* Change only the selected widget or shared infrastructure strictly required for the task.
* Do not refactor unrelated widgets.
* Do not redesign existing UI unless explicitly requested.
* Do not add new dependencies without approval.
* Do not replace working architecture because another solution appears cleaner.
* Do not remove functionality to simplify the implementation.
* Do not create a second appearance system.
* Do not duplicate schemas.
* Do not hardcode controls separately inside every panel.
* Do not use temporary mock implementations.
* Do not leave unfinished TODOs while claiming completion.

---

# 25. Final Acceptance Criteria

The appearance editor is considered correct only when:

* Every widget style declares its own editable elements.
* Every visible editable element has a stable identifier.
* Every element can expose its own applicable styling controls.
* Advanced Mode can independently control every supported element.
* Width, height, position, spacing, shape, colors, typography, images, borders, and effects work where applicable.
* Image controls only appear for image-capable elements.
* Text controls only appear for text-capable elements.
* Layout controls only appear for layout-capable elements.
* Changing one element does not affect another.
* Changing one widget does not affect another.
* Changing one style does not affect another.
* Simple Mode and Advanced Mode use the same underlying configuration.
* Preview, saved state, pop-out preview, and OBS output remain synchronized.
* All displayed controls are fully functional.
* Saved appearance settings reload without losing values.
* Regression tests protect against style leakage.
* No TypeScript, console, rendering, or persistence errors remain.

The goal is not to show every control everywhere.

The goal is to provide every relevant control for every supported element while hiding controls that do not apply.