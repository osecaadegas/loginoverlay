import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

globalThis.window = { location: { origin: "http://localhost" } };

const server = await createServer({
  logLevel: "silent",
  server: { middlewareMode: true },
  appType: "custom",
});

const {
  BUILT_IN_STYLE_PRESETS,
  CONTROL_DEFINITIONS,
  DEFAULT_SIMPLE_SETTINGS,
  EDITOR_MODE_CAPABILITIES,
  elementSupportsControl,
  generateSimpleAppearance,
  getElementControlGroups,
  getFriendlyElementLabel,
  getModeLabel,
  getContrastRatio,
  getWidgetCategory,
  getWidgetElementSchema,
  inferElementKind,
  normalizeSimpleSettings,
  SIMPLE_COLOR_PALETTE,
  SIMPLE_DENSITIES,
  SIMPLE_MATERIAL_PRESETS,
  SIMPLE_SHAPES,
  SIMPLE_TEXT_SIZES,
  validateEditorValue,
} = await server.ssrLoadModule(
  "/src/components/OverlayCenter/appearance/editorSchema.js",
);

const {
  getTargetOverrideRoot,
  getElementAppearancePropertyPath,
  appearanceToWidgetConfigDefaults,
  setByPath,
  getByPath,
  normalizeAppearance,
} = await server.ssrLoadModule(
  "/src/components/OverlayCenter/appearance/appearanceModel.js",
);

const { subElementStyle } = await server.ssrLoadModule(
  "/src/components/OverlayCenter/widgets/shared/appearanceStyles.js",
);

const { BetterBonusHuntStyle } = await server.ssrLoadModule(
  "/src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx",
);

const { updateBetterBonusTypography } = await server.ssrLoadModule(
  "/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx",
);

const { getWidgetAppearanceCapability, getWidgetAppearanceV2Elements } =
  await server.ssrLoadModule(
    "/src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js",
  );

const {
  WIDGET_CONTROLS_PRESET_KIND,
  WIDGET_CONTROLS_PRESET_VERSION,
  createWidgetControlsPreset,
  getWidgetControlsPresetFilename,
} = await server.ssrLoadModule(
  "/src/components/OverlayCenter/editor/widgetControlsPreset.js",
);

const { STANDARD_BETTER_WIDGET_CONTROLS, STANDARD_BETTER_WIDGET_GEOMETRY } =
  await server.ssrLoadModule(
    "/src/components/OverlayCenter/editor/standardWidgetPresets.js",
  );

const { parseShoutoutChatCommand } = await server.ssrLoadModule(
  "/src/services/shoutoutCommandService.js",
);

const {
  createBetterInstance,
  getBetterWidgetTypes,
  normalizeBetterInstance,
  renderBetterWidgetInstance,
  resolveBetterWidgetConfig,
} = await server.ssrLoadModule(
  "/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx",
);

const {
  getBetterWidgetNudge,
  moveBetterWidgetLayer,
  normalizeBetterCoordinate,
  reorderBetterWidgetLayers,
} = await server.ssrLoadModule(
  "/src/components/OverlayCenter/editor/betterWidgetGeometry.js",
);

