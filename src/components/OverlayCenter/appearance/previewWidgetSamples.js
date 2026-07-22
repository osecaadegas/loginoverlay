const SAMPLE_BETS_OPTIONS = [
  { label: '0 - 99' },
  { label: '100 - 199' },
  { label: '200 - 299' },
  { label: '300 - 399' },
  { label: '400+' },
];

const SAMPLE_BET_AMOUNTS = [1280, 820, 1540, 420, 960, 610, 360, 1180, 740];

const SAMPLE_GIVEAWAY_PARTICIPANTS = [
  'Afonso',
  'Beatriz',
  'Carolina',
  'Duarte',
  'Ines',
  'Miguel',
  'Rafa',
  'Sofia',
];

const SAMPLE_SLOT_REQUESTS = [
  {
    id: 'preview-sr-1',
    slot_name: 'Gates of Olympus 1000',
    slot_image: 'https://images-cdn.softswiss.net/i/s2/pragmaticplay/GatesOfOlympus1000.png',
    requested_by: 'brutuspolus',
    created_at: '2026-07-16T10:00:00.000Z',
  },
  {
    id: 'preview-sr-2',
    slot_name: 'Le Digger',
    slot_image: 'https://images-cdn.softswiss.net/i/s2/hacksaw/LeDigger.png',
    requested_by: 'miguel',
    created_at: '2026-07-16T10:01:00.000Z',
  },
  {
    id: 'preview-sr-3',
    slot_name: 'Big Bass Secrets of the Golden Lake',
    slot_image: 'https://images-cdn.softswiss.net/i/s2/pragmaticplay/BigBassSecretsOfTheGoldenLake.png',
    requested_by: 'viewer_42',
    created_at: '2026-07-16T10:02:00.000Z',
  },
  {
    id: 'preview-sr-4',
    slot_name: 'Cyber Runner',
    slot_image: '',
    requested_by: 'sara',
    created_at: '2026-07-16T10:03:00.000Z',
  },
];

const SAMPLE_CHAT_MESSAGES = [
  {
    id: 'preview-chat-1',
    platform: 'twitch',
    username: 'brutuspolus',
    message: 'This chat preview uses the saved widget style.',
    color: '#a78bfa',
    timestamp: Date.now() - 15000,
    isBroadcaster: true,
  },
  {
    id: 'preview-chat-2',
    platform: 'kick',
    username: 'miguel',
    message: 'Edit header, message row, name, badges and text separately.',
    color: '#22c55e',
    timestamp: Date.now() - 9000,
    isVip: true,
  },
  {
    id: 'preview-chat-3',
    platform: 'youtube',
    username: 'viewer_42',
    message: 'Nothing here is shared with the live chat feed.',
    color: '#ef4444',
    timestamp: Date.now() - 3000,
  },
];

const SAMPLE_BONUS_HUNT_BONUSES = [
  {
    id: 'preview-bh-1',
    slotName: 'Gates of Olympus 1000',
    slot: {
      name: 'Gates of Olympus 1000',
      image: 'https://images-cdn.softswiss.net/i/s2/pragmaticplay/GatesOfOlympus1000.png',
      provider: 'Pragmatic Play',
    },
    betSize: 1,
    payout: 82,
    opened: true,
    isSuperBonus: true,
  },
  {
    id: 'preview-bh-2',
    slotName: 'Le Digger',
    slot: {
      name: 'Le Digger',
      image: 'https://images-cdn.softswiss.net/i/s2/hacksaw/LeDigger.png',
      provider: 'Hacksaw Gaming',
    },
    betSize: 2,
    payout: 0,
    opened: false,
  },
  {
    id: 'preview-bh-3',
    slotName: 'Big Bass Secrets of the Golden Lake',
    slot: {
      name: 'Big Bass Secrets of the Golden Lake',
      image: 'https://images-cdn.softswiss.net/i/s2/pragmaticplay/BigBassSecretsOfTheGoldenLake.png',
      provider: 'Pragmatic Play',
    },
    betSize: 1,
    payout: 0,
    opened: false,
  },
  {
    id: 'preview-bh-4',
    slotName: 'Cyber Runner',
    slot: {
      name: 'Cyber Runner',
      image: '',
      provider: 'Peter & Sons',
    },
    betSize: 1,
    payout: 0,
    opened: false,
    isExtremeBonus: true,
  },
  {
    id: 'preview-bh-5',
    slotName: 'Banana Town',
    slot: {
      name: 'Banana Town',
      image: 'https://images-cdn.softswiss.net/i/s2/evoplay/BananaTown.png',
      provider: 'Evoplay',
    },
    betSize: 1,
    payout: 0,
    opened: false,
  },
];

