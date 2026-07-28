import React from "react";
import BonusHuntWidget from "../widgets/BonusHuntWidget";
import GiveawayWidget from "../widgets/GiveawayWidget";
import NavbarWidget from "../widgets/NavbarWidget";
import ChatWidget from "../widgets/ChatWidget";
import RtpStatsWidget from "../widgets/RtpStatsWidget";
import BackgroundWidget from "../widgets/BackgroundWidget";
import BetsWidget from "../widgets/BetsWidget";
import {
  BETTER_WIDGETS,
  DEFAULT_BETTER_CONFIG,
  ensureBetterWidgetConfig,
  getBetterWidgetMeta,
} from "./BetterWidgetPackages";

export const BETTER_CANVAS = Object.freeze({ width: 1920, height: 1080 });
export const BETTER_LAYOUT_SCHEMA_VERSION = 1;
export const BETTER_DATA_MODES = Object.freeze(["mock", "live"]);

const BACKGROUND_TYPE = "background";
const MIN_OPACITY = 0;
const MAX_OPACITY = 1;

const MOCK_BONUSES = [
  {
    id: "mock-wolf-gold",
    slotName: "Wolf Gold",
    imageUrl: "https://images-cdn.softswiss.net/i/s2/pragmaticplay/WolfGold.png",
    betSize: 4,
    payout: 136,
    opened: true,
    slot: {
      provider: "Pragmatic Play",
      image: "https://images-cdn.softswiss.net/i/s2/pragmaticplay/WolfGold.png",
    },
  },
  {
    id: "mock-medusa",
    slotName: "Medusas Madness",
    imageUrl: "https://images-cdn.softswiss.net/i/s2/playngo/MedusasMadness.png",
    betSize: 5,
    payout: 0,
    opened: false,
    slot: {
      provider: "Play'n GO",
      image: "https://images-cdn.softswiss.net/i/s2/playngo/MedusasMadness.png",
    },
  },
  {
    id: "mock-gates",
    slotName: "Gates of Olympus",
    imageUrl: "https://images-cdn.softswiss.net/i/s2/pragmaticplay/GatesOfOlympus1000.png",
    betSize: 6,
    payout: 312,
    opened: true,
    isSuperBonus: true,
    slot: {
      provider: "Pragmatic Play",
      image: "https://images-cdn.softswiss.net/i/s2/pragmaticplay/GatesOfOlympus1000.png",
    },
  },
  {
    id: "mock-sugar",
    slotName: "Sugar Rush 1000",
    imageUrl: "https://images-cdn.softswiss.net/i/s2/pragmaticplay/SugarRush1000.png",
    betSize: 3,
    payout: 0,
    opened: false,
    slot: {
      provider: "Pragmatic Play",
      image: "https://images-cdn.softswiss.net/i/s2/pragmaticplay/SugarRush1000.png",
    },
  },
];

