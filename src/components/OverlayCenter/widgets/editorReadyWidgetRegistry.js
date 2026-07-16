import { compactEditableDefaults } from './slot-requests/styles/compact-editable/compactEditable.defaults.js';
import {
  compactEditableCapabilities,
  compactEditableSafeRanges,
} from './slot-requests/styles/compact-editable/compactEditable.capabilities.js';
import {
  compactEditableElementIds,
  compactEditableElements,
} from './slot-requests/styles/compact-editable/compactEditable.elements.js';
import { compactEditableQuickSchema } from './slot-requests/styles/compact-editable/compactEditable.quickSchema.js';
import { compactEditableAdvancedSchema } from './slot-requests/styles/compact-editable/compactEditable.advancedSchema.js';
import { compactEditablePreviewData } from './slot-requests/styles/compact-editable/compactEditable.previewData.js';
import {
  migrateCompactEditableSettings,
  validateCompactEditableSettings,
} from './slot-requests/styles/compact-editable/compactEditable.migrations.js';
import { classicRequestsEditableDefaults } from './bonus-hunt/styles/classic-requests-editable/classicRequestsEditable.defaults.js';
import {
  classicRequestsEditableCapabilities,
  classicRequestsEditableSafeRanges,
} from './bonus-hunt/styles/classic-requests-editable/classicRequestsEditable.capabilities.js';
import {
  classicRequestsEditableElementIds,
  classicRequestsEditableElements,
} from './bonus-hunt/styles/classic-requests-editable/classicRequestsEditable.elements.js';
import { classicRequestsEditableQuickSchema } from './bonus-hunt/styles/classic-requests-editable/classicRequestsEditable.quickSchema.js';
import { classicRequestsEditableAdvancedSchema } from './bonus-hunt/styles/classic-requests-editable/classicRequestsEditable.advancedSchema.js';
import { classicRequestsEditablePreviewData } from './bonus-hunt/styles/classic-requests-editable/classicRequestsEditable.previewData.js';
import {
  migrateClassicRequestsEditableSettings,
  validateClassicRequestsEditableSettings,
} from './bonus-hunt/styles/classic-requests-editable/classicRequestsEditable.migrations.js';

export const EDITOR_READY_WIDGET_CONTRACT_VERSION = 1;

export const KNOWN_STYLE_CAPABILITIES = Object.freeze([
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
]);

export const KNOWN_QUICK_CONTROLS = Object.freeze([
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
]);

export const KNOWN_ADVANCED_CONTROLS = Object.freeze([
  'background',
  'backgroundColor',
  'textColor',
  'borderColor',
  'borderWidth',
  'radius',
  'padding',
  'gap',
  'shadowBlur',
  'shadowOpacity',
  'glowBlur',
  'glowOpacity',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'imageSize',
  'backgroundSize',
  'opacity',
  'lineHeight',
]);

function freezeStyle(style) {
  return Object.freeze({
    ...style,
    capabilities: Object.freeze({ ...(style.capabilities || {}) }),
    editableElements: Object.freeze([...(style.editableElements || [])]),
    quickEditorSchema: Object.freeze([...(style.quickEditorSchema || [])]),
    advancedEditorSchema: Object.freeze([...(style.advancedEditorSchema || [])]),
    safeRanges: Object.freeze({ ...(style.safeRanges || {}) }),
    cssVariableMapping: Object.freeze({ ...(style.cssVariableMapping || {}) }),
    obsSafety: Object.freeze({ ...(style.obsSafety || {}) }),
  });
}

