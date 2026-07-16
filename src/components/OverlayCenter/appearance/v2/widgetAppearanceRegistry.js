export const APPEARANCE_ENGINE_V2_WIDGETS = Object.freeze(['bh_stats', 'bonus_hunt']);

const COMMON_CAPABILITIES = Object.freeze({
  surface: ['surface', 'secondarySurface', 'elevatedSurface', 'opacity'],
  border: ['border', 'borderWidth', 'radius'],
  shadow: ['shadow', 'glow'],
  shape: ['rootRadius', 'cardRadius', 'badgeRadius'],
  typography: ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight'],
  spacing: ['padding', 'gap', 'density'],
  progress: ['progressBackground', 'progressFill'],
  image: ['imageSize', 'imageRadius'],
  stateColor: ['positive', 'negative', 'warning'],
  scale: ['widgetScale'],
});

export const widgetAppearanceRegistry = Object.freeze({
  bh_stats: Object.freeze({
    id: 'bh_stats',
    widgetType: 'bh_stats',
    label: 'BH Stats',
    category: 'bonus_hunt',
    renderer: 'registered-widget-component',
    previewRenderer: 'registered-widget-component',
    schemaVersion: 1,
    migrationStatus: 'pilot',
    defaultStyleId: 'default',
    defaultAppearance: Object.freeze({
      material: 'matte',
      primaryColor: '#14d8d8',
      shape: 'rounded',
      density: 'standard',
      scale: 1,
      textSize: 'standard',
    }),
    safeRanges: Object.freeze({
      scale: [0.75, 1.5],
      rootRadius: [0, 80],
      cardRadius: [0, 40],
      rootPadding: [6, 28],
      cardPadding: [4, 22],
      fontSize: [10, 22],
      shadowIntensity: [0, 0.55],
      glowIntensity: [0, 0.45],
      blurStrength: [0, 18],
    }),
    unsupportedProperties: Object.freeze([
      'motion.durationDistance',
      'layout.carouselDistance',
      'image.objectFit',
    ]),
    responsive: Object.freeze({
      safeToResize: true,
      aspectRatioLocked: false,
      minWidth: 260,
      minHeight: 130,
      maxWidth: 900,
      maxHeight: 700,
    }),
    elements: Object.freeze({
      container: Object.freeze({
        label: 'Entire widget',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing', 'scale', 'typography'],
        cssVariables: ['--widget-surface', '--widget-text', '--widget-radius'],
      }),
      statsCard: Object.freeze({
        label: 'Stat cards',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing'],
        cssVariables: ['--widget-card-bg', '--widget-border-color'],
      }),
      label: Object.freeze({
        label: 'Stat labels',
        kind: 'text',
        capabilities: ['typography'],
        cssVariables: ['--widget-muted'],
      }),
      value: Object.freeze({
        label: 'Stat values',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
        cssVariables: ['--widget-text', '--widget-positive', '--widget-negative'],
      }),
      progressBar: Object.freeze({
        label: 'Progress bar',
        kind: 'progress',
        capabilities: ['progress', 'shape'],
        cssVariables: ['--widget-progress', '--widget-progress-bg'],
      }),
      bestStat: Object.freeze({
        label: 'Best value',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
      }),
      worstStat: Object.freeze({
        label: 'Worst value',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
      }),
    }),
    previewSampleData: Object.freeze({
      needsAllWidgets: true,
      source: 'previewWidgetSamples.applyPreviewWidgetSamples',
    }),
  }),
  bonus_hunt: Object.freeze({
    id: 'bonus_hunt',
    widgetType: 'bonus_hunt',
    label: 'Bonus Hunt',
    category: 'bonus_hunt',
    renderer: 'registered-widget-component',
    previewRenderer: 'registered-widget-component',
    schemaVersion: 1,
    migrationStatus: 'pilot',
    defaultStyleId: 'v12_classic_sr',
    defaultAppearance: Object.freeze({
      material: 'matte',
      primaryColor: '#14d8d8',
      shape: 'rounded',
      density: 'standard',
      scale: 1,
      textSize: 'standard',
    }),
    safeRanges: Object.freeze({
      scale: [0.75, 1.35],
      rootRadius: [0, 64],
      cardRadius: [0, 32],
      rootPadding: [4, 24],
      cardPadding: [4, 20],
      fontSize: [11, 22],
      slotImageHeight: [80, 240],
      shadowIntensity: [0, 0.55],
      glowIntensity: [0, 0.38],
      blurStrength: [0, 16],
    }),
    unsupportedProperties: Object.freeze([
      'motion.carouselDistance',
      'motion.flipTransform',
      'layout.rowTransform',
      'layout.absolutePosition',
    ]),
    animationSensitiveProperties: Object.freeze([
      'transform',
      'animationName',
      'carouselDistance',
      'flipDuration',
    ]),
    responsive: Object.freeze({
      safeToResize: true,
      aspectRatioLocked: false,
      minWidth: 260,
      minHeight: 360,
      maxWidth: 900,
      maxHeight: 1080,
    }),
    elements: Object.freeze({
      container: Object.freeze({
        label: 'Entire widget',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing', 'scale', 'typography'],
        cssVariables: ['--bht-text', '--bht-card-radius'],
      }),
      headerContainer: Object.freeze({
        label: 'Header',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing'],
        legacyElement: 'header',
        cssVariables: ['--bht-header-bg', '--bht-header-accent'],
      }),
      headerTitle: Object.freeze({
        label: 'Header title',
        kind: 'text',
        capabilities: ['typography'],
        legacyElement: 'huntTitle',
      }),
      mainStatsContainer: Object.freeze({
        label: 'Main stats',
        kind: 'surface',
        capabilities: ['surface', 'border', 'spacing'],
      }),
      statCell: Object.freeze({
        label: 'Stat cards',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shape', 'spacing'],
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
      slotListContainer: Object.freeze({
        label: 'Slot list',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing'],
        legacyElement: 'bonusCard',
      }),
      slotRow: Object.freeze({
        label: 'Slot rows',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shape', 'spacing', 'stateColor'],
      }),
      slotImage: Object.freeze({
        label: 'Slot image',
        kind: 'image',
        capabilities: ['image', 'shape'],
      }),
      slotTitle: Object.freeze({
        label: 'Slot title',
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
        capabilities: ['surface', 'border', 'shape', 'spacing'],
        legacyElement: 'footer',
      }),
      footerTotalValue: Object.freeze({
        label: 'Total payout',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
        legacyElement: 'footer',
      }),
      requestsSectionContainer: Object.freeze({
        label: 'Slot requests',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shape', 'spacing'],
      }),
    }),
    previewSampleData: Object.freeze({
      needsAllWidgets: false,
      source: 'previewWidgetSamples.applyPreviewWidgetSamples',
    }),
  }),
});

export function getWidgetAppearanceCapability(widgetType) {
  return widgetAppearanceRegistry[widgetType] || null;
}

export function isWidgetAppearanceV2Enabled(widgetType) {
  return APPEARANCE_ENGINE_V2_WIDGETS.includes(widgetType);
}

export function getWidgetAppearanceV2Elements(widgetType) {
  const capability = getWidgetAppearanceCapability(widgetType);
  if (!capability) return [];
  return Object.entries(capability.elements || {}).map(([id, element]) => ({
    id,
    ...element,
    controls: controlsForCapabilities(element.capabilities || []),
    safeRanges: capability.safeRanges || {},
  }));
}

export function validateWidgetAppearanceRegistry(registry = widgetAppearanceRegistry) {
  const errors = [];
  for (const [id, entry] of Object.entries(registry || {})) {
    if (id !== entry.id) errors.push(`${id}: id mismatch`);
    if (!entry.widgetType) errors.push(`${id}: missing widgetType`);
    if (!entry.renderer || !entry.previewRenderer) errors.push(`${id}: missing renderer references`);
    if (!entry.schemaVersion) errors.push(`${id}: missing schema version`);
    if (!entry.elements || !Object.keys(entry.elements).length) errors.push(`${id}: missing elements`);
    for (const [elementId, element] of Object.entries(entry.elements || {})) {
      if (!element.label) errors.push(`${id}.${elementId}: missing label`);
      if (!Array.isArray(element.capabilities) || element.capabilities.length === 0) errors.push(`${id}.${elementId}: missing capabilities`);
      for (const capability of element.capabilities || []) {
        if (!COMMON_CAPABILITIES[capability]) errors.push(`${id}.${elementId}: unknown capability ${capability}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function controlsForCapabilities(capabilities = []) {
  const controls = new Set();
  for (const capability of capabilities) {
    if (capability === 'surface') ['background', 'opacity'].forEach(control => controls.add(control));
    if (capability === 'border') ['borderColor', 'borderWidth', 'radius'].forEach(control => controls.add(control));
    if (capability === 'shadow') ['shadowBlur', 'shadowOpacity'].forEach(control => controls.add(control));
    if (capability === 'shape') controls.add('radius');
    if (capability === 'typography') ['fontFamily', 'fontSize', 'fontWeight', 'textColor', 'lineHeight'].forEach(control => controls.add(control));
    if (capability === 'spacing') ['padding', 'gap'].forEach(control => controls.add(control));
    if (capability === 'progress') ['background', 'fillColor', 'radius'].forEach(control => controls.add(control));
    if (capability === 'image') ['imageSize', 'radius'].forEach(control => controls.add(control));
    if (capability === 'stateColor') ['textColor', 'accentColor'].forEach(control => controls.add(control));
  }
  return [...controls];
}
