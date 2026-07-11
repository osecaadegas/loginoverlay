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
  getScopedVisualPath,
  getWidgetActiveStyleId,
  getWidgetOverrideCount,
  omitPath,
  resolveAppearance,
  resolveAppearanceForTarget,
  resolveWidgetAppearanceConfig,
  resolveWidgetsForAppearance,
} = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/appearanceModel.js');

registerWidget({
  type: 'appearance_test_widget',
  label: 'Appearance Test Widget',
  defaults: {
    displayStyle: 'v1',
    bgColor: '#101010',
    borderRadius: 12,
    textColor: '#ffffff',
    fontFamily: 'Test Sans',
  },
  styles: [
    { id: 'v1', label: 'Classic' },
    { id: 'compact_horizontal', label: 'Compact Horizontal' },
  ],
  styleConfigKey: 'displayStyle',
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

assert.equal(
  getScopedAppearancePath({ scope: 'widget_instance', widgetId: 'widget_a', widgetType: 'appearance_test_widget', styleId: 'compact_horizontal' }, 'borders.radius'),
  'widgets.widget_a.styles.compact_horizontal.appearance.borders.radius',
  'style-scoped widget path writes to the selected instance/style root'
);

assert.equal(
  getScopedVisualPath({ scope: 'widget_instance', widgetId: 'widget_a', widgetType: 'appearance_test_widget', styleId: 'compact_horizontal' }, 'bgColor'),
  'widgets.widget_a.styles.compact_horizontal.visual.bgColor',
  'style-scoped visual path writes to the selected instance/style root'
);

const styleScopedAppearance = {
  ...baseAppearance,
  widgetTypes: {
    appearance_test_widget: {
      ...baseAppearance.widgetTypes.appearance_test_widget,
      styles: {
        compact_horizontal: {
          appearance: { borders: { radius: 30 }, surfaces: { containerBg: '#444444' } },
        },
      },
    },
  },
  widgets: {
    widget_a: {
      activeStyleId: 'compact_horizontal',
      customStyles: {
        custom_red: { id: 'custom_red', label: 'Custom Red', baseStyleId: 'compact_horizontal' },
      },
      styles: {
        v1: { appearance: { borders: { radius: 28 } } },
        compact_horizontal: {
          appearance: { borders: { radius: 32 } },
          visual: { bgColor: '#555555' },
        },
        custom_red: {
          appearance: { colors: { accent: '#ff0000' } },
        },
      },
    },
    widget_b: {
      activeStyleId: 'compact_horizontal',
      styles: {
        compact_horizontal: { appearance: { borders: { radius: 44 } } },
      },
    },
  },
};

const widgetA = {
  id: 'widget_a',
  widget_type: 'appearance_test_widget',
  config: { displayStyle: 'v1', bgColor: '#101010', borderRadius: 12, textColor: '#ffffff', fontFamily: 'Test Sans' },
};
const widgetB = {
  id: 'widget_b',
  widget_type: 'appearance_test_widget',
  config: { displayStyle: 'v1', bgColor: '#101010', borderRadius: 12, textColor: '#ffffff', fontFamily: 'Test Sans' },
};

assert.equal(getWidgetActiveStyleId(widgetA, styleScopedAppearance), 'compact_horizontal', 'active style is stored per widget instance');

const compactConfigA = resolveWidgetAppearanceConfig(widgetA, styleScopedAppearance);
assert.equal(compactConfigA.displayStyle, 'compact_horizontal', 'active style changes the renderer style config');
assert.equal(compactConfigA.__appearanceStyleId, 'compact_horizontal', 'resolved config carries the edited style ID');
assert.equal(compactConfigA.borderRadius, 32, 'instance/style override wins for active style');
assert.equal(compactConfigA.bgColor, '#555555', 'instance/style visual override wins for active style');

const classicPreviewConfig = resolveWidgetAppearanceConfig(widgetA, styleScopedAppearance, null, { styleSelections: { widget_a: 'v1' } });
assert.equal(classicPreviewConfig.displayStyle, 'v1', 'temporary style selection changes only the preview render style');
assert.equal(classicPreviewConfig.borderRadius, 28, 'temporary style selection preserves style-specific overrides');

const renderedWidgets = resolveWidgetsForAppearance([widgetA, widgetB], styleScopedAppearance);
assert.equal(renderedWidgets[0].config.borderRadius, 32, 'first widget keeps its own style override');
assert.equal(renderedWidgets[1].config.borderRadius, 44, 'second widget keeps a different override for the same style');

const customStyleConfig = resolveWidgetAppearanceConfig(widgetA, styleScopedAppearance, null, { styleSelections: { widget_a: 'custom_red' } });
assert.equal(customStyleConfig.displayStyle, 'compact_horizontal', 'custom style renders through its base registered style');
assert.equal(customStyleConfig.__appearanceStyleId, 'custom_red', 'custom style keeps its editable style identity');
assert.equal(customStyleConfig.borderRadius, 30, 'custom style inherits type defaults from its base registered style');
assert.equal(customStyleConfig.accentColor, '#ff0000', 'custom style stores independent visual values');

const resetStyleRadius = omitPath(styleScopedAppearance, 'widgets.widget_a.styles.compact_horizontal.appearance.borders.radius');
const resetConfig = resolveWidgetAppearanceConfig(widgetA, resetStyleRadius);
assert.equal(resetConfig.borderRadius, 30, 'resetting a style override restores the inherited type/style value');
assert.equal(getWidgetOverrideCount(styleScopedAppearance, 'widget_a', 'compact_horizontal'), 2, 'style-specific override count only includes that style root');

console.log('appearance model tests passed');

await server.close();