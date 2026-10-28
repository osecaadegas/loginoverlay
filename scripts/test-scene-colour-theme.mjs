import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createOverlayTestDatabase } from './helpers/overlay-build-test-db.mjs';

globalThis.window = { location: { origin: 'http://localhost' } };
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
const server = await createServer({ logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const registry = await server.ssrLoadModule('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
  const sceneThemes = await server.ssrLoadModule('/src/components/OverlayCenter/editor/sceneColourTheme.js');
  const widgetThemes = await server.ssrLoadModule('/src/components/OverlayCenter/editor/widgetColourThemes.js');
  const types = registry.getBetterWidgetTypes();
  const instances = types.map((type, index) => registry.createBetterInstance(type, {
    x: index * 20, y: index * 30, label: `${type} fixture`,
  }));
  const original = { ...registry.createDefaultBetterLayout(), instances };
  const originalJson = JSON.stringify(original);
  const themed = sceneThemes.applySceneColourTheme(original, 'arctic');

  assert.equal(JSON.stringify(original), originalJson, 'the scene remains unchanged');
  assert.equal(sceneThemes.getSceneColourTheme(themed), 'arctic');
  for (const [index, instance] of themed.instances.entries()) {
    assert.equal(instance.instanceId, instances[index].instanceId);
    assert.equal(instance.x, instances[index].x);
    assert.equal(instance.y, instances[index].y);
    assert.equal(instance.label, instances[index].label);
  }
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
