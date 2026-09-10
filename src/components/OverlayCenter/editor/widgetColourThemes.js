import { getWidgetColourTheme } from "../widgets/shared/colourThemePalettes";
import {
  getScopedAppearanceConfigValue,
  setScopedAppearanceConfigValue,
  validateAppearanceRoute,
} from "../appearance/v2/appearanceRouting";

const COLOUR_KEYS = {
  connect_four: { boardColor: "surface", boardBorderColor: "border", titleColor: "accent", textColor: "text", mutedColor: "muted" },
  raid_shoutout: { backgroundColor: "background", accentColor: "accent", secondaryColor: "secondary", textColor: "text", mutedColor: "muted" },
  slideshow_frame: { frameColor: "border", accentColor: "accent", backgroundColor: "surface", panelHi: "raised", panelLo: "background" },
  bonus_hunt: { headerAccent: "accent", accentColor: "accent", headerColor: "surface", bgColor: "surface" },
  giveaway: { panelHi: "raised", bgColor: "surface", panelLo: "background", cardHi: "raised", cardLo: "surface", lineColor: "border", secondaryTextColor: "muted", accentColor: "accent", deepAccentColor: "secondary" },
  navbar: { bgColor: "background", textColor: "text", mutedColor: "muted", accentColor: "accent", accentBlue: "secondary", accentGold: "accent", borderColor: "border", navbarTopColor: "raised", navbarBottomColor: "background", navbarBorderColor: "border" },
  chat: { glow: "accent", username: "accent", text: "text", bubble: "raised", panel: "surface", panelHi: "raised", panelLo: "background", cardLo: "surface", borderColor: "border" },
  rtp_stats: { cBarTop: "raised", cBarMid: "surface", cBarBot: "background", cRim: "border", cValue: "text", cLabel: "muted", cBolt: "accent", cBrand: "muted", cEmA: "accent", cEmB: "secondary", cEmBase: "surface" },
  background: { color1: "background", color2: "secondary", color3: "accent", overlayColor: "background", fxParticleColor: "accent", fxGlimpseColor: "accent" },
  tournament: { bgColor: "surface", panelHi: "raised", panelLo: "background", borderColor: "border", cardBg: "raised", cardBorder: "border", nameColor: "text", slotNameColor: "muted", multiColor: "accent", swordColor: "accent", xIconColor: "muted", emptyTextColor: "muted", sbTextColor: "text", sbPayColor: "muted", sbMultiColor: "accent" },
  bets: {},
};

// Explicit existing element targets, not a global recolour of arbitrary descendants.
const ELEMENT_COLOURS = {
  chat: {
    container: { background: "surface", borderColor: "border" },
    header: { background: "surface", textColor: "accent", borderColor: "border" },
    message: { background: "raised", borderColor: "border" },
    username: { textColor: "accent" }, messageText: { textColor: "text" },
    emptyState: { textColor: "muted" },
  },
  bonus_hunt: {
    container: { background: "surface", borderColor: "border" },
    header: { background: "surface", borderColor: "border" },
    title: { textColor: "text" }, statCard: { background: "raised", borderColor: "border" },
    statLabel: { textColor: "muted" }, statValue: { textColor: "text" },
    slotRow: { background: "raised", borderColor: "border" },
    carouselBackdrop: { background: "surface", borderColor: "border" },
    progressBarFill: { background: "accent" }, progressCount: { textColor: "text" },
  },
  giveaway: {
    container: { background: "surface", borderColor: "border" },
    title: { textColor: "text" }, prize: { textColor: "accent" },
    statCard: { background: "raised", borderColor: "border" },
  },
  navbar: {
    container: { background: "surface", borderColor: "border" },
    displayName: { textColor: "text", accentColor: "accent" },
    avatar: { borderColor: "border" }, motto: { textColor: "muted" },
    clock: { textColor: "text" }, separator: { background: "border" },
  },
  rtp_stats: {
    container: { background: "surface", borderColor: "border" },
    slotName: { textColor: "text" }, providerName: { textColor: "muted" },
    rtpValue: { textColor: "text" }, maxWin: { textColor: "text" },
    bestWin: { textColor: "text" },
  },
  background: {
    texture: { background: "background", accentColor: "secondary", fillColor: "accent" },
    tint: { background: "background" },
    effects: { fxParticleColor: "accent", fxGlimpseColor: "accent" },
  },
  tournament: {
    container: { background: "surface", borderColor: "border" },
    matchCard: { background: "raised", borderColor: "border" },
    participantCard: { background: "raised", borderColor: "border", textColor: "text" },
    playerName: { textColor: "text" }, scoreValue: { textColor: "accent" },
    score: { textColor: "accent" }, label: { textColor: "muted" },
  },
};

export function buildWidgetColourThemePatch(type, config, key) {
  const theme = getWidgetColourTheme(key);
  if (!theme || !Object.hasOwn(COLOUR_KEYS, type)) return null;
  const patch = Object.fromEntries(Object.entries(COLOUR_KEYS[type])
    .map(([property, token]) => [property, theme[token]]));
  if (type === "bets") patch.theme = theme.key;
  if (type === "bonus_hunt") patch.colour = `theme_${theme.key}`;
  if (type === "giveaway") patch.hue = theme.hue;
  if (type === "chat" && config.bgColor) patch.bgColor = theme.surface;
  return patch;
}

function syncElementOverrides(config, type, theme) {
  let next = config;
  const widgetVariant = config.chatStyle || config.displayStyle || config.layout;
  for (const [elementId, properties] of Object.entries(ELEMENT_COLOURS[type] || {})) {
    for (const [propertyId, token] of Object.entries(properties)) {
      const value = theme[token];
      for (const bucket of ["subElements", "elements", "__appearanceExplicitSubElements"]) {
        const element = next[bucket]?.[elementId];
        if (element && Object.hasOwn(element, propertyId)) {
          next = { ...next, [bucket]: { ...next[bucket], [elementId]: { ...element, [propertyId]: value } } };
        }
      }
      const overrides = next.appearanceV2?.elementOverrides;
      if (overrides?.[elementId] && Object.hasOwn(overrides[elementId], propertyId)) {
        next = { ...next, appearanceV2: { ...next.appearanceV2, elementOverrides: {
          ...overrides, [elementId]: { ...overrides[elementId], [propertyId]: value },
        } } };
      }
      const route = { widgetType: type, widgetVariant, elementId, propertyId };
      if (validateAppearanceRoute(route).valid && getScopedAppearanceConfigValue(next, route) !== undefined) {
        next = setScopedAppearanceConfigValue(next, route, value);
      }
    }
  }
  return next;
}

export function applyWidgetColourTheme(type, config = {}, key) {
  const patch = buildWidgetColourThemePatch(type, config, key);
  if (!patch) return config;
  return syncElementOverrides({ ...config, ...patch, colourTheme: key }, type, getWidgetColourTheme(key));
}

export function getSelectedWidgetColourTheme(type, config = {}) {
  const key = type === "bets" ? config.theme || config.betTheme || "neon" : config.colourTheme;
  if (type === "bets") return getWidgetColourTheme(key)?.key || null;
  const patch = buildWidgetColourThemePatch(type, config, key);
  if (!patch) return null;
  return Object.entries(patch).every(([property, value]) => config[property] === value) ? key : null;
}
