# Editor Workspace

The existing `/editor` route uses `WidgetEditorPage.jsx`. The workspace is a UI layer around the existing Better widget controls, registry, saved layouts and OBS renderer. It does not replace the Overlay Center appearance infrastructure.

## Responsibilities

- `WidgetEditorPage.jsx`: draft history, canvas interactions, serialized saves, publication, source subscription and responsive panels.
- `OverlayBuildFolders.jsx`: searchable build picker and existing create/duplicate/rename actions. Build summaries load only when opened.
- `EditorWidgetPicker.jsx`: searchable catalogue backed by `BETTER_WIDGET_REGISTRY`.
- `EditorInspector.jsx`: frame controls and Simple/Advanced navigation around one mounted `BetterWidgetControls` instance.
- `EditorControlScope.jsx`: section visibility, cross-category search and collapse state. Outside this provider, existing control panels retain their original behavior.
- `editorWidgetMetadata.js`: per-widget categories, search terms, source routes and Simple section titles. This is navigation metadata, not a second configuration schema.
- `editorPreferences.js`: account/build-scoped local UI preferences, including selected widget, zoom, snapping, panel visibility, and per-instance mode/tab/sections. These preferences never trigger database writes.
- `EditorWorkspace.css`: workspace-only styling; widget rendering styles are unchanged.

## Compatibility

Widget configuration remains instance-scoped in the existing draft/published JSON. Existing IDs, permissions, URLs, live source adapters, validation and OBS rendering remain in use. Appearance properties still belong to the existing appearance infrastructure.

Normalized layouts carry a small derived `preview` array containing up to 16 visible non-background frame rectangles. The build list selects this summary instead of downloading every build's widget configuration. Older layouts without the summary use a folder icon until their next save. No database migration is required.

Fit content to frame is opt-in for Bonus Hunt, Chat and Giveaway. It keeps their existing content dimension keys in sync when resizing. Bonus Hunt's fit height respects the current renderer's 980px limit. Other widget controls retain their own sizing behavior.

Draft save failures retain the canvas and unsaved values. Explicit publish/reset/revert/link operations serialize after draft saves and disable conflicting edits. Reset, revert, link regeneration and widget deletion require confirmation. Published layouts remain separate from draft edits.

If the owner-row publication write succeeds but the public OBS write fails, the service returns the committed owner version with the error. The editor retains that version so Retry can complete publication without bypassing the existing optimistic concurrency check.

## Extending

Register new widgets through the existing registry and renderer, then add navigation metadata here. Add controls to the widget's existing sections, using descriptive labels so search can find them. Keep Simple limited to common settings; Advanced retains the full control surface. Do not introduce parallel config state, universal appearance controls or mock production adapters.

Groups, multi-selection and version history should be separate changes with explicit persistence and undo semantics. This change does not introduce those features.

## Verification

Run `node scripts/test-editor-control-scope.mjs`, `npm.cmd run test:widget-control-categories`, `npm.cmd run test:editor-builds`, `npm.cmd run validate:widgets` and `npm.cmd run build`.

With the existing Vite server running, run `node scripts/test-editor-builds-browser.mjs`. Set `TEST_BASE_URL` when not using port 3010; set `EDITOR_SCREENSHOT` to a PNG path for desktop/mobile screenshots. The browser test substitutes the database in the test page only and does not modify production records.

## File Inventory

Created:
- `src/components/OverlayCenter/editor/EditorControlScope.jsx`
- `src/components/OverlayCenter/editor/EditorInspector.jsx`
- `src/components/OverlayCenter/editor/EditorWidgetPicker.jsx`
- `src/components/OverlayCenter/editor/EditorWorkspace.css`
- `src/components/OverlayCenter/editor/editorPreferences.js`
- `src/components/OverlayCenter/editor/editorWidgetMetadata.js`
- `scripts/test-editor-control-scope.mjs`
- `DOCs/EDITOR_WORKSPACE.md`

Modified:
- `src/components/OverlayCenter/editor/WidgetEditorPage.jsx`
- `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`
- `src/components/OverlayCenter/editor/betterWidgetRegistry.jsx`
- `src/components/OverlayCenter/editor/OverlayBuildFolders.jsx`
- `src/services/betterOverlayService.js`
- `scripts/helpers/overlay-build-test-db.mjs`
- `scripts/test-editor-builds-browser.mjs`

No migrations, dependencies, environment variables or production records were changed.
