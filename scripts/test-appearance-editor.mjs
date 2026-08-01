import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

const { createBetterInstance, renderBetterWidgetInstance } =
  await server.ssrLoadModule(
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
  const betterWidgetRegistrySource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/editor/betterWidgetRegistry.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  const betterWidgetPackagesSource = readFileSync(
    new URL(
      "../src/components/OverlayCenter/editor/BetterWidgetPackages.jsx",
      import.meta.url,
    ),
    "utf8",
  );
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
    shoutoutWidgetSource.includes('runtime !== "obs"') &&
      betterWidgetRegistrySource.includes(
        'runtime: mode === "live" ? "obs" : "editor"',
      ),
    "editor preview cannot subscribe to or consume production shoutout alerts",
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
      widgetType: "bonus_hunt",
      widgetLabel: "Better Hunt",
      position: { x: -37, y: 1124 },
      size: { width: 430, height: 884 },
      controls: { drawerMode: "contain", accentColor: "#45c8ff" },
    },
    "widget control presets contain controls, signed position, and frame size without live state",
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
    navbarWidgetSource.includes("Math.max(28, barHeight * 0.62)") &&
      navbarWidgetSource.includes("size={compact ? 13 : 14}"),
    "Better Navbar social pills remain tall and legible in compact OBS mode",
  );
  assert.ok(
    !betterWidgetPackagesSource.includes("NAVBAR_SOCIAL_DISPLAY_OPTIONS") &&
      !navbarConfigSource.includes("<span>Display</span>"),
    "Navbar controls expose one consistent social handle format",
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
    betterWidgetStylesSource.includes('"--w-bg": c.bgColor || "#0a1734"'),
    "Better Giveaway routes its editable background color through the Bonus Hunt panel midpoint",
  );
  assert.ok(
    betterWidgetStylesSource.includes('"--w-panel-hi": c.panelHi || "#0c1c40"'),
    "Better Giveaway uses the exact Bonus Hunt ocean panel highlight",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      '"--w-accent":\n      c.accentColor || "#45c8ff"',
    ),
    "Better Giveaway uses the exact Bonus Hunt ocean ice accent",
  );
  assert.ok(
    betterWidgetStylesSource.includes(
      '"--frame-bg":\n      "linear-gradient(180deg,#0c1c40 0%,#0a1734 55%,#081228 100%)"',
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
  assert.ok(
    chatWidgetSource.includes(
      "linear-gradient(180deg, ${panelHi} 0%, ${panel} 55%, ${panelLo} 100%)",
    ),
    "Better Chat uses the exact Bonus Hunt ocean panel gradient",
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