function hasPositiveBetPool(config = {}) {
  return Object.values(config.bets || {}).some(value => Number(value) > 0);
}

function hasParticipants(config = {}) {
  return Array.isArray(config.participants) && config.participants.length > 0;
}

function buildSampleBetters(count) {
  return Array.from({ length: Math.max(4, count) }, (_, index) => [`viewer_${index + 1}`, true])
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}

function applyBetsPreviewSample(config = {}, now) {
  const options = Array.isArray(config.options) && config.options.length > 0
    ? config.options
    : SAMPLE_BETS_OPTIONS;
  const status = config.gameStatus && config.gameStatus !== 'idle' ? config.gameStatus : 'open';
  const bets = hasPositiveBetPool(config)
    ? config.bets
    : options.reduce((acc, _option, index) => ({ ...acc, [`opt_${index}`]: SAMPLE_BET_AMOUNTS[index % SAMPLE_BET_AMOUNTS.length] }), {});

  return {
    ...config,
    gameStatus: status,
    question: config.question || 'Place Your Bets',
    timerSeconds: Number(config.timerSeconds) > 0 ? config.timerSeconds : 600,
    _openedAt: config._openedAt || now - 120000,
    options,
    bets,
    betters: Object.keys(config.betters || {}).length > 0 ? config.betters : buildSampleBetters(options.length + 3),
    __appearancePreviewSample: true,
  };
}

function applySpotifyPreviewSample(config = {}) {
  if (config.manualArtist || config.manualTrack || config.spotify_access_token) {
    return { ...config, __appearancePreviewSample: true };
  }
  return {
    ...config,
    manualArtist: 'Streamers Center Radio',
    manualTrack: 'Bonus Hunt Live',
    manualAlbumArt: config.manualAlbumArt || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=512&q=80',
    __appearancePreviewSample: true,
  };
}

function applyGiveawayPreviewSample(config = {}) {
  const previewState = config.__appearancePreviewState;
  if (previewState) {
    const base = {
      ...config,
      title: config.title || 'Giveaway',
      prize: config.prize || '1000 points',
      keyword: config.keyword || 'join',
      participants: SAMPLE_GIVEAWAY_PARTICIPANTS,
      winner: '',
      spinningWinner: '',
      isActive: true,
      __appearancePreviewSample: true,
    };
    if (previewState === 'empty') {
      return {
        ...base,
        participants: [],
        winner: '',
        spinningWinner: '',
        isActive: false,
      };
    }
    if (previewState === 'drawing') {
      return {
        ...base,
        spinningWinner: 'Miguel',
        isActive: false,
      };
    }
    if (previewState === 'winner') {
      return {
        ...base,
        winner: 'Miguel',
        isActive: false,
      };
    }
    return base;
  }
  if (config.winner || config.spinningWinner || config.isActive || hasParticipants(config)) {
    return { ...config, __appearancePreviewSample: true };
  }
  return {
    ...config,
    title: config.title || 'Giveaway',
    prize: config.prize || '1000 points',
    keyword: config.keyword || 'join',
    isActive: true,
    participants: SAMPLE_GIVEAWAY_PARTICIPANTS,
    __appearancePreviewSample: true,
  };
}