const MOCK_WIDGET_CONFIGS = {
  bonus_hunt: {
    bonuses: MOCK_BONUSES,
    startMoney: 2000,
    stopLoss: 700,
    currency: "EUR ",
    requests: [
      { username: "miguel", slotName: "Sweet Bonanza 1000" },
      { username: "arena", slotName: "Gates of Olympus" },
      { username: "seca", slotName: "Wanted Dead or a Wild" },
    ],
  },
  giveaway: {
    title: "Giveaway #1",
    prize: "10 EUR",
    subtitle: "42 players entered",
    keyword: "iseca",
    participants: ["brutus", "osecaadegas", "arena", "secalive"],
    entriesCount: 42,
    winner: "",
  },
  navbar: {
    streamerName: "BRUTUSPOLUS",
    motto: "streamerscenter.com",
    nowPlayingLabel: "Now Playing",
    showNowPlaying: true,
    showCasino: true,
    showStartBalance: true,
    startValue: "EUR 2000",
    casinoName: "SecaHub",
    casinoCommand: "!Casino",
    __mockNowPlaying: {
      artist: "Streamers Center",
      track: "Live Overlay",
      album: "Better Editor",
    },
  },
  chat: {
    twitchEnabled: false,
    youtubeEnabled: false,
    kickEnabled: false,
    __appearancePreviewMessages: [
      { user: "miguel", text: "the hunt is live" },
      { user: "arena", text: "!bet 2" },
      { user: "secalive", text: "good luck everyone" },
      { user: "chat", text: "that rtp bar is clean" },
    ],
  },
  rtp_stats: {
    previewMode: true,
    slotName: "Medusas Madness",
    detectedSlotName: "Medusas Madness",
    currentSlotName: "Medusas Madness",
    provider: "Play'n GO",
    providerName: "Play'n GO",
    rtp: "96.20%",
    rtpValue: "96.20%",
    potential: "x5000",
    maxWin: "x5000",
    volatility: "High",
    bestWin: "No personal best yet",
  },
  background: {},
  bets: {
    question: "Bonus Hunt Result",
    gameStatus: "open",
    timerSeconds: 180,
    _openedAt: Date.now() - 45000,
    chatCommand: "!bet",
    options: ["0 - 99x", "100 - 199x", "200 - 299x", "300 - 499x", "500x+"],
    bets: {
      opt_0: 350,
      opt_1: 1120,
      opt_2: 875,
      opt_3: 420,
      opt_4: 215,
    },
    betters: {
      miguel: { option: 1, amount: 300 },
      arena: { option: 2, amount: 180 },
      seca: { option: 1, amount: 220 },
      chat: { option: 0, amount: 80 },
    },
  },
};

const LIVE_DATA_KEYS = Object.freeze({
  bonus_hunt: [
    "bonuses",
    "huntActive",
    "bonusOpening",
    "sessionState",
    "previewSlotName",
    "startMoney",
    "targetMoney",
    "stopLoss",
    "currency",
    "streamerName",
    "avatarUrl",
    "streamerAvatar",
    "avatarImageUrl",
    "profileAvatarUrl",
    "sortBy",
    "sortDir",
    "showStatistics",
    "animatedTracker",
    "showRequests",
    "showSlotRequests",
    "requests",
    "slotRequests",
    "pendingRequests",
    "slotRequestQueue",
  ],
  giveaway: [
    "title",
    "prize",
    "subtitle",
    "keyword",
    "isActive",
    "winner",
    "spinningWinner",
    "participants",
    "entriesCount",
    "twitchEnabled",
    "twitchChannel",
    "kickEnabled",
    "kickChannelId",
  ],
  navbar: [
    "streamerName",
    "brandName",
    "motto",
    "siteUrl",
    "avatarUrl",
    "streamerAvatar",
    "avatarImageUrl",
    "badgeImageUrl",
    "badgeLabel",
    "clockFormat",
    "timezone",
    "nowPlayingLabel",
    "casinoName",
    "casinoCommand",
    "casinoLogoUrl",
    "casinoImageUrl",
    "startLabel",
    "startBalance",
    "startValue",
    "balanceCurrency",
    "ctaText",
    "twitchUsername",
    "kickChannelId",
    "kickChannel",
    "youtubeChannel",
    "youtubeVideoId",
    "xUsername",
    "twitterUsername",
    "instagramUsername",
    "discordUrl",
    "discordInvite",
    "discordTag",
    "tiktokUsername",
    "cryptoCoins",
  ],
  chat: [
    "twitchEnabled",
    "twitchChannel",
    "youtubeEnabled",
    "youtubeVideoId",
    "youtubeApiKey",
    "kickEnabled",
    "kickChannelId",
    "maxMessages",
    "showHeader",
    "showLegend",
    "showBadges",
    "useNativeColors",
    "nameBold",
  ],
  rtp_stats: [
    "showSpinner",
    "showProvider",
    "showRtp",
    "showPotential",
    "showVolatility",
    "showBestWin",
    "_cachedBestWin",
    "previewMode",
  ],
  bets: [
    "question",
    "gameStatus",
    "timerSeconds",
    "_openedAt",
    "chatCommand",
    "twitchChannel",
    "seAnnounce",
    "betSeEnabled",
    "betMinAmount",
    "betMaxAmount",
    "betMsgPlaced",
    "betMsgPlacedSe",
    "betMsgNoPoints",
    "betMsgAlreadyBet",
    "betMsgNotOpen",
    "betMsgWinner",
    "options",
    "bets",
    "betters",
    "winnerOption",
    "winnerLabel",
    "winOption",
    "betsHistory",
    "bracketHistory",
    "bracketUsage",
  ],
  background: [],
});

