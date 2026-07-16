import assert from 'node:assert/strict';
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
  assert.equal(registryModule.isWidgetAppearanceV2Enabled('slot_requests'), false, 'non-pilot widgets stay on legacy engine');
  assert.ok(registryModule.getWidgetAppearanceCapability('bonus_hunt').elements.slotRow, 'bonus hunt declares real slot row element');

  for (const material of materialModule.MATERIAL_IDS) {
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
    },
  };

  const statsConfig = appearanceModel.resolveWidgetAppearanceConfig(bhStatsWidget, appearance, {});
  assert.equal(statsConfig.__appearanceV2.material, 'glass', 'BH Stats receives V2 material');
  assert.equal(statsConfig.displayStyle, 'glass', 'BH Stats maps glass material to existing renderer style');
  assert.ok(statsConfig.subElements.container.background, 'BH Stats container sub-element is generated');
  assert.equal(statsConfig.subElements.value.fontSize, 21, 'BH Stats large text maps to value font size');
  assert.ok(statsConfig.__appearanceV2Vars['--sc-v2-primary'], 'BH Stats exposes V2 CSS variables');

  const huntConfig = appearanceModel.resolveWidgetAppearanceConfig(bonusHuntWidget, appearance, {});
  assert.equal(huntConfig.__appearanceV2.material, 'metallic', 'Bonus Hunt receives V2 material');
  assert.equal(huntConfig.displayStyle, 'v12_classic_sr', 'Bonus Hunt keeps selected renderer style');
  assert.ok(huntConfig.subElements.headerContainer.background, 'Bonus Hunt header sub-element is generated');
  assert.ok(huntConfig.subElements.slotRow.background, 'Bonus Hunt slot row sub-element is generated');
  assert.ok(huntConfig.subElements.footerTotalValue.states.success.textColor, 'Bonus Hunt state-specific success style remains explicit');

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

  const resolvedWidgets = appearanceModel.resolveWidgetsForAppearance([bhStatsWidget, bonusHuntWidget], appearance, {});
  assert.equal(resolvedWidgets[0].config.__appearanceV2.material, 'glass', 'preview/OBS shared resolver resolves simple pilot');
  assert.equal(resolvedWidgets[1].config.__appearanceV2.material, 'metallic', 'preview/OBS shared resolver resolves complex pilot');
  assert.notEqual(resolvedWidgets[0].config.bgColor, resolvedWidgets[1].config.bgColor, 'pilot widget styles do not leak between widgets');

  const bhStatsElements = editorSchema.getWidgetElementSchema('bh_stats');
  const bonusElements = editorSchema.getWidgetElementSchema('bonus_hunt');
  assert.ok(bhStatsElements.some(element => element.id === 'statsCard'), 'Advanced Mode schema for BH Stats comes from V2 registry');
  assert.ok(bonusElements.some(element => element.id === 'slotRow'), 'Advanced Mode schema for Bonus Hunt comes from V2 registry');
  assert.ok(!editorSchema.getWidgetElementSchema('slot_requests').some(element => element.id === 'slotRow'), 'non-pilot schema is not replaced by V2 registry');

  console.log('appearance v2 tests passed');
} finally {
  await server.close();
}
