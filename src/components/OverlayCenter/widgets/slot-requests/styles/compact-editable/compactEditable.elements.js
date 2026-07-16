export const compactEditableElements = Object.freeze({
  container: Object.freeze({
    label: 'Entire widget',
    kind: 'surface',
    capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing', 'scale', 'typography'],
    cssVariables: ['--srce-bg', '--srce-text', '--srce-accent'],
  }),
  requestCard: Object.freeze({
    label: 'Request card',
    kind: 'surface',
    capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing', 'stateColor'],
    cssVariables: ['--srce-card-bg', '--srce-card-radius'],
  }),
  position: Object.freeze({
    label: 'Position badge',
    kind: 'badge',
    capabilities: ['surface', 'border', 'shape', 'typography', 'stateColor'],
    cssVariables: ['--srce-accent'],
  }),
  slotImage: Object.freeze({
    label: 'Slot image',
    kind: 'image',
    capabilities: ['image', 'shape', 'border'],
    cssVariables: ['--srce-img-size', '--srce-img-radius'],
  }),
  slotTitle: Object.freeze({
    label: 'Slot name',
    kind: 'text',
    capabilities: ['typography'],
    cssVariables: ['--srce-title'],
  }),
  viewerName: Object.freeze({
    label: 'Viewer name',
    kind: 'text',
    capabilities: ['typography'],
    cssVariables: ['--srce-muted'],
  }),
  footer: Object.freeze({
    label: 'Progress dots',
    kind: 'surface',
    capabilities: ['surface', 'spacing', 'stateColor'],
    cssVariables: ['--srce-accent'],
  }),
  emptyState: Object.freeze({
    label: 'Empty state',
    kind: 'surface',
    capabilities: ['surface', 'typography', 'spacing'],
    cssVariables: ['--srce-muted'],
  }),
});

export const compactEditableElementIds = Object.freeze(Object.keys(compactEditableElements));

export default compactEditableElements;
