import { createBetterInstance } from "./betterWidgetRegistry.jsx";
import { applyWidgetColourTheme } from "./widgetColourThemes.js";

// This follows the supplied overlay's actual scene: a slim top bar, one active
// stream panel on the left, an unobstructed gameplay opening, and chat on the
// right. It deliberately does not add unrelated request, slideshow, or result
// cards from the general StreamersCenter widget catalog.
export const STREAMER_OVERLAY_COMPOSITION_VERSION = 2;
export const STREAMER_OVERLAY_COMPOSITION = Object.freeze([
  { type: "background", role: "scene", x: 0, y: 0, width: 1920, height: 1080 },
  { type: "navbar", role: "header", x: 0, y: 0, width: 1920, height: 50 },
  { type: "bonus_hunt", role: "active_panel", x: 20, y: 60, width: 350, height: 720 },
  { type: "slot_window", role: "gameplay", x: 378, y: 60, width: 1164, height: 720 },
  { type: "chat", role: "chat", x: 1550, y: 60, width: 350, height: 720 },
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
  return STREAMER_OVERLAY_COMPOSITION.every(({ type, role }) =>
      instances.some(
        (instance) =>
          instance.widgetType === type &&
          instance.config?.streamerOverlay?.role === role &&
          instance.config?.streamerOverlay?.compositionVersion === STREAMER_OVERLAY_COMPOSITION_VERSION,
      ),
    );
}

export function isLegacyStreamerOverlayComposition(layout) {
  const instances = Array.isArray(layout?.instances) ? layout.instances : [];
  const roles = new Set(
    instances.map((instance) => instance.config?.streamerOverlay?.role).filter(Boolean),
  );
  return roles.has("header") && roles.has("hunt") && roles.has("gameplay") && roles.has("chat");
}

function configureStreamerWidget(type, config, role, geometry) {
  let next = applyWidgetColourTheme(type, config, "galactic_command");
  next = {
    ...next,
    streamerOverlay: {
      ...next.streamerOverlay,
      role,
      compositionVersion: STREAMER_OVERLAY_COMPOSITION_VERSION,
    },
  };

  if (type === "navbar") {
    next = {
      ...next,
      displayStyle: "better_navbar",
      showClock: true,
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
    next = { ...next, transparent: true, showLabel: false };
  } else if (type === "chat") {
    next = {
      ...next,
      chatStyle: "broadcast_chat",
      showHeader: false,
      showLegend: false,
      showAvatars: false,
      flow: "top-to-bottom",
      fontSize: 18,
      msgSpacing: 3,
      giveawayInChat: true,
      giveawayHeight: 64,
      giveawayWinnerHeight: 112,
      giveawayMargin: 2,
    };
  }

  return next;
}

export function applyStreamerOverlayComposition(layout, user) {
  const instances = [...layout.instances];
  const used = new Set();

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
    if (instance.locked && type !== "background") continue;
    const config = configureStreamerWidget(type, instance.config, role, geometry);
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
