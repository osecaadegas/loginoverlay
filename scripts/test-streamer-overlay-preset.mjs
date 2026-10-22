import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
  const { applyStreamerOverlayComposition, getStreamerOverlayName, hasStreamerOverlayComposition, isLegacyStreamerOverlayComposition, STREAMER_OVERLAY_COMPOSITION } =
    await server.ssrLoadModule(
      "/src/components/OverlayCenter/editor/streamerOverlayComposition.js",
    );
  const service = await server.ssrLoadModule(
    "/src/services/betterOverlayService.js",
  );
  const slotWindow = await server.ssrLoadModule(
    "/src/components/OverlayCenter/widgets/slot-window/SlotWindowWidget.jsx",
  );
  const sourceBonusPanel = await server.ssrLoadModule(
    "/src/components/OverlayCenter/widgets/bonus-hunt/StreamerSourceBonusPanel.jsx",
  );
  const { supabase } = await server.ssrLoadModule(
    "/src/config/supabaseClient.js",
  );
  const { client, state } = createOverlayTestDatabase();
  supabase.from = client.from;
  supabase.rpc = client.rpc;

  // The imported scene must consume the owner's existing StreamersCenter
  // overlay data; it must not create or depend on the source project's tables.
  state.tables.overlay_instances = [
    {
      id: "live-overlay-admin-user",
      user_id: "admin-user",
      is_active: true,
      created_at: "2026-10-22T00:00:00.000Z",
    },
  ];
  state.tables.overlay_widgets = [
    {
      id: "bonus-hunt-live-widget",
      user_id: "admin-user",
      overlay_id: "live-overlay-admin-user",
      widget_type: "bonus_hunt",
      label: "Bonus Hunt",
      is_visible: true,
      config: { huntName: "Current Stream Hunt", totalSpent: 125 },
      position_x: 0,
      position_y: 0,
      width: 400,
      height: 300,
      z_index: 1,
    },
    {
      id: "chat-live-widget",
      user_id: "admin-user",
      overlay_id: "live-overlay-admin-user",
      widget_type: "chat",
      label: "Chat",
      is_visible: true,
      config: { chatStyle: "broadcast_chat" },
      position_x: 0,
      position_y: 0,
      width: 400,
      height: 300,
      z_index: 2,
    },
  ];
  state.tables.overlay_themes = [
    {
      id: "theme-admin-user",
      user_id: "admin-user",
      overlay_id: "live-overlay-admin-user",
      theme_name: "emerald",
    },
  ];

  const layout = registry.createDefaultBetterLayout();
  const navbar = layout.instances.find((instance) => instance.widgetType === "navbar");
  navbar.config.streamerName = "Miguel Streamer";
  const applied = applyStreamerOverlayComposition(layout);
  assert.equal(hasStreamerOverlayComposition(applied), true);
  assert.equal(isLegacyStreamerOverlayComposition(layout), false);
  assert.equal(
    hasStreamerOverlayComposition({ ...applied, instances: applied.instances.filter((item) => ["scene", "active_panel"].includes(item.config.streamerOverlay?.role)) }),
    false,
    "a partial layout must not be mistaken for a complete supplied-overlay scene",
  );
  assert.equal(getStreamerOverlayName(layout), "Miguel Streamer Overlay");
  assert.equal(applied.name, "Miguel Streamer Overlay");
  const normalized = registry.normalizeBetterLayout(
    JSON.parse(JSON.stringify(applied)),
  );

  assert.equal(STREAMER_OVERLAY_COMPOSITION.length, 5);
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
  assert.equal(chat.config.showHeader, true);
  const hunt = normalized.instances.find(
    (item) => item.config.streamerOverlay?.role === "active_panel",
  );
  assert.deepEqual([hunt.x, hunt.y, hunt.width, hunt.height], [130, 60, 240, 720]);
  assert.equal(hunt.config.orientation, "mainstream");
  assert.equal(hunt.config.colourTheme, "neon");
  const sourcePanelMarkup = renderToStaticMarkup(
    React.createElement(sourceBonusPanel.default, {
      config: { streamerName: "Miguel", startMoney: 100, currency: "€" },
      bonuses: [
        { id: "open-1", slotName: "Source Style Slot", betSize: 1, opened: false, isSuperBonus: true },
        { id: "opened-1", slotName: "Opened Slot", betSize: 1, payout: 5, opened: true },
      ],
      stats: {
        liveBE: 10,
        avgMulti: 5,
        totalWin: 5,
        bestSlot: { slotName: "Opened Slot", betSize: 1, payout: 5, _multi: 5 },
      },
      currency: "€",
    }),
  );
  assert.match(sourcePanelMarkup, /BONUS HUNT/);
  assert.match(sourcePanelMarkup, /Source Style Slot/);
  assert.match(sourcePanelMarkup, /SUPER/);
  assert.match(sourcePanelMarkup, /BEST RESULT/);
  assert.match(sourcePanelMarkup, /TOTAL PAYOUT/);
  assert.match(sourcePanelMarkup, /€5\.00/);
  assert.match(sourcePanelMarkup, /streamer-source-bonus-panel/);
  const endedPanelMarkup = renderToStaticMarkup(
    React.createElement(sourceBonusPanel.default, {
      config: { streamerName: "Miguel", startMoney: 100, currency: "€" },
      bonuses: [{ id: "ended-1", slotName: "Finished Slot", betSize: 1, payout: 5, opened: true }],
      stats: { totalWin: 5, bestSlot: { slotName: "Finished Slot", betSize: 1, payout: 5, _multi: 5 } },
      currency: "€",
    }),
  );
  assert.match(endedPanelMarkup, /BONUS ENDED/);
  const scene = normalized.instances.find(
    (item) => item.config.streamerOverlay?.role === "scene",
  );
  assert.equal(scene.config.colourTheme, "neon");
  assert.equal(scene.config.color1, "#111827");
  assert.equal(scene.config.color2, "#1e3a8a");
  const gameplay = normalized.instances.find(
    (item) => item.config.streamerOverlay?.role === "gameplay",
  );
  const openingMarkup = renderToStaticMarkup(
    React.createElement(slotWindow.default, {
      config: gameplay.config,
      runtime: "obs",
    }),
  );
  assert.match(openingMarkup, /slot-window-widget--streamer-opening/);
  assert.match(openingMarkup, /slot-window-widget__streamer-frame/);
  assert.doesNotMatch(openingMarkup, /In ScreenSplit, isolate the slot/);

  const build = await service.createBetterEditorOverlay(
    "admin-user",
    normalized.name,
    normalized,
  );
  const fetchedBuild = await service.getBetterEditorOverlay("admin-user", build.id);
  assert.equal(hasStreamerOverlayComposition(fetchedBuild.draftLayout), true);
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
    1164,
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
  const legacyLayout = {
    ...applied,
    streamerOverlayCompositionVersion: 1,
    instances: applied.instances.map((instance) => ({
      ...instance,
      config: {
        ...instance.config,
        streamerOverlay: {
          ...instance.config.streamerOverlay,
          role: ({ scene: "scene", header: "header", active_panel: "hunt", gameplay: "gameplay", chat: "chat" })[instance.config.streamerOverlay?.role],
        },
      },
    })),
  };
  assert.equal(isLegacyStreamerOverlayComposition(legacyLayout), true);
  assert.equal(hasStreamerOverlayComposition(legacyLayout), false);
  const migrated = applyStreamerOverlayComposition(legacyLayout);
  assert.equal(hasStreamerOverlayComposition(migrated), true);
  assert.deepEqual(
    [
      migrated.instances.find((instance) => instance.config.streamerOverlay?.role === "active_panel").x,
      migrated.instances.find((instance) => instance.config.streamerOverlay?.role === "gameplay").x,
      migrated.instances.find((instance) => instance.config.streamerOverlay?.role === "chat").x,
    ],
    [130, 378, 1550],
    "legacy builds migrate to the supplied scene's exact widget positions",
  );
  const previousStyleLayout = {
    ...applied,
    instances: applied.instances.map((instance) => ({
      ...instance,
      config: {
        ...instance.config,
        colourTheme: "galactic_command",
        streamerOverlay: {
          ...instance.config.streamerOverlay,
          compositionVersion: 3,
        },
      },
    })),
  };
  assert.equal(isLegacyStreamerOverlayComposition(previousStyleLayout), true);
  assert.equal(hasStreamerOverlayComposition(previousStyleLayout), false);
  const restyled = applyStreamerOverlayComposition(previousStyleLayout);
  assert.equal(hasStreamerOverlayComposition(restyled), true);
  assert.equal(
    restyled.instances.find((instance) => instance.config.streamerOverlay?.role === "scene").config.colourTheme,
    "neon",
    "the next version migration updates saved builds to the supplied overlay's panel position and styling",
  );
  assert.ok(
    state.calls.some(
      (call) =>
        call.table === "better_editor_overlays" &&
        call.action === "update" &&
        call.filters.some(([key, value]) => key === "user_id" && value === "admin-user"),
    ),
    "draft writes are owner scoped",
  );

  const publicRecord = await service.getPublishedBetterOverlay(
    state.tables.better_overlay_publications[0].public_overlay_id,
  );
  assert.equal(publicRecord.ownerUserId, "admin-user");
  assert.equal(publicRecord.publishedLayout.name, "Miguel Streamer Overlay");

  const liveSource = await service.getPublishedBetterLiveSource(
    publicRecord.ownerUserId,
  );
  assert.equal(liveSource.overlayId, "live-overlay-admin-user");
  assert.equal(
    liveSource.widgets.find((item) => item.widget_type === "bonus_hunt")?.config
      ?.totalSpent,
    125,
    "the OBS overlay resolves the owner's current bonus hunt data from StreamersCenter's live overlay tables",
  );
  assert.equal(
    liveSource.widgets.find((item) => item.widget_type === "chat")?.config
      ?.chatStyle,
    "broadcast_chat",
    "chat is loaded from the same owner's live overlay rows",
  );
  assert.equal(liveSource.theme?.theme_name, "emerald");

  const appDatabaseTables = new Set(Object.keys(state.tables));
  assert.equal(appDatabaseTables.has("bonus_hunts"), false);
  assert.equal(appDatabaseTables.has("fever_tournaments"), false);

  const editorSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/editor/WidgetEditorPage.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(editorSource, /import \{applyStreamerOverlayComposition, getStreamerOverlayName, hasStreamerOverlayComposition, isLegacyStreamerOverlayComposition\}/);
  assert.match(editorSource, /if \(isLegacyStreamerOverlayComposition\(fullBuild\?\.draftLayout\)\)/);
  assert.match(editorSource, /await saveBetterDraft\([\s\S]*?fullBuild\.draftVersion,[\s\S]*?build\.id,/);
  assert.match(editorSource, /className="is-primary editor-streamer-overlay-action"/);
  assert.match(editorSource, /\{isAdmin && \([\s\S]{0,500}editor-streamer-overlay-action/);
  assert.match(editorSource, /<span>Open Streamer Overlay<\/span>/);
  assert.match(editorSource, /const openStreamerOverlay = useCallback\(async \(\) =>/);
  assert.match(editorSource, /listBetterEditorOverlays\(user\.id\)/);
  assert.match(editorSource, /getBetterEditorOverlay\(user\.id, build\.id\)/);
  assert.match(editorSource, /hasStreamerOverlayComposition\(fullBuild\?\.draftLayout\)/);
  assert.match(editorSource, /createBetterEditorOverlay\([\s\S]*?composed\.name,[\s\S]*?composed,/);
  assert.match(editorSource, /let buildName = overlayName;/);
  assert.match(editorSource, /Open your saved Streamer Overlay build, or create a separate one/);
  assert.match(editorSource, /editor-streamer-overlay-action/);
  const appsSource = readFileSync(
    new URL("../src/components/AppsPage/AppsPage.jsx", import.meta.url),
    "utf8",
  );
  assert.match(
    appsSource,
    /\.\.\.\(isAdmin\s*\?\s*\[[\s\S]*?to: "\/editor"[\s\S]*?label: "Streamer Overlay \(Admin Beta\)"/,
    "the website Apps page exposes the beta only to admins and opens the working editor route",
  );
  console.log(
    "Streamer Overlay checks passed: supplied-scene widgets and layout, blue source styling, transparent empty gameplay frame, admin gate, legacy build migration, owner-scoped persistence, OBS publication, live data, and embedded giveaway settings.",
  );
} finally {
  await server.close();
}