const DEFAULT_POSITIONS = {
  background: { x: 0, y: 0, width: 1920, height: 1080, zIndex: 0, locked: true },
  navbar: { x: 360, y: 26, width: 1200, height: 72, zIndex: 10 },
  rtp_stats: { x: 420, y: 126, width: 1080, height: 88, zIndex: 20 },
  bonus_hunt: { x: 42, y: 150, width: 430, height: 860, zIndex: 30 },
  bets: { x: 1496, y: 134, width: 380, height: 430, zIndex: 40 },
  chat: { x: 1616, y: 544, width: 260, height: 500, zIndex: 50 },
  giveaway: { x: 610, y: 782, width: 700, height: 270, zIndex: 60 },
};

const COMPONENTS = {
  bonus_hunt: BonusHuntWidget,
  giveaway: GiveawayWidget,
  navbar: NavbarWidget,
  chat: ChatWidget,
  rtp_stats: RtpStatsWidget,
  background: BackgroundWidget,
  bets: BetsWidget,
};

const CONTROL_SCHEMAS = {
  bonus_hunt: ["style", "orientation", "session", "texture", "colour", "animations", "carousel", "requests", "typography", "sizes", "list", "drawer"],
  giveaway: ["theme", "size", "edges", "type", "content"],
  navbar: ["sections", "arrange", "spotify", "crypto", "socials", "casino", "cta", "size", "colours"],
  chat: ["theme", "messages", "layout", "typography", "animation", "source"],
  rtp_stats: ["presets", "provider", "content", "emblem", "colours", "type", "bar"],
  background: ["presets", "colors", "source", "textures", "effects"],
  bets: ["theme", "cards", "fill", "layout", "text", "colours"],
};

