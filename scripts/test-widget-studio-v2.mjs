import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

function createStorageStub() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

const localStorageStub = createStorageStub();
const sessionStorageStub = createStorageStub();
globalThis.localStorage = localStorageStub;
globalThis.sessionStorage = sessionStorageStub;
Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'widget-studio-v2-test', sendBeacon: () => true },
  configurable: true,
});
globalThis.window = {
  location: { origin: 'http://localhost', pathname: '/', search: '' },
  localStorage: localStorageStub,
  sessionStorage: sessionStorageStub,
  navigator: globalThis.navigator,
  screen: { width: 1920, height: 1080 },
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout,
  clearTimeout,
  crypto: globalThis.crypto,
};

const server = await createServer({
  logLevel: 'silent',
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const studioRegistry = await server.ssrLoadModule('/src/widgets/registry/widgetRegistry.js');
  const resolver = await server.ssrLoadModule('/src/widgets/shared/settings/settingsResolver.js');
  const { statisticCardV2Schema } = await server.ssrLoadModule('/src/widgets/statistic-card-v2/schema.js');
  const { statisticCardV2Defaults } = await server.ssrLoadModule('/src/widgets/statistic-card-v2/defaults.js');
  const { statisticCardV2MockData } = await server.ssrLoadModule('/src/widgets/statistic-card-v2/mockData.js');
  const statisticCardManifestModule = await server.ssrLoadModule('/src/widgets/statistic-card-v2/manifest.js');
  const widgetStudioModule = await server.ssrLoadModule('/src/components/OverlayCenter/appearance/studio/WidgetStudioV2.jsx');
  const legacyRegistry = await server.ssrLoadModule('/src/components/OverlayCenter/widgets/widgetRegistry.js');
  await server.ssrLoadModule('/src/components/OverlayCenter/widgets/builtinWidgets.js');

  const manifest = statisticCardManifestModule.default;
  const registryValidation = studioRegistry.validateStudioWidgetRegistry();
  assert.equal(registryValidation.valid, true, registryValidation.errors.join('\n'));

  const studioWidgets = studioRegistry.getAppearanceStudioWidgets();
  assert.equal(studioWidgets.length, 1);
  assert.equal(studioWidgets[0].id, 'statistic-card-v2');
  assert.equal(studioWidgets[0].supportsAppearanceStudio, true);
  assert.equal(studioWidgets[0].renderer, studioWidgets[0].previewRenderer);

  const validatedDefaults = resolver.validateWidgetSettings(statisticCardV2Defaults, statisticCardV2Schema);
  assert.deepEqual(validatedDefaults.errors, []);
  assert.equal(resolver.getByPath(validatedDefaults.settings, 'typography.headerFontSize'), 15);

  const resolvedPriority = resolver.resolveWidgetSettings({
    widgetDefaults: statisticCardV2Defaults,
    userSettings: { typography: { headerFontSize: 20, valueFontSize: 40 } },
    instanceSettings: { typography: { headerFontSize: 30 } },
    previewSettings: { typography: { headerFontSize: 44 } },
    schema: statisticCardV2Schema,
  });
  assert.equal(resolver.getByPath(resolvedPriority.settings, 'typography.headerFontSize'), 44);
  assert.equal(resolver.getByPath(resolvedPriority.settings, 'typography.valueFontSize'), 40);

  const corrected = resolver.resolveWidgetSettings({
    widgetDefaults: statisticCardV2Defaults,
    userSettings: {
      typography: { headerFontSize: 1 },
      animation: { type: 'unsafe-spin' },
      colors: { value: 'not-a-colour' },
    },
    schema: statisticCardV2Schema,
  });
  assert.equal(resolver.getByPath(corrected.settings, 'typography.headerFontSize'), 10);
  assert.equal(resolver.getByPath(corrected.settings, 'animation.type'), 'fade');
  assert.equal(resolver.getByPath(corrected.settings, 'colors.value'), '#5eead4');
  assert.ok(corrected.errors.some(error => error.key === 'typography.headerFontSize'));

  const cssVars = resolver.settingsToCssVariables(resolvedPriority.settings, statisticCardV2Schema);
  assert.equal(cssVars['--stat-card-header-font-size'], '44px');
  assert.equal(cssVars['--stat-card-value-font-size'], '40px');
  assert.ok(!Object.keys(cssVars).some(key => key === '--widget-font-size'));

  const firstInstance = resolver.resolveWidgetSettings({
    widgetDefaults: statisticCardV2Defaults,
    instanceSettings: { typography: { headerFontSize: 18 } },
    schema: statisticCardV2Schema,
  });
  const secondInstance = resolver.resolveWidgetSettings({
    widgetDefaults: statisticCardV2Defaults,
    instanceSettings: { typography: { headerFontSize: 33 } },
    schema: statisticCardV2Schema,
  });
  assert.equal(resolver.getByPath(firstInstance.settings, 'typography.headerFontSize'), 18);
  assert.equal(resolver.getByPath(secondInstance.settings, 'typography.headerFontSize'), 33);

  const record = resolver.createWidgetStudioRecord({
    widgetId: 'statistic-card-v2',
    widgetVersion: 2,
    instanceId: 'default',
    settings: resolvedPriority.settings,
    mode: 'draft',
  });
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.widgetId, 'statistic-card-v2');
  assert.equal(record.widgetVersion, 2);
  assert.equal(record.instanceId, 'default');
  assert.equal(record.mode, 'draft');
  assert.ok(record.updatedAt);

  const Renderer = manifest.renderer;
  const html = renderToStaticMarkup(React.createElement(Renderer, {
    settings: resolvedPriority.settings,
    data: statisticCardV2MockData.default,
    instanceId: 'default',
  }));
  assert.match(html, /data-widget-id="statistic-card-v2"/);
  assert.match(html, /data-widget-instance="default"/);
  assert.match(html, /data-widget-element="header"/);
  assert.match(html, /--stat-card-header-font-size:44px/);
  assert.doesNotMatch(html, /--stat-card-value-font-size:44px/);

  const WidgetStudioV2 = widgetStudioModule.default;
  const studioHtml = renderToStaticMarkup(React.createElement(WidgetStudioV2, {
    user: { id: 'test-user' },
    overlayState: {},
    updateState: async () => ({}),
  }));
  assert.match(studioHtml, /widget-studio-v2/);
  assert.match(studioHtml, /Widget Studio v2/);
  assert.match(studioHtml, /Statistic Card/);
  assert.doesNotMatch(studioHtml, /appearance-center/);

  const legacyWidgets = legacyRegistry.getAllWidgetDefs();
  assert.ok(legacyWidgets.length > 0, 'expected existing runtime widgets to remain registered');
  assert.ok(legacyWidgets.every(widget => widget.supportsAppearanceStudio === false));
  assert.ok(legacyWidgets.every(widget => widget.appearanceEditorVersion === 'legacy'));
  assert.ok(!legacyWidgets.some(widget => widget.type === 'statistic-card-v2'));
  assert.ok(!studioWidgets.some(widget => legacyWidgets.some(legacy => legacy.type === widget.id)));

  const migrated = resolver.migrateWidgetSettings(manifest, {
    widgetId: 'statistic-card-v2',
    widgetVersion: 1,
    settings: { typography: { headerFontSize: 22 } },
  });
  assert.equal(migrated.widgetVersion, 2);
  assert.equal(resolver.getByPath(migrated.settings, 'typography.headerFontSize'), 22);

  console.log('Widget Studio v2 tests passed.');
} finally {
  await server.close();
}
