import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import {
  editorReadyWidgetRegistry,
  filterUnsupportedStyleSettings,
  getEditorReadyWidgetStyle,
  shouldExposeEditorReadyStyle,
  validateEditorReadyWidgetRegistry,
} from '../src/components/OverlayCenter/widgets/editorReadyWidgetRegistry.js';

const contractResult = validateEditorReadyWidgetRegistry();
assert.equal(contractResult.valid, true, `editor-ready registry validates: ${contractResult.errors.join(', ')}`);

const bonusHuntContract = editorReadyWidgetRegistry.bonus_hunt;
assert.ok(bonusHuntContract, 'Bonus Hunt has an editor-ready contract entry');
assert.equal(bonusHuntContract.dataAdapter, 'useBonusHuntRequestsData', 'Bonus Hunt Classic + Requests shares the request data adapter');

const originalBonusHunt = getEditorReadyWidgetStyle('bonus_hunt', 'v12_classic_sr');
assert.equal(originalBonusHunt.legacy, true, 'Bonus Hunt Classic + Requests original remains a legacy fallback');
assert.equal(originalBonusHunt.editable, false, 'Bonus Hunt original style is not marked editable');
assert.equal(originalBonusHunt.productionFallback, true, 'Bonus Hunt original style remains the production fallback');

const editableBonusHunt = getEditorReadyWidgetStyle('bonus_hunt', 'v12_classic_sr_editable');
assert.equal(editableBonusHunt.editable, true, 'Bonus Hunt editable Classic + Requests style is registered');
assert.equal(editableBonusHunt.fallbackStyleId, 'v12_classic_sr', 'Bonus Hunt editable style falls back to the original V12 style');
assert.equal(editableBonusHunt.hiddenInProduction, false, 'Bonus Hunt editable style is visible for testing');
assert.equal(shouldExposeEditorReadyStyle(editableBonusHunt, { dev: true }), true, 'development can expose the editable Bonus Hunt style');
assert.equal(shouldExposeEditorReadyStyle(editableBonusHunt, { dev: false, appearanceEditablePilot: false }), true, 'production exposes editable Bonus Hunt style for testing');
assert.ok(editableBonusHunt.editableElements.includes('requestsSectionContainer'), 'Bonus Hunt editable style declares the embedded requests panel');
assert.ok(editableBonusHunt.quickEditorSchema.some(section => section.controls.includes('carouselSpeed')), 'Bonus Hunt quick schema exposes safe carousel speed');
assert.ok(!editableBonusHunt.quickEditorSchema.some(section => section.controls.includes('imageSize')), 'Bonus Hunt quick schema hides unsafe structural image size');

const filteredBonusHunt = filterUnsupportedStyleSettings('bonus_hunt', 'v12_classic_sr_editable', {
  fontSize: 16,
  autoSpeed: 2500,
  slotImageHeight: 999,
});
assert.deepEqual(filteredBonusHunt, { fontSize: 16, autoSpeed: 2500 }, 'Bonus Hunt unsupported structural settings are filtered out');
assert.deepEqual(filterUnsupportedStyleSettings('bonus_hunt', 'v12_classic_sr', { fontSize: 16 }), {}, 'Bonus Hunt legacy style does not accept editor-ready settings');

const slotRequestsContract = editorReadyWidgetRegistry.slot_requests;
assert.ok(slotRequestsContract, 'Slot Requests has an editor-ready contract entry');
assert.equal(slotRequestsContract.dataAdapter, 'useSlotRequestsData', 'pilot styles share the same Slot Requests data adapter');

const original = getEditorReadyWidgetStyle('slot_requests', 'v3_compact');
assert.equal(original.legacy, true, 'original compact style remains a legacy fallback');
assert.equal(original.editable, false, 'legacy style is not marked editable');
assert.equal(original.productionFallback, true, 'original compact style remains the production fallback');

