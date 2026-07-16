# Widget Migration Checklist

Use this checklist for every widget style migration.

## 1. Inventory

- Identify widget ID, label, category, style IDs, and `styleConfigKey`.
- Identify main dispatcher and presentation components.
- Identify CSS files, global class names, inline styles, and CSS variables.
- Identify Supabase, API, Twitch, StreamElements, Spotify, or other live data access.
- Identify timers, animation state, carousel state, and calculations.
- Identify OBS route and editor preview path.
- Identify existing saved settings and migration risks.

## 2. Preserve Original

- Original style remains registered.
- Original style remains the production fallback.
- Original CSS is not removed.
- Existing OBS URLs still work.
- Existing settings still resolve.

## 3. Extract Shared Logic

- Move data loading into a shared hook.
- Move reusable calculations into shared helpers.
- Move carousel/timer behavior into shared hooks if multiple presentations need it.
- Confirm original presentation still renders from shared data.
- Confirm no duplicate Supabase or socket listeners were introduced.

## 4. Create Editable Presentation

- Create editor-ready presentation component.
- Use the shared data hook and shared timers.
- Use CSS Modules or strict prefixed classes.
- Add `data-widget-id`, `data-style-id`, and `data-widget-element`.
- Match the original visual defaults before expanding controls.

## 5. Add Style Contract

- Defaults created.
- Capabilities created.
- Editable elements created.
- Quick Editor schema created.
- Advanced Editor schema created.
- Preview data created.
- Validation created.
- Migration created.
- Safe ranges declared.
- OBS safety rules declared.
- Fallback style declared.

## 6. Registry

- Add legacy style entry to `editorReadyWidgetRegistry.js`.
- Add editable style entry to `editorReadyWidgetRegistry.js`.
- Add editor-facing bridge in `widgetAppearanceRegistry.js`.
- Keep editable style behind a feature flag until verified.

## 7. Editor

- Style selector shows only enabled styles.
- Quick Editor displays only supported controls.
- Advanced Editor displays only supported elements and controls.
- Settings remain isolated by widget, style, and element.
- Unsupported values are filtered or ignored.

## 8. Verification

- `npm.cmd run validate:widgets`
- `npm.cmd run test:widget-pilot`
- relevant appearance tests
- production build
- editor preview check
- OBS route check
- console check
- no duplicate network calls

## 9. Evidence

Do not mark a migration complete without evidence for:

- original still works
- shared logic used by both styles
- visual parity for editable defaults
- CSS isolation
- Quick Editor controls connected
- Advanced Editor controls connected
- preview and OBS match
- build passes
