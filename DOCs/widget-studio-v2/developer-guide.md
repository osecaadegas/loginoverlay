# Creating a Widget Studio v2 Widget

Use this guide when creating a new customizable widget. The appearance page should not need bespoke form code for each widget.

## Development Flow

1. Copy the `src/widgets/statistic-card-v2` structure.
2. Create the renderer.
3. Define the manifest.
4. Define the settings schema.
5. Add defaults from the schema.
6. Add mock data states.
7. Add migrations.
8. Add documentation.
9. Register the widget in `src/widgets/registry/widgetRegistry.js`.
10. Add tests.

## Manifest Contract

A Studio widget manifest must include:

- `id`
- `name`
- `version`
- `category`
- `description`
- `renderer`
- `previewRenderer`
- `supportsAppearanceStudio: true`
- `appearanceEditorVersion: "studio-v2"`
- `defaultSettings`
- `settingsSchema`
- `dataSchema`
- `validate(settings)`
- `responsive`
- `migrations`
- `documentation`
- `featureFlags`
- `deprecated`

The preview renderer should normally be the same component as the runtime renderer. Preview-specific behavior should come from mock data, not duplicated visual code.

## Schema Settings

Settings are declared with `defineSetting`.

Each setting should include:

- `key`
- `type`
- `label`
- `description`
- `defaultValue`
- `group`
- `target`
- `cssVariable` when the renderer consumes it through scoped CSS variables
- `min`, `max`, `step`, and `unit` for numeric controls
- `options` for select controls
- `responsive` when future responsive overrides are safe

Example:

```js
defineSetting({
  key: "typography.headerFontSize",
  type: SETTING_TYPES.NUMBER,
  label: "Header font size",
  description: "Changes only the header text.",
  defaultValue: 28,
  min: 10,
  max: 100,
  step: 1,
  unit: "px",
  group: COMMON_SETTING_GROUPS.TYPOGRAPHY,
  target: "header",
  cssVariable: "--my-widget-header-font-size",
  responsive: true
})
```

## Scoped Styling Rules

New widgets must avoid broad selectors.

Use:

- CSS modules.
- A root `data-widget-id`.
- A root `data-widget-instance`.
- Widget-specific CSS variables.
- Element `data-widget-element` attributes.

Do not use global selectors such as `.widget h2`, `.card span`, or `.overlay div`.

## Preview And Runtime

The same renderer should receive:

- `settings`
- `data`
- `instanceId`

The editor supplies mock data. Runtime integrations can supply real data later without changing the visual schema.

## Validation

Use `validateWidgetManifest` for manifests and `validateWidgetSettings` for settings. Unsupported or invalid values should be corrected to schema defaults or clamped to safe ranges.

## Migration Rules

Migrations must be additive and versioned. Preserve unknown legacy records unless they are explicitly mapped and validated. Never delete user settings during a widget rollout.

