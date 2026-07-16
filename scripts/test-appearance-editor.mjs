import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});

const {
  BUILT_IN_STYLE_PRESETS,
  CONTROL_DEFINITIONS,
  DEFAULT_SIMPLE_SETTINGS,
  EDITOR_MODE_CAPABILITIES,
  elementSupportsControl,
  generateSimpleAppearance,
  getElementControlGroups,
  getFriendlyElementLabel,
  getModeLabel,
  getContrastRatio,
  getWidgetCategory,
  getWidgetElementSchema,
  inferElementKind,
  normalizeSimpleSettings,
  SIMPLE_COLOR_PALETTE,
  SIMPLE_DENSITIES,
  SIMPLE_MATERIAL_PRESETS,
  SIMPLE_SHAPES,
  SIMPLE_TEXT_SIZES,
  validateEditorValue,
} = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/editorSchema.js');

const {
  getTargetOverrideRoot,
  getElementAppearancePropertyPath,
  appearanceToWidgetConfigDefaults,
  setByPath,
  getByPath,
  normalizeAppearance,
} = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/appearanceModel.js');

try {
  assert.equal(getModeLabel('simple'), 'Simple Mode');
  assert.equal(getModeLabel('advanced'), 'Advanced Mode');
  assert.equal(EDITOR_MODE_CAPABILITIES.simple.showLayers, false, 'simple mode hides layers');
  assert.equal(EDITOR_MODE_CAPABILITIES.simple.previewMode, 'fit-widget', 'simple mode defaults to focused widget preview');
  assert.equal(EDITOR_MODE_CAPABILITIES.advanced.showLayers, true, 'advanced mode displays layers');

  assert.ok(BUILT_IN_STYLE_PRESETS.length >= 9, 'built-in presets cover beginner starting points');
  assert.ok(BUILT_IN_STYLE_PRESETS.some(preset => preset.id === 'transparent_obs'), 'transparent OBS preset exists');
  for (const material of ['original', 'matte', 'metallic', 'gradient', 'glass', 'neon', 'minimal', 'soft_shadow', 'transparent_obs']) {
    assert.ok(SIMPLE_MATERIAL_PRESETS.some(preset => preset.id === material), `${material} simple material exists`);
  }
  assert.equal(SIMPLE_MATERIAL_PRESETS.find(preset => preset.id === 'original')?.protected, true, 'Original is a protected built-in preset');
  assert.ok(SIMPLE_COLOR_PALETTE.length >= 8, 'simple mode exposes streamer-friendly colour swatches');
  assert.ok(SIMPLE_SHAPES.some(shape => shape.id === 'pill'), 'simple mode exposes pill shape');
  assert.ok(SIMPLE_DENSITIES.some(size => size.id === 'compact'), 'simple mode exposes compact size');
  assert.ok(SIMPLE_TEXT_SIZES.some(size => size.id === 'large'), 'simple mode exposes large text');

  assert.equal(getWidgetCategory({ widget_type: 'bonus_hunt' }), 'bonus_hunt');
  assert.equal(getWidgetCategory({ widget_type: 'slot_requests' }), 'slot_requests');
  assert.equal(getWidgetCategory({ widget_type: 'chat' }), 'chat');

  assert.equal(getFriendlyElementLabel('headerTitle'), 'Title');
  assert.equal(getFriendlyElementLabel('slotImage'), 'Slot image');

  const bonusElements = getWidgetElementSchema('bonus_hunt');
  assert.ok(bonusElements.length > 3, 'bonus hunt exposes editable layers');
  const header = bonusElements.find(element => element.id === 'headerTitle') || bonusElements.find(element => /title/i.test(element.id));
  assert.ok(header, 'bonus hunt has a title/header element');
  assert.equal(inferElementKind(header), 'text');

  const simpleHeaderGroups = getElementControlGroups(header, 'simple');
  const advancedHeaderGroups = getElementControlGroups(header, 'advanced');
  const simpleHeaderControls = simpleHeaderGroups.flatMap(group => group.controls.map(control => control.id));
  const advancedHeaderControls = advancedHeaderGroups.flatMap(group => group.controls.map(control => control.id));
  assert.ok(simpleHeaderControls.includes('fontSize'), 'simple mode exposes text size');
  assert.ok(simpleHeaderControls.includes('textColor'), 'simple mode exposes text color');
  assert.ok(!simpleHeaderControls.includes('letterSpacing'), 'simple mode hides letter spacing');
  assert.ok(advancedHeaderControls.includes('letterSpacing'), 'advanced mode exposes letter spacing');
  assert.ok(elementSupportsControl(header, 'fontFamily'), 'text layer supports font family');
  assert.ok(!elementSupportsControl(header, 'background'), 'title text does not show unrelated background control');

  const surface = bonusElements.find(element => /container|card|row/i.test(element.id)) || bonusElements[0];
  assert.ok(elementSupportsControl(surface, 'background'), 'surface layer supports background');
  assert.ok(elementSupportsControl(surface, 'radius'), 'surface layer supports rounded corners');

  assert.equal(validateEditorValue(CONTROL_DEFINITIONS.fontSize, 999), CONTROL_DEFINITIONS.fontSize.max);
  assert.equal(validateEditorValue(CONTROL_DEFINITIONS.opacity, -4), 0);
  assert.equal(validateEditorValue(CONTROL_DEFINITIONS.textColor, 'not-a-color'), '#ffffff');
  assert.equal(validateEditorValue(CONTROL_DEFINITIONS.textColor, '#14b8a6'), '#14b8a6');

  const target = { scope: 'widget_instance', widgetId: 'widget_a', widgetType: 'bonus_hunt', styleId: 'v12' };
  const root = getTargetOverrideRoot(target);
  assert.equal(root, 'widgets.widget_a.styles.v12');
  const headerPath = `${root}.elements.headerTitle.${getElementAppearancePropertyPath('fontSize')}`;
  const statPath = `${root}.elements.statValue.${getElementAppearancePropertyPath('fontSize')}`;
  const appearance = setByPath(normalizeAppearance({}), headerPath, 32);
  assert.equal(getByPath(appearance, headerPath), 32, 'header font value is stored on header path');
  assert.equal(getByPath(appearance, statPath), undefined, 'header font value does not leak to stat value path');
  const sizeConfig = appearanceToWidgetConfigDefaults({ container: { width: 420, height: 160 } });
  assert.equal(sizeConfig.widgetWidth, 420, 'widget width maps into shared widget config');
  assert.equal(sizeConfig.widgetHeight, 160, 'widget height maps into shared widget config');
  const scaledConfig = appearanceToWidgetConfigDefaults({ spacing: { widgetScale: 1.35 } });
  assert.equal(scaledConfig.widgetScale, 1.35, 'simple widget scale maps into shared widget config');

  const normalizedSimple = normalizeSimpleSettings({ material: 'unknown', primaryColor: 'bad', scale: 9 });
  assert.equal(normalizedSimple.material, DEFAULT_SIMPLE_SETTINGS.material, 'invalid simple material falls back safely');
  assert.equal(normalizedSimple.primaryColor, DEFAULT_SIMPLE_SETTINGS.primaryColor, 'invalid simple colour falls back safely');
  assert.equal(normalizedSimple.scale, 1.5, 'simple scale is clamped');

  const originalSimple = normalizeSimpleSettings({ material: 'original' });
  assert.equal(originalSimple.material, 'original', 'Original material is accepted by Simple Mode');
  const originalAppearance = generateSimpleAppearance(originalSimple);
  assert.equal(originalAppearance.generatedTokens.material, 'original', 'Original simple appearance records original intent');
  assert.equal(originalAppearance.surfaces, undefined, 'Original simple appearance does not generate generic surfaces');

  const metallicGold = generateSimpleAppearance({
    ...DEFAULT_SIMPLE_SETTINGS,
    material: 'metallic',
    primaryColor: '#f5b301',
    shape: 'rounded',
    density: 'standard',
  });
  assert.equal(metallicGold.surfaces.preset, 'metallic', 'metallic material updates generated surface preset');
  assert.equal(metallicGold.borders.radius, 16, 'rounded shape updates corners');
  assert.equal(metallicGold.spacing.widgetScale, 1, 'standard scale does not distort widget layout');
  assert.ok(metallicGold.generatedTokens.contrastRatio >= 4.5, 'metallic gold keeps readable text contrast');

  const glassCyan = generateSimpleAppearance({
    ...DEFAULT_SIMPLE_SETTINGS,
    material: 'glass',
    primaryColor: '#14d8d8',
    useSecondColor: true,
    accentColor: '#3b82f6',
  });
  assert.equal(glassCyan.surfaces.glass, true, 'glass material enables glass surface behavior');
  assert.ok(glassCyan.effects.backdropBlur > 0, 'glass material adds blur token');
  assert.ok(glassCyan.generatedTokens.contrastRatio >= 4.5, 'glass cyan keeps readable text contrast');

  const neonGreen = generateSimpleAppearance({
    ...DEFAULT_SIMPLE_SETTINGS,
    material: 'neon',
    primaryColor: '#22c55e',
    density: 'compact',
    textSize: 'large',
    boldText: true,
    scale: 1.25,
  });
  assert.equal(neonGreen.effects.glowEnabled, true, 'neon material enables controlled glow');
  assert.equal(neonGreen.surfaces.density, 'compact', 'compact density updates widget density');
  assert.equal(neonGreen.typography.baseSize, 17, 'large text updates generated typography');
  assert.equal(neonGreen.typography.bodyWeight, 800, 'bold text updates generated typography weight');
  assert.equal(neonGreen.spacing.widgetScale, 1.25, 'simple scale updates generated widget scale');
  assert.ok(getContrastRatio('#020617', neonGreen.colors.text) >= 4.5, 'neon green maintains acceptable text contrast');

  console.log('appearance editor tests passed');
} finally {
  await server.close();
}
