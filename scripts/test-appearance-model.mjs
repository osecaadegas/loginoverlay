import assert from 'node:assert/strict';
import { createServer } from 'vite';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});

const { registerWidget, getAllWidgetDefs } = await server.ssrLoadModule('/src/components/OverlayCenter/widgets/widgetRegistry.js');
const { subValue } = await server.ssrLoadModule('/src/components/OverlayCenter/widgets/shared/appearanceStyles.js');
const { default: BonusHuntWidgetV12 } = await server.ssrLoadModule('/src/components/OverlayCenter/widgets/BonusHuntWidgetV12.jsx');
const { applyPreviewWidgetSamples } = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/previewWidgetSamples.js');
const {
  buildWidgetAppearanceVars,
  buildSubElementDefaults,
  buildScopedAppearanceVars,
  COMMON_APPEARANCE_PROPERTY_DEFINITIONS,
  SYSTEM_APPEARANCE,
  getWidgetAppearanceDefinition,
  getScopedAppearancePath,
  getScopedVisualPath,
  getWidgetActiveStyleId,
  getWidgetOverrideCount,
  getSupportedVisualKeys,
  normalizeAppearanceControlValue,
  omitPath,
  resolveAppearance,
  resolveAppearanceForTarget,
  resolveWidgetAppearance,
  resolveWidgetAppearanceConfig,
  resolveWidgetsForAppearance,
} = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/appearanceModel.js');

function sampleValueForVisualKey(key) {
  const name = String(key || '').toLowerCase();
  if (/size|width|height|weight|spacing|lineheight|opacity|padding|radius|blur|shadow|angle|speed|intensity/.test(name)) {
    if (name.includes('opacity')) return 0.65;
    if (name.includes('speed')) return 1.25;
    if (name.includes('weight')) return 700;
    if (name.includes('lineheight')) return 1.4;
    if (name.includes('angle')) return 90;
    return 24;
  }
  if (/fontfamily|font$/.test(name)) return "'Rajdhani', 'Segoe UI', sans-serif";
  if (/fit/.test(name)) return 'cover';
  if (/position/.test(name)) return 'center';
  if (/color|background|fill|bg|text|caption|provider|slotname|accent|primary|secondary|muted|divider|progress|spinner|sword|button|best|worst|positive|negative|border/.test(name)) return '#123456';
  return 'test-value';
}

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
assert.equal(inheritedResolved.borders.radius, 18, 'removing instance override restores global/default value without applying type override');
const explicitTypeResolved = resolveAppearanceForTarget(withoutInstance, {
  scope: 'widget_type',
  widgetType: 'appearance_test_widget',
});
assert.equal(explicitTypeResolved.borders.radius, 20, 'explicit widget-type target can still inspect type override');

const widgetConfig = resolveWidgetAppearanceConfig({
  id: 'widget_a',
  widget_type: 'appearance_test_widget',
  config: { bgColor: '#101010', borderRadius: 12, textColor: '#ffffff', fontFamily: 'Test Sans' },
}, baseAppearance);
assert.equal(widgetConfig.borderRadius, 24, 'widget config receives resolved instance radius');
assert.notEqual(widgetConfig.bgColor, '#333333', 'widget config ignores user type background during normal instance rendering');

const registryDefaultConfig = resolveWidgetAppearanceConfig({
  id: 'widget_registry_defaults',
  widget_type: 'appearance_test_widget',
  config: { bgColor: '#101010', borderRadius: 12, textColor: '#ffffff', fontFamily: 'Test Sans' },
}, { themeId: 'classic' });
assert.equal(registryDefaultConfig.bgColor, '#242424', 'registry appearance defaults feed visual config inheritance');
assert.equal(registryDefaultConfig.borderRadius, 15, 'registry appearance defaults feed dimensional config inheritance');
assert.equal(registryDefaultConfig.subElements.card.background, '#2a2a2a', 'registry appearance defaults feed element defaults');

