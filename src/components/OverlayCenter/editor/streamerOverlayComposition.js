import { createBetterInstance } from "./betterWidgetRegistry.jsx";
import { applyWidgetColourTheme } from "./widgetColourThemes.js";

// This follows MainStreamOverlay's 1920 x 1080 stage and the actual source
// component dimensions: a full-width 50px header, 240px side widgets, and a
// transparent 1164px gameplay opening between them.
export const STREAMER_OVERLAY_COMPOSITION_VERSION = 12;
export const STREAMER_OVERLAY_COMPOSITION = Object.freeze([
  { type: "background", role: "scene", x: 0, y: 0, width: 1920, height: 1080 },
  { type: "navbar", role: "header", x: 0, y: 0, width: 1920, height: 50 },
  // MainStreamOverlay reserves a 350px left rail, then its 240px active
  // widget is right-aligned in that rail (110px inset from the scene edge).
  { type: "bonus_hunt", role: "active_panel", x: 130, y: 60, width: 240, height: 720 },
  { type: "slot_window", role: "gameplay", x: 378, y: 60, width: 1164, height: 720 },
  { type: "chat", role: "chat", x: 1550, y: 60, width: 240, height: 720 },
]);

export function getStreamerOverlayName(layout, user) {
  const identity = layout.instances.find((instance) => instance.widgetType === "navbar")?.config || {};
  const configuredName = [
    identity.twitchUsername,
    identity.streamerName,
    identity.displayName,
    identity.channelName,
  ].find((value) => typeof value === "string" && value.trim() && value !== "YOUR CHANNEL");
  const accountName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  const name = String(configuredName || accountName || "Streamer").trim();
  return `${name} Overlay`;
}

export function hasStreamerOverlayComposition(layout) {
  const instances = Array.isArray(layout?.instances) ? layout.instances : [];
  return STREAMER_OVERLAY_COMPOSITION.every((spec) => {
    const instance = instances.find((item) =>
      item.widgetType === spec.type && item.config?.streamerOverlay?.role === spec.role,
    );
    return Boolean(
      instance &&
      instance.config?.streamerOverlay?.compositionVersion === STREAMER_OVERLAY_COMPOSITION_VERSION &&
      [instance.x, instance.y, instance.width, instance.height].every((value, index) =>
        Math.abs(Number(value) - [spec.x, spec.y, spec.width, spec.height][index]) < 0.01,
      ),
    );
  });
}

export function isLegacyStreamerOverlayComposition(layout) {
  const instances = Array.isArray(layout?.instances) ? layout.instances : [];
  const roles = new Set(
    instances.map((instance) => instance.config?.streamerOverlay?.role).filter(Boolean),
  );
  const legacyWidgetScene = roles.has("header") && roles.has("hunt") && roles.has("gameplay") && roles.has("chat");
  const previousSuppliedScene =
    roles.has("header") && roles.has("active_panel") && roles.has("gameplay") && roles.has("chat") &&
    STREAMER_OVERLAY_COMPOSITION.some((spec) => {
      const instance = instances.find((item) =>
        item.widgetType === spec.type && item.config?.streamerOverlay?.role === spec.role,
      );
      return Boolean(
        instance &&
        (Number(instance.config?.streamerOverlay?.compositionVersion) < STREAMER_OVERLAY_COMPOSITION_VERSION ||
          ![instance.x, instance.y, instance.width, instance.height].every((value, index) =>
            Math.abs(Number(value) - [spec.x, spec.y, spec.width, spec.height][index]) < 0.01,
          )),
      );
    });
  return legacyWidgetScene || previousSuppliedScene;
}

