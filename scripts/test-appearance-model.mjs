import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});

const { registerWidget } = await server.ssrLoadModule('/src/components/OverlayCenter/widgets/widgetRegistry.js');
const { subValue } = await server.ssrLoadModule('/src/components/OverlayCenter/widgets/shared/appearanceStyles.js');
const {
  buildWidgetAppearanceVars,
  buildScopedAppearanceVars,
  SYSTEM_APPEARANCE,
  getWidgetAppearanceDefinition,
  getScopedAppearancePath,
  getScopedVisualPath,
  getWidgetActiveStyleId,
  getWidgetOverrideCount,
  omitPath,
  resolveAppearance,
  resolveAppearanceForTarget,
  resolveWidgetAppearance,
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
  appearanceDefaults: {
    appearance: {
      surfaces: { containerBg: '#242424' },
      borders: { radius: 15 },
    },
    subElements: {
      card: { background: '#2a2a2a', radius: 9 },
    },
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

const registryDefaultConfig = resolveWidgetAppearanceConfig({
  id: 'widget_registry_defaults',
  widget_type: 'appearance_test_widget',
  config: { bgColor: '#101010', borderRadius: 12, textColor: '#ffffff', fontFamily: 'Test Sans' },
}, { themeId: 'classic' });
assert.equal(registryDefaultConfig.bgColor, '#242424', 'registry appearance defaults feed visual config inheritance');
assert.equal(registryDefaultConfig.borderRadius, 15, 'registry appearance defaults feed dimensional config inheritance');
assert.equal(registryDefaultConfig.subElements.card.background, '#2a2a2a', 'registry appearance defaults feed element defaults');

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

const elementStateAppearance = {
  ...styleScopedAppearance,
  responsive: {
    overrides: {
      compact: {
        maxWidth: 800,
        appearance: {
          subElements: {
            card: { padding: 6 },
          },
        },
      },
    },
  },
  widgetTypes: {
    appearance_test_widget: {
      styles: {
        compact_horizontal: {
          subElements: {
            card: { background: '#222222', states: { selected: { background: '#333333' } } },
          },
        },
      },
    },
  },
  widgets: {
    widget_a: {
      styles: {
        compact_horizontal: {
          subElements: {
            card: { radius: 18, states: { selected: { background: '#444444' } } },
          },
        },
      },
    },
  },
};

const selectedCard = resolveWidgetAppearance({
  widgetType: 'appearance_test_widget',
  widgetId: 'widget_a',
  styleId: 'compact_horizontal',
  elementId: 'card',
  stateId: 'selected',
  viewport: { width: 640, height: 360 },
  globalAppearance: elementStateAppearance,
  draftAppearance: { subElements: { card: { states: { selected: { textColor: '#abcdef' } } } } },
});
assert.equal(selectedCard.element.background, '#444444', 'state-specific instance override wins over type style state');
assert.equal(selectedCard.element.radius, 18, 'element override inherits from instance style element');
assert.equal(selectedCard.element.padding, 6, 'responsive element override applies for matching viewport');
assert.equal(selectedCard.element.textColor, '#abcdef', 'temporary draft element state wins last');
assert.deepEqual(selectedCard.sourceOrder, ['system', 'theme', 'global', 'widget-type', 'widget-style', 'widget-instance', 'widget-element', 'responsive', 'draft'], 'resolver documents deterministic precedence');

const cardVars = buildScopedAppearanceVars({ element: selectedCard.element, prefix: '--test-card' });
assert.equal(cardVars['--test-card-background'], '#444444', 'token generator emits scoped background variable');
assert.equal(cardVars['--test-card-radius'], '18px', 'token generator adds px units for dimensional numbers');
assert.equal(cardVars['--test-card-text-color'], '#abcdef', 'token generator kebab-cases token names');

const widgetVars = buildWidgetAppearanceVars({
  subElements: {
    participantCard: {
      background: '#111111',
      states: { winner: { background: '#222222', opacity: 0.9 } },
    },
  },
});
assert.equal(widgetVars['--widget-participant-card-background'], '#111111', 'widget vars include element token variables');
assert.equal(widgetVars['--widget-participant-card-winner-background'], '#222222', 'widget vars include state token variables');
assert.equal(widgetVars['--widget-participant-card-winner-opacity'], 0.9, 'state token variables preserve unitless values');

const widgetDefinition = getWidgetAppearanceDefinition('appearance_test_widget');
assert.equal(widgetDefinition.type, 'appearance_test_widget', 'appearance definition exposes widget type');
assert.ok(widgetDefinition.elements.some(element => element.id === 'card'), 'appearance definition exposes element definitions');
assert.ok(widgetDefinition.supportedProperties.some(property => property.path === 'background'), 'appearance definition exposes generated property controls');

const bonusHuntDefinition = getWidgetAppearanceDefinition('bonus_hunt');
const bonusCardDefinition = bonusHuntDefinition.elements.find(element => element.id === 'bonusCard');
assert.ok(bonusCardDefinition, 'bonus hunt exposes the real bonus card element');
assert.ok(bonusCardDefinition.states.some(state => state.id === 'opened'), 'bonus card exposes opened as a state');
assert.ok(!bonusHuntDefinition.elements.some(element => element.id === 'openedState'), 'legacy opened pseudo-element is hidden from the editor contract');

const chatDefinition = getWidgetAppearanceDefinition('chat');
const messageDefinition = chatDefinition.elements.find(element => element.id === 'message');
assert.ok(messageDefinition.states.some(state => state.id === 'moderator'), 'chat message exposes moderator as a state');
assert.ok(!chatDefinition.elements.some(element => element.id === 'moderatorMessage'), 'legacy moderator pseudo-element is hidden from the editor contract');

assert.equal(
  subValue({ subElements: { bonusCard: { background: '#111111', states: { opened: { background: '#222222' } } } } }, 'openedState', 'background', '#000000'),
  '#222222',
  'legacy pseudo-elements resolve canonical state overrides'
);

console.log('appearance model tests passed');

await server.close();