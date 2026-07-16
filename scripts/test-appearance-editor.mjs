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
  elementSupportsControl,
  getElementControlGroups,
  getFriendlyElementLabel,
  getModeLabel,
  getWidgetCategory,
  getWidgetElementSchema,
  inferElementKind,
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

  assert.ok(BUILT_IN_STYLE_PRESETS.length >= 9, 'built-in presets cover beginner starting points');
  assert.ok(BUILT_IN_STYLE_PRESETS.some(preset => preset.id === 'transparent_obs'), 'transparent OBS preset exists');

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

  console.log('appearance editor tests passed');
} finally {
  await server.close();
}