const propertyDefinitionPaths = new Set(COMMON_APPEARANCE_PROPERTY_DEFINITIONS.map(property => property.path));
for (const property of ['fontFamily', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign']) {
  assert.ok(propertyDefinitionPaths.has(property), `common property registry exposes ${property}`);
}

assert.equal(normalizeAppearanceControlValue('animSpeed', { duration: 350 }, 'slider'), 0, 'object animation values are normalized before binding to numeric inputs');
assert.equal(normalizeAppearanceControlValue('fontFamily', { value: 'Bad Object' }, 'text'), '', 'object font values are normalized before binding to text inputs');
assert.equal(normalizeAppearanceControlValue('textColor', { token: 'primary' }, 'color'), '', 'object color values are normalized before binding to color inputs');

const typographyElementDefaults = buildSubElementDefaults('appearance_test_widget', {
  typography: {
    bodyFont: 'Spec Sans',
    baseSize: 17,
    bodyWeight: 700,
    fontStyle: 'italic',
    lineHeight: 1.6,
    letterSpacing: 0.04,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
assert.equal(typographyElementDefaults.label.fontFamily, 'Spec Sans', 'element typography defaults include font family');
assert.equal(typographyElementDefaults.label.fontStyle, 'italic', 'element typography defaults include font style');
assert.equal(typographyElementDefaults.label.lineHeight, 1.6, 'element typography defaults include line height');
assert.equal(typographyElementDefaults.label.letterSpacing, 0.04, 'element typography defaults include letter spacing');
assert.equal(typographyElementDefaults.label.textTransform, 'uppercase', 'element typography defaults include text transform');
assert.equal(typographyElementDefaults.label.textAlign, 'center', 'element typography defaults include text alignment');

const betsTypographyDefaults = buildSubElementDefaults('bets', {
  typography: {
    headingFont: 'Heading Face',
    bodyFont: 'Body Face',
    numberFont: 'Number Face',
    baseSize: 20,
    headingScale: 1.5,
    lineHeight: 1.8,
    letterSpacing: 0.02,
    textTransform: 'uppercase',
  },
});
assert.equal(betsTypographyDefaults.title.fontFamily, 'Heading Face', 'bets title inherits heading font defaults');
assert.equal(betsTypographyDefaults.title.fontSize, 30, 'bets title inherits heading scale defaults');
assert.equal(betsTypographyDefaults.optionLabel.fontFamily, 'Body Face', 'bets option label inherits body font defaults');
assert.equal(betsTypographyDefaults.percentage.fontFamily, 'Number Face', 'bets percentage inherits number font defaults');
assert.equal(betsTypographyDefaults.statistics.fontFamily, 'Number Face', 'bets statistics inherit number font defaults');
assert.equal(betsTypographyDefaults.optionLabel.lineHeight, 1.8, 'bets option label inherits shared line height defaults');
assert.equal(betsTypographyDefaults.optionLabel.textTransform, 'uppercase', 'bets option label inherits shared text transform defaults');

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
assert.notEqual(customStyleConfig.borderRadius, 30, 'custom style does not inherit user type defaults from its base registered style');
assert.equal(customStyleConfig.accentColor, '#ff0000', 'custom style stores independent visual values');

const resetStyleRadius = omitPath(styleScopedAppearance, 'widgets.widget_a.styles.compact_horizontal.appearance.borders.radius');
const resetConfig = resolveWidgetAppearanceConfig(widgetA, resetStyleRadius);
assert.notEqual(resetConfig.borderRadius, 30, 'resetting a style override does not restore a user type/style value');
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
    label: {
      fontStyle: 'italic',
      lineHeight: 1.4,
      letterSpacing: 0.03,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
  },
});
assert.equal(widgetVars['--widget-participant-card-background'], '#111111', 'widget vars include element token variables');
assert.equal(widgetVars['--widget-participant-card-winner-background'], '#222222', 'widget vars include state token variables');
assert.equal(widgetVars['--widget-participant-card-winner-opacity'], 0.9, 'state token variables preserve unitless values');
assert.equal(widgetVars['--widget-label-font-style'], 'italic', 'widget vars include font style token variables');
assert.equal(widgetVars['--widget-label-line-height'], 1.4, 'widget vars preserve unitless line-height variables');
assert.equal(widgetVars['--widget-label-letter-spacing'], '0.03em', 'widget vars serialize numeric letter spacing as em');
assert.equal(widgetVars['--widget-label-text-transform'], 'uppercase', 'widget vars include text transform variables');
assert.equal(widgetVars['--widget-label-text-align'], 'center', 'widget vars include text alignment variables');

const widgetDefinition = getWidgetAppearanceDefinition('appearance_test_widget');
assert.equal(widgetDefinition.type, 'appearance_test_widget', 'appearance definition exposes widget type');
assert.ok(widgetDefinition.elements.some(element => element.id === 'card'), 'appearance definition exposes element definitions');
assert.ok(widgetDefinition.supportedProperties.some(property => property.path === 'background'), 'appearance definition exposes generated property controls');

const bonusHuntDefinition = getWidgetAppearanceDefinition('bonus_hunt');
const bonusCardDefinition = bonusHuntDefinition.elements.find(element => element.id === 'bonusCard');
assert.ok(bonusCardDefinition, 'bonus hunt exposes the real bonus card element');
assert.ok(bonusCardDefinition.states.some(state => state.id === 'opened'), 'bonus card exposes opened as a state');
assert.ok(!bonusHuntDefinition.elements.some(element => element.id === 'openedState'), 'legacy opened pseudo-element is hidden from the editor contract');

for (const elementId of ['headerContainer', 'headerIcon', 'headerTitle', 'mainStatsContainer', 'statCell', 'statLabel', 'statValue', 'tagContainer', 'tagText', 'slotCarouselContainer', 'slotImage', 'progressBar', 'progressBarFill', 'progressCount', 'slotListContainer', 'slotRow', 'slotPositionNumber', 'slotThumbnail', 'slotTitle', 'winLabel', 'winValue', 'multiplierLabel', 'multiplierValue', 'betLabel', 'betValue', 'requestsSectionContainer', 'requestsHeader', 'requestsDescription', 'requestsEmpty', 'footerContainer', 'footerLabel', 'footerTotalValue']) {
  assert.ok(bonusHuntDefinition.elements.some(element => element.id === elementId), `bonus hunt Classic + Requests exposes ${elementId}`);
}

const bonusHuntV12Widget = {
  id: 'bonus_hunt_v12_a',
  widget_type: 'bonus_hunt',
  config: { displayStyle: 'v12_classic_sr', fontSize: 15, fontFamily: 'Legacy Sans' },
};
const bonusHuntV12StandardConfig = resolveWidgetAppearanceConfig(bonusHuntV12Widget, { themeId: 'classic' });
assert.deepEqual(bonusHuntV12StandardConfig.__appearanceExplicitSubElements, {}, 'standard Bonus Hunt V12 has no explicit child element overrides');
assert.equal(subValue(bonusHuntV12StandardConfig, 'headerTitle', 'fontSize', 'css-default'), 'css-default', 'generated element defaults do not override standard renderer fallbacks');
const bonusHuntV12StandardMarkup = renderToStaticMarkup(React.createElement(BonusHuntWidgetV12, {
  config: bonusHuntV12StandardConfig,
  userId: null,
}));
assert.ok(bonusHuntV12StandardMarkup.includes('data-widget-element="headerTitle"'), 'standard Bonus Hunt V12 renders the header target');
assert.ok(!/data-widget-element="headerTitle"[^>]*style=/.test(bonusHuntV12StandardMarkup), 'standard Bonus Hunt V12 header keeps CSS-driven styling');
assert.ok(!/data-widget-element="statLabel"[^>]*style=/.test(bonusHuntV12StandardMarkup), 'standard Bonus Hunt V12 stat labels keep CSS-driven styling');
assert.ok(!/data-widget-element="slotTitle"[^>]*style=/.test(bonusHuntV12StandardMarkup), 'standard Bonus Hunt V12 slot titles keep CSS-driven styling');
const bonusHuntV12Appearance = {
  themeId: 'classic',
  widgetTypes: {
    bonus_hunt: {
      styles: {
        v3: {
          elements: {
            headerTitle: { typography: { fontSize: 20 } },
          },
        },
      },
    },
  },
  widgets: {
    bonus_hunt_v12_a: {
      styles: {
        v12_classic_sr: {
          elements: {
            headerTitle: { typography: { fontSize: 42, fontWeight: 900 }, colors: { text: '#112233' } },
            statValue: { typography: { fontWeight: 800 } },
            requestsHeader: { colors: { text: '#abcdef' } },
            slotRow: { states: { active: { colors: { background: '#010203' } } } },
          },
        },
        v3: {
          elements: {
            headerTitle: { typography: { fontSize: 20 } },
          },
        },
      },
    },
    bonus_hunt_v12_b: {
      styles: {
        v12_classic_sr: {
          elements: {
            headerTitle: { typography: { fontSize: 24 } },
          },
        },
      },
    },
  },
};
const bonusHuntV12Config = resolveWidgetAppearanceConfig(bonusHuntV12Widget, bonusHuntV12Appearance);
assert.equal(bonusHuntV12Config.displayStyle, 'v12_classic_sr', 'bonus hunt Classic + Requests keeps its renderer style');
assert.equal(bonusHuntV12Config.__appearanceExplicitSubElements.headerTitle.fontSize, 42, 'explicit child element metadata includes real header override');
assert.equal(subValue(bonusHuntV12Config, 'headerTitle', 'fontSize', 'css-default'), 42, 'explicit element overrides still reach shared renderer helpers');
assert.equal(bonusHuntV12Config.subElements.headerTitle.fontSize, 42, 'grouped headerTitle font size resolves to flat renderer config');
assert.equal(bonusHuntV12Config.subElements.headerTitle.fontWeight, 900, 'grouped headerTitle font weight resolves to flat renderer config');
assert.equal(bonusHuntV12Config.subElements.headerTitle.textColor, '#112233', 'grouped headerTitle text color resolves to flat renderer config');
assert.notEqual(bonusHuntV12Config.subElements.statLabel.fontSize, 42, 'headerTitle font size does not leak to stat labels');
assert.notEqual(bonusHuntV12Config.subElements.statValue.fontSize, 42, 'headerTitle font size does not leak to stat values');
assert.notEqual(bonusHuntV12Config.subElements.slotTitle.fontSize, 42, 'headerTitle font size does not leak to slot titles');
assert.notEqual(bonusHuntV12Config.subElements.requestsHeader.fontSize, 42, 'headerTitle font size does not leak to requests header');
assert.notEqual(bonusHuntV12Config.subElements.footerTotalValue.fontSize, 42, 'headerTitle font size does not leak to footer totals');
assert.equal(bonusHuntV12Config.subElements.statValue.fontWeight, 800, 'stat value font weight remains independently scoped');
assert.equal(bonusHuntV12Config.subElements.requestsHeader.textColor, '#abcdef', 'requests header colour remains independently scoped');
assert.notEqual(bonusHuntV12Config.subElements.headerTitle.textColor, '#abcdef', 'requests header colour does not leak to main header');
assert.equal(bonusHuntV12Config.subElements.slotRow.states.active.background, '#010203', 'slot row active state resolves from grouped state override');
assert.notEqual(bonusHuntV12Config.subElements.slotRow.background, '#010203', 'slot row active state does not overwrite default state');
const bonusHuntV12CustomizedMarkup = renderToStaticMarkup(React.createElement(BonusHuntWidgetV12, {
  config: bonusHuntV12Config,
  userId: null,
}));
assert.match(bonusHuntV12CustomizedMarkup, /data-widget-element="headerTitle"[^>]*style="[^"]*font-size:42px/, 'custom Bonus Hunt V12 header renders explicit inline font size');
assert.doesNotMatch(bonusHuntV12CustomizedMarkup, /data-widget-element="statLabel"[^>]*style="[^"]*font-size:42px/, 'custom Bonus Hunt V12 header font size does not render on stat labels');

