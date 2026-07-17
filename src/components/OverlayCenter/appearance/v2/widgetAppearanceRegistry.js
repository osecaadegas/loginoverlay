import {
  getEditorReadyWidgetStyle,
  shouldExposeEditorReadyStyle,
} from '../../widgets/editorReadyWidgetRegistry.js';

export const APPEARANCE_ENGINE_V2_WIDGETS = Object.freeze(['bh_stats', 'rtp_stats', 'navbar', 'bonus_hunt', 'slot_requests', 'giveaway', 'spotify_now_playing']);

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

const QUICK_CAPABILITY_KEYS = Object.freeze([
  'colours',
  'multipleColours',
  'fonts',
  'fontSizes',
  'fontWeights',
  'textAlignment',
  'containers',
  'containerShapes',
  'borderRadius',
  'borders',
  'shadows',
  'glow',
  'glowIntensity',
  'opacity',
  'images',
  'imageSize',
  'imageShape',
  'imageFit',
  'imageVisibility',
  'spacing',
  'cardGap',
  'layoutDensity',
  'orientation',
  'carousel',
  'carouselSpeed',
  'carouselDirection',
  'carouselAutoplay',
  'carouselPauseOnHover',
  'animations',
  'animationSpeed',
  'animationIntensity',
  'entranceAnimation',
  'loopAnimation',
  'progressBar',
  'positiveNegativeColours',
  'statCards',
  'rows',
  'columns',
  'maximumVisibleItems',
  'transparentBackground',
  'barDimensions',
  'musicDisplayStyle',
]);

const QUICK_CAPABILITY_SET = new Set(QUICK_CAPABILITY_KEYS);

const QUICK_CONTROL_STYLE_REQUIREMENTS = Object.freeze({
  material: ['colours', 'containers', 'transparentBackground'],
  primaryColor: ['colours', 'positiveNegativeColours', 'progressBar'],
  accentColor: ['colours', 'multipleColours', 'positiveNegativeColours', 'progressBar'],
  fontFamily: ['fonts'],
  textSize: ['fontSizes'],
  boldText: ['fontWeights'],
  imageVisibility: ['images', 'imageVisibility'],
  imageSize: ['images', 'imageSize'],
  imageShape: ['images', 'imageShape'],
  imageFit: ['images', 'imageFit'],
  shape: ['containers', 'containerShapes', 'borderRadius', 'borders', 'progressBar'],
  density: ['spacing', 'layoutDensity'],
  scale: ['layoutDensity'],
  shadowStrength: ['shadows'],
  glowStrength: ['glow', 'glowIntensity'],
  carouselAutoplay: ['carousel', 'carouselAutoplay'],
  carouselSpeed: ['carousel', 'carouselSpeed'],
  carouselDirection: ['carousel', 'carouselDirection'],
  animationEnabled: ['animations', 'carousel'],
  animationSpeed: ['animations', 'animationSpeed', 'carouselSpeed'],
  animationIntensity: ['animations', 'animationIntensity'],
  barHeight: ['barDimensions'],
  maxWidth: ['barDimensions'],
  musicDisplayStyle: ['musicDisplayStyle'],
});

const QUICK_CONTROL_ELEMENT_REQUIREMENTS = Object.freeze({
  material: { wholeWidget: true },
  primaryColor: {
    capabilities: ['surface', 'border', 'shadow', 'shape', 'typography', 'progress', 'stateColor'],
    kinds: ['surface', 'text', 'badge', 'progress', 'carousel'],
    wholeWidget: true,
  },
  accentColor: {
    capabilities: ['surface', 'border', 'shadow', 'shape', 'typography', 'progress', 'stateColor'],
    kinds: ['surface', 'text', 'badge', 'progress', 'carousel'],
    wholeWidget: true,
  },
  fontFamily: { capabilities: ['typography'], kinds: ['text', 'badge'], wholeWidget: true },
  textSize: { capabilities: ['typography'], kinds: ['text', 'badge'], wholeWidget: true },
  boldText: { capabilities: ['typography'], kinds: ['text', 'badge'], wholeWidget: true },
  imageVisibility: { capabilities: ['image'], kinds: ['image'] },
  imageSize: { capabilities: ['image'], kinds: ['image'] },
  imageShape: { capabilities: ['image', 'shape'], kinds: ['image'] },
  imageFit: { capabilities: ['image'], kinds: ['image'] },
  shape: { capabilities: ['border', 'shape', 'progress'], kinds: ['badge', 'image', 'progress', 'carousel'], wholeWidget: true },
  density: { capabilities: ['spacing', 'scale'], wholeWidget: true },
  scale: { capabilities: ['scale'], wholeWidget: true },
  shadowStrength: { capabilities: ['shadow'], kinds: ['carousel'], wholeWidget: true },
  glowStrength: { capabilities: ['shadow'], kinds: ['carousel'], wholeWidget: true },
  carouselAutoplay: { kinds: ['carousel'], wholeWidget: true },
  carouselSpeed: { kinds: ['carousel'], wholeWidget: true },
  carouselDirection: { kinds: ['carousel'], wholeWidget: true },
  animationEnabled: { kinds: ['carousel'], wholeWidget: true },
  animationSpeed: { kinds: ['carousel'], wholeWidget: true },
  animationIntensity: { kinds: ['carousel'], wholeWidget: true },
  barHeight: { wholeWidget: true },
  maxWidth: { wholeWidget: true },
  musicDisplayStyle: { wholeWidget: true },
});

const QUICK_CONTROL_FALLBACK_ORDER = Object.freeze([
  'material',
  'primaryColor',
  'accentColor',
  'fontFamily',
  'textSize',
  'boldText',
  'imageVisibility',
  'imageSize',
  'imageShape',
  'imageFit',
  'shape',
  'density',
  'scale',
  'shadowStrength',
  'glowStrength',
  'carouselAutoplay',
  'carouselSpeed',
  'carouselDirection',
  'animationEnabled',
  'animationSpeed',
  'animationIntensity',
  'barHeight',
  'maxWidth',
  'musicDisplayStyle',
]);

const BASE_QUICK_CAPABILITIES = Object.freeze({
  colours: true,
  multipleColours: true,
  fonts: true,
  fontSizes: true,
  fontWeights: true,
  containers: true,
  containerShapes: true,
  borderRadius: true,
  borders: true,
  shadows: true,
  opacity: true,
  spacing: true,
  layoutDensity: true,
  transparentBackground: true,
});

const IMAGE_QUICK_CAPABILITIES = Object.freeze({
  images: true,
  imageShape: true,
  imageFit: true,
  imageVisibility: true,
});