const editable = getEditorReadyWidgetStyle('slot_requests', 'v3_compact_editable');
assert.equal(editable.editable, true, 'editable compact style is registered');
assert.equal(editable.fallbackStyleId, 'v3_compact', 'editable compact style falls back to the original style');
assert.equal(editable.hiddenInProduction, true, 'editable compact style is hidden until the pilot is enabled');
assert.equal(shouldExposeEditorReadyStyle(editable, { dev: true }), true, 'development can expose the editable style');
assert.equal(shouldExposeEditorReadyStyle(editable, { dev: false, appearanceEditablePilot: false }), false, 'production hides the editable style without a flag');
assert.equal(shouldExposeEditorReadyStyle(editable, { appearanceEditablePilot: true }), true, 'feature flag can expose the editable style');
assert.ok(editable.editableElements.includes('slotImage'), 'editable compact style declares slot-image element');
assert.ok(editable.quickEditorSchema.some(section => section.controls.includes('carouselSpeed')), 'quick schema exposes carousel speed');
assert.ok(editable.advancedEditorSchema.some(section => section.elementId === 'slotImage' && section.controls.includes('imageSize')), 'advanced schema exposes supported image size');

const filtered = filterUnsupportedStyleSettings('slot_requests', 'v3_compact_editable', {
  fontSize: 16,
  imageSize: 48,
  stolenCss: 'display:none',
});
assert.deepEqual(filtered, { fontSize: 16, imageSize: 48 }, 'unsupported settings are filtered out');
assert.deepEqual(filterUnsupportedStyleSettings('slot_requests', 'v3_compact', { fontSize: 16 }), {}, 'legacy styles do not accept editor-ready settings');

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const registryModule = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js');
  const resolverModule = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/v2/appearanceResolver.js');
  const {
    getWidgetStyleCapability,
    getWidgetStyleQuickControls,
    styleSupportsQuickCapability,
    validateWidgetAppearanceRegistry,
  } = registryModule;
  const {
    applyWidgetAppearanceV2ToConfig,
    buildAppearanceV2ForStorage,
  } = resolverModule;

  const v2RegistryResult = validateWidgetAppearanceRegistry();
  assert.equal(v2RegistryResult.valid, true, `appearance v2 registry validates: ${v2RegistryResult.errors.join(', ')}`);

  const v2Editable = getWidgetStyleCapability('slot_requests', 'v3_compact_editable');
  assert.equal(v2Editable.editorReady, true, 'appearance registry knows the editable compact style');
  assert.equal(styleSupportsQuickCapability('slot_requests', 'v3_compact_editable', 'imageSize'), true, 'editable compact style supports image size');
  assert.equal(styleSupportsQuickCapability('slot_requests', 'v3_compact', 'imageSize'), false, 'legacy compact style does not expose image size');
  assert.equal(styleSupportsQuickCapability('slot_requests', 'v3_compact_editable', 'carouselSpeed'), true, 'editable compact style exposes carousel speed');

  const v2BonusHuntEditable = getWidgetStyleCapability('bonus_hunt', 'v12_classic_sr_editable');
  assert.equal(v2BonusHuntEditable.editorReady, true, 'appearance registry knows the editable Bonus Hunt Classic + Requests style');
  assert.equal(styleSupportsQuickCapability('bonus_hunt', 'v12_classic_sr_editable', 'carouselSpeed'), true, 'editable Bonus Hunt style exposes carousel speed');
  assert.equal(styleSupportsQuickCapability('bonus_hunt', 'v12_classic_sr_editable', 'imageSize'), false, 'editable Bonus Hunt style hides unsafe image size');

  const bhTitleQuickControls = getWidgetStyleQuickControls('bonus_hunt', 'v12_classic_sr_editable', 'headerTitle');
  assert.ok(bhTitleQuickControls.includes('fontFamily'), 'Bonus Hunt header title exposes text controls');
  assert.ok(!bhTitleQuickControls.includes('shape'), 'Bonus Hunt header title hides shape controls');
  assert.ok(!bhTitleQuickControls.includes('carouselSpeed'), 'Bonus Hunt header title hides carousel controls');
  assert.ok(!bhTitleQuickControls.includes('animationSpeed'), 'Bonus Hunt header title hides motion controls');

  const bhCarouselQuickControls = getWidgetStyleQuickControls('bonus_hunt', 'v12_classic_sr_editable', 'slotCarouselContainer');
  assert.ok(bhCarouselQuickControls.includes('shape'), 'Bonus Hunt carousel exposes supported shape controls');
  assert.ok(bhCarouselQuickControls.includes('carouselSpeed'), 'Bonus Hunt carousel exposes carousel speed');
  assert.ok(!bhCarouselQuickControls.includes('fontFamily'), 'Bonus Hunt carousel hides unrelated text controls');

  const bhRequestsQuickControls = getWidgetStyleQuickControls('bonus_hunt', 'v12_classic_sr_editable', 'requestsSectionContainer');
  assert.ok(bhRequestsQuickControls.includes('shape'), 'Bonus Hunt requests panel exposes surface controls');
  assert.ok(!bhRequestsQuickControls.includes('carouselSpeed'), 'Bonus Hunt requests panel hides carousel controls');

  const bhSlotImageQuickControls = getWidgetStyleQuickControls('bonus_hunt', 'v12_classic_sr_editable', 'slotImage');
  assert.ok(bhSlotImageQuickControls.includes('shape'), 'Bonus Hunt slot image exposes safe shape control');
  assert.ok(!bhSlotImageQuickControls.includes('imageSize'), 'Bonus Hunt slot image hides unsafe image size quick control');
  assert.ok(!bhSlotImageQuickControls.includes('carouselSpeed'), 'Bonus Hunt slot image hides carousel controls');

  const srContainerQuickControls = getWidgetStyleQuickControls('slot_requests', 'v3_compact_editable', 'container');
  assert.ok(srContainerQuickControls.includes('carouselSpeed'), 'Slot Requests whole widget exposes style motion controls');
  assert.ok(srContainerQuickControls.includes('scale'), 'Slot Requests whole widget exposes scale');

  const srImageQuickControls = getWidgetStyleQuickControls('slot_requests', 'v3_compact_editable', 'slotImage');
  assert.ok(srImageQuickControls.includes('imageSize'), 'Slot Requests image element exposes image size');
  assert.ok(srImageQuickControls.includes('imageFit'), 'Slot Requests image element exposes image fit');
  assert.ok(!srImageQuickControls.includes('carouselSpeed'), 'Slot Requests image element hides carousel controls');

  const srCardQuickControls = getWidgetStyleQuickControls('slot_requests', 'v3_compact_editable', 'requestCard');
  assert.ok(srCardQuickControls.includes('shape'), 'Slot Requests card exposes shape controls');
  assert.ok(srCardQuickControls.includes('shadowStrength'), 'Slot Requests card exposes supported shadow controls');
  assert.ok(!srCardQuickControls.includes('imageSize'), 'Slot Requests card hides image controls');
  assert.ok(!srCardQuickControls.includes('animationSpeed'), 'Slot Requests card hides motion controls');

  const srEmptyQuickControls = getWidgetStyleQuickControls('slot_requests', 'v3_compact_editable', 'emptyState');
  assert.ok(srEmptyQuickControls.includes('fontFamily'), 'Slot Requests empty state exposes text controls');
  assert.ok(!srEmptyQuickControls.includes('shape'), 'Slot Requests empty state hides unsupported shape controls');
  assert.ok(!srEmptyQuickControls.includes('shadowStrength'), 'Slot Requests empty state hides unsupported shadow controls');

  const scopedBonusHuntWidget = {
    id: 'bh-scoped',
    widget_type: 'bonus_hunt',
    config: {
      displayStyle: 'v12_classic_sr_editable',
      subElements: {},
    },
  };
  const scopedBonusHuntAppearanceV2 = buildAppearanceV2ForStorage('bonus_hunt', {
    material: 'original',
    primaryColor: '#facc15',
    textSize: 'large',
  });
  scopedBonusHuntAppearanceV2.elementOverrides = {
    headerTitle: {
      textColor: '#facc15',
      fontSize: 24,
    },
    slotCarouselContainer: {
      borderColor: '#facc15',
    },
  };
  const scopedBonusHuntResolved = applyWidgetAppearanceV2ToConfig(scopedBonusHuntWidget, scopedBonusHuntWidget.config, {
    widgets: {
      'bh-scoped': {
        styles: {
          v12_classic_sr_editable: {
            appearanceV2: scopedBonusHuntAppearanceV2,
          },
        },
      },
    },
  }, { styleId: 'v12_classic_sr_editable' });
  assert.equal(scopedBonusHuntResolved.subElements.headerTitle.fontSize, 24, 'Bonus Hunt scoped quick text size reaches the real subElement config');
  assert.equal(scopedBonusHuntResolved.subElements.headerTitle.textColor, '#facc15', 'Bonus Hunt scoped quick text colour reaches the real subElement config');
  assert.equal(scopedBonusHuntResolved.subElements.slotCarouselContainer.borderColor, '#facc15', 'Bonus Hunt scoped carousel surface colour reaches the real subElement config');

  const widget = {
    id: 'sr-pilot',
    widget_type: 'slot_requests',
    config: {
      displayStyle: 'v3_compact_editable',
      subElements: {},
    },
  };
  const appearance = {
    widgets: {
      'sr-pilot': {
        styles: {
          v3_compact_editable: {
            appearanceV2: buildAppearanceV2ForStorage('slot_requests', {
              material: 'glass',
              primaryColor: '#8b5cf6',
              shape: 'rounded',
              density: 'standard',
              textSize: 'standard',
              imageSize: 'large',
              imageShape: 'circle',
              imageFit: 'contain',
              carouselSpeed: 'fast',
              carouselAutoplay: false,
            }),
          },
        },
      },
    },
  };
  const resolved = applyWidgetAppearanceV2ToConfig(widget, widget.config, appearance, { styleId: 'v3_compact_editable' });
  assert.equal(resolved.displayStyle, 'v3_compact_editable', 'selected editable style reaches the renderer');
  assert.equal(resolved.autoSpeed, 1400, 'carousel speed resolves to real widget interval');
  assert.equal(resolved.carouselAutoplay, false, 'carousel autoplay setting resolves to real widget config');
  assert.equal(resolved.subElements.slotImage.imageFit, 'contain', 'editable compact style receives image fit');
  assert.ok(resolved.subElements.slotImage.imageSize > 38, 'editable compact style receives large image size');

  const scopedSlotRequestAppearanceV2 = buildAppearanceV2ForStorage('slot_requests', {
    material: 'glass',
    primaryColor: '#8b5cf6',
    imageSize: 'large',
    imageShape: 'circle',
    imageFit: 'contain',
  });
  scopedSlotRequestAppearanceV2.elementOverrides = {
    slotImage: {
      imageSize: 52,
      imageFit: 'contain',
      radius: 999,
    },
    requestCard: {
      shadow: '0 8px 24px rgba(139, 92, 246, 0.3)',
    },
  };
  const scopedSlotRequestResolved = applyWidgetAppearanceV2ToConfig(widget, widget.config, {
    widgets: {
      'sr-pilot': {
        styles: {
          v3_compact_editable: {
            appearanceV2: scopedSlotRequestAppearanceV2,
          },
        },
      },
    },
  }, { styleId: 'v3_compact_editable' });
  assert.equal(scopedSlotRequestResolved.subElements.slotImage.imageSize, 52, 'Slot Requests scoped image size reaches the real subElement config');
  assert.equal(scopedSlotRequestResolved.subElements.slotImage.imageFit, 'contain', 'Slot Requests scoped image fit reaches the real subElement config');
  assert.equal(scopedSlotRequestResolved.subElements.requestCard.shadow, '0 8px 24px rgba(139, 92, 246, 0.3)', 'Slot Requests scoped card effect reaches the real subElement config');

  const legacyWidget = {
    id: 'sr-legacy',
    widget_type: 'slot_requests',
    config: {
      displayStyle: 'v3_compact',
      subElements: {},
    },
  };
  const legacyAppearance = {
    widgets: {
      'sr-legacy': {
        styles: {
          v3_compact: {
            appearanceV2: buildAppearanceV2ForStorage('slot_requests', {
              material: 'glass',
              primaryColor: '#8b5cf6',
              imageSize: 'large',
              imageFit: 'contain',
            }),
          },
        },
      },
    },
  };
  const resolvedLegacy = applyWidgetAppearanceV2ToConfig(legacyWidget, legacyWidget.config, legacyAppearance, { styleId: 'v3_compact' });
  assert.equal(resolvedLegacy.subElements.slotImage.imageSize, undefined, 'legacy compact style still blocks unsafe image size');
  assert.equal(resolvedLegacy.subElements.slotImage.imageFit, undefined, 'legacy compact style still blocks image fit');

  const bonusHuntWidget = {
    id: 'bh-v12-editable',
    widget_type: 'bonus_hunt',
    config: {
      displayStyle: 'v12_classic_sr_editable',
      subElements: {},
    },
  };
  const bonusHuntAppearance = {
    widgets: {
      'bh-v12-editable': {
        styles: {
          v12_classic_sr_editable: {
            appearanceV2: buildAppearanceV2ForStorage('bonus_hunt', {
              material: 'metallic',
              primaryColor: '#f5b301',
              shape: 'rounded',
              density: 'standard',
              textSize: 'standard',
              carouselSpeed: 'fast',
              carouselAutoplay: false,
            }),
          },
        },
      },
    },
  };
  const resolvedBonusHunt = applyWidgetAppearanceV2ToConfig(bonusHuntWidget, bonusHuntWidget.config, bonusHuntAppearance, { styleId: 'v12_classic_sr_editable' });
  assert.equal(resolvedBonusHunt.displayStyle, 'v12_classic_sr_editable', 'editable Bonus Hunt style reaches the renderer dispatcher');
  assert.equal(resolvedBonusHunt.autoSpeed, 1400, 'Bonus Hunt carousel speed resolves to the real widget interval');
  assert.equal(resolvedBonusHunt.carouselAutoplay, false, 'Bonus Hunt carousel autoplay resolves to the real widget config');
  assert.equal(resolvedBonusHunt.subElements.slotImage?.imageSize, undefined, 'Bonus Hunt editable style still blocks structural image size');
  assert.ok(resolvedBonusHunt.subElements.requestsHeader, 'Bonus Hunt editable style maps embedded request header tokens');
} finally {
  await server.close();
}

