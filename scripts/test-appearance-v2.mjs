import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const registryModule = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js');
  const materialModule = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/v2/materialGenerators.js');
  const colorModule = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/v2/colorUtils.js');
  const resolverModule = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/v2/appearanceResolver.js');
  const appearanceModel = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/appearanceModel.js');
  const editorSchema = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/editorSchema.js');

  const registryResult = registryModule.validateWidgetAppearanceRegistry();
  assert.equal(registryResult.valid, true, `registry should validate: ${registryResult.errors.join(', ')}`);
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('bh_stats'), true, 'BH Stats is a V2 pilot');
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('bonus_hunt'), true, 'Bonus Hunt is a V2 pilot');
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('slot_requests'), true, 'Slot Requests is migrated to V2');
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('giveaway'), true, 'Giveaway is migrated to V2');
  assert.ok(registryModule.getWidgetAppearanceCapability('bonus_hunt').elements.slotRow, 'bonus hunt declares real slot row element');
  assert.ok(registryModule.getWidgetAppearanceCapability('slot_requests').elements.requestCard, 'slot requests declares request row element');
  assert.ok(registryModule.getWidgetAppearanceCapability('giveaway').elements.winnerArea, 'giveaway declares winner area element');

  assert.ok(materialModule.MATERIAL_IDS.includes('original'), 'Original material is available for baseline widgets');
  const originalTokens = materialModule.generateAppearanceTokens({
    material: 'original',
    primaryColor: '#14d8d8',
  }, registryModule.getWidgetAppearanceCapability('bonus_hunt'));
  assert.equal(originalTokens.material, 'original', 'Original token material is preserved');
  assert.equal(originalTokens.isOriginalBaseline, true, 'Original material marks the widget baseline');
  assert.deepEqual(resolverModule.buildWidgetV2CssVars(originalTokens), {}, 'Original material emits no generic CSS variables');

  for (const material of materialModule.MATERIAL_IDS.filter(item => item !== 'original')) {
    const tokens = materialModule.generateAppearanceTokens({
      material,
      primaryColor: material === 'metallic' ? '#f5b301' : '#14d8d8',
      accentColor: '#8b5cf6',
      useAccentColor: material === 'gradient',
      shape: 'rounded',
      density: 'standard',
      textSize: 'standard',
      scale: 1,
    }, registryModule.getWidgetAppearanceCapability('bh_stats'));
    assert.equal(tokens.material, material, `${material} token material is preserved`);
    assert.ok(tokens.colors.text, `${material} provides readable text`);
    assert.ok(tokens.colors.surface !== undefined, `${material} provides surface token`);
    assert.ok(tokens.validation.some(item => item.code === 'valid' || item.code === 'low-contrast'), `${material} reports contrast validation`);
  }

  const metallicGold = materialModule.generateMetallicTokens({
    primaryColor: '#f5b301',
    shape: 'rounded',
  });
  assert.ok(String(metallicGold.colors.surface).includes('linear-gradient'), 'metallic gold uses reflective gradient surface');
  assert.ok(colorModule.getContrastRatio(metallicGold.colors.surfaceReference, metallicGold.colors.text) >= 4.5, 'metallic gold text is readable');

  const glassCyan = materialModule.generateGlassTokens({ primaryColor: '#14d8d8' });
  assert.ok(glassCyan.materialTokens.blurStrength > 0, 'glass cyan exposes safe blur token');
  assert.ok(colorModule.getContrastRatio(glassCyan.colors.surfaceReference, glassCyan.colors.text) >= 4.5, 'glass cyan text is readable');

  const neonGreen = materialModule.generateNeonTokens({ primaryColor: '#22c55e' });
  assert.ok(neonGreen.materialTokens.glowIntensity > 0, 'neon green exposes controlled glow');
  assert.ok(colorModule.getContrastRatio(neonGreen.colors.surfaceReference, neonGreen.colors.text) >= 4.5, 'neon green contrast stays safe');

  const normalized = materialModule.normalizeSimpleAppearanceV2({ material: 'fake', primaryColor: 'nope', scale: 9 });
  assert.equal(normalized.material, 'matte', 'invalid material falls back');
  assert.equal(normalized.primaryColor, '#14d8d8', 'invalid color falls back');
  assert.equal(normalized.scale, 1.5, 'scale clamps to safe max');

  const bhStatsWidget = {
    id: 'stats1',
    widget_type: 'bh_stats',
    width: 320,
    height: 220,
    config: {
      displayStyle: 'default',
      subElements: {},
    },
  };
  const bonusHuntWidget = {
    id: 'hunt1',
    widget_type: 'bonus_hunt',
    width: 400,
    height: 720,
    config: {
      displayStyle: 'v12_classic_sr',
      bonuses: [],
      subElements: {},
    },
  };
  const slotRequestsWidget = {
    id: 'sr1',
    widget_type: 'slot_requests',
    width: 360,
    height: 520,
    config: {
      displayStyle: 'v1_minimal',
      subElements: {},
    },
  };
  const giveawayWidget = {
    id: 'give1',
    widget_type: 'giveaway',
    width: 480,
    height: 360,
    config: {
      displayStyle: 'v1',
      title: 'Giveaway',
      prize: '1000 points',
      keyword: 'join',
      participants: [],
      subElements: {},
    },
  };

  const appearance = {
    widgets: {
      stats1: {
        styles: {
          default: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('bh_stats', {
              material: 'glass',
              primaryColor: '#14d8d8',
              shape: 'rounded',
              density: 'compact',
              textSize: 'large',
              scale: 1.15,
            }),
          },
        },
      },
      hunt1: {
        styles: {
          v12_classic_sr: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('bonus_hunt', {
              material: 'metallic',
              primaryColor: '#f5b301',
              shape: 'rounded',
              density: 'standard',
              textSize: 'standard',
              scale: 1.05,
            }),
          },
        },
      },
      sr1: {
        styles: {
          v1_minimal: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('slot_requests', {
              material: 'glass',
              primaryColor: '#8b5cf6',
              shape: 'rounded',
              density: 'compact',
              textSize: 'standard',
              scale: 1.08,
            }),
          },
        },
      },
      give1: {
        styles: {
          v1: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('giveaway', {
              material: 'neon',
              primaryColor: '#22c55e',
              shape: 'slightly_rounded',
              density: 'standard',
              textSize: 'large',
              scale: 1.1,
            }),
          },
        },
      },
    },
  };

  const originalAppearance = {
    widgets: {
      hunt1: {
        styles: {
          v12_classic_sr: {
            appearanceV2: resolverModule.buildAppearanceV2ForStorage('bonus_hunt', {
              material: 'original',
              primaryColor: '#14d8d8',
              shape: 'rounded',
              density: 'standard',
              textSize: 'standard',
              scale: 1,
            }),
          },
        },
      },
    },
  };

  const unstyledHuntConfig = appearanceModel.resolveWidgetAppearanceConfig(bonusHuntWidget, {}, {});
  assert.equal(unstyledHuntConfig.__appearanceV2, undefined, 'No Bonus Hunt appearance record leaves the original widget baseline untouched by V2');

  const originalHuntConfig = appearanceModel.resolveWidgetAppearanceConfig(bonusHuntWidget, originalAppearance, {});
  assert.equal(originalHuntConfig.__appearanceV2.material, 'original', 'Bonus Hunt can explicitly restore Original');
  assert.equal(originalHuntConfig.displayStyle, 'v12_classic_sr', 'Original keeps the selected production renderer');
  assert.equal(originalHuntConfig.headerColor, undefined, 'Original does not inject generic header color');
  assert.equal(originalHuntConfig.cardPadding, undefined, 'Original does not inject generic card padding');
  assert.equal(originalHuntConfig.cardGap, undefined, 'Original does not inject generic card gap');
  assert.equal(originalHuntConfig.subElements.headerContainer?.background, undefined, 'Original does not box the header with generated sub-element surfaces');
  assert.equal(originalHuntConfig.subElements.slotRow?.background, undefined, 'Original does not turn slot rows into generated dashboard cards');
  assert.deepEqual(originalHuntConfig.__appearanceV2Vars, {}, 'Original emits no V2 CSS variable overrides');

  const bonusHuntV12Source = readFileSync(new URL('../src/components/OverlayCenter/widgets/BonusHuntWidgetV12.jsx', import.meta.url), 'utf8');
  assert.ok(bonusHuntV12Source.includes('V12_ORIGINAL_STYLE'), 'Bonus Hunt V12 declares an explicit original baseline');
  assert.ok(!bonusHuntV12Source.includes("c.headerColor || '#1e3a8a'"), 'Bonus Hunt V12 original baseline does not fall back to generic blue header');
  assert.ok(!bonusHuntV12Source.includes("c.listCardColor || '#581c87'"), 'Bonus Hunt V12 original baseline does not fall back to generic purple list cards');
  assert.ok(bonusHuntV12Source.includes('composeV12RootBackground'), 'Bonus Hunt V12 composes safe root backgrounds without invalid rgba alpha suffixes');

  const statsConfig = appearanceModel.resolveWidgetAppearanceConfig(bhStatsWidget, appearance, {});
  assert.equal(statsConfig.__appearanceV2.material, 'glass', 'BH Stats receives V2 material');
  assert.equal(statsConfig.displayStyle, 'glass', 'BH Stats maps glass material to existing renderer style');
  assert.ok(statsConfig.subElements.container.background, 'BH Stats container sub-element is generated');
  assert.equal(statsConfig.subElements.value.fontSize, 21, 'BH Stats large text maps to value font size');
  assert.ok(statsConfig.__appearanceV2Vars['--sc-v2-primary'], 'BH Stats exposes V2 CSS variables');

  const huntConfig = appearanceModel.resolveWidgetAppearanceConfig(bonusHuntWidget, appearance, {});
  assert.equal(huntConfig.__appearanceV2.material, 'metallic', 'Bonus Hunt receives V2 material');
  assert.equal(huntConfig.displayStyle, 'v12_classic_sr', 'Bonus Hunt keeps selected renderer style');
  assert.equal(huntConfig.subElements.headerContainer?.padding, undefined, 'Bonus Hunt material presets do not alter structural header padding');
  assert.equal(huntConfig.subElements.slotRow?.padding, undefined, 'Bonus Hunt material presets do not alter structural slot row padding');
  assert.equal(huntConfig.subElements.slotImage?.height, undefined, 'Bonus Hunt material presets do not alter carousel image dimensions');
  assert.ok(huntConfig.headerColor, 'Bonus Hunt material presets recolor the original surface variables');
  assert.ok(huntConfig.subElements.footerTotalValue.states.success.textColor, 'Bonus Hunt state-specific success style remains explicit');

  const slotRequestsConfig = appearanceModel.resolveWidgetAppearanceConfig(slotRequestsWidget, appearance, {});
  assert.equal(slotRequestsConfig.__appearanceV2.material, 'glass', 'Slot Requests receives V2 material');
  assert.equal(slotRequestsConfig.displayStyle, 'v1_minimal', 'Slot Requests keeps selected renderer style');
  assert.ok(slotRequestsConfig.subElements.requestCard.background, 'Slot Requests request rows receive generated surface');
  assert.ok(slotRequestsConfig.subElements.requestCard.states.playing.accentColor, 'Slot Requests keeps request state colors explicit');
  assert.equal(slotRequestsConfig.subElements.slotImage.imageSize, undefined, 'Slot Requests image size is intentionally unsupported');
  assert.ok(slotRequestsConfig.__appearanceV2.unsupportedProperties.includes('layout.cardStackTransform'), 'Slot Requests records animation-sensitive unsupported transforms');

  const giveawayConfig = appearanceModel.resolveWidgetAppearanceConfig(giveawayWidget, appearance, {});
  assert.equal(giveawayConfig.__appearanceV2.material, 'neon', 'Giveaway receives V2 material');
  assert.equal(giveawayConfig.displayStyle, 'v1', 'Giveaway keeps selected renderer style');
  assert.ok(giveawayConfig.subElements.keyword.background, 'Giveaway keyword receives generated token mapping');
  assert.ok(giveawayConfig.subElements.statusBadge.states.live.textColor, 'Giveaway live state remains semantic');
  assert.notEqual(giveawayConfig.subElements.statusBadge.states.live.textColor, giveawayConfig.subElements.statusBadge.states.closed.textColor, 'Giveaway live and closed states remain distinguishable');

  const legacyAppearance = {
    widgets: {
      stats1: {
        styles: {
          default: {
            appearance: {
              simpleSettings: {
                material: 'neon',
                primaryColor: '#22c55e',
                shape: 'slightly_rounded',
              },
            },
          },
        },
      },
    },
  };
  const migratedConfig = appearanceModel.resolveWidgetAppearanceConfig(bhStatsWidget, legacyAppearance, {});
  assert.equal(migratedConfig.__appearanceV2.material, 'neon', 'legacy simple settings migrate into V2 resolver');
  assert.equal(migratedConfig.borderRadius, 8, 'legacy shape is preserved through migration');

  const overrideConfig = appearanceModel.resolveWidgetAppearanceConfig({
    ...bhStatsWidget,
    config: {
      ...bhStatsWidget.config,
      __appearanceExplicitSubElements: {
        value: { textColor: '#ff00ff' },
      },
    },
  }, appearance, {});
  assert.equal(overrideConfig.subElements.value.textColor, '#ff00ff', 'advanced explicit sub-element overrides generated tokens');

  const giveawayOverride = appearanceModel.resolveWidgetAppearanceConfig({
    ...giveawayWidget,
    config: {
      ...giveawayWidget.config,
      __appearanceExplicitSubElements: {
        keyword: { textColor: '#ff00ff' },
      },
    },
  }, appearance, {});
  assert.equal(giveawayOverride.subElements.keyword.textColor, '#ff00ff', 'Giveaway advanced override wins over generated keyword token');

  const resolvedWidgets = appearanceModel.resolveWidgetsForAppearance([bhStatsWidget, bonusHuntWidget, slotRequestsWidget, giveawayWidget], appearance, {});
  assert.equal(resolvedWidgets[0].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves simple pilot');
  assert.equal(resolvedWidgets[1].config.__appearanceV2.material, 'metallic', 'preview/OBS shared resolver resolves complex pilot');
  assert.equal(resolvedWidgets[2].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves Slot Requests');
  assert.equal(resolvedWidgets[3].config.__appearanceV2.material, 'neon', 'preview/OBS shared resolver resolves Giveaway');
  assert.notEqual(resolvedWidgets[2].config.bgColor, resolvedWidgets[3].config.bgColor, 'Slot Requests and Giveaway styles do not leak between widgets');

  const bhStatsElements = editorSchema.getWidgetElementSchema('bh_stats');
  const bonusElements = editorSchema.getWidgetElementSchema('bonus_hunt');
  const slotRequestElements = editorSchema.getWidgetElementSchema('slot_requests');
  const giveawayElements = editorSchema.getWidgetElementSchema('giveaway');
  assert.ok(bhStatsElements.some(element => element.id === 'statsCard'), 'Advanced Mode schema for BH Stats comes from V2 registry');
  assert.ok(bonusElements.some(element => element.id === 'slotRow'), 'Advanced Mode schema for Bonus Hunt comes from V2 registry');
  assert.ok(slotRequestElements.some(element => element.id === 'requestCard'), 'Advanced Mode schema for Slot Requests comes from V2 registry');
  assert.ok(giveawayElements.some(element => element.id === 'winnerArea'), 'Advanced Mode schema for Giveaway comes from V2 registry');
  assert.ok(!slotRequestElements.find(element => element.id === 'slotImage')?.controls.includes('imageSize'), 'Slot Requests hides unsafe image-size control');

  console.log('appearance v2 tests passed');
} finally {
  await server.close();
}
