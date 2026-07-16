“Codex and developers must read this document before creating, copying, migrating or modifying any widget.”

# Widget Creation Standard

This standard exists because Streamers Center widgets are OBS browser-source components with live data, animations, and user settings. A widget style may be rebuilt for the visual editor, but widget business logic must stay shared.

## Required Folder Structure

Use the existing repository structure unless a widget already has a more specific folder.

```text
src/components/OverlayCenter/widgets/
  WidgetDispatcher.jsx
  widgetName/
    shared/
      useWidgetData.js
      widgetCalculations.js
      widgetPreviewData.js
    styles/
      style-original/
        WidgetStyleOriginal.jsx
        widgetStyleOriginal.css
      style-editable/
        WidgetStyleEditable.jsx
        WidgetStyleEditable.module.css
        widgetStyleEditable.defaults.js
        widgetStyleEditable.capabilities.js
        widgetStyleEditable.elements.js
        widgetStyleEditable.quickSchema.js
        widgetStyleEditable.advancedSchema.js
        widgetStyleEditable.previewData.js
        widgetStyleEditable.migrations.js
```

## Required Contracts

Every editor-ready style must declare:

- `widgetId`
- `styleId`
- `displayName`
- `version`
- component reference
- default settings
- editable elements
- capabilities
- Quick Editor schema
- Advanced Editor schema
- preview sample data
- settings validator
- settings migration
- CSS variable mapping
- OBS-safe defaults
- minimum and maximum dimensions
- responsive behavior
- fallback behavior

The runtime contract registry lives at:

- `src/components/OverlayCenter/widgets/editorReadyWidgetRegistry.js`

The existing V2 appearance registry remains the editor-facing bridge:

- `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js`

## Business Logic Separation

Dispatcher and shared files may own:

- Supabase queries
- API calls
- realtime subscriptions
- Twitch listeners
- StreamElements listeners
- Spotify listeners
- timers and shared carousel state
- calculations
- normalized preview data

Presentation components may own:

- markup
- class names
- scoped variables
- element data attributes
- CSS module styles
- rendering of already-normalized props

Presentation components must not open database, chat, or socket listeners.

## Naming Conventions

- Widget IDs use existing `widget_type` values, such as `slot_requests`.
- Style IDs must be stable and explicit, such as `v3_compact_editable`.
- Legacy styles keep their existing IDs.
- Editor-ready CSS should use CSS Modules or strongly prefixed classes.
- Editable elements use friendly IDs matching the registry, such as `slotImage`, `requestCard`, and `viewerName`.

## CSS Isolation

Allowed:

- CSS Modules.
- Strict widget-prefixed classes.
- `data-widget-id`, `data-style-id`, and `data-widget-element` attributes.
- Scoped CSS variables on the widget root.

Forbidden:

- Generic global classes such as `.title`, `.header`, `.card`, `.container`, `.value`, or `.image`.
- Writing editor style variables to `:root`.
- Global selectors that can affect the website or unrelated widgets.
- Separate preview-only CSS that does not load in OBS.

## Quick Editor Registration

Quick Editor sections must be generated from style capabilities. A style must only expose controls it supports.

Examples:

- A carousel style may expose `carouselSpeed`.
- A non-carousel style must not expose `carouselSpeed`.
- A style without images must not expose image size, image fit, or image visibility.

Beginner controls use simple labels:

- Text size: Small, Normal, Large.
- Image size: Hidden, Small, Medium, Large.
- Corners: Square, Slightly rounded, Rounded, Pill where supported.
- Shadow: None, Soft, Medium, Strong.
- Glow: Off, Subtle, Medium, Strong.
- Carousel speed: Slow, Normal, Fast.

## Advanced Editor Registration

Advanced Editor controls must also come from the same style contract. It may expose exact values only for supported elements.

Each advanced schema row must reference an element that exists in `editableElements`.

## Settings and OBS Flow

Settings are versioned and isolated by:

- user
- widget
- style
- element

Preview can update immediately, but publishing to OBS must remain an explicit action.

Keep these states separate:

- default settings
- unsaved editor state
- saved draft
- published OBS settings

## Validation

Run before merging widget architecture changes:

```bash
npm.cmd run validate:widgets
npm.cmd run test:widget-pilot
npm.cmd run test:appearance-v2
npm.cmd run build
```

`npm.cmd run validate:widgets` must fail when:

- widget IDs are duplicated
- style IDs are duplicated
- editable styles miss defaults, elements, schemas, validation, migration, or preview data
- unknown capabilities are declared
- quick or advanced schemas reference unsupported controls
- legacy styles are marked editable

## Prohibited Patterns

- No duplicated API logic per style.
- No duplicated Supabase queries per style.
- No duplicated Twitch, StreamElements, Spotify, or slot-detection listeners per style.
- No direct database access inside presentation components.
- No global generic CSS classes.
- No unsupported hardcoded appearance values in editable styles.
- No raw arbitrary CSS in Quick Editor.
- No hidden fallback to another widget schema.
- No separate preview styling implementation.
- No removal of legacy styles during migration.
- No automatic production switch to an editable pilot style.

## Adding a New Widget

1. Register the production widget in `builtinWidgets.js`.
2. Put data, calculations, timers, and listeners in shared files.
3. Keep the original presentation as the production fallback.
4. Add an editor-ready presentation only when shared logic is extracted.
5. Add defaults, capabilities, elements, schemas, preview data, validation, and migration.
6. Register the style in `editorReadyWidgetRegistry.js`.
7. Bridge it into `widgetAppearanceRegistry.js`.
8. Add tests.
9. Verify preview and OBS use the same component and resolver.

## Adding a New Style

1. Keep the original style available.
2. Reuse the shared data adapter.
3. Create isolated presentation CSS.
4. Match original defaults before enabling custom controls.
5. Add the style behind a feature flag until visual parity and OBS verification pass.
6. Validate and test.

## Legacy Deprecation

Legacy styles may only be deprecated after:

- editor-ready style visual parity passes
- OBS output matches preview
- existing user settings migrate safely
- production flag is enabled gradually
- rollback path remains available