const bonusHuntDispatcherSource = readFileSync(new URL('../src/components/OverlayCenter/widgets/BonusHuntWidget.jsx', import.meta.url), 'utf8');
assert.ok(bonusHuntDispatcherSource.includes('useBonusHuntRequestsData'), 'Bonus Hunt dispatcher uses shared request data hook');
assert.ok(bonusHuntDispatcherSource.includes('v12_classic_sr_editable'), 'Bonus Hunt dispatcher can route to the editable Classic + Requests style');

const bonusHuntV12Source = readFileSync(new URL('../src/components/OverlayCenter/widgets/BonusHuntWidgetV12.jsx', import.meta.url), 'utf8');
assert.ok(!bonusHuntV12Source.includes(".from('slot_requests')"), 'Bonus Hunt V12 renderer no longer owns the slot_requests query');
assert.ok(!bonusHuntV12Source.includes('supabase'), 'Bonus Hunt V12 renderer does not import Supabase directly');
assert.ok(bonusHuntV12Source.includes('slotRequests = []'), 'Bonus Hunt V12 receives shared request rows as props');

const dispatcherSource = readFileSync(new URL('../src/components/OverlayCenter/widgets/SlotRequestsWidget.jsx', import.meta.url), 'utf8');
assert.ok(dispatcherSource.includes('useSlotRequestsData'), 'dispatcher uses shared Slot Requests data hook');
assert.ok(!dispatcherSource.includes(".from('slot_requests')"), 'dispatcher no longer owns the Supabase query');
assert.ok(dispatcherSource.includes('v3_compact_editable'), 'dispatcher can route to the editable pilot style');

const legacySource = readFileSync(new URL('../src/components/OverlayCenter/widgets/SlotRequestsCompactOverlay.jsx', import.meta.url), 'utf8');
assert.ok(legacySource.includes('useSlotRequestCarousel'), 'legacy compact style shares carousel timing');

const editableSource = readFileSync(new URL('../src/components/OverlayCenter/widgets/slot-requests/styles/compact-editable/SlotRequestsCompactEditable.jsx', import.meta.url), 'utf8');
assert.ok(editableSource.includes('useSlotRequestCarousel'), 'editable compact style shares carousel timing');
assert.ok(!editableSource.includes('supabase'), 'editable presentation does not duplicate database logic');

const cssModuleSource = readFileSync(new URL('../src/components/OverlayCenter/widgets/slot-requests/styles/compact-editable/SlotRequestsCompactEditable.module.css', import.meta.url), 'utf8');
assert.ok(!cssModuleSource.includes(':root'), 'editable CSS module does not write global root variables');
assert.ok(!/^\.(title|header|card|container|value)\b/m.test(cssModuleSource), 'editable CSS module avoids generic global class names');

console.log('widget pilot tests passed');