const bonusHuntSelectedHeader = resolveWidgetAppearance({
  widgetType: 'bonus_hunt',
  widgetId: 'bonus_hunt_v12_a',
  styleId: 'v12_classic_sr',
  elementId: 'headerTitle',
  globalAppearance: bonusHuntV12Appearance,
});
const bonusHuntSelectedStats = resolveWidgetAppearance({
  widgetType: 'bonus_hunt',
  widgetId: 'bonus_hunt_v12_a',
  styleId: 'v12_classic_sr',
  elementId: 'statValue',
  globalAppearance: bonusHuntV12Appearance,
});
assert.equal(bonusHuntSelectedHeader.element.fontSize, 42, 'selected header resolver returns the header font size');
assert.notEqual(bonusHuntSelectedStats.element.fontSize, 42, 'selected stat resolver does not inherit the header font size');

const bonusHuntResponsiveHeader = resolveWidgetAppearance({
  widgetType: 'bonus_hunt',
  widgetId: 'bonus_hunt_v12_a',
  styleId: 'v12_classic_sr',
  elementId: 'headerTitle',
  viewport: { width: 640, height: 360 },
  globalAppearance: bonusHuntV12Appearance,
  responsiveAppearance: {
    overrides: {
      compact: {
        maxWidth: 800,
        elements: {
          headerTitle: { typography: { fontSize: 33 } },
        },
      },
    },
  },
});
assert.equal(bonusHuntResponsiveHeader.element.fontSize, 33, 'responsive grouped header override applies at matching viewport');

