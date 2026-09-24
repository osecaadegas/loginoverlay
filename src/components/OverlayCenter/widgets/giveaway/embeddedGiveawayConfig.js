import { STANDARD_BETTER_WIDGET_CONTROLS } from "../../editor/standardWidgetPresets";
import { removeScopedAppearanceConfigValue, validateAppearanceRoute } from "../../appearance/v2/appearanceRouting";

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
  return {
    ...pickGiveawayAppearance(STANDARD_BETTER_WIDGET_CONTROLS.giveaway),
    ...pickGiveawayAppearance(appearanceSource),
    ...(chatConfig.giveawayCustomAppearance ? pickGiveawayAppearance(chatConfig.giveawayAppearance) : {}),
    ...Object.fromEntries([...LIVE_KEYS].filter(key => liveConfig[key] !== undefined).map(key => [key, liveConfig[key]])),
    displayStyle: "better_giveaway",
    __betterInstanceId: `${chatConfig.__betterInstanceId || "chat"}:${chatConfig.chatStyle || "classic"}:giveaway`,
  };
}
