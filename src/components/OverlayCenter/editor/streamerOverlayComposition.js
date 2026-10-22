import { createBetterInstance } from "./betterWidgetRegistry.jsx";
import { applyWidgetColourTheme } from "./widgetColourThemes.js";

// Streamer Overlay is delivered as an editable composition of StreamersCenter's
// existing live widgets. Each role gets its own instance so users can move,
// resize, restyle, or remove it independently in the editor.
export const STREAMER_OVERLAY_COMPOSITION = Object.freeze([
  { type: "background", role: "scene", x: 0, y: 0, width: 1920, height: 1080 },
  { type: "navbar", role: "header", x: 18, y: 18, width: 1884, height: 60 },
  { type: "bonus_hunt", role: "hunt", x: 18, y: 94, width: 370, height: 430 },
  { type: "slot_requests", role: "requests", x: 18, y: 532, width: 370, height: 530 },
  { type: "slot_window", role: "gameplay", x: 398, y: 94, width: 1124, height: 700 },
  { type: "rtp_stats", role: "stats", x: 398, y: 802, width: 1124, height: 72 },
  { type: "current_slot", role: "current_game", x: 398, y: 886, width: 1124, height: 176 },
  { type: "slideshow_frame", role: "slideshow", x: 1532, y: 94, width: 370, height: 270 },
  { type: "giveaway", role: "winner", x: 1532, y: 374, width: 370, height: 180 },
  { type: "chat", role: "chat", x: 1532, y: 562, width: 370, height: 500 },
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

function configureStreamerWidget(type, config, role, geometry) {
  let next = applyWidgetColourTheme(type, config, "emerald");
  next = { ...next, streamerOverlay: { ...next.streamerOverlay, role } };

  if (type === "navbar") {
    next = {
      ...next,
      displayStyle: "better_navbar",
      showClock: true,
      showCTA: true,
      ctaText: "18+ PLAY RESPONSIBLY",
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
  } else if (type === "slot_requests") {
    next = {
      ...next,
      displayStyle: "image_cards",
      visibleRequests: 5,
      rowHeight: 84,
      artworkWidth: 104,
      artworkHeight: 68,
      showAvatars: false,
      showPositions: false,
    };
  } else if (type === "current_slot") {
    next = { ...next, displayStyle: "immersive_current", showBackdrop: false };
  } else if (type === "giveaway") {
    next = { ...next, displayStyle: "better_giveaway" };
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
      label: role === "gameplay" ? "Gameplay" : role.replaceAll("_", " "),
    };
  }

  return {
    ...layout,
    name: getStreamerOverlayName(layout, user),
    instances: instances.map((instance, index) =>
      used.has(index) || instance.locked ? instance : { ...instance, visible: false },
    ),
  };
}