const bonusHuntV3Config = resolveWidgetAppearanceConfig(bonusHuntV12Widget, bonusHuntV12Appearance, null, { styleSelections: { bonus_hunt_v12_a: 'v3' } });
assert.equal(bonusHuntV3Config.displayStyle, 'v3', 'temporary selection can render another Bonus Hunt style');
assert.equal(bonusHuntV3Config.subElements.headerTitle.fontSize, 20, 'Bonus Hunt v3 keeps its own style-level header font size');
assert.notEqual(bonusHuntV3Config.subElements.headerTitle.fontSize, 42, 'Classic + Requests header font size does not leak to other Bonus Hunt styles');

const bonusHuntOtherWidgetConfig = resolveWidgetAppearanceConfig({
  id: 'bonus_hunt_v12_b',
  widget_type: 'bonus_hunt',
  config: { displayStyle: 'v12_classic_sr' },
}, bonusHuntV12Appearance);
assert.equal(bonusHuntOtherWidgetConfig.subElements.headerTitle.fontSize, 24, 'second Bonus Hunt instance keeps its own header font size');
assert.notEqual(bonusHuntOtherWidgetConfig.subElements.headerTitle.fontSize, 42, 'first Bonus Hunt instance header font size does not leak to another instance');

const chatDefinition = getWidgetAppearanceDefinition('chat');
const messageDefinition = chatDefinition.elements.find(element => element.id === 'message');
assert.ok(messageDefinition.states.some(state => state.id === 'moderator'), 'chat message exposes moderator as a state');
assert.ok(!chatDefinition.elements.some(element => element.id === 'moderatorMessage'), 'legacy moderator pseudo-element is hidden from the editor contract');

