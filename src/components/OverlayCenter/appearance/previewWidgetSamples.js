const SAMPLE_BETS_OPTIONS = [
  { label: "0 - 99" },
  { label: "100 - 199" },
  { label: "200 - 299" },
  { label: "300 - 399" },
  { label: "400+" },
];

const SAMPLE_BET_AMOUNTS = [1280, 820, 1540, 420, 960, 610, 360, 1180, 740];

export const PREVIEW_SLOT_NAMES = Object.freeze([
  "Gates of Olympus 1000",
  "Le Digger",
  "Sugar Rush 1000",
  "Wanted Dead or a Wild",
  "Big Bass Secrets of the Golden Lake",
  "Cyber Runner",
  "Banana Town",
]);

const SAMPLE_TOURNAMENT_MATCHES = [
  {
    id: "preview-tournament-1",
    player1: "Brutus",
    player2: "NOVA",
    slot1: {
      name: "Gates of Olympus 1000",
      image: "",
    },
    slot2: {
      name: "Le Digger",
      image: "",
    },
    type: "bonus_bo3",
    status: "completed",
    winner: "player1",
    rounds: [
      {
        roundNum: 1,
        player1: { bonusCost: 100, bonusPayout: 240 },
        player2: { bonusCost: 100, bonusPayout: 80 },
        winner: "player1",
        status: "completed",
      },
      {
        roundNum: 2,
        player1: { bonusCost: 100, bonusPayout: 70 },
        player2: { bonusCost: 100, bonusPayout: 165 },
        winner: "player2",
        status: "completed",
      },
      {
        roundNum: 3,
        player1: { bonusCost: 100, bonusPayout: 310 },
        player2: { bonusCost: 100, bonusPayout: 125 },
        winner: "player1",
        status: "completed",
      },
    ],
  },
  {
    id: "preview-tournament-2",
    player1: "Sofia",
    player2: "Rafa",
    slot1: { name: "Sugar Rush 1000", image: "" },
    slot2: { name: "Wanted Dead or a Wild", image: "" },
    type: "bonus_bo3",
    status: "in_progress",
    winner: null,
    rounds: [
      {
        roundNum: 1,
        player1: { bonusCost: 100, bonusPayout: 190 },
        player2: { bonusCost: 100, bonusPayout: 115 },
        winner: "player1",
        status: "completed",
      },
      {
        roundNum: 2,
        player1: { bonusCost: null, bonusPayout: null },
        player2: { bonusCost: null, bonusPayout: null },
        winner: null,
        status: "pending",
      },
      {
        roundNum: 3,
        player1: { bonusCost: null, bonusPayout: null },
        player2: { bonusCost: null, bonusPayout: null },
        winner: null,
        status: "pending",
      },
    ],
  },
];

const SAMPLE_GIVEAWAY_PARTICIPANTS = [
  "Afonso",
  "Beatriz",
  "Carolina",
  "Duarte",
  "Ines",
  "NOVA",
  "Rafa",
  "Sofia",
];

const SAMPLE_SLOT_REQUESTS = [
  {
    id: "preview-sr-1",
    slot_name: "Gates of Olympus 1000",
    slot_image: "",
    requested_by: "brutuspolus",
    created_at: "2026-07-16T10:00:00.000Z",
  },
  {
    id: "preview-sr-2",
    slot_name: "Le Digger",
    slot_image: "",
    requested_by: "streamfan",
    created_at: "2026-07-16T10:01:00.000Z",
  },
  {
    id: "preview-sr-3",
    slot_name: "Big Bass Secrets of the Golden Lake",
    slot_image: "",
    requested_by: "viewer_42",
    created_at: "2026-07-16T10:02:00.000Z",
  },
  {
    id: "preview-sr-4",
    slot_name: "Cyber Runner",
    slot_image: "",
    requested_by: "sara",
    created_at: "2026-07-16T10:03:00.000Z",
  },
];

const SAMPLE_CHAT_MESSAGES = [
  {
    id: "preview-chat-1",
    platform: "twitch",
    username: "brutuspolus",
    message: "This chat preview uses the saved widget style.",
    color: "#a78bfa",
    timestamp: Date.now() - 15000,
    isBroadcaster: true,
  },
  {
    id: "preview-chat-2",
    platform: "kick",
    username: "nightowl",
    message: "Edit header, message row, name, badges and text separately.",
    color: "#22c55e",
    timestamp: Date.now() - 9000,
    isVip: true,
  },
  {
    id: "preview-chat-3",
    platform: "youtube",
    username: "viewer_42",
    message: "Nothing here is shared with the live chat feed.",
    color: "#ef4444",
    timestamp: Date.now() - 3000,
  },
];