export const editorReadyWidgetRegistry = Object.freeze({
  bonus_hunt: Object.freeze({
    id: 'bonus_hunt',
    label: 'Bonus Hunt',
    category: 'bonus_hunt',
    contractVersion: EDITOR_READY_WIDGET_CONTRACT_VERSION,
    styleConfigKey: 'displayStyle',
    dataAdapter: 'useBonusHuntRequestsData',
    notes: 'Classic + Requests is the next editor-ready migration. The original V12 renderer remains the production fallback.',
    styles: Object.freeze({
      v12_classic_sr: freezeStyle({
        id: 'v12_classic_sr',
        label: 'Classic + Requests - Original',
        component: 'BonusHuntWidgetV12',
        legacy: true,
        editable: false,
        productionFallback: true,
        featureFlag: null,
        fallbackStyleId: null,
        defaultSettings: {},
        editableElements: [],
        quickEditorSchema: [],
        advancedEditorSchema: [],
        previewSampleData: classicRequestsEditablePreviewData,
      }),
      v12_classic_sr_editable: freezeStyle({
        id: 'v12_classic_sr_editable',
        label: 'Classic + Requests - Editable',
        component: 'BonusHuntWidgetV12',
        version: 1,
        legacy: false,
        editable: true,
        productionFallback: false,
        featureFlag: null,
        hiddenInProduction: false,
        fallbackStyleId: 'v12_classic_sr',
        defaultSettings: classicRequestsEditableDefaults,
        capabilities: classicRequestsEditableCapabilities,
        editableElements: classicRequestsEditableElementIds,
        elements: classicRequestsEditableElements,
        quickEditorSchema: classicRequestsEditableQuickSchema,
        advancedEditorSchema: classicRequestsEditableAdvancedSchema,
        previewSampleData: classicRequestsEditablePreviewData,
        safeRanges: classicRequestsEditableSafeRanges,
        minimumDimensions: Object.freeze({ width: 260, height: 520 }),
        maximumDimensions: Object.freeze({ width: 900, height: 1080 }),
        cssVariableMapping: Object.freeze({
          container: ['--bht-text', '--bht-card-radius'],
          headerContainer: ['--bht-header-bg', '--bht-header-accent'],
          statCell: ['--bht-count-bg'],
          slotCarouselContainer: ['--bht-current-bg', '--bht-current-accent'],
          slotListContainer: ['--bht-list-bg', '--bht-list-accent'],
          progressBar: ['--bht-progress-bg', '--bht-progress-fill'],
          footerContainer: ['--bht-summary-bg', '--bht-total-pay-bg'],
          requestsSectionContainer: ['--bht-list-bg', '--bht-list-accent'],
        }),
        obsSafety: Object.freeze({
          transparentBackground: true,
          noEditorChrome: true,
          noGlobalCssClasses: false,
          sharesDataAdapterWith: 'v12_classic_sr',
          preservesOriginalRenderer: true,
          avoidsAnimatedTransformOverride: true,
          structuralCarouselDimensionsLocked: true,
          embeddedRequestsShareDataAdapter: true,
        }),
        validateSettings: validateClassicRequestsEditableSettings,
        migrateSettings: migrateClassicRequestsEditableSettings,
      }),
    }),
  }),
  slot_requests: Object.freeze({
    id: 'slot_requests',
    label: 'Slot Requests',
    category: 'slot_requests',
    contractVersion: EDITOR_READY_WIDGET_CONTRACT_VERSION,
    styleConfigKey: 'displayStyle',
    dataAdapter: 'useSlotRequestsData',
    notes: 'Pilot widget for separating shared data logic from legacy and editor-ready presentations.',
    styles: Object.freeze({
      v3_compact: freezeStyle({
        id: 'v3_compact',
        label: 'Compact Overlay - Original',
        component: 'SlotRequestsCompactOverlay',
        legacy: true,
        editable: false,
        productionFallback: true,
        featureFlag: null,
        fallbackStyleId: null,
        defaultSettings: {},
        editableElements: [],
        quickEditorSchema: [],
        advancedEditorSchema: [],
        previewSampleData: compactEditablePreviewData,
      }),
      v3_compact_editable: freezeStyle({
        id: 'v3_compact_editable',
        label: 'Compact Overlay - Editable',
        component: 'SlotRequestsCompactEditable',
        version: 1,
        legacy: false,
        editable: true,
        productionFallback: false,
        featureFlag: 'appearanceEditablePilot',
        hiddenInProduction: true,
        fallbackStyleId: 'v3_compact',
        defaultSettings: compactEditableDefaults,
        capabilities: compactEditableCapabilities,
        editableElements: compactEditableElementIds,
        elements: compactEditableElements,
        quickEditorSchema: compactEditableQuickSchema,
        advancedEditorSchema: compactEditableAdvancedSchema,
        previewSampleData: compactEditablePreviewData,
        safeRanges: compactEditableSafeRanges,
        minimumDimensions: Object.freeze({ width: 220, height: 86 }),
        maximumDimensions: Object.freeze({ width: 720, height: 160 }),
        cssVariableMapping: Object.freeze({
          container: ['--srce-bg', '--srce-text', '--srce-accent', '--srce-padding', '--srce-gap'],
          requestCard: ['--srce-card-bg', '--srce-card-radius', '--srce-card-padding', '--srce-card-gap'],
          slotImage: ['--srce-img-size', '--srce-img-radius', '--srce-img-fit'],
          footer: ['--srce-accent'],
        }),
        obsSafety: Object.freeze({
          transparentBackground: true,
          noEditorChrome: true,
          noGlobalCssClasses: true,
          sharesDataAdapterWith: 'v3_compact',
          avoidsAnimatedTransformOverride: true,
        }),
        validateSettings: validateCompactEditableSettings,
        migrateSettings: migrateCompactEditableSettings,
      }),
    }),
  }),
});

export function getEditorReadyWidget(widgetId) {
  return editorReadyWidgetRegistry[widgetId] || null;
}

export function getEditorReadyWidgetStyle(widgetId, styleId) {
  const widget = getEditorReadyWidget(widgetId);
  return widget?.styles?.[styleId] || null;
}