function configureStreamerWidget(type, config, role, geometry) {
  let next = applyWidgetColourTheme(type, config, "neon");
  next = {
    ...next,
    streamerOverlay: {
      ...next.streamerOverlay,
      role,
      compositionVersion: STREAMER_OVERLAY_COMPOSITION_VERSION,
    },
  };

  if (type === "background") {
    next = {
      ...next,
      bgMode: "texture",
      textureType: "gradient",
      color1: "#111827",
      color2: "#1e3a8a",
      color3: "#111827",
      gradientAngle: 135,
      opacity: 100,
      overlayColor: "",
      overlayOpacity: 0,
      texture: {
        ...next.texture,
        background: "#111827",
        accentColor: "#1e3a8a",
        fillColor: "#111827",
        gradientAngle: 135,
      },
      themeEffects: { ...next.themeEffects, enabled: false },
    };
  } else if (type === "navbar") {
    next = {
      ...next,
      displayStyle: "better_navbar",
      // MainStreamOverlay renders its header iframe at the full 1920px stage
      // width and 50px height. Keep the source content in that exact envelope.
      barHeight: 50,
      fontSize: 12,
      borderRadius: 12,
      radius: 12,
      containerBorderWidth: 1,
      containerBorderColor: "rgba(255,255,255,.1)",
      containerBlur: 12,
      showClock: true,
      showNowPlaying: false,
      showCasino: true,
      socialDisplayStyle: "slide",
      socialIntervalMs: 3000,
      sectionLayout: [
        { id: "identity", zone: "left" },
        { id: "badge", zone: "left" },
        { id: "crypto", zone: "left" },
        { id: "balance", zone: "left" },
        { id: "clock", zone: "center" },
        { id: "nowPlaying", zone: "center" },
        { id: "socials", zone: "center" },
        { id: "casino", zone: "right" },
        { id: "cta", zone: "right" },
      ],
      // The supplied header displays the casino mark, not the app-specific
      // command label beside it. Keep the configured mark and data intact.
      casinoCommand: "",
      showCTA: true,
      ctaText: "PLAY RESPONSIBLY",
    };
  } else if (type === "bonus_hunt") {
    next = {
      ...next,
      displayStyle: "better_bonus_hunt",
      orientation: "mainstream",
      showRequests: false,
      showStatistics: true,
      winEffects: false,
      animations: false,
      visibleRows: 5,
      widgetWidth: geometry.width,
      widgetHeight: geometry.height,
    };
  } else if (type === "slot_window") {
    next = { ...next, showLabel: false };
  } else if (type === "chat") {
    next = {
      ...next,
      chatStyle: "broadcast_chat",
      showHeader: true,
      showLegend: false,
      showAvatars: false,
      showBadges: false,
      useNativeColors: true,
      flow: "top-to-bottom",
      fontSize: 11,
      msgSpacing: 4,
      animation: "none",
      stagger: 0,
      containerRadius: 16,
      containerBorderWidth: 1,
      containerBorderColor: "rgba(96,165,250,.48)",
      bgColor: "rgba(8,18,42,.96)",
      headerBg: "rgba(7,17,40,.98)",
      headerText: "#53c8ff",
      textColor: "#f8fafc",
      giveawayInChat: true,
      giveawayHeight: 72,
      giveawayWinnerHeight: 116,
      giveawayMargin: 10,
      showEmptyState: true,
      emptyMessage: "Sem mensagens ainda...",
    };
  }

  return next;
}

export function applyStreamerOverlayComposition(layout, user) {
  const instances = [...layout.instances];
  const used = new Set();
  const navbarConfig = instances.find((instance) => instance.widgetType === "navbar")?.config || {};
  const sourceStreamerName = [
    navbarConfig.twitchUsername,
    navbarConfig.streamerName,
    navbarConfig.displayName,
    navbarConfig.channelName,
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
  ].find((value) => typeof value === "string" && value.trim() && value !== "YOUR CHANNEL");

  for (const { type, role, ...geometry } of STREAMER_OVERLAY_COMPOSITION) {
    let index = instances.findIndex(
      (instance, position) =>
        !used.has(position) &&
        instance.widgetType === type &&
        instance.config?.streamerOverlay?.role === role,
    );
    if (index < 0) {
      index = instances.findIndex(
        (instance, position) =>
          !used.has(position) &&
          instance.widgetType === type &&
          (!instance.locked || type === "background"),
      );
    }
    if (index < 0) {
      const source = instances.find((instance) => instance.widgetType === type);
      const created = createBetterInstance(type, {
        config: source ? structuredClone(source.config) : undefined,
      });
      if (!created) continue;
      instances.push(created);
      index = instances.length - 1;
    }

    used.add(index);
    const instance = instances[index];
    const config = configureStreamerWidget(type, instance.config, role, geometry);
    if (role === "active_panel" && sourceStreamerName && !config.streamerName) {
      config.streamerName = String(sourceStreamerName).trim();
    }
    instances[index] = {
      ...instance,
      ...geometry,
      config,
      visible: true,
      label: ({ scene: "Scene Background", header: "Top Bar", active_panel: "Active Stream Panel", gameplay: "Gameplay Opening", chat: "Live Chat" })[role],
    };
  }

  return {
    ...layout,
    name: getStreamerOverlayName(layout, user),
    streamerOverlayCompositionVersion: STREAMER_OVERLAY_COMPOSITION_VERSION,
    instances: instances.map((instance, index) =>
      used.has(index) || instance.locked ? instance : { ...instance, visible: false },
    ),
  };
}