const SAMPLE_BONUS_HUNT_BONUSES = [
  {
    id: "preview-bh-1",
    slotName: "Gates of Olympus 1000",
    slot: {
      name: "Gates of Olympus 1000",
      image: "",
      provider: "Pragmatic Play",
    },
    betSize: 1,
    payout: 82,
    opened: true,
    isSuperBonus: true,
  },
  {
    id: "preview-bh-2",
    slotName: "Le Digger",
    slot: {
      name: "Le Digger",
      image: "",
      provider: "Hacksaw Gaming",
    },
    betSize: 2,
    payout: 0,
    opened: false,
  },
  {
    id: "preview-bh-3",
    slotName: "Big Bass Secrets of the Golden Lake",
    slot: {
      name: "Big Bass Secrets of the Golden Lake",
      image: "",
      provider: "Pragmatic Play",
    },
    betSize: 1,
    payout: 0,
    opened: false,
  },
  {
    id: "preview-bh-4",
    slotName: "Cyber Runner",
    slot: {
      name: "Cyber Runner",
      image: "",
      provider: "Peter & Sons",
    },
    betSize: 1,
    payout: 0,
    opened: false,
    isExtremeBonus: true,
  },
  {
    id: "preview-bh-5",
    slotName: "Banana Town",
    slot: {
      name: "Banana Town",
      image: "",
      provider: "Evoplay",
    },
    betSize: 1,
    payout: 0,
    opened: false,
  },
];

function hasPositiveBetPool(config = {}) {
  return Object.values(config.bets || {}).some((value) => Number(value) > 0);
}

function hasParticipants(config = {}) {
  return Array.isArray(config.participants) && config.participants.length > 0;
}

function buildSampleBetters(count) {
  return Array.from({ length: Math.max(4, count) }, (_, index) => [
    `viewer_${index + 1}`,
    true,
  ]).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}

function buildBusySlotRequests(idSuffix, viewerOffset) {
  return [
    ...SAMPLE_SLOT_REQUESTS,
    ...SAMPLE_SLOT_REQUESTS.map((item, index) => ({
      ...item,
      id: `${item.id}-${idSuffix}-${index}`,
      requested_by: `viewer_${index + viewerOffset}`,
    })),
  ];
}

function getSlotRequestsPreviewRequests(state) {
  if (state === "empty") return [];
  if (state === "busy_queue") return buildBusySlotRequests("busy", 5);
  return SAMPLE_SLOT_REQUESTS;
}

function getBonusHuntPreviewRequests(previewState) {
  if (previewState === "requests_empty") return [];
  if (previewState === "requests_busy")
    return buildBusySlotRequests("bh-busy", 8);
  return SAMPLE_SLOT_REQUESTS;
}

function positiveNumberOr(value, fallback) {
  const number = Number(value);
  if (number > 0) return value;
  return fallback;
}

function nonEmptyArrayOr(value, fallback) {
  if (Array.isArray(value) && value.length > 0) return value;
  return fallback;
}