const SIZE_CONSTRAINTS = {
  bonus_hunt: { minWidth: 320, minHeight: 320, maxWidth: 1280, maxHeight: 1080 },
  giveaway: { minWidth: 420, minHeight: 180, maxWidth: 1100, maxHeight: 520 },
  navbar: { minWidth: 720, minHeight: 46, maxWidth: 1920, maxHeight: 160 },
  chat: { minWidth: 180, minHeight: 220, maxWidth: 720, maxHeight: 900 },
  rtp_stats: { minWidth: 680, minHeight: 52, maxWidth: 1920, maxHeight: 160 },
  background: { minWidth: 1920, minHeight: 1080, maxWidth: 1920, maxHeight: 1080 },
  bets: { minWidth: 280, minHeight: 300, maxWidth: 880, maxHeight: 920 },
};

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasOwnKey(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function pickLiveDataPatch(widgetType, liveConfig = {}) {
  const keys = LIVE_DATA_KEYS[widgetType] || [];
  return keys.reduce((patch, key) => {
    if (hasOwnKey(liveConfig, key)) patch[key] = liveConfig[key];
    return patch;
  }, {});
}

function firstLiveNumber(values, fallback = 0) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const parsed = typeof value === "number"
      ? value
      : Number.parseFloat(String(value).replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function hasFilledBonusPayment(bonus = {}) {
  return firstLiveNumber([
    bonus.payout,
    bonus.pay,
    bonus.win,
    bonus.winAmount,
    bonus.win_amount,
    bonus.result,
  ], 0) > 0;
}

function deriveBonusHuntSessionState(liveConfig = {}, livePatch = {}) {
  const bonuses = Array.isArray(livePatch.bonuses)
    ? livePatch.bonuses
    : Array.isArray(liveConfig.bonuses)
      ? liveConfig.bonuses
      : [];

  if (liveConfig.bonusOpening === true || livePatch.bonusOpening === true) {
    return bonuses.length > 0 && bonuses.every(hasFilledBonusPayment) ? "ended" : "opening";
  }

  return "hunt";
}

function normalizeBonusHuntLivePatch(liveConfig = {}, livePatch = {}, baseConfig = {}) {
  const next = { ...livePatch };

  if (hasOwnKey(liveConfig, "showSlotRequests") || hasOwnKey(liveConfig, "showRequests")) {
    const liveRequestsVisible =
      (hasOwnKey(liveConfig, "showSlotRequests") ? liveConfig.showSlotRequests !== false : true) &&
      (hasOwnKey(liveConfig, "showRequests") ? liveConfig.showRequests !== false : true);
    next.showSlotRequests = liveRequestsVisible;
    next.showRequests = baseConfig.showRequests !== false && liveRequestsVisible;
  }

  if (hasOwnKey(liveConfig, "bonuses") || hasOwnKey(liveConfig, "bonusOpening")) {
    const sessionState = deriveBonusHuntSessionState(liveConfig, next);
    next.sessionState = sessionState;
    next.huntActive = sessionState === "hunt" && Array.isArray(next.bonuses) && next.bonuses.length > 0;
  }

  return next;
}

export function findBetterLiveSourceWidget(widgetType, liveWidgets = []) {
  if (!widgetType || !Array.isArray(liveWidgets)) return null;
  return liveWidgets.find((widget) => widget?.widget_type === widgetType) || null;
}

function resolveBetterLiveSourceWidget(widgetType, context = {}) {
  if (context?.liveWidget?.widget_type === widgetType) return context.liveWidget;
  return findBetterLiveSourceWidget(widgetType, context?.liveWidgets);
}

function mergeBetterLiveDataConfig(widgetType, baseConfig, liveWidget) {
  const liveConfig = liveWidget?.config;
  if (!liveConfig || typeof liveConfig !== "object") return baseConfig;
  const livePatch = widgetType === "bonus_hunt"
    ? normalizeBonusHuntLivePatch(liveConfig, pickLiveDataPatch(widgetType, liveConfig), baseConfig)
    : pickLiveDataPatch(widgetType, liveConfig);
  if (Object.keys(livePatch).length === 0) return baseConfig;
  return ensureBetterWidgetConfig(widgetType, {
    ...baseConfig,
    ...livePatch,
  });
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function makeInstanceId(widgetType) {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${widgetType}-${randomId}`;
}

function normalizeZIndexes(instances) {
  const background = instances.find((item) => item.widgetType === BACKGROUND_TYPE);
  const foreground = instances
    .filter((item) => item.widgetType !== BACKGROUND_TYPE)
    .sort((a, b) => Number(a.zIndex) - Number(b.zIndex));
  const normalized = foreground.map((item, index) => ({
    ...item,
    zIndex: Math.max(1, Number(item.zIndex) || index + 1),
  }));
  return [
    ...(background
      ? [
          {
            ...background,
            x: 0,
            y: 0,
            width: BETTER_CANVAS.width,
            height: BETTER_CANVAS.height,
            locked: true,
            zIndex: 0,
          },
        ]
      : []),
    ...normalized,
  ].sort((a, b) => Number(a.zIndex) - Number(b.zIndex));
}

function normalizeInstanceGeometry(widgetType, geometry = {}) {
  const meta = getBetterWidgetMeta(widgetType);
  const defaultPos = DEFAULT_POSITIONS[widgetType] || {};
  const constraints = SIZE_CONSTRAINTS[widgetType] || {};
  const minWidth = constraints.minWidth || 80;
  const minHeight = constraints.minHeight || 80;
  const maxWidth = constraints.maxWidth || BETTER_CANVAS.width;
  const maxHeight = constraints.maxHeight || BETTER_CANVAS.height;
  const width = clampNumber(
    geometry.width,
    minWidth,
    maxWidth,
    defaultPos.width || meta?.defaultSize?.width || 320,
  );
  const height = clampNumber(
    geometry.height,
    minHeight,
    maxHeight,
    defaultPos.height || meta?.defaultSize?.height || 240,
  );
  const x = clampNumber(geometry.x, 0, BETTER_CANVAS.width - width, defaultPos.x || 0);
  const y = clampNumber(geometry.y, 0, BETTER_CANVAS.height - height, defaultPos.y || 0);
  return { x, y, width, height };
}

function buildDefinition(meta) {
  return {
    widgetType: meta.type,
    label: meta.label,
    icon: meta.icon,
    styleKey: meta.styleKey,
    styleId: meta.styleId,
    defaultConfig: cloneJson(DEFAULT_BETTER_CONFIG[meta.type] || {}),
    defaultSize: cloneJson(meta.defaultSize),
    constraints: SIZE_CONSTRAINTS[meta.type],
    controlSchema: CONTROL_SCHEMAS[meta.type] || [],
    component: COMPONENTS[meta.type],
    validateConfig: (config) => ensureBetterWidgetConfig(meta.type, config || {}),
    dataAdapter: ({ config, mode, liveWidget }) => {
      const baseConfig = ensureBetterWidgetConfig(meta.type, config || {});
      if (mode !== "mock") {
        return mergeBetterLiveDataConfig(meta.type, baseConfig, liveWidget);
      }
      return {
        ...baseConfig,
        ...(MOCK_WIDGET_CONFIGS[meta.type] || {}),
      };
    },
  };
}

export const BETTER_WIDGET_REGISTRY = Object.freeze(
  Object.fromEntries(BETTER_WIDGETS.map((meta) => [meta.type, buildDefinition(meta)])),
);

export function getBetterWidgetTypes() {
  return BETTER_WIDGETS.map((item) => item.type);
}

export function getBetterWidgetDefinition(widgetType) {
  return BETTER_WIDGET_REGISTRY[widgetType] || null;
}

export function isBetterWidgetType(widgetType) {
  return Boolean(getBetterWidgetDefinition(widgetType));
}

export function validateBetterWidgetConfig(widgetType, config = {}) {
  const definition = getBetterWidgetDefinition(widgetType);
  if (!definition) return {};
  return definition.validateConfig(config);
}

export function resolveBetterWidgetConfig(widgetType, config = {}, mode = "live", context = {}) {
  const definition = getBetterWidgetDefinition(widgetType);
  if (!definition) return {};
  const normalizedMode = BETTER_DATA_MODES.includes(mode) ? mode : "live";
  const liveWidget = normalizedMode === "live"
    ? resolveBetterLiveSourceWidget(widgetType, context)
    : null;
  return definition.dataAdapter({ config, mode: normalizedMode, liveWidget });
}

export function createBetterInstance(widgetType, overrides = {}) {
  const definition = getBetterWidgetDefinition(widgetType);
  if (!definition) return null;
  const defaultPos = DEFAULT_POSITIONS[widgetType] || {};
  const geometry = normalizeInstanceGeometry(widgetType, {
    ...defaultPos,
    ...overrides,
  });
  return {
    instanceId: overrides.instanceId || makeInstanceId(widgetType),
    widgetType,
    label: overrides.label || definition.label,
    config: validateBetterWidgetConfig(widgetType, overrides.config || definition.defaultConfig),
    visible: overrides.visible !== false,
    locked: widgetType === BACKGROUND_TYPE ? true : overrides.locked === true,
    opacity: clampNumber(overrides.opacity, MIN_OPACITY, MAX_OPACITY, 1),
    zIndex: widgetType === BACKGROUND_TYPE ? 0 : Number(overrides.zIndex || defaultPos.zIndex || 1),
    ...geometry,
  };
}

export function duplicateBetterInstance(instance, overrides = {}) {
  if (!instance) return null;
  return createBetterInstance(instance.widgetType, {
    ...instance,
    ...overrides,
    instanceId: makeInstanceId(instance.widgetType),
    label: overrides.label || `${instance.label || getBetterWidgetMeta(instance.widgetType)?.label || "Widget"} Copy`,
    x: clampNumber((Number(instance.x) || 0) + 32, 0, BETTER_CANVAS.width - (Number(instance.width) || 0), 0),
    y: clampNumber((Number(instance.y) || 0) + 32, 0, BETTER_CANVAS.height - (Number(instance.height) || 0), 0),
    zIndex: Number(instance.zIndex || 1) + 1,
    config: cloneJson(instance.config || {}),
  });
}

export function normalizeBetterInstance(rawInstance = {}) {
  const widgetType = rawInstance.widgetType || rawInstance.widget_type || rawInstance.type;
  const definition = getBetterWidgetDefinition(widgetType);
  if (!definition) return null;
  const geometry = normalizeInstanceGeometry(widgetType, rawInstance);
  return {
    instanceId: rawInstance.instanceId || rawInstance.id || makeInstanceId(widgetType),
    widgetType,
    label: rawInstance.label || definition.label,
    config: validateBetterWidgetConfig(widgetType, rawInstance.config || definition.defaultConfig),
    visible: rawInstance.visible !== false && rawInstance.is_visible !== false,
    locked: widgetType === BACKGROUND_TYPE ? true : rawInstance.locked === true,
    opacity: clampNumber(rawInstance.opacity, MIN_OPACITY, MAX_OPACITY, 1),
    zIndex: widgetType === BACKGROUND_TYPE ? 0 : Number(rawInstance.zIndex ?? rawInstance.z_index ?? 1),
    ...geometry,
  };
}

export function normalizeBetterLayout(layout = {}) {
  const rawInstances = Array.isArray(layout.instances) ? layout.instances : [];
  const normalized = rawInstances
    .map((instance) => normalizeBetterInstance(instance))
    .filter(Boolean);
  const hasBackground = normalized.some((instance) => instance.widgetType === BACKGROUND_TYPE);
  if (!hasBackground) normalized.unshift(createBetterInstance(BACKGROUND_TYPE));
  const hasAnyForeground = normalized.some((instance) => instance.widgetType !== BACKGROUND_TYPE);
  const instances = hasAnyForeground
    ? normalizeZIndexes(normalized)
    : createDefaultBetterLayout().instances;
  return {
    schemaVersion: BETTER_LAYOUT_SCHEMA_VERSION,
    canvas: {
      width: BETTER_CANVAS.width,
      height: BETTER_CANVAS.height,
    },
    instances,
    updatedAt: layout.updatedAt || new Date().toISOString(),
  };
}

export function createDefaultBetterLayout() {
  const preferredOrder = [
    "background",
    "navbar",
    "rtp_stats",
    "bonus_hunt",
    "bets",
    "chat",
    "giveaway",
  ];
  const instances = preferredOrder
    .map((widgetType) => createBetterInstance(widgetType, DEFAULT_POSITIONS[widgetType]))
    .filter(Boolean);
  return {
    schemaVersion: BETTER_LAYOUT_SCHEMA_VERSION,
    canvas: {
      width: BETTER_CANVAS.width,
      height: BETTER_CANVAS.height,
    },
    instances: normalizeZIndexes(instances),
    updatedAt: new Date().toISOString(),
  };
}

export function betterInstanceToLegacyWidget(instance, mode = "live", context = {}) {
  const liveWidget = mode === "live"
    ? resolveBetterLiveSourceWidget(instance.widgetType, context)
    : null;
  const config = resolveBetterWidgetConfig(instance.widgetType, instance.config, mode, {
    ...context,
    liveWidget,
  });
  const instanceConfig = {
    ...config,
    __betterInstanceId: instance.instanceId,
  };
  return {
    id: liveWidget?.id || instance.instanceId,
    instanceId: instance.instanceId,
    widget_type: instance.widgetType,
    label: instance.label,
    config: instanceConfig,
    is_visible: instance.visible !== false,
    position_x: instance.x,
    position_y: instance.y,
    width: instance.width,
    height: instance.height,
    z_index: instance.zIndex,
  };
}

export function renderBetterWidgetInstance({
  instance,
  layout,
  mode = "live",
  userId,
  theme,
  liveWidgets = [],
}) {
  const definition = getBetterWidgetDefinition(instance?.widgetType);
  if (!definition?.component || !instance) return null;
  const WidgetComponent = definition.component;
  const normalizedLayout = normalizeBetterLayout(layout);
  const liveSourceContext = { liveWidgets };
  const allWidgets = normalizedLayout.instances.map((item) =>
    betterInstanceToLegacyWidget(item, mode, liveSourceContext),
  );
  const widget = betterInstanceToLegacyWidget(instance, mode, liveSourceContext);
  const commonProps = {
    config: widget.config,
    allWidgets,
    widgetId: widget.id,
    userId,
    theme,
  };
  return <WidgetComponent {...commonProps} />;
}