const expectWidgetElements = (widgetType, elementIds) => {
  const definition = getWidgetAppearanceDefinition(widgetType);
  for (const elementId of elementIds) {
    assert.ok(definition.elements.some(element => element.id === elementId), `${widgetType} exposes ${elementId} as an editable element`);
  }
};

expectWidgetElements('bh_stats', ['container', 'statsCard', 'label', 'value', 'progressBar', 'bestStat', 'worstStat']);
expectWidgetElements('spotify_now_playing', ['container', 'albumArt', 'trackTitle', 'artistName', 'playbackState', 'progressBar']);
expectWidgetElements('rtp_stats', ['container', 'statCard', 'provider', 'slotTitle', 'label', 'rtpValue', 'volatility', 'maxWin', 'personalBest', 'spinner']);

const otherWidgetContracts = [
  {
    widgetType: 'bh_stats',
    elementId: 'statsCard',
    values: { background: '#111827', borderColor: '#223344', accentColor: '#f59e0b' },
    expectedProperty: 'accentColor',
    expectedValue: '#f59e0b',
  },
  {
    widgetType: 'spotify_now_playing',
    elementId: 'trackTitle',
    values: { textColor: '#22c55e', fontSize: 24, fontWeight: 800 },
    expectedProperty: 'textColor',
    expectedValue: '#22c55e',
  },
  {
    widgetType: 'rtp_stats',
    elementId: 'slotTitle',
    values: { textColor: '#60a5fa', fontSize: 21, fontWeight: 900 },
    expectedProperty: 'fontSize',
    expectedValue: 21,
  },
];
for (const contract of otherWidgetContracts) {
  const widgetId = `${contract.widgetType}_contract_widget`;
  const resolvedConfig = resolveWidgetAppearanceConfig({
    id: widgetId,
    widget_type: contract.widgetType,
    config: {},
  }, {
    themeId: 'classic',
    widgets: {
      [widgetId]: {
        subElements: {
          [contract.elementId]: contract.values,
        },
      },
    },
  });
  assert.equal(
    resolvedConfig.subElements[contract.elementId][contract.expectedProperty],
    contract.expectedValue,
    `${contract.widgetType}.${contract.elementId}.${contract.expectedProperty} resolves into widget config`
  );
}