function normalizeSlotName(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

function buildPreviewSlotCatalog(records = []) {
  return new Map(
    records
      .filter((record) => record?.name)
      .map((record) => [normalizeSlotName(record.name), record]),
  );
}

function hydratePreviewSlot(slot = {}, catalog) {
  const record = catalog.get(normalizeSlotName(slot.name));
  return {
    ...slot,
    image: record?.image || "",
    provider: record?.provider || slot.provider || "",
  };
}

function hydratePreviewRequests(requests, catalog) {
  return requests.map((request) => {
    const record = catalog.get(normalizeSlotName(request.slot_name));
    return {
      ...request,
      slot_image: record?.image || "",
      slot_provider: record?.provider || request.slot_provider || "",
    };
  });
}

function hydratePreviewBonuses(bonuses, catalog) {
  return bonuses.map((bonus) => ({
    ...bonus,
    slot: hydratePreviewSlot(bonus.slot, catalog),
  }));
}

function hydratePreviewMatches(matches, catalog) {
  return matches.map((match) => ({
    ...match,
    slot1: hydratePreviewSlot(match.slot1, catalog),
    slot2: hydratePreviewSlot(match.slot2, catalog),
  }));
}

function previewOpeningState(previewState, config) {
  if (previewState === "opening") return true;
  return config.bonusOpening;
}

function applyBetsPreviewSample(config, now) {
  const sourceConfig = config || {};
  const options =
    Array.isArray(sourceConfig.options) && sourceConfig.options.length > 0
      ? sourceConfig.options
      : SAMPLE_BETS_OPTIONS;
  const status =
    sourceConfig.gameStatus && sourceConfig.gameStatus !== "idle"
      ? sourceConfig.gameStatus
      : "open";
  const bets = hasPositiveBetPool(sourceConfig)
    ? sourceConfig.bets
    : options.reduce(
        (acc, _option, index) => ({
          ...acc,
          [`opt_${index}`]:
            SAMPLE_BET_AMOUNTS[index % SAMPLE_BET_AMOUNTS.length],
        }),
        {},
      );

  return {
    ...sourceConfig,
    gameStatus: status,
    question: sourceConfig.question || "Place Your Bets",
    timerSeconds:
      Number(sourceConfig.timerSeconds) > 0 ? sourceConfig.timerSeconds : 600,
    _openedAt: sourceConfig._openedAt || now - 120000,
    options,
    bets,
    betters:
      Object.keys(sourceConfig.betters || {}).length > 0
        ? sourceConfig.betters
        : buildSampleBetters(options.length + 3),
    __appearancePreviewSample: true,
  };
}

function applySpotifyPreviewSample(config = {}) {
  if (
    config.manualArtist ||
    config.manualTrack ||
    config.spotify_access_token
  ) {
    return { ...config, __appearancePreviewSample: true };
  }
  return {
    ...config,
    manualArtist: "Streamers Center Radio",
    manualTrack: "Bonus Hunt Live",
    manualAlbumArt:
      config.manualAlbumArt ||
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=512&q=80",
    __appearancePreviewSample: true,
  };
}

function applyNavbarPreviewSample(config = {}) {
  if (config.showNowPlaying === false) return config;
  const sampledMusic = applySpotifyPreviewSample(config);
  return {
    ...sampledMusic,
    musicSource: sampledMusic.musicSource || "manual",
  };
}

function applyGiveawayPreviewSample(config = {}) {
  const previewState = config.__appearancePreviewState;
  if (previewState) {
    const base = {
      ...config,
      title: config.title || "Giveaway",
      prize: config.prize || "1000 points",
      keyword: config.keyword || "join",
      participants: SAMPLE_GIVEAWAY_PARTICIPANTS,
      winner: "",
      spinningWinner: "",
      isActive: true,
      __appearancePreviewSample: true,
    };
    if (previewState === "empty") {
      return {
        ...base,
        participants: [],
        winner: "",
        spinningWinner: "",
        isActive: false,
      };
    }
    if (previewState === "drawing") {
      return {
        ...base,
        spinningWinner: "NOVA",
        isActive: false,
      };
    }
    if (previewState === "winner") {
      return {
        ...base,
        winner: "NOVA",
        isActive: false,
      };
    }
    return base;
  }
  if (
    config.winner ||
    config.spinningWinner ||
    config.isActive ||
    hasParticipants(config)
  ) {
    return { ...config, __appearancePreviewSample: true };
  }
  return {
    ...config,
    title: config.title || "Giveaway",
    prize: config.prize || "1000 points",
    keyword: config.keyword || "join",
    isActive: true,
    participants: SAMPLE_GIVEAWAY_PARTICIPANTS,
    __appearancePreviewSample: true,
  };
}

function applySlotRequestsPreviewSample(config = {}, slotCatalog) {
  if (Array.isArray(config.__appearancePreviewRequests)) {
    return { ...config, __appearancePreviewSample: true };
  }
  const state = config.__appearancePreviewState || "with_requests";
  const requests = hydratePreviewRequests(
    getSlotRequestsPreviewRequests(state),
    slotCatalog,
  );
  return {
    ...config,
    __appearancePreviewRequests: requests,
    __appearancePreviewSample: true,
  };
}

function applyChatPreviewSample(config = {}) {
  if (Array.isArray(config.__appearancePreviewMessages)) {
    return { ...config, __appearancePreviewSample: true };
  }
  return {
    ...config,
    __appearancePreviewMessages: SAMPLE_CHAT_MESSAGES,
    __appearancePreviewSample: true,
  };
}

function applyBonusHuntPreviewSample(config = {}, slotCatalog) {
  const previewState = config.__appearancePreviewState || "hunt_live";
  const requests = hydratePreviewRequests(
    getBonusHuntPreviewRequests(previewState),
    slotCatalog,
  );
  return {
    ...config,
    displayStyle: config.displayStyle || "v12_classic_sr",
    huntName: config.huntName || "Preview Hunt",
    currency: config.currency || "€",
    startMoney: positiveNumberOr(config.startMoney, 1500),
    stopLoss: positiveNumberOr(config.stopLoss, 200),
    bonusOpening: previewOpeningState(previewState, config),
    bonuses: nonEmptyArrayOr(
      config.bonuses,
      hydratePreviewBonuses(SAMPLE_BONUS_HUNT_BONUSES, slotCatalog),
    ),
    showSlotRequests: config.showSlotRequests !== false,
    __appearancePreviewRequests: requests,
    __appearancePreviewSample: true,
  };
}

function applyTournamentPreviewSample(config = {}, slotCatalog) {
  const existingMatches = config.data?.matches;
  return {
    ...config,
    bracketName: config.bracketName || "Friday Night Showdown",
    bracketPhase: "active",
    data: {
      ...(config.data || {}),
      currentMatchIdx: config.data?.currentMatchIdx ?? 1,
      matches: nonEmptyArrayOr(
        existingMatches,
        hydratePreviewMatches(SAMPLE_TOURNAMENT_MATCHES, slotCatalog),
      ),
    },
    __appearancePreviewSample: true,
  };
}

function getBetsPreviewFrame(config) {
  if (config.displayStyle === "StyleSecaBets")
    return { width: 400, height: 510 };
  const isGrid = ["v2_grid", "v3_grid_2x3", "StyleSecaBets"].includes(
    config.displayStyle,
  );
  return {
    width: isGrid ? 620 : 560,
    height: isGrid ? 430 : 460,
  };
}

function getSpotifyPreviewFrame(config) {
  const compact = ["mini_player", "compact_bar"].includes(config.displayStyle);
  return {
    width: compact ? 460 : 420,
    height: compact ? 120 : 420,
  };
}

function getBonusHuntPreviewFrame(config) {
  if (
    ["v12_classic_sr", "v12_classic_sr_editable"].includes(config.displayStyle)
  ) {
    return { width: 300, height: 820 };
  }
  return null;
}

function getSlotRequestsPreviewFrame(config) {
  if (config.displayStyle === "v2_card_stack")
    return { width: 560, height: 430 };
  if (["v3_compact", "v3_compact_editable"].includes(config.displayStyle)) {
    return { width: 560, height: 120 };
  }
  return { width: 360, height: 520 };
}

const PREVIEW_FRAME_BUILDERS = Object.freeze({
  bets: getBetsPreviewFrame,
  bonus_hunt: getBonusHuntPreviewFrame,
  chat: () => ({ width: 420, height: 520 }),
  giveaway: () => ({ width: 480, height: 360 }),
  slot_requests: getSlotRequestsPreviewFrame,
  spotify_now_playing: getSpotifyPreviewFrame,
  tournament: () => ({ width: 960, height: 720 }),
});

function getPreviewFrame(widgetType, config = {}) {
  const frameBuilder = PREVIEW_FRAME_BUILDERS[widgetType];
  if (!frameBuilder) return null;
  return frameBuilder(config);
}

function applyWidgetPreviewSample(widget, now, slotCatalog) {
  if (!widget) return widget;
  if (widget.widget_type === "bets")
    return {
      ...widget,
      config: applyBetsPreviewSample(widget.config || {}, now),
    };
  if (widget.widget_type === "navbar")
    return { ...widget, config: applyNavbarPreviewSample(widget.config || {}) };
  if (widget.widget_type === "spotify_now_playing")
    return {
      ...widget,
      config: applySpotifyPreviewSample(widget.config || {}),
    };
  if (widget.widget_type === "giveaway")
    return {
      ...widget,
      config: applyGiveawayPreviewSample(widget.config || {}),
    };
  if (widget.widget_type === "chat")
    return { ...widget, config: applyChatPreviewSample(widget.config || {}) };
  if (widget.widget_type === "bonus_hunt")
    return {
      ...widget,
      config: applyBonusHuntPreviewSample(widget.config || {}, slotCatalog),
    };
  if (widget.widget_type === "tournament")
    return {
      ...widget,
      config: applyTournamentPreviewSample(widget.config || {}, slotCatalog),
    };
  if (widget.widget_type === "slot_requests")
    return {
      ...widget,
      config: applySlotRequestsPreviewSample(widget.config || {}, slotCatalog),
    };
  return widget;
}

export function applyPreviewWidgetSamples(widgets = [], options = {}) {
  const now = Number(options.now) || Date.now();
  const expandFrames = options.expandFrames === true;
  const slotCatalog = buildPreviewSlotCatalog(options.slotCatalog);
  return widgets.map((widget) => {
    const sampled = applyWidgetPreviewSample(widget, now, slotCatalog);
    if (!expandFrames || sampled === widget) return sampled;
    const frame = getPreviewFrame(sampled.widget_type, sampled.config || {});
    if (!frame) return sampled;
    return {
      ...sampled,
      __previewFrame: {
        width: Math.max(Number(sampled.width) || 0, frame.width),
        height: Math.max(Number(sampled.height) || 0, frame.height),
      },
    };
  });
}

export function getWidgetPreviewFrame(widget = {}) {
  return widget.__previewFrame || null;
}