try {
  assert.equal(
    normalizeBetterCoordinate(-37, 0),
    -37,
    "Better Editor normalization preserves negative foreground coordinates",
  );
  assert.equal(
    normalizeBetterCoordinate(1124, 0),
    1124,
    "Better Editor normalization preserves coordinates beyond the canvas",
  );
  assert.deepEqual(
    getBetterWidgetNudge("ArrowLeft"),
    { x: -1, y: 0 },
    "Better Editor moves left by exactly one pixel",
  );
  assert.deepEqual(
    getBetterWidgetNudge("ArrowDown"),
    { x: 0, y: 1 },
    "Better Editor moves down by exactly one pixel",
  );
  const layers = [
    { instanceId: "background", widgetType: "background", zIndex: 0 },
    { instanceId: "low", widgetType: "chat", zIndex: 1 },
    { instanceId: "middle", widgetType: "navbar", zIndex: 2 },
    { instanceId: "high", widgetType: "giveaway", zIndex: 3 },
  ];
  const draggedLayers = reorderBetterWidgetLayers(layers, "low", "high");
  assert.deepEqual(
    draggedLayers.map(({ instanceId, zIndex }) => ({ instanceId, zIndex })),
    [
      { instanceId: "background", zIndex: 0 },
      { instanceId: "low", zIndex: 3 },
      { instanceId: "middle", zIndex: 1 },
      { instanceId: "high", zIndex: 2 },
    ],
    "dragging a sidebar row onto the highest row makes it the top OBS layer",
  );
  const keyboardLayers = moveBetterWidgetLayer(layers, "high", 1);
  assert.equal(
    keyboardLayers.find((instance) => instance.instanceId === "middle")?.zIndex,
    3,
    "moving a layer down promotes the next sidebar row above it",
  );
  const lowestLayers = reorderBetterWidgetLayers(layers, "high", "background");
  assert.equal(
    lowestLayers.find((instance) => instance.instanceId === "high")?.zIndex,
    1,
    "dropping on the fixed background moves a widget to the lowest foreground layer",
  );
  assert.equal(
    lowestLayers.find((instance) => instance.instanceId === "background")
      ?.zIndex,
    0,
    "layer reordering keeps the background fixed at z-index zero",
  );
  Object.entries(STANDARD_BETTER_WIDGET_GEOMETRY).forEach(
    ([widgetType, geometry]) => {
      const instance = createBetterInstance(widgetType);
      assert.ok(instance, `${widgetType} can be created from its standard`);
      assert.deepEqual(
        {
          x: instance.x,
          y: instance.y,
          width: instance.width,
          height: instance.height,
        },
        {
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
        },
        `${widgetType} uses the standard position and frame size when added`,
      );
      Object.entries(STANDARD_BETTER_WIDGET_CONTROLS[widgetType]).forEach(
        ([key, value]) => {
          assert.deepEqual(
            instance.config[key],
            value,
            `${widgetType}.${key} uses the supplied standard control value`,
          );
        },
      );
    },
  );
  const betterObsOverlaySource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/editor/BetterObsOverlay.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    betterObsOverlaySource.includes(
      ".sort((a, b) => Number(a.zIndex) - Number(b.zIndex))",
    ) && betterObsOverlaySource.includes("zIndex: instance.zIndex"),
    "Better OBS renders the persisted sidebar layer order",
  );
  const widgetEditorPageSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/editor/WidgetEditorPage.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    widgetEditorPageSource.includes("getBetterWidgetNudge(event.key)"),
    "Better Editor routes arrow key presses through the tested pixel nudge map",
  );
  assert.ok(
    widgetEditorPageSource.includes("Download complete Chat JSON") &&
      widgetEditorPageSource.includes("resolveBetterWidgetConfig(") &&
      widgetEditorPageSource.includes('"chat",') &&
      widgetEditorPageSource.includes("liveWidgetContext,") &&
      widgetEditorPageSource.includes(
        "onDownloadPreset={handleDownloadPreset}",
      ),
    "Chat downloads route the complete resolved configuration into JSON",
  );
  const landingPageSource = readFileSync(
    new URL("../src/components/LandingPage/LandingPage.jsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    landingPageSource.includes('glow: "#0e5997"') &&
      landingPageSource.includes('ownerColor: "#cf0202"') &&
      landingPageSource.includes("chat: 4200") &&
      landingPageSource.includes("landingRandomInt(18001)") &&
      landingPageSource.includes("__previewShoutoutAlert: previewShoutout") &&
      landingPageSource.includes('message: `!so @${previewShoutout.login}`'),
    "Landing Chat uses the exported appearance, slow message feed, and randomized embedded shoutouts",
  );
  assert.ok(
    landingPageSource.includes("dropConnectFourCoin(") &&
      landingPageSource.includes("findConnectFourWin(") &&
      landingPageSource.includes("setConnectFourPreview(") &&
      landingPageSource.includes("__previewState: connectFourPreview") &&
      landingPageSource.includes(
        '["bets", "chat", "connect_four", "tournament"].includes(widget.widgetType)',
      ) &&
      landingPageSource.includes("bets: 3400") &&
      landingPageSource.includes("tournament: 2800") &&
      landingPageSource.includes("getLandingTournamentConfig(previewCycle)") &&
      landingPageSource.includes("LANDING_TOURNAMENT_MATCHES.map") &&
      landingPageSource.includes('bracketPlayerCount: 8') &&
      /title: "Tournament",[\s\S]*?widgetType: "tournament",[\s\S]*?layout: "feature",[\s\S]*?width: 960,[\s\S]*?height: 720,/.test(
        landingPageSource,
      ) &&
      landingPageSource.includes('height: 520') &&
      landingPageSource.includes('"liquid",') &&
      landingPageSource.includes('"scanline",') &&
      landingPageSource.includes('layoutMode: "bars"') &&
      landingPageSource.includes("landingRandomInt(920)"),
    "Landing Connect 4, Bets, and Tournament previews use complete live demo states without clipping",
  );
  const connectFourWidgetSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/connect-four/ConnectFourWidget.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    connectFourWidgetSource.includes("config.__previewState") &&
      connectFourWidgetSource.includes("normalizeState("),
    "Connect 4 normalizes an editor-only preview-state override",
  );
  const widgetEditorPageCssSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/editor/WidgetEditorPage.css",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    widgetEditorPageCssSource.includes(
      ".better-editor-widget-row:has(.better-editor-widget-row__menu[open]) {",
    ) &&
      widgetEditorPageCssSource.includes(
        ".better-editor-widget-list:has(.better-editor-widget-row__menu[open]) {",
      ) &&
      /\.better-editor-widget-list:has\([^)]+\)\s*\{[\s\S]*?z-index:\s*200;[\s\S]*?overflow:\s*visible;/.test(
        widgetEditorPageCssSource,
      ) &&
      /\.better-editor-widget-row__menu-panel\s*\{[\s\S]*?z-index:\s*320;/.test(
        widgetEditorPageCssSource,
      ) &&
      !widgetEditorPageCssSource.includes(
        ".better-editor-widget-row.is-hidden {\n  opacity:",
      ),
    "open widget menus escape list clipping and stack above unused widgets",
  );
  assert.ok(
    widgetEditorPageSource.includes(
      "instance.locked ? <Unlock size={14} /> : <Lock size={14} />",
    ) &&
      widgetEditorPageSource.includes(
        'instance.locked ? "Unlock widget" : "Lock widget"',
      ),
    "movable widgets expose matching lock and unlock actions",
  );
  const betterWidgetRegistrySource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/editor/betterWidgetRegistry.jsx",
      import.meta.url,
    ),
    "utf8",
  ).replaceAll("\r\n", "\n");
  const betterWidgetPackagesSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/editor/BetterWidgetPackages.jsx",
      import.meta.url,
    ),
    "utf8",
  ).replaceAll("\r\n", "\n");
  const standardWidgetPresetsSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/editor/standardWidgetPresets.js",
      import.meta.url,
    ),
    "utf8",
  ).replaceAll("\r\n", "\n");
  assert.ok(
    betterWidgetRegistrySource.includes(
      "giveaway: { minWidth: 240, minHeight: 180",
    ),
    "Better Editor allows Giveaway widgets to shrink to the renderer's 240px minimum width",
  );
  const shoutoutInstance = createBetterInstance("raid_shoutout");
  assert.equal(
    shoutoutInstance.config.displayStyle,
    "better_raid_shoutout",
    "Twitch Shoutout is a first-class Better widget",
  );
  assert.deepEqual(
    {
      width: shoutoutInstance.width,
      height: shoutoutInstance.height,
      accentColor: shoutoutInstance.config.accentColor,
      backgroundColor: shoutoutInstance.config.backgroundColor,
    },
    {
      width: 640,
      height: 360,
      accentColor: "#45c8ff",
      backgroundColor: "#081228",
    },
    "Twitch Shoutout defaults to a widescreen player in the shared blue palette",
  );
  const migratedShoutout = normalizeBetterInstance({
    ...shoutoutInstance,
    x: 680,
    y: 330,
    width: 560,
    height: 420,
    config: {
      ...shoutoutInstance.config,
      accentColor: "#9146ff",
      secondaryColor: "#22d3ee",
      backgroundColor: "#090711",
    },
  });
  assert.deepEqual(
    {
      x: migratedShoutout.x,
      y: migratedShoutout.y,
      width: migratedShoutout.width,
      height: migratedShoutout.height,
      accentColor: migratedShoutout.config.accentColor,
      secondaryColor: migratedShoutout.config.secondaryColor,
    },
    {
      x: 640,
      y: 360,
      width: 640,
      height: 360,
      accentColor: "#45c8ff",
      secondaryColor: "#1385e9",
    },
    "legacy default Shoutouts migrate in place to widescreen blue without moving their centre",
  );
  assert.ok(
    !Object.keys(shoutoutInstance.config).some((key) =>
      /client.?id|access.?token|oauth|secret/i.test(key),
    ),
    "Twitch Shoutout never persists Twitch credentials in widget configuration",
  );
  assert.deepEqual(
    parseShoutoutChatCommand({
      id: "twitch-message-owner",
      message: '!so "@Some_Channel"',
      isBroadcaster: true,
      isMod: false,
    }),
    {
      raiderUsername: "some_channel",
      sourceEventId: "twitch-message-owner",
      requesterRole: "broadcaster",
    },
    "channel owners can trigger !so with quoted or @-prefixed Twitch usernames",
  );
  assert.deepEqual(
    parseShoutoutChatCommand({
      id: "twitch-message-mod",
      message: "!so target_user",
      isBroadcaster: false,
      isMod: true,
    }),
    {
      raiderUsername: "target_user",
      sourceEventId: "twitch-message-mod",
      requesterRole: "moderator",
    },
    "channel moderators can trigger !so username",
  );
  assert.equal(
    parseShoutoutChatCommand({
      id: "twitch-message-viewer",
      message: "!so target_user",
      isBroadcaster: false,
      isMod: false,
    }),
    null,
    "ordinary viewers cannot trigger shoutout clips",
  );
  const shoutoutMarkup = renderToStaticMarkup(
    renderBetterWidgetInstance({
      instance: shoutoutInstance,
      layout: { instances: [shoutoutInstance] },
      mode: "mock",
    }),
  );
  for (const elementId of [
    "container",
    "header",
    "avatar",
    "title",
    "subtitle",
    "viewsBadge",
    "timer",
    "clipFrame",
    "footer",
    "channel",
    "liveBadge",
  ]) {
    assert.ok(
      shoutoutMarkup.includes(`data-widget-element="${elementId}"`),
      `Twitch Shoutout exposes the stable ${elementId} appearance element`,
    );
  }
  const liveShoutoutEditorMarkup = renderToStaticMarkup(
    renderBetterWidgetInstance({
      instance: shoutoutInstance,
      layout: { instances: [shoutoutInstance] },
      mode: "live",
      runtime: "editor",
    }),
  );
  assert.ok(
    liveShoutoutEditorMarkup.includes("better-shoutout-stage"),
    "live data mode still renders the Twitch Shoutout preview in the editor",
  );
  const shoutoutWidgetSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/raid-shoutout/RaidShoutoutWidget.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    shoutoutWidgetSource.includes("subscribeToShoutoutAlerts") &&
      shoutoutWidgetSource.includes("getPendingAlerts") &&
      shoutoutWidgetSource.includes("markAlertShown") &&
      shoutoutWidgetSource.includes("markAlertDismissed"),
    "OBS shoutouts use the production realtime queue and lifecycle service",
  );
  assert.ok(
    shoutoutWidgetSource.includes("video.defaultMuted = true") &&
      shoutoutWidgetSource.includes("video.play()") &&
      shoutoutWidgetSource.includes("autoplay=true&muted=true") &&
      shoutoutWidgetSource.includes(String.raw`-preview-\d+x\d+`) &&
      !betterWidgetPackagesSource.includes('label="Autoplay clip"') &&
      !betterWidgetPackagesSource.includes('label="Mute clip"'),
    "Shoutout clips autoplay muted and modern Twitch thumbnails bypass the obsolete MP4 derivation",
  );
  assert.ok(
    betterWidgetRegistrySource.includes(
      "raid_shoutout: {\n    minWidth: 240,\n    minHeight: 135",
    ) &&
      betterWidgetPackagesSource.includes(
        "width: patch.width ?? widget?.width",
      ) &&
      betterWidgetPackagesSource.includes(
        "height: patch.height ?? widget?.height",
      ),
    "Shoutout width and height can be resized independently down to compact dimensions",
  );
  assert.ok(
    shoutoutWidgetSource.includes('runtime !== "obs"') &&
      betterWidgetRegistrySource.includes('runtime = "editor"') &&
      betterObsOverlaySource.includes('runtime: "obs"'),
    "editor preview cannot subscribe to or consume production shoutout alerts",
  );
  assert.ok(
    betterObsOverlaySource.includes(
      "isSingleWidget || !targetWidth || !targetHeight",
    ) &&
      betterObsOverlaySource.includes(
        "Math.min(viewport.width / targetWidth, viewport.height / targetHeight)",
      ),
    "individual OBS widget URLs preserve saved pixel dimensions while full overlays still scale to the viewport",
  );
  assert.ok(
    betterWidgetRegistrySource.includes(
      'raid_shoutout: ["twitchChannel", "chatCommandEnabled"]',
    ) && betterWidgetRegistrySource.includes("publicOverlayId,"),
    "published OBS shoutouts merge tile command settings and receive the public overlay token",
  );
  const builtinWidgetsSourceForShoutout = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/builtinWidgets.js",
      import.meta.url,
    ),
    "utf8",
  );
  const overlayControlCenterSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/OverlayControlCenter.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    builtinWidgetsSourceForShoutout.includes('type: "raid_shoutout"') &&
      builtinWidgetsSourceForShoutout.includes("RaidShoutoutConfig"),
    "Raid Shoutout is registered with an operational Overlay Center settings panel",
  );
  assert.ok(
    overlayControlCenterSource.includes('title: "Twitch Shoutout"') &&
      /PRIMARY_TOOLS[\s\S]*?"raid_shoutout"/.test(overlayControlCenterSource),
    "Overlay Center shows a Twitch Shoutout tool tile",
  );
  const profileSectionSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/ProfileSection.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    /raid_shoutout:\s*\{\s*twitchUsername:\s*"twitchChannel"/.test(
      profileSectionSource,
    ) && /raid_shoutout:\s*"SO"/.test(profileSectionSource),
    "Widget Sync includes Shoutout and applies the profile Twitch channel",
  );
  const shoutoutMigrationSource = readFileSync(
    new URL(
      "../migrations/032_shoutout_chat_command_deduplication.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    shoutoutMigrationSource.includes("source_event_id") &&
      shoutoutMigrationSource.includes("CREATE UNIQUE INDEX"),
    "Twitch source event IDs prevent duplicate alerts across OBS browser sources",
  );
  const shoutoutApiSource = readFileSync(
    new URL("../api/raid-shoutout.js", import.meta.url),
    "utf8",
  );
  assert.ok(
    shoutoutApiSource.includes(
      'req.method === "POST" && triggeredBy === "chat_command"',
    ) &&
      shoutoutApiSource.includes('["PGRST204", "42703"]') &&
      shoutoutApiSource.includes("delete legacyAlertPayload.source_event_id"),
    "owner/mod command checks do not intercept legacy GET webhook triggers",
  );
  assert.ok(
    shoutoutApiSource.includes("resolveModernClipVideoUrl(clip.id)") &&
      shoutoutApiSource.includes("playbackAccessToken") &&
      shoutoutApiSource.includes(
        'qualities.find((item) => item.quality === "720")',
      ),
    "modern Twitch clips resolve to signed 720p MP4 sources before the iframe fallback",
  );
  for (const frameStyle of ["neon", "glass", "retro", "minimal", "gaming"]) {
    assert.ok(
      betterWidgetPackagesSource.includes(`value: "${frameStyle}"`),
      `Twitch Shoutout offers the supplied ${frameStyle} frame style`,
    );
  }
  for (const animation of [
    "slide-left",
    "slide-right",
    "slide-top",
    "slide-bottom",
    "zoom",
    "flip",
    "bounce",
    "glitch",
    "roll",
  ]) {
    assert.ok(
      betterWidgetPackagesSource.includes(`value: "${animation}"`),
      `Twitch Shoutout offers the supplied ${animation} animation`,
    );
  }
  const presetExportedAt = "2026-08-01T12:00:00.000Z";
  const preset = createWidgetControlsPreset(
    {
      widgetType: "bonus_hunt",
      label: "Better Hunt",
      config: { drawerMode: "contain", accentColor: "#45c8ff" },
      x: -37,
      y: 1124,
      width: 430,
      height: 884,
      liveData: { totalPay: 1200 },
    },
    presetExportedAt,
  );
  assert.deepEqual(
    preset,
    {
      kind: WIDGET_CONTROLS_PRESET_KIND,
      schemaVersion: WIDGET_CONTROLS_PRESET_VERSION,
      exportedAt: presetExportedAt,
      instanceId: null,
      widgetType: "bonus_hunt",
      widgetLabel: "Better Hunt",
      position: { x: -37, y: 1124 },
      size: { width: 430, height: 884 },
      layout: { visible: true, locked: false, opacity: 1, zIndex: 1 },
      controls: { drawerMode: "contain", accentColor: "#45c8ff" },
    },
    "widget control presets contain controls, signed position, and frame size without live state",
  );
  for (const widgetType of getBetterWidgetTypes()) {
    const instance = createBetterInstance(widgetType);
    const widgetPreset = createWidgetControlsPreset(instance, presetExportedAt);
    assert.deepEqual(
      widgetPreset.controls,
      instance.config,
      `${widgetType} exports every normalized widget control`,
    );
    assert.deepEqual(
      widgetPreset.layout,
      {
        visible: instance.visible,
        locked: instance.locked,
        opacity: instance.opacity,
        zIndex: instance.zIndex,
      },
      `${widgetType} exports all instance-level controls`,
    );
  }
  const chatInstance = createBetterInstance("chat", {
    instanceId: "chat-complete-export",
    config: {
      roleEffects: { ownerColor: "#123456" },
      celebrations: { raid: false },
      subElements: { message: { textColor: "#abcdef" } },
    },
  });
  const completeChatConfig = resolveBetterWidgetConfig(
    "chat",
    chatInstance.config,
    "live",
    {
      liveWidgets: [
        {
          widget_type: "chat",
          config: {
            twitchEnabled: true,
            twitchChannel: "completechannel",
            youtubeEnabled: true,
            youtubeVideoId: "youtube-video-id",
            youtubeApiKey: "youtube-api-key",
            kickEnabled: true,
            kickChannelId: "kick-channel-id",
          },
        },
      ],
    },
  );
  const completeChatPreset = createWidgetControlsPreset(
    { ...chatInstance, config: completeChatConfig },
    presetExportedAt,
  );
  assert.equal(completeChatPreset.instanceId, "chat-complete-export");
  assert.equal(completeChatPreset.controls.twitchChannel, "completechannel");
  assert.equal(completeChatPreset.controls.youtubeVideoId, "youtube-video-id");
  assert.equal(completeChatPreset.controls.youtubeApiKey, "youtube-api-key");
  assert.equal(completeChatPreset.controls.kickChannelId, "kick-channel-id");
  assert.equal(completeChatPreset.controls.roleEffects.ownerColor, "#123456");
  assert.equal(completeChatPreset.controls.celebrations.raid, false);
  assert.equal(
    completeChatPreset.controls.subElements.message.textColor,
    "#abcdef",
  );
  assert.equal(
    getWidgetControlsPresetFilename(
      { widgetType: "bonus_hunt" },
      presetExportedAt,
    ),
    "bonus-hunt-controls-preset-2026-08-01.json",
    "widget control presets use a stable JSON filename",
  );
  const builtInWidgetsSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/builtinWidgets.js",
      import.meta.url,
    ),
    "utf8",
  );
  const navbarWidgetSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/navbar/NavbarWidget.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  const navbarConfigSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/navbar/NavbarConfig.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  const spotifyAuthSource = readFileSync(
    new URL("../src/utils/spotifyAuth.js", import.meta.url),
    "utf8",
  );
  const publicSpotifySource = readFileSync(
    new URL("../api/public-spotify-now-playing.js", import.meta.url),
    "utf8",
  );
  const cryptoPricesSource = readFileSync(
    new URL("../api/crypto-prices.js", import.meta.url),
    "utf8",
  );
  assert.ok(
    navbarWidgetSource.includes("SiTwitch") &&
      navbarWidgetSource.includes("SiKick") &&
      navbarWidgetSource.includes("SiYoutube") &&
      navbarWidgetSource.includes("SiX") &&
      navbarWidgetSource.includes("SiInstagram") &&
      navbarWidgetSource.includes("SiDiscord") &&
      navbarWidgetSource.includes("SiTiktok"),
    "Better Navbar renders official logos for every supported social platform",
  );
  assert.ok(
    navbarWidgetSource.includes(
      "const handle = formatSocialHandle(item.value)",
    ) && !navbarWidgetSource.includes("item.short"),
    "Better Navbar socials always show handles instead of text abbreviations",
  );
  assert.ok(
    navbarWidgetSource.includes("const socialIconSize = Math.max(") &&
      navbarWidgetSource.includes("compact ? 18 : 20") &&
      navbarWidgetSource.includes("const socialHandleSize = Math.max(") &&
      navbarWidgetSource.includes('background: "transparent"') &&
      navbarWidgetSource.includes("borderRadius: 0") &&
      navbarWidgetSource.includes('textShadow: "0 1px 2px rgba(0,0,0,0.9)"') &&
      !navbarWidgetSource.includes("drop-shadow(0 0 5px") &&
      !navbarWidgetSource.includes("socialPillHeight"),
    "Better Navbar socials use clear, unframed official icons without neon glow",
  );
  assert.ok(
    navbarWidgetSource.includes('runtime === "obs" && publicOverlayId') &&
      navbarWidgetSource.includes("fetchPublicNowPlaying(publicOverlayId)") &&
      spotifyAuthSource.includes("/api/public-spotify-now-playing") &&
      spotifyAuthSource.includes("data.nowPlaying || null") &&
      publicSpotifySource.includes('from("better_overlay_publications")') &&
      publicSpotifySource.includes('.is("revoked_at", null)') &&
      publicSpotifySource.includes("{ nowPlaying: result.nowPlaying }") &&
      !publicSpotifySource.includes("spotify_refresh_token:"),
    "Better Navbar fetches Spotify data securely in public OBS sources",
  );
  assert.ok(
    betterWidgetPackagesSource.includes("NAVBAR_SOCIAL_DISPLAY_OPTIONS") &&
      betterWidgetPackagesSource.includes(
        '{ key: "marquee", name: "Marquee" }',
      ) &&
      betterWidgetPackagesSource.includes(
        '{ key: "slide", name: "Slideshow" }',
      ) &&
      betterWidgetPackagesSource.includes("socialMarqueeDuration") &&
      betterWidgetPackagesSource.includes("socialIntervalMs") &&
      navbarConfigSource.includes("Display mode") &&
      navbarConfigSource.includes("socialMarqueeDuration") &&
      navbarConfigSource.includes("socialIntervalMs") &&
      navbarWidgetSource.includes("nbSocialMarquee") &&
      navbarWidgetSource.includes('socialMode === "slide"') &&
      navbarWidgetSource.includes('socialMode === "fade"'),
    "Navbar controls support static, marquee, slideshow, and fade display modes",
  );
  assert.ok(
    navbarWidgetSource.includes('fetch("/api/crypto-prices"') &&
      navbarWidgetSource.includes("readCachedCryptoPrices") &&
      navbarWidgetSource.includes('"Loading markets..."') &&
      cryptoPricesSource.includes("api.coingecko.com/api/v3/simple/price") &&
      cryptoPricesSource.includes("stale-while-revalidate=300"),
    "Better Navbar loads crypto through a cached same-origin endpoint and keeps a visible fallback",
  );
  assert.ok(
    !betterWidgetPackagesSource.includes("import TournamentConfig"),
    "Better Editor does not import the full Tournament data manager",
  );
  assert.ok(
    betterWidgetPackagesSource.includes("function BetterTournamentControls"),
    "Better Editor provides dedicated Tournament appearance controls",
  );
  assert.ok(
    /tournament:\s*\{[\s\S]*?showBg:\s*true,[\s\S]*?panelHi:\s*"#0c1c40"[\s\S]*?bgColor:\s*"#0a1734"[\s\S]*?panelLo:\s*"#081228"/.test(
      betterWidgetPackagesSource,
    ),
    "Better Tournament has the exact Bonus Hunt ocean main card",
  );
  assert.ok(
    betterWidgetPackagesSource.includes("const next = { ...c }"),
    "Tournament appearance reset starts from the complete saved config",
  );
  const tournamentWidgetSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/tournament/TournamentWidget.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    /width:\s*large\s*\?\s*"clamp\(20px, 2\.8vw, 34px\)"/.test(
      tournamentWidgetSource,
    ),
    "Tournament Now Playing keeps the VS column narrow so player images stay wide",
  );
  assert.ok(
    tournamentWidgetSource.includes('minHeight: "clamp(96px, 19vh, 168px)"'),
    "Tournament Now Playing avoids reserving excess space below its cards",
  );
  const betterWidgetStylesSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx",
      import.meta.url,
    ),
    "utf8",
  ).replaceAll("\r\n", "\n");
  const giveawayConfigSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/giveaway/GiveawayConfig.jsx",
      import.meta.url,
    ),
    "utf8",
  ).replaceAll("\r\n", "\n");
  assert.ok(
    giveawayConfigSource.includes("function participantFromMessage(message)") &&
      giveawayConfigSource.includes("pendingRef.current.push(participant)") &&
      giveawayConfigSource.includes("participants.map(participantKey)") &&
      betterWidgetStylesSource.includes("function BetterGiveawayAvatar") &&
      betterWidgetStylesSource.includes("twitchAvatarProxyUrl(login)"),
    "Better Giveaway retains Twitch participant identity and renders profile avatars with fallback support",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      'data-giveaway-winner={isWinner ? "true" : undefined}',
    ) &&
      betterWidgetStylesSource.includes("viewport.clientWidth / 2") &&
      betterWidgetStylesSource.includes(
        "winnerChip.offsetLeft + winnerChip.offsetWidth / 2",
      ) &&
      betterWidgetStylesSource.includes("observer.observe(stage)") &&
      betterWidgetStylesSource.includes(
        "requestAnimationFrame(measureWinnerOffset)",
      ) &&
      betterWidgetStylesSource.includes(
        "transform:translate3d(var(--gw-winner-offset),0,0)",
      ),
    "Better Giveaway always lands the selected winner avatar at the measured viewport center",
  );
  assert.ok(
    betterWidgetStylesSource.includes("function BetterGiveawayConfetti()") &&
      betterWidgetStylesSource.includes("better-gw-confetti-fall") &&
      betterWidgetStylesSource.includes("better-gw-pointer-crossline"),
    "Better Giveaway celebrates the centered winner with confetti and a two-axis crosshair",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      '[data-drawer-mode="contain"] .better-hunt-drawer{height:auto;min-height:0;max-height:0;transform:translateY(100%)',
    ),
    "contained Bonus Hunt hides the drawer below Total Pay without reserving list space",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      '[data-drawer-mode="contain"] .better-hunt-drawer.is-open{max-height:var(--bh-drawer-open-height);opacity:1;transform:translateY(0)',
    ),
    "contained Bonus Hunt slides the drawer upward while shrinking the list",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      '[data-drawer-mode="contain"] .better-hunt-vertical > .better-hunt-list',
    ) &&
      betterWidgetStylesSource.includes(
        '[data-drawer-mode="contain"] .better-hunt-main-list-wrap',
      ) &&
      betterWidgetStylesSource.includes(
        '[data-drawer-mode="contain"] .better-hunt-left > .better-hunt-carousel',
      ) &&
      betterWidgetStylesSource.includes(
        '[data-drawer-mode="contain"] .better-hunt-left{height:100%;min-height:0;overflow:hidden}',
      ),
    "contained Bonus Hunt assigns one shrinkable content region in every orientation",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      'height: drawerMode === "contain" ? undefined : listHeight',
    ) &&
      !betterWidgetStylesSource.includes(
        'height: drawerMode === "contain" ? "100%" : listHeight',
      ),
    "contained Bonus Hunt lets layout shrink and restore the list instead of forcing full height",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      '[data-drawer-mode="expand"][data-anim="on"] .better-hunt-drawer.is-open{animation:better-hunt-drawer-in',
    ),
    "expanded Bonus Hunt grows only the anchored panel bottom",
  );
  assert.ok(
    !betterWidgetStylesSource.includes(
      '[data-drawer-mode="contain"][data-anim="on"] .better-hunt-drawer.is-open{animation:better-hunt-stats-in',
    ),
    "contained Bonus Hunt never slides best and worst cards horizontally",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      "clampNumber(c.drawerHoldSeconds, 12, 30, 15)",
    ),
    "Bonus Hunt best/worst cards remain visible long enough to read",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      'const requestView = c.requestView === "carousel" ? "carousel" : "list"',
    ) &&
      betterWidgetStylesSource.includes("better-hunt-request-stage") &&
      betterWidgetStylesSource.includes("distance * 88") &&
      betterWidgetStylesSource.includes("-abs * 100") &&
      betterWidgetStylesSource.includes("BETTER_HUNT_REQUEST_ROWS") &&
      betterWidgetStylesSource.includes("better-hunt-request-group") &&
      betterWidgetStylesSource.includes("prefers-reduced-motion:reduce"),
    "Better Bonus Hunt exports matching list and 3D request feeds with stable animation guards",
  );
  const bonusHuntConfigSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/bonus-hunt/BonusHuntConfig.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  const bonusHuntWidgetSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/bonus-hunt/BonusHuntWidget.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  const slotRequestDataSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/slot-requests/shared/useSlotRequestsData.js",
      import.meta.url,
    ),
    "utf8",
  );
  const publicSlotRequestsApiSource = readFileSync(
    new URL("../api/public-slot-requests.js", import.meta.url),
    "utf8",
  );
  const overlayCenterStylesSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/OverlayCenter.css",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    overlayControlCenterSource.includes(
      '"streamers-center:overlay-center:tools-preview-expanded:v1"',
    ) &&
      /window\.localStorage\.getItem\(TOOLS_PREVIEW_STORAGE_KEY\)/.test(
        overlayControlCenterSource,
      ) &&
      /window\.localStorage\.setItem\([\s\S]*?TOOLS_PREVIEW_STORAGE_KEY/.test(
        overlayControlCenterSource,
      ) &&
      !overlayControlCenterSource.includes(
        'currentPanel !== "home" && toolsPreviewExpanded',
      ) &&
      /\.oc2-better-preview-shell\s*\{[\s\S]*?aspect-ratio:\s*16\s*\/\s*9;/.test(
        overlayCenterStylesSource,
      ) &&
      !overlayCenterStylesSource.includes(
        "min-height: clamp(560px, 72vh, 820px)",
      ),
    "Overlay Center live preview fills its 16:9 stage and preserves the expanded state in client storage",
  );
  assert.ok(
    bonusHuntWidgetSource.includes("publicOverlayId,") &&
      bonusHuntWidgetSource.includes("runtime,") &&
      slotRequestDataSource.includes(
        'const usePublicOverlayApi = runtime === "obs" && !!publicOverlayId',
      ) &&
      slotRequestDataSource.includes("/api/public-slot-requests?") &&
      slotRequestDataSource.includes("window.setInterval(fetchRequests, 5000)"),
    "Bonus Hunt OBS requests use the public overlay endpoint and refresh independently of authenticated canvas realtime",
  );
  assert.ok(
    publicSlotRequestsApiSource.includes("PUBLIC_OVERLAY_ID_PATTERN") &&
      publicSlotRequestsApiSource.includes(
        'from("better_overlay_publications")',
      ) &&
      publicSlotRequestsApiSource.includes('is("revoked_at", null)') &&
      publicSlotRequestsApiSource.includes(
        '.eq("user_id", publication.owner_user_id)',
      ) &&
      publicSlotRequestsApiSource.includes('eq("status", "pending")'),
    "Public slot requests resolve a non-revoked publication owner server-side before returning pending display rows",
  );
  assert.ok(
    bonusHuntConfigSource.includes('update({ status: "played" })') &&
      slotRequestDataSource.includes("requestActions") &&
      slotRequestDataSource.includes('status === "played"') &&
      slotRequestDataSource.includes('status === "refunded"') &&
      publicSlotRequestsApiSource.includes("actions:") &&
      bonusHuntWidgetSource.includes("requestActions") &&
      betterWidgetStylesSource.includes("better-hunt-request-transfer") &&
      betterWidgetStylesSource.includes("better-hunt-request-landing") &&
      betterWidgetStylesSource.includes("better-hunt-request-shard") &&
      betterWidgetStylesSource.includes(
        "const sourceAnchorNode =",
      ) &&
      betterWidgetStylesSource.includes(
        '".better-hunt-request-list, .better-hunt-request--empty"',
      ) &&
      betterWidgetStylesSource.includes(
        "better-hunt-request-shard-surface",
      ) &&
      betterWidgetStylesSource.includes(
        '"--bh-transfer-end-x": endScaleX',
      ) &&
      betterWidgetStylesSource.includes(
        '"--bh-transfer-end-y": endScaleY',
      ) &&
      betterWidgetStylesSource.includes(
        'className="better-hunt-request-transfer-ring"',
      ) &&
      betterWidgetStylesSource.includes(
        "const scaleX = rootRect.width / rootNode.clientWidth || 1;",
      ) &&
      betterWidgetStylesSource.includes(
        "const scaleY = rootRect.height / rootNode.clientHeight || 1;",
      ) &&
      betterWidgetStylesSource.includes(
        'requestArea?.querySelector(".better-hunt-request-card.is-center")',
      ) &&
      betterWidgetStylesSource.includes(
        "height: Math.max(32, rowHeight - 6)",
      ) &&
      betterWidgetStylesSource.includes(
        "filter:brightness(1.12) saturate(1.14)",
      ) &&
      betterWidgetStylesSource.includes(
        "better-hunt-request-ring-reveal{0%{opacity:.82}12%,100%{opacity:1}}",
      ) &&
      betterWidgetStylesSource.includes(
        ".better-hunt-row--compact{grid-template-columns:auto minmax(0,1fr) auto;gap:7px;min-height:52px;padding:5px 8px 5px 26px}",
      ) &&
      betterWidgetStylesSource.includes(
        ".better-hunt-row--names{grid-template-columns:minmax(0,1fr) auto;gap:7px;min-height:32px;padding:6px 8px 6px 26px}",
      ) &&
      betterWidgetStylesSource.includes(
        ".better-hunt-row-id{position:absolute;left:3px;top:50%",
      ) &&
      betterWidgetStylesSource.includes(
        "Math.min(8, Math.round(source.width / 44))",
      ) &&
      betterWidgetStylesSource.includes(
        "Math.min(3, Math.round(source.height / 34))",
      ) &&
      betterWidgetStylesSource.includes(
        "const requestActionAnimationsEnabled = c.requestActionAnimations === true;",
      ) &&
      betterWidgetStylesSource.includes(
        "if (requestActionAnimationsEnabled && fresh.length)",
      ) &&
      betterWidgetStylesSource.includes(
        "if (!requestActionVisual || !requestActionAnimationsEnabled)",
      ) &&
      betterWidgetPackagesSource.includes(
        'label="Add and shatter animations"',
      ) &&
      betterWidgetPackagesSource.includes(
        "checked={c.requestActionAnimations === true}",
      ) &&
      betterWidgetStylesSource.includes(
        "`${action.id}-shard-${row}-${column}`",
      ) &&
      /bonus_hunt:\s*\{[\s\S]*?showRequests: true,\s*animations: false,/.test(
        betterWidgetPackagesSource,
      ) &&
      /bonus_hunt:\s*\{[\s\S]*?showRequests: true,\s*animations: false,/.test(
        standardWidgetPresetsSource,
      ) &&
      /bonus_hunt:\s*\{[\s\S]*?requestActionAnimations: false,/.test(
        betterWidgetPackagesSource,
      ) &&
      /bonus_hunt:\s*\{[\s\S]*?requestActionAnimations: false,/.test(
        standardWidgetPresetsSource,
      ),
    "Better Bonus Hunt carries Add to BH and Points Back events into shared preview and OBS transfer/shatter animations",
  );
  assert.ok(
    bonusHuntConfigSource.includes("function getBonusHuntProvider(bonus)") &&
      bonusHuntConfigSource.includes(
        "const provider = getBonusHuntProvider(bonus)",
      ) &&
      bonusHuntConfigSource.includes("provider={provider}"),
    "Bonus Hunt management rows resolve provider logos from every supported bonus shape",
  );
  assert.ok(
    bonusHuntConfigSource.includes("function getBonusHuntRequester(bonus)") &&
      bonusHuntConfigSource.includes("bonus?.requested_by") &&
      bonusHuntConfigSource.includes(
        'className="bh-list-provider bh-list-requester"',
      ) &&
      bonusHuntConfigSource.includes("{requester}") &&
      !bonusHuntConfigSource.includes("bh-list-field--requester"),
    "Bonus Hunt request names replace the provider without adding a separate row field",
  );
  assert.ok(
    betterWidgetStylesSource.includes("function bonusRequester(bonus)") &&
      betterWidgetStylesSource.includes("bonus?.requestedBy") &&
      betterWidgetStylesSource.includes("bonus?.requested_by") &&
      betterWidgetStylesSource.includes(
        "bonusRequester(bonus) ||\n              bonusProvider(bonus)",
      ),
    "Better Bonus Hunt Rows show a chat requester instead of the provider beneath the slot name",
  );
  assert.ok(
    overlayCenterStylesSource.includes("width: 108px") &&
      overlayCenterStylesSource.includes("height: 24px") &&
      overlayCenterStylesSource.includes("padding: 1px 3px") &&
      overlayCenterStylesSource.includes("box-sizing: border-box") &&
      overlayCenterStylesSource.includes("max-height: 100%") &&
      overlayCenterStylesSource.includes("object-position: left center") &&
      !overlayCenterStylesSource.includes("flex: 0 0 108px"),
    "Bonus Hunt provider images fit without changing the fixed row layout",
  );
  assert.ok(
    overlayCenterStylesSource.includes(
      "grid-template-columns: 66px 48px 82px 48px 30px",
    ) &&
      overlayCenterStylesSource.includes("justify-self: end") &&
      /\.bh-list-side\s+\.bh-list-payout-input\s*\{\s*width: 100%;\s*box-sizing: border-box;/.test(
        overlayCenterStylesSource,
      ) &&
      !/\.bh-list-side\s+\.bh-list-payout-input\s*\{[^}]*width: 74px;/.test(
        overlayCenterStylesSource,
      ),
    "Bonus Hunt row controls stay aligned to the right-side grid",
  );
  assert.ok(
    overlayCenterStylesSource.includes("flex: 0 0 50px") &&
      overlayCenterStylesSource.includes("width: 38px !important") &&
      overlayCenterStylesSource.includes("max-height: 38px !important"),
    "Bonus Hunt request queue fits four compact thumbnail rows",
  );
  const betterOverlayServiceSource = readFileSync(
    new URL("../src/services/betterOverlayService.js", import.meta.url),
    "utf8",
  );
  const multiWindowEditorSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/editor/WidgetEditorPage.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    betterOverlayServiceSource.includes(
      '.eq("draft_version", baseDraftVersion)',
    ) &&
      betterOverlayServiceSource.includes("BETTER_OVERLAY_DRAFT_CONFLICT") &&
      multiWindowEditorSource.includes("overlayRecord?.draftVersion") &&
      multiWindowEditorSource.includes("streamers-center-better-editor") &&
      multiWindowEditorSource.includes("better-editor-draft-saved"),
    "Better Editor synchronizes clean windows and rejects stale writes",
  );
  assert.ok(
    betterWidgetStylesSource.includes("request?.requested_by") &&
      betterWidgetStylesSource.includes("request?.slot_name") &&
      betterWidgetStylesSource.includes("request?.slot_image"),
    "Bonus Hunt request rows consume the canonical slot request fields",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      'className="better-hunt-request-image"',
    ) &&
      betterWidgetStylesSource.includes(
        'className="better-hunt-request-copy"',
      ) &&
      betterWidgetStylesSource.includes("Requested by <b>"),
    "Bonus Hunt requests render as image-left rows with the viewer below the slot name",
  );
  assert.ok(
    betterWidgetPackagesSource.includes('label="Always visible"') &&
      betterWidgetPackagesSource.includes("drawerAlwaysVisible: false"),
    "Bonus Hunt exposes a persisted always-visible Best/Worst control",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      'const drawerMode = drawerAlwaysVisible ? "expand" : configuredDrawerMode',
    ) &&
      betterWidgetStylesSource.includes(
        "drawerAlwaysVisible ||\n        c.drawerOpen === true",
      ),
    "always-visible Best/Worst bypasses timing and uses the expanded bottom layout",
  );
  assert.ok(
    betterWidgetStylesSource.includes('"--w-bg": c.bgColor || "#0a1734"'),
    "Better Giveaway routes its editable background color through the Bonus Hunt panel midpoint",
  );
  assert.ok(
    betterWidgetStylesSource.includes('"--w-panel-hi": c.panelHi || "#0c1c40"'),
    "Better Giveaway uses the exact Bonus Hunt ocean panel highlight",
  );
  assert.ok(
    betterWidgetStylesSource.includes('c.accentColor || "#45c8ff"'),
    "Better Giveaway uses the exact Bonus Hunt ocean ice accent",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      "linear-gradient(180deg,#0c1c40 0%,#0a1734 55%,#081228 100%)",
    ),
    "Better Bets uses the exact Bonus Hunt ocean panel gradient",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      '"--card-bg": "linear-gradient(180deg,#0d2049,#0a1836)"',
    ),
    "Better Bets uses the exact Bonus Hunt ocean card gradient",
  );
  const chatWidgetSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/chat/ChatWidget.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  const raidShoutoutSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/raid-shoutout/RaidShoutoutWidget.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    chatWidgetSource.includes(
      "linear-gradient(180deg, ${panelHi} 0%, ${panel} 55%, ${panelLo} 100%)",
    ),
    "Better Chat uses the exact Bonus Hunt ocean panel gradient",
  );
  assert.ok(
    chatWidgetSource.includes("useTwitchChat(resolvedTwitchChannel") &&
      /type:\s*"chat"[\s\S]*?defaults:\s*\{[\s\S]*?twitchEnabled:\s*true/.test(
        builtInWidgetsSource,
      ),
    "Better Chat connects whenever a Twitch channel resolves",
  );
  assert.ok(
    betterWidgetStylesSource.includes('label: "OWNER"') &&
      betterWidgetStylesSource.includes('label: "MOD"') &&
      betterWidgetStylesSource.includes('label: "VIP"') &&
      betterWidgetStylesSource.includes('label: "SUB"') &&
      betterWidgetStylesSource.includes("roleEffects[definition.colorKey]") &&
      !betterWidgetStylesSource.includes('{platform?.icon || "C"}'),
    "Better Chat replaces the Twitch initial with configurable role badges",
  );
  assert.ok(
    betterWidgetStylesSource.includes("roleEffects.intensity") &&
      betterWidgetStylesSource.includes("roleEffects.raidColor") &&
      betterWidgetStylesSource.includes("better-chat-lantern ${effectSpeed}"),
    "Better Chat gives roles and raids distinct configurable glazed message effects",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      '(title && title !== "Bonus" ? title : "Bonus")',
    ) &&
      betterWidgetStylesSource.includes(
        "better-hunt-main-status--${sessionState}",
      ),
    "Mainstream Bonus Hunt uses the state badge instead of a Bonus Opening title",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      'if (sessionState === "hunt") return null;',
    ) &&
      betterWidgetStylesSource.includes(
        'const showProfit = sessionState === "ended";',
      ) &&
      betterWidgetStylesSource.includes(
        '<span>{showProfit ? "Total Profit" : "Total Pay"}</span>',
      ) &&
      betterWidgetStylesSource.indexOf("const totalProfit =") >
        betterWidgetStylesSource.indexOf("const startValue =") &&
      betterWidgetStylesSource.indexOf("const totalProfit =") >
        betterWidgetStylesSource.indexOf("const stopValue ="),
    "Bonus Hunt hides payout during the hunt, shows it while opening, and shows total profit when ended",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      '"Stop",\n          stopKnown ? formatMoney(stopValue, money) : "-"',
    ) &&
      !betterWidgetStylesSource.includes("          Shield,") &&
      betterWidgetStylesSource.includes(
        'displayBreakEven > 0 ? formatMultiplier(displayBreakEven, 0) : "-"',
      ) &&
      betterWidgetStylesSource.includes("justify-items:center") &&
      betterWidgetStylesSource.includes("text-align:center"),
    "Mainstream Bonus Hunt shows Stop once, rounds Breakeven, and centers stat cards",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      "roleEffects[role.effectKey] !== false",
    ) &&
      betterWidgetStylesSource.includes(
        "roleEffects[role.movementKey] !== false",
      ) &&
      betterWidgetStylesSource.includes("const animatedEffect") &&
      betterWidgetPackagesSource.includes('["ownerEnabled", "Owner colour"]') &&
      betterWidgetPackagesSource.includes(
        '["ownerMovementEnabled", "Owner movement"]',
      ) &&
      betterWidgetPackagesSource.includes(
        '["moderatorEnabled", "Moderator colour"]',
      ) &&
      betterWidgetPackagesSource.includes(
        '["moderatorMovementEnabled", "Moderator movement"]',
      ) &&
      betterWidgetPackagesSource.includes('["vipEnabled", "VIP colour"]') &&
      betterWidgetPackagesSource.includes(
        '["vipMovementEnabled", "VIP movement"]',
      ) &&
      betterWidgetPackagesSource.includes(
        '["subscriberEnabled", "Subscriber colour"]',
      ) &&
      betterWidgetPackagesSource.includes(
        '["subscriberMovementEnabled", "Subscriber movement"]',
      ),
    "Better Chat exposes independent colour and movement toggles for each role",
  );
  assert.ok(
    betterWidgetStylesSource.includes('borderRadius: "50%"'),
    "Better Chat renders circular avatars",
  );
  assert.ok(
    chatWidgetSource.includes("parseShoutoutChatCommand(stampedMessage)") &&
      chatWidgetSource.includes('c.shoutoutPosition === "bottom"') &&
      chatWidgetSource.includes("<RaidShoutoutWidget") &&
      chatWidgetSource.includes("chatCommandEnabled: false"),
    "Better Chat can securely play one !so alert inside the selected edge",
  );
  assert.ok(
    chatWidgetSource.includes("visibleBetterChatCount") &&
      chatWidgetSource.includes("betterChatMeasurementKey") &&
      chatWidgetSource.includes("new ResizeObserver(scheduleMeasure)") &&
      chatWidgetSource.includes('overflowY: "hidden"') &&
      betterWidgetStylesSource.includes(
        'visibility: visible ? "visible" : "hidden"',
      ) &&
      raidShoutoutSource.includes(
        "config.__previewAlert || allowFallbackPreview",
      ) &&
      chatWidgetSource.includes("allowFallbackPreview={false}"),
    "Better Chat fits complete message rows and releases inactive !so space",
  );
  assert.ok(
    betterWidgetPackagesSource.includes('title="Roles & Message Glaze"') &&
      betterWidgetPackagesSource.includes('title="In-Chat Shoutout"') &&
      betterWidgetPackagesSource.includes('label="Play !so inside chat"') &&
      betterWidgetPackagesSource.includes('label="Clip height"'),
    "Better Chat controls expose role effects and in-chat shoutout placement",
  );
  const slideshowWidgetSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/widgets/slideshow-frame/SlideshowFrameWidget.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    slideshowWidgetSource.includes(
      '"--bsf-bg": c.backgroundColor || "#0a1734"',
    ),
    "Slideshow Frame uses the exact Bonus Hunt ocean panel midpoint",
  );
  assert.ok(
    betterWidgetPackagesSource.includes(
      'frameColor: "#2f63c9",\n    accentColor: "#45c8ff",\n    backgroundColor: "#0a1734"',
    ),
    "Slideshow Frame first-add defaults use the Bonus Hunt line, ice, and panel colors",
  );
  for (const [widgetType, surfaceColor] of Object.entries({
    bonus_hunt: "#061126",
    giveaway: "#0a1734",
    navbar: "#061126",
    chat: "#0a1734",
    rtp_stats: "#061126",
    tournament: "#0a1734",
    slideshow_frame: "#0a1734",
  })) {
    const widgetDefaults = new RegExp(
      String.raw`type: "${widgetType}"[\s\S]*?defaults: \{[\s\S]*?"${surfaceColor}"`,
    );
    assert.ok(
      widgetDefaults.test(builtInWidgetsSource),
      `${widgetType} built-in defaults use its expected panel surface`,
    );
  }
  for (const sharedColor of ["#061126", "#20d8ff", "#ffb020"]) {
    assert.ok(
      betterWidgetPackagesSource.includes(sharedColor),
      `Better Editor defaults include shared theme color ${sharedColor}`,
    );
    assert.ok(
      builtInWidgetsSource.includes(sharedColor),
      `built-in defaults include shared theme color ${sharedColor}`,
    );
  }

  assert.equal(getModeLabel("simple"), "Simple Mode");
  assert.equal(getModeLabel("advanced"), "Advanced Mode");
  assert.equal(
    EDITOR_MODE_CAPABILITIES.simple.showLayers,
    false,
    "simple mode hides layers",
  );
  assert.equal(
    EDITOR_MODE_CAPABILITIES.simple.previewMode,
    "fit-widget",
    "simple mode defaults to focused widget preview",
  );
  assert.equal(
    EDITOR_MODE_CAPABILITIES.advanced.showLayers,
    true,
    "advanced mode displays layers",
  );

  assert.ok(
    BUILT_IN_STYLE_PRESETS.length >= 9,
    "built-in presets cover beginner starting points",
  );
  assert.ok(
    BUILT_IN_STYLE_PRESETS.some((preset) => preset.id === "transparent_obs"),
    "transparent OBS preset exists",
  );
  for (const material of [
    "original",
    "matte",
    "metallic",
    "gradient",
    "glass",
    "neon",
    "minimal",
    "soft_shadow",
    "transparent_obs",
  ]) {
    assert.ok(
      SIMPLE_MATERIAL_PRESETS.some((preset) => preset.id === material),
      `${material} simple material exists`,
    );
  }
  assert.equal(
    SIMPLE_MATERIAL_PRESETS.find((preset) => preset.id === "original")
      ?.protected,
    true,
    "Original is a protected built-in preset",
  );
  assert.ok(
    SIMPLE_COLOR_PALETTE.length >= 8,
    "simple mode exposes streamer-friendly colour swatches",
  );
  assert.ok(
    SIMPLE_SHAPES.some((shape) => shape.id === "pill"),
    "simple mode exposes pill shape",
  );
  assert.ok(
    SIMPLE_DENSITIES.some((size) => size.id === "compact"),
    "simple mode exposes compact size",
  );
  assert.ok(
    SIMPLE_TEXT_SIZES.some((size) => size.id === "large"),
    "simple mode exposes large text",
  );

  assert.equal(getWidgetCategory({ widget_type: "bonus_hunt" }), "bonus_hunt");
  assert.equal(
    getWidgetCategory({ widget_type: "slot_requests" }),
    "slot_requests",
  );
  assert.equal(getWidgetCategory({ widget_type: "chat" }), "chat");

  assert.equal(getFriendlyElementLabel("headerTitle"), "Title");
  assert.equal(getFriendlyElementLabel("slotImage"), "Slot image");

  const bonusElements = getWidgetElementSchema("bonus_hunt");
  assert.ok(bonusElements.length > 3, "bonus hunt exposes editable layers");
  const header =
    bonusElements.find((element) => element.id === "headerTitle") ||
    bonusElements.find((element) => /title/i.test(element.id));
  assert.ok(header, "bonus hunt has a title/header element");
  assert.equal(inferElementKind(header), "text");

  const simpleHeaderGroups = getElementControlGroups(header, "simple");
  const advancedHeaderGroups = getElementControlGroups(header, "advanced");
  const simpleHeaderControls = new Set(
    simpleHeaderGroups.flatMap((group) =>
      group.controls.map((control) => control.id),
    ),
  );
  const advancedHeaderControls = new Set(
    advancedHeaderGroups.flatMap((group) =>
      group.controls.map((control) => control.id),
    ),
  );
  assert.ok(
    simpleHeaderControls.has("fontSize"),
    "simple mode exposes text size",
  );
  assert.ok(
    simpleHeaderControls.has("textColor"),
    "simple mode exposes text color",
  );
  assert.ok(
    !simpleHeaderControls.has("letterSpacing"),
    "simple mode hides letter spacing",
  );
  assert.ok(
    advancedHeaderControls.has("letterSpacing"),
    "advanced mode exposes letter spacing",
  );
  assert.ok(
    elementSupportsControl(header, "fontFamily"),
    "text layer supports font family",
  );
  assert.ok(
    !elementSupportsControl(header, "background"),
    "title text does not show unrelated background control",
  );

  const bonusCapability = getWidgetAppearanceCapability("bonus_hunt");
  const requiredBonusTypographyElements = [
    "headerTitle",
    "statLabel",
    "statValue",
    "requestsHeader",
    "requestsDescription",
    "requestsEmpty",
    "slotTitle",
    "slotPositionNumber",
    "winLabel",
    "winValue",
    "multiplierLabel",
    "multiplierValue",
    "betLabel",
    "betValue",
  ];
  for (const style of bonusCapability.styles) {
    for (const elementId of requiredBonusTypographyElements) {
      assert.ok(
        style.elementIds.includes(elementId),
        `${style.id} exposes independent ${elementId} typography`,
      );
    }
    const styleElements = getWidgetAppearanceV2Elements(
      "bonus_hunt",
      style.id,
    );
    for (const elementId of requiredBonusTypographyElements) {
      const element = styleElements.find((entry) => entry.id === elementId);
      assert.ok(element, `${style.id} resolves ${elementId}`);
      assert.ok(
        element.controls.includes("fontFamily"),
        `${style.id} ${elementId} exposes font family`,
      );
      assert.ok(
        element.controls.includes("fontSize"),
        `${style.id} ${elementId} exposes font size`,
      );
    }
  }

  const updatedBonusTypography = updateBetterBonusTypography(
    {
      subElements: {
        slotTitle: { fontFamily: "slot-font", fontSize: 12 },
        statLabel: { fontWeight: 700 },
      },
    },
    "statLabel",
    { fontFamily: "stats-font", fontSize: 15 },
  );
  assert.deepEqual(
    updatedBonusTypography.subElements,
    {
      slotTitle: { fontFamily: "slot-font", fontSize: 12 },
      statLabel: {
        fontWeight: 700,
        fontFamily: "stats-font",
        fontSize: 15,
      },
    },
    "Widget Controls update one Bonus Hunt text element without changing siblings",
  );
  const updatedExplicitBonusTypography = updateBetterBonusTypography(
    {
      subElements: { headerTitle: { fontSize: 11 } },
      __appearanceExplicitSubElements: {
        requestsHeader: { fontWeight: 900 },
      },
    },
    "requestsHeader",
    { fontFamily: "requests-font", fontSize: 17 },
  );
  assert.deepEqual(
    updatedExplicitBonusTypography.__appearanceExplicitSubElements
      .requestsHeader,
    { fontWeight: 900, fontFamily: "requests-font", fontSize: 17 },
    "Widget Controls update the active Advanced Appearance typography store",
  );
  assert.ok(
    betterWidgetPackagesSource.includes('label: "Stats bar"') &&
      betterWidgetPackagesSource.includes('label: "Chat requests"') &&
      betterWidgetPackagesSource.includes('label: "Bonus list"') &&
      betterWidgetPackagesSource.includes(
        "<BonusTypographyControls config={c} onChange={onChange} />",
      ),
    "Bonus Hunt Widget Controls expose independent typography groups",
  );

  assert.ok(
    betterWidgetStylesSource.includes("function BetterHuntSlotMarquee") &&
      betterWidgetStylesSource.includes(
        'className={`better-hunt-slot-marquee${shouldScroll ? " is-scrolling" : ""}`}',
      ) &&
      betterWidgetStylesSource.includes(
        '<BetterHuntSlotMarquee config={c} enabled={c.animations !== false}>',
      ),
    "Bonus Hunt list slot names use the overflow-aware visible-row marquee",
  );

  const horizontalBonusConfig = {
    orientation: "horizontal",
    showRequests: true,
    startMoney: 100,
    stopMoney: 50,
    liveBE: 4,
    avgMulti: 2,
    slotRequests: [
      {
        id: "horizontal-request",
        slot_name: "Wanted Dead or a Wild",
        requested_by: "viewer_one",
      },
    ],
  };
  const horizontalBonusMarkup = renderToStaticMarkup(
    createElement(BetterBonusHuntStyle, {
      config: horizontalBonusConfig,
      bonuses: [{ id: "bonus-one", slot_name: "Bear Crazy", bet: 1 }],
      stats: {},
      currency: "EUR",
    }),
  );
  assert.ok(
    horizontalBonusMarkup.includes(
      'class="better-hunt-panel better-hunt-horizontal is-requests-visible"',
    ) &&
      horizontalBonusMarkup.includes(">Chat Requests<") &&
      !horizontalBonusMarkup.includes(">Queue<"),
    "horizontal Bonus Hunt reveals Chat Requests instead of the legacy queue",
  );
  const horizontalHeaderMarkup = horizontalBonusMarkup.match(
    /<div class="better-hunt-hstrip-head">.*?<\/div><div class="better-hunt-carousel"/,
  )?.[0];
  assert.ok(
    horizontalHeaderMarkup &&
      horizontalHeaderMarkup.indexOf(">Bonus<") <
        horizontalHeaderMarkup.indexOf(">Hunt<") &&
      horizontalHeaderMarkup.indexOf("Start <strong>") <
        horizontalHeaderMarkup.indexOf("Stop <strong>") &&
      horizontalHeaderMarkup.indexOf("Stop <strong>") <
        horizontalHeaderMarkup.indexOf("BE <strong>") &&
      horizontalHeaderMarkup.indexOf("BE <strong>") <
        horizontalHeaderMarkup.indexOf("AVG <strong>") &&
      !horizontalHeaderMarkup.includes("Bonus Hunt") &&
      !horizontalHeaderMarkup.includes("opened"),
    "horizontal Bonus Hunt orders Bonus, state, Start, Stop, BE, and AVG",
  );
  assert.ok(
    horizontalBonusMarkup.includes(
      '<div class="better-hunt-hstrip-active-top"><span>#1</span></div>',
    ) &&
      horizontalBonusMarkup.includes(
        '<div class="better-hunt-hstrip-active-bottom"><strong>Bet EUR1</strong><span>-</span></div>',
      ),
    "horizontal active image hides the slot name and places the bet at the bottom",
  );
  const horizontalBonusWithoutRequests = renderToStaticMarkup(
    createElement(BetterBonusHuntStyle, {
      config: { ...horizontalBonusConfig, showRequests: false },
      bonuses: [{ id: "bonus-one", slot_name: "Bear Crazy", bet: 1 }],
      stats: {},
      currency: "EUR",
    }),
  );
  assert.ok(
    horizontalBonusWithoutRequests.includes(
      'class="better-hunt-panel better-hunt-horizontal"',
    ) && !horizontalBonusWithoutRequests.includes(">Chat Requests<"),
    "horizontal Bonus Hunt fully hides Chat Requests when disabled",
  );

  const surface =
    bonusElements.find((element) => /container|card|row/i.test(element.id)) ||
    bonusElements[0];
  assert.ok(
    elementSupportsControl(surface, "background"),
    "surface layer supports background",
  );
  assert.ok(
    elementSupportsControl(surface, "radius"),
    "surface layer supports rounded corners",
  );

  const navbarElements = getWidgetElementSchema("navbar");
  const navbarAvatar = navbarElements.find(
    (element) => element.id === "avatar",
  );
  assert.ok(navbarAvatar, "navbar exposes avatar as an editable element");
  assert.equal(
    navbarAvatar.kind,
    "image",
    "navbar avatar is treated as an image element",
  );
  const avatarControlIds = new Set(
    getElementControlGroups(navbarAvatar, "advanced").flatMap((group) =>
      group.controls.map((control) => control.id),
    ),
  );
  for (const expected of [
    "imageUrl",
    "imageSize",
    "imageFit",
    "radius",
    "borderColor",
    "borderWidth",
    "width",
    "height",
    "maxWidth",
    "maxHeight",
  ]) {
    assert.ok(
      avatarControlIds.has(expected),
      `navbar avatar exposes ${expected}`,
    );
  }
  for (const forbidden of ["fontFamily", "textColor", "background"]) {
    assert.ok(
      !avatarControlIds.has(forbidden),
      `navbar avatar hides unrelated ${forbidden} control`,
    );
  }
  assert.ok(
    getElementControlGroups(navbarAvatar, "advanced").some(
      (group) => group.label === "Image",
    ),
    "avatar image controls are grouped as Image",
  );

  assert.equal(
    validateEditorValue(CONTROL_DEFINITIONS.fontSize, 999),
    CONTROL_DEFINITIONS.fontSize.max,
  );
  assert.equal(validateEditorValue(CONTROL_DEFINITIONS.opacity, -4), 0);
  assert.equal(
    validateEditorValue(CONTROL_DEFINITIONS.textColor, "not-a-color"),
    "#ffffff",
  );
  assert.equal(
    validateEditorValue(CONTROL_DEFINITIONS.textColor, "#14b8a6"),
    "#14b8a6",
  );

  const target = {
    scope: "widget_instance",
    widgetId: "widget_a",
    widgetType: "bonus_hunt",
    styleId: "v12",
  };
  const root = getTargetOverrideRoot(target);
  assert.equal(root, "widgets.widget_a.styles.v12");
  const headerPath = `${root}.elements.headerTitle.${getElementAppearancePropertyPath("fontSize")}`;
  const statPath = `${root}.elements.statValue.${getElementAppearancePropertyPath("fontSize")}`;
  const appearance = setByPath(normalizeAppearance({}), headerPath, 32);
  assert.equal(
    getByPath(appearance, headerPath),
    32,
    "header font value is stored on header path",
  );
  assert.equal(
    getByPath(appearance, statPath),
    undefined,
    "header font value does not leak to stat value path",
  );
  const sizeConfig = appearanceToWidgetConfigDefaults({
    container: { width: 420, height: 160 },
  });
  assert.equal(
    sizeConfig.widgetWidth,
    420,
    "widget width maps into shared widget config",
  );
  assert.equal(
    sizeConfig.widgetHeight,
    160,
    "widget height maps into shared widget config",
  );
  const scaledConfig = appearanceToWidgetConfigDefaults({
    spacing: { widgetScale: 1.35 },
  });
  assert.equal(
    scaledConfig.widgetScale,
    1.35,
    "simple widget scale maps into shared widget config",
  );
  assert.equal(
    subElementStyle(
      { subElements: { clock: { visible: false, background: "#ffffff" } } },
      "clock",
      { display: "flex" },
    ).display,
    "none",
    "hidden layer visibility renders the element as display none",
  );

  const normalizedSimple = normalizeSimpleSettings({
    material: "unknown",
    primaryColor: "bad",
    scale: 9,
  });
  assert.equal(
    normalizedSimple.material,
    DEFAULT_SIMPLE_SETTINGS.material,
    "invalid simple material falls back safely",
  );
  assert.equal(
    normalizedSimple.primaryColor,
    DEFAULT_SIMPLE_SETTINGS.primaryColor,
    "invalid simple colour falls back safely",
  );
  assert.equal(normalizedSimple.scale, 1.5, "simple scale is clamped");

  const originalSimple = normalizeSimpleSettings({ material: "original" });
  assert.equal(
    originalSimple.material,
    "original",
    "Original material is accepted by Simple Mode",
  );
  const originalAppearance = generateSimpleAppearance(originalSimple);
  assert.equal(
    originalAppearance.generatedTokens.material,
    "original",
    "Original simple appearance records original intent",
  );
  assert.equal(
    originalAppearance.surfaces,
    undefined,
    "Original simple appearance does not generate generic surfaces",
  );

  const metallicGold = generateSimpleAppearance({
    ...DEFAULT_SIMPLE_SETTINGS,
    material: "metallic",
    primaryColor: "#f5b301",
    shape: "rounded",
    density: "standard",
  });
  assert.equal(
    metallicGold.surfaces.preset,
    "metallic",
    "metallic material updates generated surface preset",
  );
  assert.equal(
    metallicGold.borders.radius,
    16,
    "rounded shape updates corners",
  );
  assert.equal(
    metallicGold.spacing.widgetScale,
    1,
    "standard scale does not distort widget layout",
  );
  assert.ok(
    metallicGold.generatedTokens.contrastRatio >= 4.5,
    "metallic gold keeps readable text contrast",
  );

  const glassCyan = generateSimpleAppearance({
    ...DEFAULT_SIMPLE_SETTINGS,
    material: "glass",
    primaryColor: "#14d8d8",
    useSecondColor: true,
    accentColor: "#3b82f6",
  });
  assert.equal(
    glassCyan.surfaces.glass,
    true,
    "glass material enables glass surface behavior",
  );
  assert.ok(
    glassCyan.effects.backdropBlur > 0,
    "glass material adds blur token",
  );
  assert.ok(
    glassCyan.generatedTokens.contrastRatio >= 4.5,
    "glass cyan keeps readable text contrast",
  );

  const neonGreen = generateSimpleAppearance({
    ...DEFAULT_SIMPLE_SETTINGS,
    material: "neon",
    primaryColor: "#22c55e",
    density: "compact",
    textSize: "large",
    boldText: true,
    scale: 1.25,
  });
  assert.equal(
    neonGreen.effects.glowEnabled,
    true,
    "neon material enables controlled glow",
  );
  assert.equal(
    neonGreen.surfaces.density,
    "compact",
    "compact density updates widget density",
  );
  assert.equal(
    neonGreen.typography.baseSize,
    17,
    "large text updates generated typography",
  );
  assert.equal(
    neonGreen.typography.bodyWeight,
    800,
    "bold text updates generated typography weight",
  );
  assert.equal(
    neonGreen.spacing.widgetScale,
    1.25,
    "simple scale updates generated widget scale",
  );
  assert.ok(
    getContrastRatio("#020617", neonGreen.colors.text) >= 4.5,
    "neon green maintains acceptable text contrast",
  );

  console.log("appearance editor tests passed");
} finally {
  await server.close();
}
