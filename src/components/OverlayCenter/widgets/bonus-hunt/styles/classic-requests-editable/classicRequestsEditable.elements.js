export const classicRequestsEditableElements = Object.freeze({
  container: Object.freeze({
    label: 'Entire widget',
    kind: 'surface',
    capabilities: ['surface', 'border', 'shadow', 'shape', 'scale', 'typography'],
    cssVariables: ['--bht-text', '--bht-card-radius'],
  }),
  headerContainer: Object.freeze({
    label: 'Header',
    kind: 'surface',
    capabilities: ['surface', 'border', 'shadow', 'shape'],
    cssVariables: ['--bht-header-bg', '--bht-header-accent'],
  }),
  headerTitle: Object.freeze({
    label: 'Header title',
    kind: 'text',
    capabilities: ['typography'],
  }),
  mainStatsContainer: Object.freeze({
    label: 'Main stats',
    kind: 'surface',
    capabilities: ['surface', 'border'],
  }),
  statCell: Object.freeze({
    label: 'Stat cards',
    kind: 'surface',
    capabilities: ['surface', 'border', 'shape'],
  }),
  statLabel: Object.freeze({
    label: 'Stat labels',
    kind: 'text',
    capabilities: ['typography'],
  }),
  statValue: Object.freeze({
    label: 'Stat values',
    kind: 'text',
    capabilities: ['typography', 'stateColor'],
  }),
  slotCarouselContainer: Object.freeze({
    label: 'Slot carousel',
    kind: 'carousel',
    capabilities: ['surface', 'border', 'shadow', 'shape'],
  }),
  slotListContainer: Object.freeze({
    label: 'Bonus list',
    kind: 'surface',
    capabilities: ['surface', 'border', 'shadow', 'shape'],
  }),
  slotRow: Object.freeze({
    label: 'Bonus rows',
    kind: 'surface',
    capabilities: ['surface', 'border', 'shape', 'stateColor'],
  }),
  slotImage: Object.freeze({
    label: 'Slot images',
    kind: 'image',
    capabilities: ['shape', 'border'],
  }),
  slotTitle: Object.freeze({
    label: 'Slot names',
    kind: 'text',
    capabilities: ['typography'],
  }),
  progressBar: Object.freeze({
    label: 'Progress bar',
    kind: 'progress',
    capabilities: ['progress', 'shape'],
  }),
  footerContainer: Object.freeze({
    label: 'Footer',
    kind: 'surface',
    capabilities: ['surface', 'border', 'shape'],
  }),
  footerTotalValue: Object.freeze({
    label: 'Total payout',
    kind: 'text',
    capabilities: ['typography', 'stateColor'],
  }),
  requestsSectionContainer: Object.freeze({
    label: 'Requests panel',
    kind: 'surface',
    capabilities: ['surface', 'border', 'shape'],
  }),
  requestsHeader: Object.freeze({
    label: 'Requests title',
    kind: 'text',
    capabilities: ['typography'],
  }),
  requestsDescription: Object.freeze({
    label: 'Requests helper text',
    kind: 'text',
    capabilities: ['typography'],
  }),
  requestsEmpty: Object.freeze({
    label: 'Requests empty state',
    kind: 'surface',
    capabilities: ['surface', 'typography'],
  }),
});

export const classicRequestsEditableElementIds = Object.freeze(Object.keys(classicRequestsEditableElements));

export default classicRequestsEditableElements;
