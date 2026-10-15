import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { createOverlayTestDatabase } from './helpers/overlay-build-test-db.mjs';

globalThis.window = { location: { origin: 'http://localhost' } };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const server = await createServer({ logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' });
try {
  const service = await server.ssrLoadModule('/src/services/betterOverlayService.js');
  const registry = await server.ssrLoadModule('/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx');
  const { supabase } = await server.ssrLoadModule('/src/config/supabaseClient.js');
  const { client, state } = createOverlayTestDatabase();
  supabase.from = client.from;
  supabase.rpc = client.rpc;

  const layout = registry.createDefaultBetterLayout();
  layout.instances.push(registry.createBetterInstance('slot_window', {
    config: {
      sourceUrl: 'http://127.0.0.1:17832/view/panel-1?token=0123456789abcdef0123456789abcdef0123456789abcdef',
      maskShape: 'rounded',
    },
  }));
  const chat = layout.instances.find((item) => item.widgetType === 'chat');
  chat.config = {
    ...chat.config,
    colourTheme: 'arctic',
    fontFamily: 'Impact',
    twitchChannel: 'private-streamer',
    youtubeApiKey: 'super-secret',
    streamerName: 'Brutuspolus',
    messages: [{ username: 'private-viewer', message: 'private message' }],
    backgroundUrl: 'https://private.example/background.png',
    textureUrl: '/images/safe-built-in-texture.webp',
  };

  const shared = await service.shareBetterOverlay('owner-a', layout, {
    name: 'Arctic command deck',
    description: 'A clean arctic layout.',
  });
  assert.equal(shared.name, 'Arctic command deck');
  assert.equal(shared.isMine, true);
  assert.equal(state.tables.shared_overlay_templates.length, 1);

  const stored = state.tables.shared_overlay_templates[0];
  const storedJson = JSON.stringify(stored.layout);
  for (const privateValue of [
    'private-streamer',
    'super-secret',
    'Brutuspolus',
    'private-viewer',
    'private message',
    'https://private.example/background.png',
  ]) {
    assert.equal(storedJson.includes(privateValue), false, `Shared layout removes ${privateValue}`);
  }
  const storedChat = stored.layout.instances.find((item) => item.widgetType === 'chat');
  assert.equal(storedChat.config.fontFamily, 'Impact');
  assert.equal(storedChat.config.colourTheme, 'arctic');
  assert.equal(storedChat.config.textureUrl, '/images/safe-built-in-texture.webp');
  const storedSlotWindow = stored.layout.instances.find((item) => item.widgetType === 'slot_window');
  assert.equal(storedSlotWindow.config.sourceUrl, '', 'Shared overlays never publish the local ScreenSplit token');

  const library = await service.listSharedBetterOverlays('owner-b');
  assert.equal(library.length, 1);
  assert.equal(library[0].isMine, false);
  assert.ok(library[0].widgetTypes.includes('chat'));
  assert.equal(Object.hasOwn(library[0], 'layout'), false, 'Browse results do not expose full layouts');

  const previews = await service.listSharedBetterOverlayPreviews('owner-b');
  assert.equal(previews.length, 1);
  assert.ok(previews[0].layout, 'Entitlement-aware browsing returns the sanitized layout');
  assert.equal(JSON.stringify(previews[0].layout).includes('private-streamer'), false);

  const loaded = await service.loadSharedBetterOverlay('owner-b', shared.id);
  assert.equal(loaded.userId, 'owner-b');
  assert.equal(loaded.draftLayout.name, 'Arctic command deck Copy');
  assert.notDeepEqual(
    loaded.draftLayout.instances.map((item) => item.instanceId),
    stored.layout.instances.map((item) => item.instanceId),
    'Loaded builds receive independent widget instance IDs',
  );
  const loadedChat = loaded.draftLayout.instances.find((item) => item.widgetType === 'chat');
  assert.equal(loadedChat.config.fontFamily, 'Impact');
  assert.equal(loadedChat.config.colourTheme, 'arctic');

  await assert.rejects(
    service.unshareBetterOverlay('owner-b', shared.id),
    /unavailable/,
    'A different user cannot remove the template',
  );
  await service.unshareBetterOverlay('owner-a', shared.id);
  assert.equal(state.tables.shared_overlay_templates.length, 0);

  const migration = readFileSync(
    new URL('../migrations/20261012073954_shared_overlay_templates.sql', import.meta.url),
    'utf8',
  );
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /to authenticated[\s\S]*using \(true\)/i);
  assert.match(migration, /with check \(\(select auth\.uid\(\)\) = owner_id\)/i);
  assert.match(migration, /grant select \([\s\S]*updated_at[\s\S]*\) on public\.shared_overlay_templates to authenticated/i);
  assert.doesNotMatch(
    migration.match(/grant select \([\s\S]*?\) on public\.shared_overlay_templates to authenticated/i)?.[0] || '',
    /\blayout\b/i,
    'The full layout column is not directly selectable',
  );
  assert.match(migration, /load_shared_overlay_template/i);
  assert.match(migration, /assert_access\(requester, template\.layout\)/i);

  const previewMigration = readFileSync(
    new URL('../migrations/20261012080707_browse_shared_overlay_previews.sql', import.meta.url),
    'utf8',
  );
  assert.match(previewMigration, /browse_shared_overlay_templates/i);
  assert.match(previewMigration, /assert_access\(requester, template\.layout\)/i);
  assert.match(previewMigration, /when insufficient_privilege then\s+continue/i);

  console.log('Shared overlay checks passed: safe publishing, metadata-only browsing, independent loading, owner removal and RLS migration guards.');
} finally {
  await server.close();
}