const previewSampleWidgets = applyPreviewWidgetSamples([
  { id: 'bets_preview', widget_type: 'bets', width: 320, height: 180, config: { gameStatus: 'idle', options: [] } },
  { id: 'spotify_preview', widget_type: 'spotify_now_playing', width: 260, height: 100, config: {} },
  { id: 'giveaway_preview', widget_type: 'giveaway', width: 280, height: 180, config: {} },
], { now: 1000000, expandFrames: true });
const sampledBets = previewSampleWidgets.find(widget => widget.id === 'bets_preview');
assert.equal(sampledBets.config.gameStatus, 'open', 'preview samples open idle bets widgets');
assert.ok(sampledBets.config.options.length >= 4, 'preview samples provide bets options');
assert.ok(Object.keys(sampledBets.config.bets).length >= sampledBets.config.options.length, 'preview samples provide a visible bets pool');
assert.ok(sampledBets.__previewFrame.width >= 560 && sampledBets.__previewFrame.height >= 460, 'preview samples expand the bets workbench frame');
const sampledSpotify = previewSampleWidgets.find(widget => widget.id === 'spotify_preview');
assert.equal(sampledSpotify.config.manualTrack, 'Bonus Hunt Live', 'preview samples provide spotify track data');
const sampledGiveaway = previewSampleWidgets.find(widget => widget.id === 'giveaway_preview');
assert.equal(sampledGiveaway.config.isActive, true, 'preview samples activate giveaway widgets');
assert.ok(sampledGiveaway.config.participants.length > 0, 'preview samples provide giveaway participants');

const betsDefinition = getWidgetAppearanceDefinition('bets');
for (const elementId of ['container', 'title', 'status', 'statistics', 'optionRow', 'optionNumber', 'optionLabel', 'percentage', 'footer', 'progressBar']) {
  assert.ok(betsDefinition.elements.some(element => element.id === elementId), `bets exposes ${elementId} as an editable element`);
}

const betsWidget = {
  id: 'bets_a',
  widget_type: 'bets',
  config: {
    displayStyle: 'v1_list',
    bgColor: 'rgba(10,14,20,0.94)',
    textColor: '#d4dce8',
    fontFamily: 'Legacy Sans',
    fontSize: 14,
  },
};
const betsAppearance = {
  themeId: 'classic',
  widgets: {
    bets_a: {
      styles: {
        v1_list: {
          subElements: {
            title: { fontFamily: 'Bets Heading', fontSize: 31, textColor: '#112233' },
            optionRow: { radius: 22, padding: 13, gap: 9 },
            optionNumber: { background: '#445566', radius: 11 },
            optionLabel: { fontSize: 19, lineHeight: 1.7, textTransform: 'uppercase' },
            percentage: { fontFamily: 'Bets Number', fontSize: 23, textColor: '#778899' },
            progressBar: { background: '#010203', fillColor: '#abcdef', height: 12, radius: 6 },
          },
        },
      },
    },
  },
};
const betsConfig = resolveWidgetAppearanceConfig(betsWidget, betsAppearance);
assert.equal(betsConfig.subElements.title.fontSize, 31, 'bets title style override reaches widget config');
assert.equal(betsConfig.subElements.optionRow.radius, 22, 'bets option row radius override reaches widget config');
assert.equal(betsConfig.subElements.optionNumber.background, '#445566', 'bets option number background override reaches widget config');
assert.equal(betsConfig.subElements.optionLabel.textTransform, 'uppercase', 'bets option label typography override reaches widget config');
assert.equal(betsConfig.subElements.percentage.fontFamily, 'Bets Number', 'bets percentage number font override reaches widget config');
assert.equal(betsConfig.subElements.progressBar.fillColor, '#abcdef', 'bets progress fill override reaches widget config');
const betsOverrideVars = buildWidgetAppearanceVars(betsConfig);
assert.equal(betsOverrideVars['--widget-title-font-size'], '31px', 'explicit bets title override emits element CSS var');
assert.equal(betsOverrideVars['--widget-progress-bar-fill-color'], '#abcdef', 'explicit bets progress fill override emits element CSS var');

