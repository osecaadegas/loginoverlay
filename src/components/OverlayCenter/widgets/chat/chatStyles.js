import { CHAT_STYLE_KEYS } from "../styleKeysRegistry";

export const BROADCAST_CHAT_STYLE = "broadcast_chat";
export const BETTER_CHAT_STYLES = Object.freeze([
  { id: "better_chat", label: "Better Chat" },
  { id: BROADCAST_CHAT_STYLE, label: "Broadcast" },
]);

export const BROADCAST_CHAT_DEFAULTS = Object.freeze({
  font: "Arial",
  fontSize: 16,
  usernameSize: 14,
  msgLineHeight: 1.45,
  msgSpacing: 3,
  msgPadH: 10,
  borderRadius: 6,
  borderWidth: 1,
  glow: "#6ee7b7",
  username: "#a7f3d0",
  text: "#f4f4f5",
  bubble: "#242427",
  panel: "#161618",
  panelHi: "#242427",
  panelLo: "#161618",
  cardLo: "#242427",
  borderColor: "#3f3f46",
  bg: "solid",
  texture: "none",
});

export function isBetterChatStyle(styleId) {
  return BETTER_CHAT_STYLES.some((style) => style.id === styleId);
}

// Connections, message behavior and widget geometry survive a visual style change.
const VISUAL_KEYS = [...new Set([
  ...CHAT_STYLE_KEYS.filter((key) => ![
    "width", "height", "maxMessages", "bonusHuntColorSync",
  ].includes(key)),
  ...Object.keys(BROADCAST_CHAT_DEFAULTS),
  "textureStrength", "subElements", "elements", "appearanceV2",
  "colourTheme",
  "__appearanceExplicitSubElements",
])];

export function switchChatStyle(config = {}, nextStyleId) {
  const currentStyle = config.chatStyle || "classic";
  if (currentStyle === nextStyleId) return config;
  const snapshot = Object.fromEntries(VISUAL_KEYS
    .filter((key) => config[key] !== undefined)
    .map((key) => [key, config[key]]));
  const styleConfigs = { ...config.styleConfigs, [currentStyle]: snapshot };
  const next = { ...config };
  for (const key of VISUAL_KEYS) delete next[key];
  delete next.__appearanceStyleId;
  return {
    ...next,
    ...(nextStyleId === BROADCAST_CHAT_STYLE ? BROADCAST_CHAT_DEFAULTS : {}),
    ...styleConfigs[nextStyleId],
    chatStyle: nextStyleId,
    styleConfigs,
  };
}