export function isEditorReadyStyle(widgetId, styleId) {
  return !!getEditorReadyWidgetStyle(widgetId, styleId)?.editable;
}

export function shouldExposeEditorReadyStyle(style, env = {}) {
  if (!style?.hiddenInProduction) return true;
  if (env.dev === true) return true;
  if (env.appearanceEditablePilot === true) return true;
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) return true;
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APPEARANCE_EDITABLE_PILOT === 'true') return true;
  if (typeof window !== 'undefined' && window.localStorage?.getItem('appearanceEditablePilot') === '1') return true;
  return false;
}

export function filterUnsupportedStyleSettings(widgetId, styleId, source = {}) {
  const style = getEditorReadyWidgetStyle(widgetId, styleId);
  if (!style?.editable) return {};
  const allowed = new Set(Object.keys(style.defaultSettings || {}));
  return Object.fromEntries(
    Object.entries(source || {}).filter(([key]) => allowed.has(key))
  );
}

export function validateEditorReadyWidgetRegistry(registry = editorReadyWidgetRegistry) {
  const errors = [];
  const widgetIds = new Set();
  const knownCapabilities = new Set(KNOWN_STYLE_CAPABILITIES);
  const knownQuickControls = new Set(KNOWN_QUICK_CONTROLS);
  const knownAdvancedControls = new Set(KNOWN_ADVANCED_CONTROLS);

  for (const [widgetId, widget] of Object.entries(registry || {})) {
    if (widgetIds.has(widgetId)) errors.push(`${widgetId}: duplicate widget id`);
    widgetIds.add(widgetId);
    if (widget.id !== widgetId) errors.push(`${widgetId}: id mismatch`);
    if (!widget.label) errors.push(`${widgetId}: missing label`);
    if (!widget.styleConfigKey) errors.push(`${widgetId}: missing styleConfigKey`);
    if (!widget.dataAdapter) errors.push(`${widgetId}: missing shared data adapter`);
    if (!widget.styles || Object.keys(widget.styles).length === 0) errors.push(`${widgetId}: missing styles`);
    const styleIds = new Set();

    for (const [styleId, style] of Object.entries(widget.styles || {})) {
      if (styleIds.has(styleId)) errors.push(`${widgetId}.${styleId}: duplicate style id`);
      styleIds.add(styleId);
      if (style.id !== styleId) errors.push(`${widgetId}.${styleId}: style id mismatch`);
      if (!style.label) errors.push(`${widgetId}.${styleId}: missing label`);
      if (!style.component) errors.push(`${widgetId}.${styleId}: missing component reference`);
      if (style.legacy && style.editable) errors.push(`${widgetId}.${styleId}: legacy styles cannot be editable`);
      if (!style.legacy && !style.fallbackStyleId) errors.push(`${widgetId}.${styleId}: editable style must declare fallbackStyleId`);
      if (style.editable) {
        if (!style.version) errors.push(`${widgetId}.${styleId}: missing version`);
        if (!style.defaultSettings || Object.keys(style.defaultSettings).length === 0) errors.push(`${widgetId}.${styleId}: missing defaults`);
        if (!style.capabilities || Object.keys(style.capabilities).length === 0) errors.push(`${widgetId}.${styleId}: missing capabilities`);
        if (!style.editableElements?.length) errors.push(`${widgetId}.${styleId}: missing editable elements`);
        if (!style.quickEditorSchema?.length) errors.push(`${widgetId}.${styleId}: missing quick editor schema`);
        if (!style.advancedEditorSchema?.length) errors.push(`${widgetId}.${styleId}: missing advanced editor schema`);
        if (!style.previewSampleData?.states?.length) errors.push(`${widgetId}.${styleId}: missing preview sample states`);
        if (typeof style.validateSettings !== 'function') errors.push(`${widgetId}.${styleId}: missing settings validator`);
        if (typeof style.migrateSettings !== 'function') errors.push(`${widgetId}.${styleId}: missing settings migration`);
      }

      for (const capability of Object.keys(style.capabilities || {})) {
        if (!knownCapabilities.has(capability)) errors.push(`${widgetId}.${styleId}: unknown capability ${capability}`);
      }

      const elementSet = new Set(style.editableElements || []);
      for (const schema of style.quickEditorSchema || []) {
        for (const control of schema.controls || []) {
          if (!knownQuickControls.has(control)) errors.push(`${widgetId}.${styleId}: unknown quick control ${control}`);
        }
      }
      for (const schema of style.advancedEditorSchema || []) {
        if (!elementSet.has(schema.elementId)) errors.push(`${widgetId}.${styleId}: advanced schema references unknown element ${schema.elementId}`);
        for (const control of schema.controls || []) {
          if (!knownAdvancedControls.has(control)) errors.push(`${widgetId}.${styleId}: unknown advanced control ${control}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export default editorReadyWidgetRegistry;