const inheritingBetsWidget = {
  id: 'bets_global',
  widget_type: 'bets',
  config: { displayStyle: 'v1_list' },
};
const globalBetsConfig = resolveWidgetAppearanceConfig(inheritingBetsWidget, {
  themeId: 'classic',
  typography: {
    headingFont: 'Global Heading',
    bodyFont: 'Global Body',
    numberFont: 'Global Number',
    baseSize: 18,
    headingScale: 1.4,
    lineHeight: 1.65,
    letterSpacing: 0.04,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  surfaces: {
    containerBg: '#010101',
    cardBg: '#020202',
    padding: 17,
    gap: 12,
  },
  borders: {
    color: '#030303',
    radius: 21,
    width: 3,
  },
});
assert.equal(globalBetsConfig.headingFont, 'Global Heading', 'bets config receives global heading font');
assert.equal(globalBetsConfig.numberFont, 'Global Number', 'bets config receives global number font');
assert.equal(globalBetsConfig.lineHeight, 1.65, 'bets config receives global line height');
assert.equal(globalBetsConfig.letterSpacing, 0.04, 'bets config receives global letter spacing');
assert.equal(globalBetsConfig.bgColor, '#010101', 'bets config receives global container background');
assert.equal(globalBetsConfig.subElements.container.background, '#010101', 'bets container element inherits global container background');
assert.equal(globalBetsConfig.subElements.title.fontFamily, 'Global Heading', 'bets title element inherits global heading font');
assert.equal(globalBetsConfig.subElements.title.fontSize, 25, 'bets title element inherits global heading scale');
assert.equal(globalBetsConfig.subElements.percentage.fontFamily, 'Global Number', 'bets percentage element inherits global number font');
assert.equal(globalBetsConfig.subElements.optionRow.radius, 21, 'bets option row inherits global radius');

const globalBetsVars = buildWidgetAppearanceVars(globalBetsConfig);
assert.equal(globalBetsVars['--widget-heading-font'], 'Global Heading', 'widget CSS vars expose heading font');
assert.equal(globalBetsVars['--widget-number-font'], 'Global Number', 'widget CSS vars expose number font');
assert.equal(globalBetsVars['--widget-line-height'], 1.65, 'widget CSS vars expose line height');
assert.equal(globalBetsVars['--widget-letter-spacing'], '0.04em', 'widget CSS vars expose letter spacing');
assert.equal(globalBetsVars['--widget-title-font-family'], undefined, 'generated title defaults do not emit element CSS vars');
assert.equal(globalBetsVars['--widget-option-row-radius'], undefined, 'generated option row defaults do not emit element CSS vars');

assert.equal(
  subValue({ subElements: { bonusCard: { background: '#111111', states: { opened: { background: '#222222' } } } } }, 'openedState', 'background', '#000000'),
  '#222222',
  'legacy pseudo-elements resolve canonical state overrides'
);

const widgetTypographyConfig = resolveWidgetAppearanceConfig(widgetA, {
  themeId: 'classic',
  widgetTypes: {
    appearance_test_widget: {
      subElements: {
        label: { fontFamily: 'Type Sans', lineHeight: 1.7 },
      },
    },
  },
  widgets: {
    widget_a: {
      subElements: {
        label: { states: { selected: { textTransform: 'uppercase' } } },
      },
    },
  },
});
assert.notEqual(widgetTypographyConfig.subElements.label.fontFamily, 'Type Sans', 'user widget-type typography sub-element overrides do not leak into widget instances');
assert.notEqual(widgetTypographyConfig.subElements.label.lineHeight, 1.7, 'user widget-type line-height sub-element overrides do not leak into widget instances');
assert.equal(widgetTypographyConfig.subElements.label.states.selected.textTransform, 'uppercase', 'widget config carries state typography overrides');

for (const widgetDefinitionEntry of getAllWidgetDefs()) {
  const keys = getSupportedVisualKeys(widgetDefinitionEntry.type);
  assert.ok(keys.length > 0, `${widgetDefinitionEntry.type} exposes supported appearance visual keys`);
  const visual = Object.fromEntries(keys.map(key => [key, sampleValueForVisualKey(key)]));
  const widgetId = `registry_smoke_${widgetDefinitionEntry.type}`;
  const resolvedConfig = resolveWidgetAppearanceConfig({
    id: widgetId,
    widget_type: widgetDefinitionEntry.type,
    config: { ...(widgetDefinitionEntry.defaults || {}) },
  }, {
    themeId: 'classic',
    widgets: {
      [widgetId]: { visual },
    },
  });
  for (const key of keys) {
    assert.equal(resolvedConfig[key], visual[key], `${widgetDefinitionEntry.type}.${key} resolves from registry visual override`);
  }
}

console.log('appearance model tests passed');

await server.close();
