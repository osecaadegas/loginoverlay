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
  return null;
}

function applyWidgetPreviewSample(widget, now) {
  if (!widget) return widget;
  if (widget.widget_type === 'bets') return { ...widget, config: applyBetsPreviewSample(widget.config || {}, now) };
  if (widget.widget_type === 'spotify_now_playing') return { ...widget, config: applySpotifyPreviewSample(widget.config || {}) };
  if (widget.widget_type === 'giveaway') return { ...widget, config: applyGiveawayPreviewSample(widget.config || {}) };
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