function freezeStyle(style) {
  return Object.freeze({
    ...style,
    capabilities: Object.freeze({ ...(style.capabilities || {}) }),
    elementIds: Object.freeze([...(style.elementIds || ['container'])]),
    previewStateIds: Object.freeze([...(style.previewStateIds || [])]),
    recommended: !!style.recommended,
  });
}

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
    styles: Object.freeze([
      freezeStyle({
        id: 'default',
        label: 'Default Stats',
        description: 'Compact stats panel with progress and best/worst values.',
        recommended: true,
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          progressBar: true,
          statCards: true,
          positiveNegativeColours: true,
        },
        elementIds: ['container', 'statsCard', 'label', 'value', 'progressBar', 'bestStat', 'worstStat'],
      }),
      freezeStyle({
        id: 'metal',
        label: 'Metal Stats',
        description: 'The same stats panel with stronger surfaces and borders.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          progressBar: true,
          statCards: true,
          positiveNegativeColours: true,
          shadows: true,
        },
        elementIds: ['container', 'statsCard', 'label', 'value', 'progressBar', 'bestStat', 'worstStat'],
      }),
      freezeStyle({
        id: 'glass',
        label: 'Glass Stats',
        description: 'Transparent stats panel for OBS scenes.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          progressBar: true,
          statCards: true,
          positiveNegativeColours: true,
          transparentBackground: true,
          opacity: true,
        },
        elementIds: ['container', 'statsCard', 'label', 'value', 'progressBar', 'bestStat', 'worstStat'],
      }),
    ]),
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
  rtp_stats: Object.freeze({
    id: 'rtp_stats',
    widgetType: 'rtp_stats',
    label: 'RTP Stats Bar',
    category: 'stream',
    renderer: 'registered-widget-component',
    previewRenderer: 'registered-widget-component',
    schemaVersion: 1,
    migrationStatus: 'production-v2',
    defaultStyleId: 'v1',
    defaultAppearance: Object.freeze({
      material: 'matte',
      primaryColor: '#1d4ed8',
      shape: 'slightly_rounded',
      density: 'compact',
      scale: 1,
      textSize: 'standard',
    }),
    styles: Object.freeze([
      freezeStyle({
        id: 'v1',
        label: 'Classic',
        description: 'Horizontal RTP bar with provider, slot name, slot stats and personal best.',
        recommended: true,
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          statCards: true,
          positiveNegativeColours: true,
          shadows: true,
          glow: true,
          glowIntensity: true,
          barDimensions: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
        },
        elementIds: ['container', 'provider', 'slotTitle', 'rtpValue', 'maxWin', 'volatility', 'personalBest', 'statCard', 'label', 'divider', 'spinner'],
        previewStateIds: ['live', 'preview', 'empty'],
      }),
      freezeStyle({
        id: 'vertical',
        label: 'Vertical',
        description: 'Stacked RTP layout for narrower stream placements.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          statCards: true,
          positiveNegativeColours: true,
          shadows: true,
          glow: true,
          glowIntensity: true,
          orientation: true,
          barDimensions: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
        },
        elementIds: ['container', 'provider', 'slotTitle', 'rtpValue', 'maxWin', 'volatility', 'personalBest', 'statCard', 'label', 'divider', 'spinner'],
        previewStateIds: ['live', 'preview', 'empty'],
      }),
      freezeStyle({
        id: 'neon',
        label: 'Neon',
        description: 'High-contrast RTP bar with glow on the border, icons and values.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          statCards: true,
          positiveNegativeColours: true,
          shadows: true,
          glow: true,
          glowIntensity: true,
          transparentBackground: true,
          barDimensions: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
        },
        elementIds: ['container', 'provider', 'slotTitle', 'rtpValue', 'maxWin', 'volatility', 'personalBest', 'statCard', 'label', 'divider', 'spinner'],
        previewStateIds: ['live', 'preview', 'empty'],
      }),
      freezeStyle({
        id: 'minimal',
        label: 'Minimal',
        description: 'Low-noise RTP bar that hides icons, spinner and separators in CSS.',
        capabilities: {
          colours: true,
          multipleColours: true,
          fonts: true,
          fontSizes: true,
          fontWeights: true,
          containers: true,
          containerShapes: true,
          borderRadius: true,
          opacity: true,
          spacing: true,
          layoutDensity: true,
          transparentBackground: true,
          positiveNegativeColours: true,
          barDimensions: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
        },
        elementIds: ['container', 'provider', 'slotTitle', 'rtpValue', 'maxWin', 'volatility', 'personalBest', 'statCard', 'label'],
        previewStateIds: ['live', 'preview', 'empty'],
      }),
      freezeStyle({
        id: 'glass',
        label: 'Glass',
        description: 'Frosted glass RTP bar with blur, soft borders and reflective shadow.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          statCards: true,
          positiveNegativeColours: true,
          shadows: true,
          glow: true,
          glowIntensity: true,
          opacity: true,
          transparentBackground: true,
          barDimensions: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
        },
        elementIds: ['container', 'provider', 'slotTitle', 'rtpValue', 'maxWin', 'volatility', 'personalBest', 'statCard', 'label', 'divider', 'spinner'],
        previewStateIds: ['live', 'preview', 'empty'],
      }),
    ]),
    safeRanges: Object.freeze({
      scale: [0.75, 1.35],
      rootRadius: [0, 36],
      cardRadius: [0, 28],
      rootPadding: [2, 16],
      cardPadding: [2, 14],
      fontSize: [10, 22],
      shadowIntensity: [0, 0.5],
      glowIntensity: [0, 0.35],
      blurStrength: [0, 18],
    }),
    unsupportedProperties: Object.freeze([
      'motion.carouselDistance',
      'motion.autoCycleInterval',
    ]),
    animationSensitiveProperties: Object.freeze([
      'spinnerAnimation',
      'barLayoutDirection',
    ]),
    responsive: Object.freeze({
      safeToResize: true,
      aspectRatioLocked: false,
      minWidth: 280,
      minHeight: 42,
      maxWidth: 1080,
      maxHeight: 220,
    }),
    elements: Object.freeze({
      container: Object.freeze({
        label: 'Entire bar',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing', 'scale', 'typography'],
        cssVariables: ['--rtp-bg-from', '--rtp-bg-via', '--rtp-bg-to', '--rtp-border-color', '--rtp-border-radius'],
      }),
      provider: Object.freeze({
        label: 'Provider logo / name',
        kind: 'image',
        capabilities: ['image', 'shape', 'typography', 'stateColor'],
        cssVariables: ['--rtp-provider', '--rtp-provider-size', '--rtp-provider-logo-width', '--rtp-provider-logo-height', '--rtp-provider-logo-radius'],
      }),
      slotTitle: Object.freeze({
        label: 'Slot name',
        kind: 'text',
        capabilities: ['typography'],
        cssVariables: ['--rtp-slot-name'],
      }),
      rtpValue: Object.freeze({
        label: 'RTP value',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
        cssVariables: ['--rtp-icon-rtp', '--rtp-text'],
      }),
      maxWin: Object.freeze({
        label: 'Potential max win',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
        cssVariables: ['--rtp-icon-potential', '--rtp-text'],
      }),
      volatility: Object.freeze({
        label: 'Volatility',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
        cssVariables: ['--rtp-icon-volatility', '--rtp-text'],
      }),
      personalBest: Object.freeze({
        label: 'Personal best',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
        cssVariables: ['--rtp-icon-bestwin', '--rtp-text'],
      }),
      statCard: Object.freeze({
        label: 'Stat values',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shape', 'spacing', 'typography', 'stateColor'],
        cssVariables: ['--rtp-text', '--rtp-divider'],
      }),
      label: Object.freeze({
        label: 'Stat labels',
        kind: 'text',
        capabilities: ['typography'],
        cssVariables: ['--rtp-label'],
      }),
      divider: Object.freeze({
        label: 'Dividers',
        kind: 'surface',
        capabilities: ['surface', 'border', 'stateColor'],
        cssVariables: ['--rtp-divider'],
      }),
      spinner: Object.freeze({
        label: 'Spinner',
        kind: 'badge',
        capabilities: ['stateColor'],
        cssVariables: ['--rtp-spinner'],
      }),
    }),
    previewSampleData: Object.freeze({
      needsAllWidgets: true,
      states: ['live', 'preview', 'empty'],
      source: 'previewWidgetSamples.applyPreviewWidgetSamples',
    }),
  }),
  navbar: Object.freeze({
    id: 'navbar',
    widgetType: 'navbar',
    label: 'Navbar',
    category: 'stream',
    renderer: 'registered-widget-component',
    previewRenderer: 'registered-widget-component',
    schemaVersion: 1,
    migrationStatus: 'production-v2',
    defaultStyleId: 'v1',
    defaultAppearance: Object.freeze({
      material: 'matte',
      primaryColor: '#f59e0b',
      shape: 'pill',
      density: 'standard',
      scale: 1,
      textSize: 'standard',
      imageSize: 'medium',
      imageShape: 'round',
      imageFit: 'contain',
    }),
    styles: Object.freeze([
      freezeStyle({
        id: 'v1',
        label: 'Classic',
        description: 'Rounded stream navbar with identity, clock, music, crypto, CTA and casino sections.',
        recommended: true,
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          imageSize: true,
          imageShape: true,
          imageFit: true,
          positiveNegativeColours: true,
          statCards: true,
          shadows: true,
          glow: true,
          glowIntensity: true,
          barDimensions: true,
          musicDisplayStyle: true,
        },
        elementIds: ['container', 'logo', 'avatar', 'badgeImage', 'displayName', 'clock', 'music', 'sponsor', 'crypto', 'balance', 'casino', 'separator'],
        previewStateIds: ['default', 'music', 'crypto'],
      }),
      freezeStyle({
        id: 'metallic',
        label: 'Metallic',
        description: 'Metallic navbar with stronger border, shine overlays and reflective surfaces.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          imageSize: true,
          imageShape: true,
          imageFit: true,
          positiveNegativeColours: true,
          statCards: true,
          shadows: true,
          glow: true,
          glowIntensity: true,
          barDimensions: true,
          musicDisplayStyle: true,
        },
        elementIds: ['container', 'logo', 'avatar', 'badgeImage', 'displayName', 'clock', 'music', 'sponsor', 'crypto', 'balance', 'casino', 'separator'],
        previewStateIds: ['default', 'music', 'crypto'],
      }),
      freezeStyle({
        id: 'glass',
        label: 'Glass',
        description: 'Frosted glass navbar with blur, soft borders and translucent panels.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          imageSize: true,
          imageShape: true,
          imageFit: true,
          positiveNegativeColours: true,
          statCards: true,
          shadows: true,
          glow: true,
          glowIntensity: true,
          opacity: true,
          transparentBackground: true,
          barDimensions: true,
          musicDisplayStyle: true,
        },
        elementIds: ['container', 'logo', 'avatar', 'badgeImage', 'displayName', 'clock', 'music', 'sponsor', 'crypto', 'balance', 'casino', 'separator'],
        previewStateIds: ['default', 'music', 'crypto'],
      }),
      freezeStyle({
        id: 'retro',
        label: 'Retro',
        description: 'Pixel-inspired navbar with harder corners, scanlines and arcade colors.',
        capabilities: {
          colours: true,
          multipleColours: true,
          fonts: true,
          fontSizes: true,
          fontWeights: true,
          containers: true,
          containerShapes: true,
          borderRadius: true,
          borders: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
          spacing: true,
          layoutDensity: true,
          positiveNegativeColours: true,
          statCards: true,
          shadows: true,
          opacity: true,
          transparentBackground: true,
          barDimensions: true,
          musicDisplayStyle: true,
        },
        elementIds: ['container', 'logo', 'avatar', 'badgeImage', 'displayName', 'clock', 'music', 'sponsor', 'crypto', 'balance', 'casino', 'separator'],
        previewStateIds: ['default', 'music', 'crypto'],
      }),
    ]),
    safeRanges: Object.freeze({
      scale: [0.75, 1.25],
      rootRadius: [0, 999],
      cardRadius: [0, 36],
      badgeRadius: [0, 999],
      rootPadding: [4, 24],
      cardPadding: [4, 18],
      fontSize: [10, 22],
      imageSize: [18, 96],
      shadowIntensity: [0, 0.5],
      glowIntensity: [0, 0.35],
      blurStrength: [0, 18],
    }),
    unsupportedProperties: Object.freeze([
      'motion.carouselDistance',
      'motion.autoCycleInterval',
      'layout.sectionOrder',
      'layout.zoneAlignment',
      'image.visibility',
    ]),
    animationSensitiveProperties: Object.freeze([
      'cryptoTickerTransition',
      'musicMarqueeDuration',
      'albumSpinAnimation',
    ]),
    responsive: Object.freeze({
      safeToResize: true,
      aspectRatioLocked: false,
      minWidth: 480,
      minHeight: 48,
      maxWidth: 1600,
      maxHeight: 140,
    }),
    elements: Object.freeze({
      container: Object.freeze({
        label: 'Entire navbar',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing', 'scale', 'typography'],
      }),
      logo: Object.freeze({
        label: 'Accent/logo color',
        kind: 'badge',
        capabilities: ['stateColor', 'shape'],
      }),
      avatar: Object.freeze({
        label: 'Avatar',
        kind: 'image',
        capabilities: ['image', 'shape', 'border'],
      }),
      badgeImage: Object.freeze({
        label: 'Badge image',
        kind: 'image',
        capabilities: ['image', 'shape'],
      }),
      displayName: Object.freeze({
        label: 'Display name',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
      }),
      clock: Object.freeze({
        label: 'Clock',
        kind: 'badge',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing', 'typography', 'stateColor'],
      }),
      music: Object.freeze({
        label: 'Music information',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
      }),
      sponsor: Object.freeze({
        label: 'CTA sponsor',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing', 'typography', 'stateColor'],
      }),
      crypto: Object.freeze({
        label: 'Crypto ticker',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
      }),
      balance: Object.freeze({
        label: 'Start balance',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
      }),
      casino: Object.freeze({
        label: 'Casino area',
        kind: 'image',
        capabilities: ['image', 'shape', 'typography', 'stateColor'],
      }),
      separator: Object.freeze({
        label: 'Separators',
        kind: 'surface',
        capabilities: ['surface', 'border', 'stateColor'],
      }),
    }),
    previewSampleData: Object.freeze({
      needsAllWidgets: false,
      states: ['default', 'music', 'crypto'],
      source: 'previewWidgetSamples.applyPreviewWidgetSamples',
    }),
  }),
  spotify_now_playing: Object.freeze({
    id: 'spotify_now_playing',
    widgetType: 'spotify_now_playing',
    label: 'Spotify Now Playing',
    category: 'stream',
    renderer: 'registered-widget-component',
    previewRenderer: 'registered-widget-component',
    schemaVersion: 1,
    migrationStatus: 'style-by-style',
    defaultStyleId: 'album_card',
    defaultAppearance: Object.freeze({
      material: 'matte',
      primaryColor: '#1DB954',
      shape: 'rounded',
      density: 'standard',
      scale: 1,
      textSize: 'standard',
      animationSpeed: 'normal',
      imageSize: 'medium',
      imageShape: 'rounded',
      imageFit: 'cover',
    }),
    styles: Object.freeze([
      freezeStyle({
        id: 'album_card',
        label: 'Album Card',
        description: 'Large album artwork card with overlay text and playback state.',
        recommended: true,
        capabilities: {
          colours: true,
          multipleColours: true,
          fonts: true,
          fontSizes: true,
          fontWeights: true,
          containers: true,
          containerShapes: true,
          borderRadius: true,
          borders: true,
          shadows: true,
          glow: true,
          images: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
          imageVisibility: true,
          animations: true,
          animationSpeed: true,
          transparentBackground: true,
        },
        elementIds: ['container', 'albumArt', 'trackTitle', 'artistName', 'playbackState', 'spotifyBadge'],
      }),
      freezeStyle({
        id: 'mini_player',
        label: 'Mini Player',
        description: 'Compact horizontal player with album art, title, artist and equalizer.',
        capabilities: {
          colours: true,
          multipleColours: true,
          fonts: true,
          fontSizes: true,
          fontWeights: true,
          containers: true,
          containerShapes: true,
          borderRadius: true,
          borders: true,
          shadows: true,
          images: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
          imageVisibility: true,
          animations: true,
          animationSpeed: true,
          transparentBackground: true,
        },
        elementIds: ['container', 'albumArt', 'trackTitle', 'artistName', 'playbackState', 'equalizer'],
      }),
      freezeStyle({
        id: 'vinyl',
        label: 'Vinyl',
        description: 'Spinning record layout with center album art and track text.',
        capabilities: {
          colours: true,
          multipleColours: true,
          fonts: true,
          fontSizes: true,
          fontWeights: true,
          containers: true,
          containerShapes: true,
          borderRadius: true,
          borders: true,
          shadows: true,
          images: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
          imageVisibility: true,
          animations: true,
          animationSpeed: true,
          transparentBackground: true,
        },
        elementIds: ['container', 'vinylRecord', 'albumArt', 'trackTitle', 'artistName'],
      }),
      freezeStyle({
        id: 'glass',
        label: 'Glass',
        description: 'Frosted card with album art, blurred backdrop, text and playback state.',
        capabilities: {
          colours: true,
          multipleColours: true,
          fonts: true,
          fontSizes: true,
          fontWeights: true,
          containers: true,
          containerShapes: true,
          borderRadius: true,
          borders: true,
          shadows: true,
          images: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
          imageVisibility: true,
          animations: true,
          animationSpeed: true,
          transparentBackground: true,
        },
        elementIds: ['container', 'albumArt', 'trackTitle', 'artistName', 'playbackState'],
      }),
      freezeStyle({
        id: 'wave',
        label: 'Wave',
        description: 'Waveform layout with album art, text and animated bars.',
        capabilities: {
          colours: true,
          multipleColours: true,
          fonts: true,
          fontSizes: true,
          fontWeights: true,
          containers: true,
          containerShapes: true,
          borderRadius: true,
          borders: true,
          shadows: true,
          images: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
          imageVisibility: true,
          animations: true,
          animationSpeed: true,
          transparentBackground: true,
        },
        elementIds: ['container', 'albumArt', 'trackTitle', 'artistName', 'waveform', 'equalizer'],
      }),
      freezeStyle({
        id: 'neon',
        label: 'Neon',
        description: 'Neon glow layout with album art, text and playback state.',
        capabilities: {
          colours: true,
          multipleColours: true,
          fonts: true,
          fontSizes: true,
          fontWeights: true,
          containers: true,
          containerShapes: true,
          borderRadius: true,
          borders: true,
          shadows: true,
          glow: true,
          glowIntensity: true,
          images: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
          imageVisibility: true,
          animations: true,
          animationSpeed: true,
          transparentBackground: true,
        },
        elementIds: ['container', 'albumArt', 'trackTitle', 'artistName', 'playbackState'],
      }),
      freezeStyle({
        id: 'metal',
        label: 'Metal',
        description: 'Metal player layout with album art, text, playback state and equalizer.',
        capabilities: {
          colours: true,
          multipleColours: true,
          fonts: true,
          fontSizes: true,
          fontWeights: true,
          containers: true,
          containerShapes: true,
          borderRadius: true,
          borders: true,
          shadows: true,
          images: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
          imageVisibility: true,
          animations: true,
          animationSpeed: true,
          transparentBackground: true,
        },
        elementIds: ['container', 'albumArt', 'trackTitle', 'artistName', 'playbackState', 'equalizer'],
      }),
      freezeStyle({
        id: 'compact_bar',
        label: 'Compact Bar',
        description: 'Compact progress-bar layout with album art, time, and equalizer controls.',
        capabilities: {
          colours: true,
          multipleColours: true,
          fonts: true,
          fontSizes: true,
          fontWeights: true,
          containers: true,
          containerShapes: true,
          borderRadius: true,
          borders: true,
          shadows: true,
          glow: true,
          images: true,
          imageSize: true,
          imageShape: true,
          imageFit: true,
          imageVisibility: true,
          animations: true,
          animationSpeed: true,
          progressBar: true,
          transparentBackground: true,
        },
        elementIds: ['container', 'albumArt', 'spotifyBadge', 'listenerBadge', 'trackTitle', 'artistName', 'progressBar', 'timeLabel', 'equalizer'],
      }),
    ]),
    safeRanges: Object.freeze({
      scale: [0.75, 1.3],
      rootRadius: [0, 32],
      cardRadius: [0, 24],
      rootPadding: [4, 20],
      fontSize: [10, 20],
      shadowIntensity: [0, 0.45],
      blurStrength: [0, 12],
    }),
    unsupportedProperties: Object.freeze([
      'layout.trackMarquee',
      'layout.spotifySvgGeometry',
      'motion.equalizerKeyframes',
    ]),
    responsive: Object.freeze({
      safeToResize: true,
      aspectRatioLocked: false,
      minWidth: 260,
      minHeight: 58,
      maxWidth: 900,
      maxHeight: 180,
    }),
    elements: Object.freeze({
      container: Object.freeze({
        label: 'Entire player',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing', 'typography'],
      }),
      albumArt: Object.freeze({
        label: 'Album art',
        kind: 'image',
        capabilities: ['image', 'shape', 'border'],
      }),
      trackTitle: Object.freeze({
        label: 'Track title',
        kind: 'text',
        capabilities: ['typography'],
      }),
      artistName: Object.freeze({
        label: 'Artist name',
        kind: 'text',
        capabilities: ['typography'],
      }),
      playbackState: Object.freeze({
        label: 'Playback state',
        kind: 'badge',
        capabilities: ['stateColor', 'typography'],
      }),
      vinylRecord: Object.freeze({
        label: 'Vinyl record',
        kind: 'carousel',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'stateColor'],
      }),
      waveform: Object.freeze({
        label: 'Waveform bars',
        kind: 'carousel',
        capabilities: ['stateColor'],
      }),
      spotifyBadge: Object.freeze({
        label: 'Spotify icon',
        kind: 'badge',
        capabilities: ['stateColor'],
      }),
      listenerBadge: Object.freeze({
        label: 'Listener icon',
        kind: 'badge',
        capabilities: ['stateColor'],
      }),
      progressBar: Object.freeze({
        label: 'Progress bar',
        kind: 'progress',
        capabilities: ['progress', 'shape'],
      }),
      timeLabel: Object.freeze({
        label: 'Time label',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
      }),
      equalizer: Object.freeze({
        label: 'Equalizer',
        kind: 'carousel',
        capabilities: ['stateColor'],
      }),
    }),
    previewSampleData: Object.freeze({
      needsAllWidgets: false,
      states: ['playing'],
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
      material: 'original',
      primaryColor: '#14d8d8',
      shape: 'rounded',
      density: 'standard',
      scale: 1,
      textSize: 'standard',
    }),
    styles: Object.freeze([
      freezeStyle({
        id: 'v12_classic_sr',
        label: 'Classic + Requests',
        description: 'The polished vertical Bonus Hunt layout with carousel, list, footer and slot requests.',
        recommended: true,
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          ...IMAGE_QUICK_CAPABILITIES,
          carousel: true,
          carouselSpeed: true,
          carouselDirection: false,
          carouselAutoplay: true,
          progressBar: true,
          positiveNegativeColours: true,
          statCards: true,
          rows: true,
          maximumVisibleItems: true,
          glow: true,
          glowIntensity: true,
        },
        elementIds: [
          'container',
          'headerContainer',
          'mainStatsContainer',
          'statCell',
          'slotCarouselContainer',
          'slotImage',
          'slotListContainer',
          'slotRow',
          'slotTitle',
          'progressBar',
          'footerContainer',
          'requestsSectionContainer',
        ],
      }),
      freezeStyle({
        id: 'v12_classic_sr_editable',
        label: 'Classic + Requests - Editable',
        description: 'Editor-ready Classic + Requests layout using the original V12 renderer and shared request data.',
        recommended: false,
        editorReady: true,
        legacy: false,
        featureFlag: null,
        hiddenInProduction: false,
        capabilities: {
          ...(getEditorReadyWidgetStyle('bonus_hunt', 'v12_classic_sr_editable')?.capabilities || {}),
        },
        elementIds: getEditorReadyWidgetStyle('bonus_hunt', 'v12_classic_sr_editable')?.editableElements || ['container'],
        previewStateIds: ['hunt_live', 'opening', 'requests_empty', 'requests_busy'],
      }),
      freezeStyle({
        id: 'v5_horizontal',
        label: 'Horizontal',
        description: 'Wide stream bar with side stats and a horizontal scrolling bonus strip.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          ...IMAGE_QUICK_CAPABILITIES,
          carousel: true,
          carouselSpeed: true,
          progressBar: true,
          positiveNegativeColours: true,
          rows: true,
          columns: true,
          glow: true,
          glowIntensity: true,
        },
        elementIds: ['container', 'headerContainer', 'statCell', 'slotCarouselContainer', 'slotImage', 'slotTitle', 'progressBar', 'footerContainer'],
      }),
      freezeStyle({
        id: 'v11_fever',
        label: 'Advanced List',
        description: 'Detailed list-style Bonus Hunt with stronger animated presentation.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          ...IMAGE_QUICK_CAPABILITIES,
          progressBar: true,
          positiveNegativeColours: true,
          rows: true,
          statCards: true,
          glow: true,
          glowIntensity: true,
        },
        elementIds: ['container', 'headerContainer', 'mainStatsContainer', 'statCell', 'slotListContainer', 'slotRow', 'slotImage', 'slotTitle', 'progressBar', 'footerContainer'],
      }),
      freezeStyle({
        id: 'v3',
        label: 'Flip Card',
        description: 'Classic flipping card view for compact hunts.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          ...IMAGE_QUICK_CAPABILITIES,
          carousel: true,
          carouselSpeed: true,
          progressBar: true,
          positiveNegativeColours: true,
          glow: true,
          glowIntensity: true,
        },
        elementIds: ['container', 'headerTitle', 'slotCarouselContainer', 'slotImage', 'slotTitle', 'progressBar', 'footerContainer'],
      }),
    ]),
    safeRanges: Object.freeze({
      scale: [0.75, 1.35],
      rootRadius: [0, 64],
      cardRadius: [0, 32],
      rootPadding: [4, 24],
      cardPadding: [4, 20],
      fontSize: [11, 22],
      shadowIntensity: [0, 0.55],
      glowIntensity: [0, 0.38],
      blurStrength: [0, 16],
    }),
    unsupportedProperties: Object.freeze([
      'motion.carouselDistance',
      'motion.flipTransform',
      'layout.rowTransform',
      'layout.absolutePosition',
      'layout.carouselDimensions',
      'layout.rowDimensions',
      'layout.rootFrame',
      'image.slotImageHeight',
      'spacing.carouselGap',
      'spacing.structuralGap',
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
        capabilities: ['surface', 'border', 'shadow', 'shape', 'scale', 'typography'],
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
        label: 'Slot list',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape'],
        legacyElement: 'bonusCard',
      }),
      slotRow: Object.freeze({
        label: 'Slot rows',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shape', 'stateColor'],
      }),
      slotImage: Object.freeze({
        label: 'Slot image',
        kind: 'image',
        capabilities: ['shape'],
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
        capabilities: ['surface', 'border', 'shape'],
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
    }),
    previewSampleData: Object.freeze({
      needsAllWidgets: false,
      source: 'previewWidgetSamples.applyPreviewWidgetSamples',
    }),
  }),
  slot_requests: Object.freeze({
    id: 'slot_requests',
    widgetType: 'slot_requests',
    label: 'Slot Requests',
    category: 'slot_requests',
    renderer: 'registered-widget-component',
    previewRenderer: 'registered-widget-component',
    schemaVersion: 1,
    migrationStatus: 'production-v2',
    defaultStyleId: 'v1_minimal',
    defaultAppearance: Object.freeze({
      material: 'matte',
      primaryColor: '#14d8d8',
      shape: 'rounded',
      density: 'standard',
      scale: 1,
      textSize: 'standard',
    }),
    styles: Object.freeze([
      freezeStyle({
        id: 'v1_minimal',
        label: 'Modern Minimal',
        description: 'Vertical request queue with slot images and clean list rows.',
        recommended: true,
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          imageShape: true,
          rows: true,
          maximumVisibleItems: true,
        },
        elementIds: ['container', 'header', 'queueContainer', 'requestCard', 'position', 'slotImage', 'slotTitle', 'viewerName', 'emptyState'],
        previewStateIds: ['with_requests', 'empty', 'busy_queue'],
      }),
      freezeStyle({
        id: 'v2_card_stack',
        label: '3D Card Stack',
        description: 'Animated 3D stack for showing the current request with side cards.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          imageShape: true,
          carousel: true,
          carouselSpeed: true,
          carouselAutoplay: true,
          carouselPauseOnHover: false,
          rows: true,
          maximumVisibleItems: true,
          glow: true,
          glowIntensity: true,
        },
        elementIds: ['container', 'header', 'queueContainer', 'requestCard', 'position', 'slotImage', 'slotTitle', 'viewerName', 'footer', 'emptyState'],
        previewStateIds: ['with_requests', 'empty', 'busy_queue'],
      }),
      freezeStyle({
        id: 'v3_compact',
        label: 'Compact Overlay',
        description: 'Small ticker-style request card for tight stream layouts.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          imageShape: true,
          carousel: true,
          carouselSpeed: true,
          carouselAutoplay: true,
          rows: true,
          maximumVisibleItems: true,
        },
        elementIds: ['container', 'requestCard', 'position', 'slotImage', 'slotTitle', 'viewerName', 'footer', 'emptyState'],
        previewStateIds: ['with_requests', 'empty', 'busy_queue'],
      }),
      freezeStyle({
        id: 'v3_compact_editable',
        label: 'Compact Overlay - Editable',
        description: 'Editor-ready compact ticker using shared Slot Requests data and isolated CSS.',
        recommended: false,
        editorReady: true,
        legacy: false,
        featureFlag: 'appearanceEditablePilot',
        hiddenInProduction: true,
        capabilities: {
          ...(getEditorReadyWidgetStyle('slot_requests', 'v3_compact_editable')?.capabilities || {}),
        },
        elementIds: getEditorReadyWidgetStyle('slot_requests', 'v3_compact_editable')?.editableElements || ['container'],
        previewStateIds: ['with_requests', 'empty', 'busy_queue'],
      }),
    ]),
    safeRanges: Object.freeze({
      scale: [0.75, 1.35],
      rootRadius: [0, 36],
      cardRadius: [0, 28],
      badgeRadius: [0, 999],
      rootPadding: [6, 22],
      cardPadding: [4, 18],
      fontSize: [11, 20],
      shadowIntensity: [0, 0.45],
      glowIntensity: [0, 0.32],
      blurStrength: [0, 14],
    }),
    unsupportedProperties: Object.freeze([
      'image.imageSize',
      'layout.queueAnimationDistance',
      'layout.cardStackTransform',
      'layout.marqueeDistance',
      'motion.carouselDistance',
      'motion.autoCycleInterval',
    ]),
    animationSensitiveProperties: Object.freeze([
      'transform',
      'animationName',
      'scrollDuration',
      'cardStackTransform',
      'marqueeDistance',
    ]),
    responsive: Object.freeze({
      safeToResize: true,
      aspectRatioLocked: false,
      minWidth: 220,
      minHeight: 86,
      maxWidth: 720,
      maxHeight: 760,
    }),
    elements: Object.freeze({
      container: Object.freeze({
        label: 'Entire widget',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing', 'scale', 'typography'],
        cssVariables: ['--sr-min-bg', '--sr-cs-bg', '--sr-co-bg'],
      }),
      header: Object.freeze({
        label: 'Header',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shape', 'spacing', 'typography'],
        cssVariables: ['--sr-min-border', '--sr-cs-border'],
      }),
      queueContainer: Object.freeze({
        label: 'Queue',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing'],
      }),
      requestCard: Object.freeze({
        label: 'Request rows',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing', 'stateColor'],
        cssVariables: ['--sr-min-card-bg', '--sr-cs-card-bg', '--sr-co-card-bg'],
      }),
      position: Object.freeze({
        label: 'Position badge',
        kind: 'badge',
        capabilities: ['surface', 'border', 'shape', 'typography', 'stateColor'],
        cssVariables: ['--sr-min-accent', '--sr-cs-accent', '--sr-co-accent'],
      }),
      slotImage: Object.freeze({
        label: 'Slot image',
        kind: 'image',
        capabilities: ['shape', 'border'],
        cssVariables: ['--sr-min-img-radius', '--sr-cs-img-radius', '--sr-co-img-radius'],
      }),
      slotTitle: Object.freeze({
        label: 'Slot name',
        kind: 'text',
        capabilities: ['typography'],
        cssVariables: ['--sr-min-title', '--sr-cs-title', '--sr-co-title'],
      }),
      viewerName: Object.freeze({
        label: 'Viewer name',
        kind: 'text',
        capabilities: ['typography'],
        cssVariables: ['--sr-min-muted', '--sr-cs-muted', '--sr-co-muted'],
      }),
      costBadge: Object.freeze({
        label: 'Cost badge',
        kind: 'badge',
        capabilities: ['surface', 'border', 'shape', 'typography', 'stateColor'],
      }),
      emptyState: Object.freeze({
        label: 'Empty state',
        kind: 'surface',
        capabilities: ['surface', 'typography', 'spacing'],
      }),
      footer: Object.freeze({
        label: 'Footer stats',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shape', 'spacing', 'typography'],
      }),
    }),
    previewSampleData: Object.freeze({
      needsAllWidgets: false,
      states: ['with_requests', 'empty', 'busy_queue', 'missing_image'],
      source: 'previewWidgetSamples.applyPreviewWidgetSamples',
    }),
  }),
  giveaway: Object.freeze({
    id: 'giveaway',
    widgetType: 'giveaway',
    label: 'Giveaway',
    category: 'giveaways',
    renderer: 'registered-widget-component',
    previewRenderer: 'registered-widget-component',
    schemaVersion: 1,
    migrationStatus: 'production-v2',
    defaultStyleId: 'v1',
    defaultAppearance: Object.freeze({
      material: 'matte',
      primaryColor: '#14d8d8',
      shape: 'rounded',
      density: 'standard',
      scale: 1,
      textSize: 'standard',
    }),
    styles: Object.freeze([
      freezeStyle({
        id: 'v1',
        label: 'Classic',
        description: 'Classic giveaway card with prize, keyword, entries and winner states.',
        recommended: true,
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          positiveNegativeColours: true,
          statCards: true,
          glow: true,
          glowIntensity: true,
        },
        elementIds: ['container', 'header', 'prize', 'keyword', 'participantCount', 'statusBadge', 'winnerArea', 'progressSection', 'emptyState'],
        previewStateIds: ['live', 'drawing', 'winner', 'empty'],
      }),
      freezeStyle({
        id: 'v2',
        label: 'Compact',
        description: 'Compact banner giveaway for lower-third stream space.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          positiveNegativeColours: true,
          transparentBackground: true,
        },
        elementIds: ['container', 'progressSection', 'prize', 'keyword', 'participantCount', 'statusBadge', 'winnerArea', 'emptyState'],
        previewStateIds: ['live', 'drawing', 'winner', 'empty'],
      }),
      freezeStyle({
        id: 'v3',
        label: 'Neon',
        description: 'High-energy neon giveaway with glow and winner animation.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          glow: true,
          glowIntensity: true,
          positiveNegativeColours: true,
          transparentBackground: true,
        },
        elementIds: ['container', 'progressSection', 'prize', 'keyword', 'participantCount', 'statusBadge', 'winnerArea', 'emptyState', 'celebration'],
        previewStateIds: ['live', 'drawing', 'winner', 'empty'],
      }),
      freezeStyle({
        id: 'v4',
        label: 'Minimal',
        description: 'Small transparent giveaway status with very low visual noise.',
        capabilities: {
          colours: true,
          multipleColours: true,
          fonts: true,
          fontSizes: true,
          fontWeights: true,
          transparentBackground: true,
        },
        elementIds: ['container', 'prize', 'keyword', 'participantCount', 'statusBadge', 'winnerArea', 'emptyState'],
        previewStateIds: ['live', 'winner', 'empty'],
      }),
      freezeStyle({
        id: 'metal',
        label: 'Metal',
        description: 'Metallic giveaway panel with reflective surfaces.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          shadows: true,
          positiveNegativeColours: true,
        },
        elementIds: ['container', 'header', 'prize', 'keyword', 'participantCount', 'statusBadge', 'winnerArea', 'emptyState'],
        previewStateIds: ['live', 'drawing', 'winner', 'empty'],
      }),
      freezeStyle({
        id: 'bh_stats',
        label: 'Hunt Stats',
        description: 'Giveaway styled like the Bonus Hunt stats panel.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          statCards: true,
          positiveNegativeColours: true,
        },
        elementIds: ['container', 'header', 'progressSection', 'keyword', 'participantCount', 'statusBadge', 'winnerArea', 'emptyState'],
        previewStateIds: ['live', 'drawing', 'winner', 'empty'],
      }),
      freezeStyle({
        id: 'v12',
        label: 'V12',
        description: 'Giveaway layout matching the polished Bonus Hunt V12 surface language.',
        capabilities: {
          ...BASE_QUICK_CAPABILITIES,
          statCards: true,
          positiveNegativeColours: true,
          glow: true,
          glowIntensity: true,
        },
        elementIds: ['container', 'header', 'prize', 'keyword', 'participantCount', 'statusBadge', 'winnerArea', 'footer', 'emptyState'],
        previewStateIds: ['live', 'drawing', 'winner', 'empty'],
      }),
    ]),
    safeRanges: Object.freeze({
      scale: [0.75, 1.35],
      rootRadius: [0, 36],
      cardRadius: [0, 28],
      badgeRadius: [0, 999],
      rootPadding: [4, 24],
      cardPadding: [4, 20],
      fontSize: [10, 24],
      shadowIntensity: [0, 0.5],
      glowIntensity: [0, 0.35],
      blurStrength: [0, 14],
    }),
    unsupportedProperties: Object.freeze([
      'layout.drawReelGeometry',
      'layout.confettiPath',
      'motion.reelDistance',
      'motion.winnerTransform',
      'motion.confettiDuration',
    ]),
    animationSensitiveProperties: Object.freeze([
      'transform',
      'animationName',
      'winnerEntrance',
      'reelTransform',
      'confettiFall',
    ]),
    responsive: Object.freeze({
      safeToResize: true,
      aspectRatioLocked: false,
      minWidth: 220,
      minHeight: 120,
      maxWidth: 760,
      maxHeight: 720,
    }),
    elements: Object.freeze({
      container: Object.freeze({
        label: 'Entire widget',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'spacing', 'scale', 'typography'],
      }),
      header: Object.freeze({
        label: 'Header',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shape', 'spacing', 'typography'],
      }),
      prize: Object.freeze({
        label: 'Prize',
        kind: 'text',
        capabilities: ['surface', 'border', 'shape', 'typography', 'spacing'],
      }),
      keyword: Object.freeze({
        label: 'Keyword',
        kind: 'badge',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'typography', 'stateColor'],
      }),
      participantCount: Object.freeze({
        label: 'Participant count',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
      }),
      statusBadge: Object.freeze({
        label: 'Status badge',
        kind: 'badge',
        capabilities: ['surface', 'border', 'shape', 'typography', 'stateColor'],
      }),
      winnerArea: Object.freeze({
        label: 'Winner area',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shadow', 'shape', 'typography', 'stateColor'],
      }),
      progressSection: Object.freeze({
        label: 'Entry section',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shape', 'spacing', 'typography'],
      }),
      timer: Object.freeze({
        label: 'Timer',
        kind: 'text',
        capabilities: ['typography', 'stateColor'],
      }),
      emptyState: Object.freeze({
        label: 'Empty state',
        kind: 'surface',
        capabilities: ['surface', 'typography', 'spacing'],
      }),
      celebration: Object.freeze({
        label: 'Celebration',
        kind: 'effect',
        capabilities: ['stateColor', 'shadow'],
      }),
      footer: Object.freeze({
        label: 'Footer stats',
        kind: 'surface',
        capabilities: ['surface', 'border', 'shape', 'spacing', 'typography'],
      }),
    }),
    previewSampleData: Object.freeze({
      needsAllWidgets: false,
      states: ['live', 'drawing', 'winner', 'closed', 'empty'],
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

export function getWidgetStyleCapability(widgetType, styleId) {
  const capability = getWidgetAppearanceCapability(widgetType);
  if (!capability) return null;
  const styles = Array.isArray(capability.styles) ? capability.styles : [];
  return styles.find(style => style.id === styleId)
    || styles.find(style => style.id === capability.defaultStyleId)
    || styles[0]
    || null;
}

export function getWidgetStyleOptionsForQuickEditor(widgetType) {
  const capability = getWidgetAppearanceCapability(widgetType);
  if (!capability || !Array.isArray(capability.styles)) return [];
  return capability.styles.filter(style => shouldExposeAppearanceStyle(style)).map(style => ({
    id: style.id,
    label: style.label || style.id,
    description: style.description || '',
    recommended: !!style.recommended,
    icon: style.icon || '',
    capabilities: style.capabilities || {},
    elementIds: style.elementIds || [],
    previewStateIds: style.previewStateIds || [],
  }));
}

function shouldExposeAppearanceStyle(style) {
  if (!style?.hiddenInProduction) return true;
  return shouldExposeEditorReadyStyle(style);
}

export function getWidgetStyleElements(widgetType, styleId) {
  const allElements = getWidgetAppearanceV2Elements(widgetType);
  const style = getWidgetStyleCapability(widgetType, styleId);
  if (!style?.elementIds?.length) return allElements;
  const allowed = new Set(style.elementIds);
  return allElements.filter(element => allowed.has(element.id));
}

export function styleSupportsQuickCapability(widgetType, styleId, key) {
  const style = getWidgetStyleCapability(widgetType, styleId);
  return !!style?.capabilities?.[key];
}

function supportsAnyStyleCapability(styleCapabilities = {}, keys = []) {
  return keys.some(key => !!styleCapabilities[key]);
}

function isWholeWidgetElement(element) {
  return !element || element.id === 'container' || element.id === 'root';
}

function elementHasAnyCapability(element, capabilities = []) {
  const elementCapabilities = new Set(element?.capabilities || []);
  return capabilities.some(capability => elementCapabilities.has(capability));
}

function elementHasAnyKind(element, kinds = []) {
  if (!element?.kind) return false;
  return kinds.includes(element.kind);
}

function getStyleQuickControlIds(widgetType, styleId, style) {
  const editorReadyStyle = getEditorReadyWidgetStyle(widgetType, styleId);
  const schemaControls = (editorReadyStyle?.quickEditorSchema || [])
    .flatMap(section => section.controls || []);
  if (schemaControls.length) return [...new Set(schemaControls)];
  return QUICK_CONTROL_FALLBACK_ORDER.filter(control => {
    const requirements = QUICK_CONTROL_STYLE_REQUIREMENTS[control] || [];
    return !requirements.length || supportsAnyStyleCapability(style?.capabilities || {}, requirements);
  });
}

export function quickControlAppliesToElement(widgetType, styleId, control, elementId) {
  const style = getWidgetStyleCapability(widgetType, styleId);
  if (!style) return false;
  const controls = getStyleQuickControlIds(widgetType, styleId, style);
  if (!controls.includes(control)) return false;
  const styleRequirements = QUICK_CONTROL_STYLE_REQUIREMENTS[control] || [];
  if (styleRequirements.length && !supportsAnyStyleCapability(style.capabilities || {}, styleRequirements)) return false;

  const elements = getWidgetStyleElements(widgetType, styleId);
  const element = elements.find(item => item.id === elementId) || elements[0] || null;
  const rule = QUICK_CONTROL_ELEMENT_REQUIREMENTS[control];
  if (!rule || !element) return true;
  if (rule.wholeWidget && isWholeWidgetElement(element)) return true;
  if (elementHasAnyCapability(element, rule.capabilities || [])) return true;
  if (elementHasAnyKind(element, rule.kinds || [])) return true;
  return false;
}

export function getWidgetStyleQuickControls(widgetType, styleId, elementId) {
  const style = getWidgetStyleCapability(widgetType, styleId);
  if (!style) return [];
  return getStyleQuickControlIds(widgetType, styleId, style)
    .filter(control => quickControlAppliesToElement(widgetType, styleId, control, elementId));
}

export function validateWidgetAppearanceRegistry(registry = widgetAppearanceRegistry) {
  const errors = [];
  for (const [id, entry] of Object.entries(registry || {})) {
    if (id !== entry.id) errors.push(`${id}: id mismatch`);
    if (!entry.widgetType) errors.push(`${id}: missing widgetType`);
    if (!entry.renderer || !entry.previewRenderer) errors.push(`${id}: missing renderer references`);
    if (!entry.schemaVersion) errors.push(`${id}: missing schema version`);
    if (!entry.elements || !Object.keys(entry.elements).length) errors.push(`${id}: missing elements`);
    if (!Array.isArray(entry.styles) || entry.styles.length === 0) errors.push(`${id}: missing styles`);
    for (const style of entry.styles || []) {
      if (!style.id) errors.push(`${id}: style missing id`);
      if (!style.label) errors.push(`${id}.${style.id || 'style'}: missing style label`);
      for (const key of Object.keys(style.capabilities || {})) {
        if (!QUICK_CAPABILITY_SET.has(key)) errors.push(`${id}.${style.id}: unknown quick capability ${key}`);
      }
      for (const elementId of style.elementIds || []) {
        if (!entry.elements?.[elementId]) errors.push(`${id}.${style.id}: unknown style element ${elementId}`);
      }
    }
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
