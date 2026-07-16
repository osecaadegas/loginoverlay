# Widget Migration Status

Status values:

- `Done` means code exists and automated evidence is available.
- `Partial` means code exists but browser/OBS evidence is still pending.
- `Pending` means not started.

| Widget | Style | Inventory | Original Registered | Shared Logic Identified | Shared Logic Extracted | Editable Copy | Visual Parity | CSS Isolated | Defaults | Capabilities | Elements | Quick Editor | Advanced Editor | Tests | OBS Verified | Production Enabled | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Slot Requests | `v3_compact` | Done | Done | Done | Done | n/a | n/a | Legacy global CSS | n/a | n/a | n/a | Existing | Existing | Done | Pending | Yes | Remains production fallback. |
| Slot Requests | `v3_compact_editable` | Done | n/a | Done | Done | Done | Partial | Done | Done | Done | Done | Done | Done | Done | Pending | No | Hidden in production behind `appearanceEditablePilot`. |
| Bonus Hunt | all | Existing audit | Done | Existing audit | Partial from previous V2 work | Pending per style | Pending | Pending | Partial | Partial | Partial | Existing V2 | Existing V2 | Existing V2 | Pending | Existing legacy only | Do not expand until Slot Requests pilot is reviewed. |
| Giveaways | all | Existing audit | Done | Existing audit | Previous V2 work | Pending per style | Pending | Pending | Partial | Partial | Partial | Existing V2 | Existing V2 | Existing V2 | Pending | Existing legacy only | Not part of this pilot pass. |
| Remaining widgets | all | Existing audit | Done | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Existing legacy only | Migrate one style at a time. |

## Evidence

- `npm.cmd run validate:widgets`: passed.
- `npm.cmd run test:widget-pilot`: passed.

## Pilot Files

- Shared data: `src/components/OverlayCenter/widgets/slot-requests/shared/useSlotRequestsData.js`
- Shared carousel: `src/components/OverlayCenter/widgets/slot-requests/shared/useSlotRequestCarousel.js`
- Legacy presentation: `src/components/OverlayCenter/widgets/SlotRequestsCompactOverlay.jsx`
- Editable presentation: `src/components/OverlayCenter/widgets/slot-requests/styles/compact-editable/SlotRequestsCompactEditable.jsx`
- Isolated CSS: `src/components/OverlayCenter/widgets/slot-requests/styles/compact-editable/SlotRequestsCompactEditable.module.css`
- Contract registry: `src/components/OverlayCenter/widgets/editorReadyWidgetRegistry.js`

## Remaining Evidence Before Enabling Production

- Capture original vs editable default screenshots.
- Verify editor focused preview.
- Verify actual OBS browser-source route.
- Check console and network errors.
- Confirm no duplicate realtime channels during runtime.