function applySlotRequestsPreviewSample(config = {}) {
  if (Array.isArray(config.__appearancePreviewRequests)) {
    return { ...config, __appearancePreviewSample: true };
  }
  const state = config.__appearancePreviewState || 'with_requests';
  const requests = state === 'empty'
    ? []
    : state === 'busy_queue'
      ? [...SAMPLE_SLOT_REQUESTS, ...SAMPLE_SLOT_REQUESTS.map((item, index) => ({
          ...item,
          id: `${item.id}-busy-${index}`,
          requested_by: `viewer_${index + 5}`,
        }))]
      : SAMPLE_SLOT_REQUESTS;
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

function applyBonusHuntPreviewSample(config = {}) {
  const previewState = config.__appearancePreviewState || 'hunt_live';
  const requests = previewState === 'requests_empty'
    ? []
    : previewState === 'requests_busy'
      ? [...SAMPLE_SLOT_REQUESTS, ...SAMPLE_SLOT_REQUESTS.map((item, index) => ({
          ...item,
          id: `${item.id}-bh-busy-${index}`,
          requested_by: `viewer_${index + 8}`,
        }))]
      : SAMPLE_SLOT_REQUESTS;
  return {
    ...config,
    displayStyle: config.displayStyle || 'v12_classic_sr',
    huntName: config.huntName || 'Preview Hunt',
    currency: config.currency || '€',
    startMoney: Number(config.startMoney) > 0 ? config.startMoney : 1500,
    stopLoss: Number(config.stopLoss) > 0 ? config.stopLoss : 200,
    bonusOpening: previewState === 'opening' ? true : config.bonusOpening,
    bonuses: Array.isArray(config.bonuses) && config.bonuses.length > 0
      ? config.bonuses
      : SAMPLE_BONUS_HUNT_BONUSES,
    showSlotRequests: config.showSlotRequests !== false,
    __appearancePreviewRequests: requests,
    __appearancePreviewSample: true,
  };
}

function getPreviewFrame(widgetType, config = {}) {
  if (widgetType === 'bets') {
    const isGrid = ['v2_grid', 'v3_grid_2x3'].includes(config.displayStyle);
    return { width: isGrid ? 620 : 560, height: isGrid ? 430 : 460 };
  }
  if (widgetType === 'spotify_now_playing') {
    const compact = ['mini_player', 'compact_bar'].includes(config.displayStyle);
    return { width: compact ? 460 : 420, height: compact ? 120 : 420 };
  }
  if (widgetType === 'giveaway') return { width: 480, height: 360 };
  if (widgetType === 'chat') return { width: 420, height: 520 };
  if (widgetType === 'bonus_hunt') {
    if (config.displayStyle === 'v12_classic_sr' || config.displayStyle === 'v12_classic_sr_editable') {
      return { width: 300, height: 820 };
    }
  }
  if (widgetType === 'slot_requests') {
    if (config.displayStyle === 'v2_card_stack') return { width: 560, height: 430 };
    if (config.displayStyle === 'v3_compact' || config.displayStyle === 'v3_compact_editable') return { width: 560, height: 120 };
    return { width: 360, height: 520 };
  }
  return null;
}

function applyWidgetPreviewSample(widget, now) {
  if (!widget) return widget;
  if (widget.widget_type === 'bets') return { ...widget, config: applyBetsPreviewSample(widget.config || {}, now) };
  if (widget.widget_type === 'spotify_now_playing') return { ...widget, config: applySpotifyPreviewSample(widget.config || {}) };
  if (widget.widget_type === 'giveaway') return { ...widget, config: applyGiveawayPreviewSample(widget.config || {}) };
  if (widget.widget_type === 'chat') return { ...widget, config: applyChatPreviewSample(widget.config || {}) };
  if (widget.widget_type === 'bonus_hunt') return { ...widget, config: applyBonusHuntPreviewSample(widget.config || {}) };
  if (widget.widget_type === 'slot_requests') return { ...widget, config: applySlotRequestsPreviewSample(widget.config || {}) };
  return widget;
}

export function applyPreviewWidgetSamples(widgets = [], options = {}) {
  const now = Number(options.now) || Date.now();
  const expandFrames = options.expandFrames === true;
  return widgets.map(widget => {
    const sampled = applyWidgetPreviewSample(widget, now);
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
