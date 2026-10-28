import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { createOverlayTestDatabase } from './helpers/overlay-build-test-db.mjs';

globalThis.window = { location: { origin: 'http://localhost' } };
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
const server = await createServer({ logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const registry = await server.ssrLoadModule('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
  const editorSource = readFileSync(new URL('../src/components/OverlayCenter/editor/WidgetEditorPage.jsx', import.meta.url), 'utf8');
  assert.match(editorSource, /commitLayout\(current => applySceneColourTheme\(current, key\)\)/, 'top selector applies the full scene');
  assert.match(editorSource, /aria-label="Reapply overlay theme layout"/, 'the selected layout can be reapplied after manual moves');
  const sceneThemes = await server.ssrLoadModule('/src/components/OverlayCenter/editor/sceneColourTheme.js');
  const widgetThemes = await server.ssrLoadModule('/src/components/OverlayCenter/editor/widgetColourThemes.js');
  const palettes = await server.ssrLoadModule('/src/components/OverlayCenter/widgets/shared/colourThemePalettes.js');
  const compositions = Object.fromEntries(await Promise.all([
    ['galactic_command', 'galacticCommandComposition', 'GALACTIC_COMMAND_COMPOSITION'],
    ['starter_studio', 'starterStudioComposition', 'STARTER_STUDIO_COMPOSITION'],
    ['street_art', 'streetArtComposition', 'STREET_ART_COMPOSITION'],
    ['solverde', 'solverdeComposition', 'SOLVERDE_COMPOSITION'],
    ['candy', 'candyComposition', 'CANDY_COMPOSITION'],
    ['volcanic', 'volcanicComposition', 'VOLCANIC_COMPOSITION'],
    ['orbital', 'orbitalComposition', 'ORBITAL_COMPOSITION'],
  ].map(async ([key, filename, constant]) => {
    const module = await server.ssrLoadModule(`/src/components/OverlayCenter/editor/${filename}.js`);
    return [key, module[constant]];
  })));
  const types = registry.getBetterWidgetTypes();
  const instances = types.map((type, index) => registry.createBetterInstance(type, {
    x: index * 20, y: index * 30, label: `${type} fixture`,
  }));
  const original = { ...registry.createDefaultBetterLayout(), instances: instances.map(instance =>
    instance.widgetType === 'bonus_hunt' ? { ...instance, config: { ...instance.config, huntName: 'Saved hunt' } } : instance
  ) };
  const originalJson = JSON.stringify(original);
  const themed = sceneThemes.applySceneColourTheme(original, 'arctic');

  assert.equal(JSON.stringify(original), originalJson, 'the scene remains unchanged');
  assert.equal(sceneThemes.getSceneColourTheme(themed), 'arctic');
  const originalIds = new Set(original.instances.map(instance => instance.instanceId));
  for (const instance of original.instances) assert.ok(themed.instances.some(item => item.instanceId === instance.instanceId), 'saved widget IDs survive');
  for (const [type, geometry] of Object.entries(sceneThemes.STANDARD_SCENE_COMPOSITION)) {
    const match = themed.instances.find(instance => instance.widgetType === type && instance.visible !== false);
    assert.ok(match, `${type} appears in the standard scene`);
    for (const key of ['x', 'y', 'width', 'height']) assert.equal(match[key], geometry[key], `${type} ${key} matches its scene position`);
  }
  assert.equal(themed.instances.find(instance => instance.widgetType === 'bonus_hunt').config.huntName, 'Saved hunt');
  assert.ok(themed.instances.filter(instance => !sceneThemes.STANDARD_SCENE_COMPOSITION[instance.widgetType]).every(instance => instance.visible === false), 'widgets outside the selected arrangement are hidden');
  assert.ok(themed.instances.every(instance => originalIds.has(instance.instanceId)), 'standard scene reuses existing instances');
  for (const theme of palettes.WIDGET_COLOUR_THEMES.map(item => item.key)) {
    const arranged = sceneThemes.applySceneColourTheme(original, theme);
    assert.equal(sceneThemes.getSceneColourTheme(arranged), theme, `${theme} colours every widget: ${arranged.instances.filter(instance => widgetThemes.getSelectedWidgetColourTheme(instance.widgetType, instance.config) !== theme).map(instance => instance.widgetType).join(', ')}`);
    assert.ok(arranged.instances.some(instance => instance.widgetType === 'background' && instance.visible !== false), `${theme} keeps a visible background`);
    assert.ok(arranged.instances.some(instance => instance.widgetType === 'navbar' && instance.visible !== false), `${theme} places a navbar`);
    assert.ok(arranged.instances.some(instance => instance.widgetType === 'bonus_hunt' && instance.visible !== false), `${theme} places Bonus Hunt`);
    for (const instance of arranged.instances.filter(item => item.visible !== false)) {
      assert.ok(instance.x >= 0 && instance.y >= 0 && instance.x + instance.width <= 1920 && instance.y + instance.height <= 1080,
        `${theme} keeps ${instance.widgetType} within the 1920 × 1080 canvas`);
    }
    const specs = compositions[theme] || sceneThemes.STANDARD_SCENE_COMPOSITION;
    const entries = Array.isArray(specs) ? specs.map(spec => [spec.type, spec]) : Object.entries(specs);
    const expectedTypes = new Set(['background', ...entries.map(([type]) => type), ...(theme === 'street_art' ? ['slot_window'] : [])]);
    assert.ok(arranged.instances.filter(instance => instance.visible !== false).every(instance => expectedTypes.has(instance.widgetType)), `${theme} hides widgets outside its scene`);
    if (theme !== 'galactic_command') {
      for (const type of expectedTypes) assert.ok(arranged.instances.filter(instance => instance.widgetType === type && instance.visible !== false).length <= 1, `${theme} shows one ${type}`);
    }
    for (const [type, geometry] of entries) {
      const match = arranged.instances.find(instance => instance.widgetType === type && instance.visible !== false &&
        (!geometry.role || instance.config?.galactic?.role === geometry.role));
      assert.ok(match, `${theme} shows ${type}${geometry.role ? ` ${geometry.role}` : ''}`);
      for (const dimension of ['x', 'y', 'width', 'height']) {
        assert.equal(match[dimension], geometry[dimension], `${theme} places ${type} ${dimension}`);
      }
    }
    assert.equal(sceneThemes.applySceneColourTheme(arranged, theme).instances.length, arranged.instances.length, `${theme} does not add widgets on repeat selection`);
  }
  const galactic = sceneThemes.applySceneColourTheme(original, 'galactic_command');
  const fromGalactic = sceneThemes.applySceneColourTheme(galactic, 'candy');
  assert.equal(sceneThemes.getSceneColourTheme(fromGalactic), 'candy');
  assert.equal(fromGalactic.instances.filter(instance => instance.widgetType === 'bonus_hunt' && instance.visible !== false).length, 1, 'switching away from multi-panel theme hides duplicate views');
  assert.equal(fromGalactic.instances.find(instance => instance.widgetType === 'bonus_hunt' && instance.visible !== false).config.huntName, 'Saved hunt');
  const backToGalactic = sceneThemes.applySceneColourTheme(fromGalactic, 'galactic_command');
  assert.equal(backToGalactic.instances.length, galactic.instances.length, 'switching back reuses existing role widgets');
  const sparse = { ...registry.createDefaultBetterLayout(), instances: [
    registry.createBetterInstance('background'),
    registry.createBetterInstance('bonus_hunt', { locked: true, x: 800, y: 500 }),
    registry.createBetterInstance('chat', { config: { orientation: 'source_panel', streamerOverlay: { role: 'chat' } } }),
  ] };
  const sparseStarter = sceneThemes.applySceneColourTheme(sparse, 'starter_studio');
  for (const [type, geometry] of Object.entries(compositions.starter_studio)) {
    const instance = sparseStarter.instances.find(item => item.widgetType === type && item.visible !== false);
    assert.ok(instance, `Starter Studio creates missing ${type}`);
    assert.equal(instance.x, geometry.x);
    assert.equal(instance.y, geometry.y);
  }
  assert.equal(sparseStarter.instances.find(instance => instance.widgetType === 'bonus_hunt').locked, true, 'lock state survives the layout change');
  assert.equal(sparseStarter.instances.find(instance => instance.widgetType === 'chat').config.streamerOverlay, undefined, 'old source-scene role cannot override the new theme');
  const sparseStandard = sceneThemes.applySceneColourTheme(sparse, 'arctic');
  assert.equal(sparseStandard.instances.find(instance => instance.widgetType === 'chat').config.orientation, 'standard');
  assert.ok(sparseStandard.instances.find(instance => instance.widgetType === 'current_slot' && instance.visible !== false), 'standard theme adds its missing Current Slot');
  const hiddenOldHunt = registry.createBetterInstance('bonus_hunt', { visible: false, config: { huntName: 'Old hunt' } });
  const visibleHunt = registry.createBetterInstance('bonus_hunt', { config: { huntName: 'Current hunt' } });
  const duplicateLayout = { ...sparse, instances: [sparse.instances[0], hiddenOldHunt, visibleHunt] };
  const deduplicated = sceneThemes.applySceneColourTheme(duplicateLayout, 'arctic');
  assert.equal(deduplicated.instances.find(instance => instance.widgetType === 'bonus_hunt' && instance.visible !== false).instanceId, visibleHunt.instanceId,
    'a visible widget supplies the scene when an older duplicate is hidden');
  assert.equal(deduplicated.instances.find(instance => instance.widgetType === 'bonus_hunt' && instance.visible !== false).config.huntName, 'Current hunt');
  const reloaded = registry.normalizeBetterLayout(JSON.parse(JSON.stringify(themed)));
  assert.equal(sceneThemes.getSceneColourTheme(reloaded), 'arctic', 'the theme survives saving and loading');
  const custom = { ...reloaded, instances: reloaded.instances.map((instance, index) =>
    index === 1 ? { ...instance, config: widgetThemes.applyWidgetColourTheme(instance.widgetType, instance.config, 'emerald') } : instance
  ) };
  assert.equal(sceneThemes.getSceneColourTheme(custom), null, 'individual edits show a mixed theme');
  const service = await server.ssrLoadModule('/src/services/betterOverlayService.js');
  const { supabase } = await server.ssrLoadModule('/src/config/supabaseClient.js');
  const { client, state } = createOverlayTestDatabase();
  supabase.from = client.from;
  supabase.rpc = client.rpc;
  const build = await service.createBetterEditorOverlay('scene-theme-owner', 'Theme test');
  const published = await service.publishBetterOverlay('scene-theme-owner', themed, build.draftVersion, build.id);
  assert.equal(sceneThemes.getSceneColourTheme(published.publishedLayout), 'arctic', 'published build keeps the chosen theme');
  assert.equal(sceneThemes.getSceneColourTheme(state.tables.better_overlay_publications[0].published_layout), 'arctic', 'OBS receives the same theme');
  console.log('Scene colour theme: all widgets, identity, geometry, reload, mixed-state and OBS publication checks passed.');
} finally {
  await server.close();
}
