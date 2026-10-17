import { STANDARD_BETTER_WIDGET_CONTROLS } from "../../editor/standardWidgetPresets";
import { removeScopedAppearanceConfigValue, validateAppearanceRoute } from "../../appearance/v2/appearanceRouting";
import { applyWidgetColourTheme } from "../../editor/widgetColourThemes";
import { getWidgetColourTheme } from "../shared/colourThemePalettes";

const LIVE_KEYS = new Set([
  "title", "prize", "subtitle", "keyword", "participants", "entries", "participantCount",
  "winner", "spinningWinner", "isActive", "twitchChannel", "twitchEnabled",
  "kickChannelId", "kickEnabled", "duration", "durationSec",
]);
const APPEARANCE_KEYS = new Set([
  ...Object.keys(STANDARD_BETTER_WIDGET_CONTROLS.giveaway).filter(key => !LIVE_KEYS.has(key)),
  "colourTheme", "themeEffects", "subElements", "elements", "appearanceV2", "__appearanceExplicitSubElements", "__appearanceScopedState",
  "titleColor", "prizeColor", "labelColor", "valueColor", "winnerColor", "reelColor",
  "cornerUnit", "cornerTopLeft", "cornerTopRight", "cornerBottomLeft", "cornerBottomRight",
  "reelHeight", "avatarSize",
]);

export function pickGiveawayAppearance(config = {}) {
  return Object.fromEntries(Object.entries(config).filter(([key]) => APPEARANCE_KEYS.has(key)));
}

// Work on a derived copy only: standalone and saved custom appearances must not
// be rewritten when another widget changes theme. Include legacy and V2 states.
function withoutThemePaint(value) {
  if (Array.isArray(value)) return value.map(withoutThemePaint);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/color$/i.test(key) && !['background', 'backgroundImage', 'fill', 'stroke', 'boxShadow', 'textShadow', 'filter'].includes(key))
    .map(([key, child]) => [key, withoutThemePaint(child)]));
}

function followChatTheme(appearance, themeKey) {
  const next = { ...appearance };
  for (const key of ['subElements', 'elements', '__appearanceExplicitSubElements', '__appearanceScopedState', 'appearanceV2']) {
    if (next[key]) next[key] = withoutThemePaint(next[key]);
  }
  return applyWidgetColourTheme('giveaway', next, themeKey);
}

// A direct control replaces an older advanced override for that same property.
export function updateGiveawayAppearance(previous, next) {
  let result = pickGiveawayAppearance(next);
  const rules = [
    [["bgColor", "panelHi", "panelLo", "surface"], ["container"], ["background", "backgroundColor"]],
    [["lineColor"], ["container", "keyword", "participantCount"], ["borderColor"]],
    [["borderWidth"], ["container"], ["borderWidth"]],
    [["radius", "cornerUnit", "cornerTopLeft", "cornerTopRight", "cornerBottomLeft", "cornerBottomRight"], ["container"], ["borderRadius"]],
    [["width", "height"], ["container"], ["width", "height"]],
    [["padX", "padY"], ["container"], ["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]],
    [["cardHi", "cardLo"], ["keyword", "participantCount"], ["background", "backgroundColor"]],
    [["tileRadius"], ["keyword", "participantCount"], ["borderRadius"]],
  ];
  for (const [keys, elements, properties] of rules) {
    if (!keys.some(key => previous[key] !== next[key])) continue;
    for (const elementId of elements) for (const propertyId of properties) {
      const route = { widgetType: "giveaway", widgetVariant: "better_giveaway", elementId, propertyId };
      if (validateAppearanceRoute(route).valid) result = removeScopedAppearanceConfigValue(result, route);
      for (const bucket of ["subElements", "elements", "__appearanceExplicitSubElements"]) {
        if (!result[bucket]?.[elementId]) continue;
        const element = { ...result[bucket][elementId] };
        delete element[propertyId];
        result = { ...result, [bucket]: { ...result[bucket], [elementId]: element } };
      }
    }
  }
  return result;
}

export function resolveEmbeddedGiveawayConfig(chatConfig = {}, liveConfig = {}, appearanceSource = liveConfig) {
  const themeKey = String(chatConfig.colourTheme || '').replace(/^theme_/, '');
  const chatTheme = getWidgetColourTheme(themeKey);
  let appearance = {
    ...pickGiveawayAppearance(STANDARD_BETTER_WIDGET_CONTROLS.giveaway),
    ...pickGiveawayAppearance(appearanceSource),
    displayStyle: 'better_giveaway',
  };
  if (chatTheme) appearance = followChatTheme(appearance, themeKey);
  if (chatConfig.giveawayCustomAppearance) {
    let custom = pickGiveawayAppearance(chatConfig.giveawayAppearance);
    // An old snapshot from theme B must not pin a chat switched to theme A.
    if (chatTheme && custom.colourTheme && String(custom.colourTheme).replace(/^theme_/, '') !== themeKey) {
      custom = followChatTheme(custom, themeKey);
    }
    appearance = { ...appearance, ...custom };
  }
  if (chatTheme) {
    appearance.colourTheme = themeKey;
    // Effects belong to the containing chat, not the hidden live-data source.
    appearance.themeEffects = chatConfig.themeEffects;
  }
  return {
    ...appearance,
    ...Object.fromEntries([...LIVE_KEYS].filter(key => liveConfig[key] !== undefined).map(key => [key, liveConfig[key]])),
    displayStyle: "better_giveaway",
    __betterInstanceId: `${chatConfig.__betterInstanceId || "chat"}:${chatConfig.chatStyle || "classic"}:giveaway`,
  };
}
