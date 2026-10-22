import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";
import { createOverlayTestDatabase } from "./helpers/overlay-build-test-db.mjs";

globalThis.window = { location: { origin: "http://localhost" } };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

const server = await createServer({
  logLevel: "silent",
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const registry = await server.ssrLoadModule(
    "/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx",
  );
  const { applyStreamerOverlayComposition, getStreamerOverlayName, STREAMER_OVERLAY_COMPOSITION } =
    await server.ssrLoadModule(
      "/src/components/OverlayCenter/editor/streamerOverlayComposition.js",
    );
  const service = await server.ssrLoadModule(
    "/src/services/betterOverlayService.js",
  );
  const { supabase } = await server.ssrLoadModule(
    "/src/config/supabaseClient.js",
  );
  const { client, state } = createOverlayTestDatabase();
  supabase.from = client.from;
  supabase.rpc = client.rpc;

  const layout = registry.createDefaultBetterLayout();
  const navbar = layout.instances.find((instance) => instance.widgetType === "navbar");
  navbar.config.streamerName = "Miguel Streamer";
  const applied = applyStreamerOverlayComposition(layout);
  assert.equal(getStreamerOverlayName(layout), "Miguel Streamer Overlay");
  assert.equal(applied.name, "Miguel Streamer Overlay");
  const normalized = registry.normalizeBetterLayout(
    JSON.parse(JSON.stringify(applied)),
  );

  assert.equal(STREAMER_OVERLAY_COMPOSITION.length, 10);
  for (const spec of STREAMER_OVERLAY_COMPOSITION) {
    const instance = normalized.instances.find(
      (item) =>
        item.widgetType === spec.type &&
        item.config.streamerOverlay?.role === spec.role,
    );
    assert.ok(instance, `composition has the ${spec.role} instance`);
    assert.equal(instance.visible, true, `${spec.role} is visible`);
    assert.deepEqual(
      [instance.x, instance.y, instance.width, instance.height],
      [spec.x, spec.y, spec.width, spec.height],
    );
    assert.ok(
      registry.getBetterWidgetDefinition(spec.type),
      `${spec.type} has an existing live widget definition`,
    );
  }

  const chat = normalized.instances.find(
    (item) => item.config.streamerOverlay?.role === "chat",
  );
  assert.equal(chat.config.giveawayInChat, true);
  assert.equal(chat.config.giveawayHeight, 64);
  const hunt = normalized.instances.find(
    (item) => item.config.streamerOverlay?.role === "hunt",
  );
  assert.equal(hunt.config.orientation, "mainstream");
  assert.equal(hunt.config.colourTheme, "emerald");

  const build = await service.createBetterEditorOverlay(
    "admin-user",
    normalized.name,
    normalized,
  );
  const saved = await service.saveBetterDraft(
    "admin-user",
    normalized,
    build.draftVersion,
    build.id,
  );
  const published = await service.publishBetterOverlay(
    "admin-user",
    normalized,
    saved.draftVersion,
    build.id,
  );
  assert.equal(
    state.tables.better_editor_overlays[0].draft_layout.instances.find(
      (item) => item.config.streamerOverlay?.role === "gameplay",
    ).width,
    1124,
    "the editor draft stores the composed gameplay frame",
  );
  assert.equal(
    state.tables.better_overlay_publications[0].published_layout.instances.find(
      (item) => item.config.streamerOverlay?.role === "chat",
    ).config.giveawayInChat,
    true,
    "the published OBS layout retains the embedded live giveaway",
  );
  assert.equal(published.publishedVersion, published.draftVersion);
  assert.equal(state.tables.better_editor_overlays[0].draft_layout.name, "Miguel Streamer Overlay");
  assert.ok(
    state.calls.some(
      (call) =>
        call.table === "better_editor_overlays" &&
        call.action === "update" &&
        call.filters.some(([key, value]) => key === "user_id" && value === "admin-user"),
    ),
    "draft writes are owner scoped",
  );

  const editorSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/editor/WidgetEditorPage.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(editorSource, /import \{applyStreamerOverlayComposition, getStreamerOverlayName\}/);
  assert.match(editorSource, /\{isAdmin && \([\s\S]*?getStreamerOverlayName\(layout, user\)/);
  console.log(
    "Streamer Overlay checks passed: admin gate, live widget definitions, geometry, normalization, owner-scoped draft persistence, OBS publication, and embedded giveaway settings.",
  );
} finally {
  await server.close();
}
