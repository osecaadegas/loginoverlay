# Widget Studio v2

Widget Studio v2 is the new appearance-customization boundary for Streamers Center. It intentionally does not edit the existing production overlay widgets until those widgets are rebuilt around a manifest, schema, scoped styling, and shared renderer contract.

## Goals

- Keep every legacy OBS widget operational.
- Hide legacy widgets from `/overlay-center/appearance`.
- Register new customizable widgets through manifests.
- Generate editor controls from each widget schema.
- Use the same renderer for editor preview and runtime output.
- Store versioned settings as JSON, not one column per visual property.
- Scope all new widget styling to the widget instance.

## Legacy Isolation

The existing Overlay Center widget registry now marks runtime widgets as:

```js
appearanceEditorVersion: "legacy"
supportsAppearanceStudio: false
```

This is a compatibility flag only. It does not remove their renderer, config panel, defaults, routes, data flow, or OBS behavior. Existing widgets continue to run in Overlay previews, OBS browser sources, Bonus Hunt, Slot Requests, Giveaways, Tournaments, Alerts, Chat, Games, and other existing URLs.

## Studio Page

The `/overlay-center/appearance` route now renders `WidgetStudioV2`.

The page contains:

- Studio heading and explanation.
- Widget categories.
- Search.
- A Studio-ready widget list.
- Live preview.
- Schema-generated controls.
- Apply, Save Draft, Publish, Reset, Undo, Redo, Copy, and Paste actions.
- Empty states for future widgets.

Legacy widgets are intentionally hidden from this page.

## Runtime Structure

```text
src/
  widgets/
    registry/
      widgetRegistry.js
      widgetTypes.js
      widgetValidation.js
    shared/
      settings/
        settingTypes.js
        settingsResolver.js
    statistic-card-v2/
      defaults.js
      documentation.md
      index.js
      manifest.js
      migrations.js
      mockData.js
      renderer.jsx
      schema.js
      styles.module.css
```

## Settings Hierarchy

`resolveWidgetSettings` merges settings in this order:

1. System defaults.
2. Theme defaults.
3. Widget defaults.
4. User widget settings.
5. Widget instance settings.
6. Temporary preview settings.

The merged result is validated against the widget schema before rendering.

## Persistence Shape

Studio v2 settings are stored under `overlay_state.state.widgetStudioV2`:

```json
{
  "schemaVersion": 1,
  "drafts": {
    "statistic-card-v2:default": {
      "schemaVersion": 1,
      "widgetId": "statistic-card-v2",
      "widgetVersion": 2,
      "instanceId": "default",
      "mode": "draft",
      "settings": {},
      "migrationHistory": [],
      "updatedAt": ""
    }
  },
  "published": {},
  "instances": {}
}
```

No legacy appearance records are deleted or modified by this shell.

## Current Studio Widgets

- `statistic-card-v2`: reference implementation for schema-generated controls, scoped CSS variables, preview/runtime renderer reuse, validation, and isolated instances.

