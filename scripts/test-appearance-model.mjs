import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});

const { registerWidget } = await server.ssrLoadModule('/src/components/OverlayCenter/widgets/widgetRegistry.js');
const {
  SYSTEM_APPEARANCE,
  getScopedAppearancePath,
  omitPath,
  resolveAppearance,
  resolveAppearanceForTarget,
  resolveWidgetAppearanceConfig,
} = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/appearanceModel.js');

registerWidget({
  type: 'appearance_test_widget',
  label: 'Appearance Test Widget',
  defaults: {
    bgColor: '#101010',
    borderRadius: 12,
    textColor: '#ffffff',
    fontFamily: 'Test Sans',
  },
});

const baseAppearance = {
  themeId: 'classic',
  colors: { text: '#111111' },
  surfaces: { containerBg: '#222222' },
  borders: { radius: 18 },
  widgetTypes: {
    appearance_test_widget: {
      appearance: { borders: { radius: 20 }, surfaces: { containerBg: '#333333' } },
    },
  },
  widgets: {
    widget_a: {
      appearance: { borders: { radius: 24 } },
    },
  },
};

const resolved = resolveAppearance({
  systemDefaults: SYSTEM_APPEARANCE,
  theme: { borders: { radius: 16 } },
  globalAppearance: { borders: { radius: 18 } },
  widgetTypeAppearance: { borders: { radius: 20 } },
  widgetInstanceAppearance: { borders: { radius: 24 } },
});
assert.equal(resolved.borders.radius, 24, 'instance override wins');

const instanceResolved = resolveAppearanceForTarget(baseAppearance, {
  scope: 'widget_instance',
  widgetId: 'widget_a',
  widgetType: 'appearance_test_widget',
});
assert.equal(instanceResolved.borders.radius, 24, 'target resolver uses instance override');

const withoutInstance = omitPath(baseAppearance, 'widgets.widget_a.appearance.borders.radius');
const inheritedResolved = resolveAppearanceForTarget(withoutInstance, {
  scope: 'widget_instance',
  widgetId: 'widget_a',
  widgetType: 'appearance_test_widget',
});
assert.equal(inheritedResolved.borders.radius, 20, 'removing instance override restores type override');

const widgetConfig = resolveWidgetAppearanceConfig({
  id: 'widget_a',
  widget_type: 'appearance_test_widget',
  config: { bgColor: '#101010', borderRadius: 12, textColor: '#ffffff', fontFamily: 'Test Sans' },
}, baseAppearance);
assert.equal(widgetConfig.borderRadius, 24, 'widget config receives resolved instance radius');
assert.equal(widgetConfig.bgColor, '#333333', 'widget config receives resolved type background');

assert.equal(
  getScopedAppearancePath({ scope: 'widget_instance', widgetId: 'widget_a', widgetType: 'appearance_test_widget' }, 'borders.radius'),
  'widgets.widget_a.appearance.borders.radius',
  'scoped widget path writes canonical appearance override'
);

assert.equal(
  getScopedAppearancePath({ scope: 'widget_instance', widgetId: 'widget_a', widgetType: 'appearance_test_widget' }, 'canvas.backgroundColor'),
  'canvas.backgroundColor',
  'canvas remains overlay-scoped'
);

console.log('appearance model tests passed');

await server.close();