/**
 * styleKeysRegistry.js — Central registry of per-style visual keys for each widget type.
 * Used by WidgetManager.handleStyleCycle to save/restore per-style settings,
 * and by each config component's makePerStyleSetters() call.
 */

/* ── Bonus Hunt ── */
export const BONUS_HUNT_STYLE_KEYS = [
  'headerColor', 'headerAccent', 'countCardColor', 'currentBonusColor', 'currentBonusAccent',
  'listCardColor', 'listCardAccent', 'summaryColor', 'cardOutlineColor',
  'superBadgeColor', 'extremeBadgeColor', 'totalPayColor', 'totalPayText',
  'textColor', 'mutedTextColor', 'statValueColor',
  'fontFamily', 'fontSize',
  'widgetWidth', 'cardPadding', 'cardRadius', 'cardGap', 'cardOutlineWidth',
  'slotImageHeight', 'listMaxHeight',
  'brightness', 'contrast', 'saturation',
  'flipBackColor1', 'flipBackColor2', 'flipBackBorder', 'flipBackImage', 'flipSpinDuration',
  'flipShowProvider', 'flipShowRTP', 'flipShowPotential', 'flipShowVolatility', 'flipShowBetSize', 'flipShowWin',
  'v8CardWidth', 'v8CardHeight', 'v8FontSize', 'v8AutoSpeed', 'v8ShowStats', 'v8ShowProgress',
  'v8CardSpacing', 'v8CardRadius', 'v8StatsFontSize', 'v8NameFontSize',
  'v9CardWidth', 'v9CardHeight', 'v9FontSize', 'v9AutoSpeed', 'v9ShowStats', 'v9ShowProgress',
  'v9CardSpacing', 'v9CardRadius', 'v9StatsFontSize', 'v9TitleFontSize', 'v9ContainerRadius',
  'v9ContainerBg', 'v9ShowHeader',
  'custom_css',
];

/* ── Current Slot ── */
export const CURRENT_SLOT_STYLE_KEYS = [
  'bgColor', 'cardBg', 'accentColor', 'textColor', 'mutedColor', 'borderColor',
  'fontFamily', 'custom_css',
];

/* ── Tournament ── */
export const TOURNAMENT_STYLE_KEYS = [
  'showBg', 'bgColor', 'borderColor', 'borderRadius', 'borderWidth', 'containerPadding', 'cardGap',
  'cardBg', 'cardBorder', 'cardRadius', 'cardBorderWidth',
  'tabBg', 'tabActiveBg', 'tabColor', 'tabActiveColor', 'tabBorder',
  'nameColor', 'multiColor', 'slotNameColor', 'nameSize', 'multiSize', 'slotNameSize',
  'fontFamily',
  'showSlotName', 'swordSize', 'swordColor', 'swordBg', 'xIconColor', 'xIconBg', 'eliminatedOpacity',
  'arenaAccent', 'arenaWinColor', 'arenaCardBg', 'arenaCurrency', 'arenaLoseOpacity',
  'esCyan', 'esPurple', 'esGold', 'esBg', 'esCardBg', 'esBorder',
  'sbAccent', 'sbHeaderBg', 'sbCardBg', 'sbTextColor', 'sbPayColor', 'sbMultiColor',
  'sbWinColor', 'sbLoseColor', 'sbTabBg', 'sbTabActive',
  'custom_css',
];

/* ── Giveaway ── */
export const GIVEAWAY_STYLE_KEYS = [
  'bgColor', 'accentColor', 'textColor', 'mutedColor', 'borderColor',
  'fontFamily', 'custom_css',
];

/* ── Navbar ── */
export const NAVBAR_STYLE_KEYS = [
  'accentColor', 'bgColor', 'textColor', 'mutedColor', 'ctaColor',
  'cryptoUpColor', 'cryptoDownColor',
  'fontFamily', 'fontSize',
  'barHeight', 'borderWidth', 'borderRadius', 'maxWidth',
  'brightness', 'contrast', 'saturation',
  'custom_css',
];

/* ── Chat ── */
export const CHAT_STYLE_KEYS = [
  'bgColor', 'textColor', 'borderColor', 'headerBg', 'headerText',
  'fontFamily', 'fontSize', 'msgLineHeight', 'msgPadH', 'nameBold', 'useNativeColors',
  'width', 'height', 'borderRadius', 'borderWidth', 'msgSpacing', 'maxMessages',
  'brightness', 'contrast', 'saturation',
  'raidBgColor', 'raidBorderColor', 'raidTextColor', 'showRaidAvatar',
  'cardBg', 'cardBorder', 'cardHoverBg', 'cardHoverBorder', 'cardTextColor',
  'headerBorder', 'headerChannelColor',
  'custom_css',
];

/* ── Random Slot Picker ── */
export const RANDOM_SLOT_PICKER_STYLE_KEYS = [
  'accentColor', 'textColor', 'mutedColor', 'fontFamily', 'custom_css',
];

/* ── Image Slideshow ── */
export const IMAGE_SLIDESHOW_STYLE_KEYS = [
  'borderRadius', 'borderWidth', 'borderColor', 'showGradient', 'gradientColor', 'showDots',
  'mediaFit', 'custom_css',
];

/* ── RTP Stats ── */
export const RTP_STATS_STYLE_KEYS = [
  'barBgFrom', 'barBgVia', 'barBgTo', 'borderColor', 'borderWidth', 'borderRadius',
  'textColor', 'providerColor', 'slotNameColor', 'labelColor',
  'rtpIconColor', 'potentialIconColor', 'volatilityIconColor', 'bestWinIconColor',
  'dividerColor', 'spinnerColor',
  'fontFamily', 'fontSize', 'providerFontSize', 'paddingX', 'paddingY',
  'brightness', 'contrast', 'saturation',
  'custom_css',
];

/* ── Background ── */
export const BACKGROUND_STYLE_KEYS = [
  'bgMode', 'textureType', 'color1', 'color2', 'color3', 'gradientAngle', 'patternSize', 'animSpeed',
  'imageUrl', 'videoUrl', 'imageFit', 'imagePosition', 'opacity',
  'borderRadius', 'brightness', 'contrast', 'saturation', 'blur', 'hueRotate', 'grayscale', 'sepia',
  'overlayColor', 'overlayOpacity',
  'fxParticles', 'fxParticleColor', 'fxParticleCount', 'fxParticleSpeed', 'fxParticleSize',
  'fxFog', 'fxFogColor', 'fxGlimpse', 'fxGlimpseColor', 'fxGlimpseSpeed',
  'custom_css',
];

/* ── Spotify Now Playing ── */
export const SPOTIFY_STYLE_KEYS = [
  'accentColor', 'custom_css',
];

/* ── Coin Flip ── */
export const COIN_FLIP_STYLE_KEYS = [
  'headsColor', 'tailsColor', 'accentColor', 'textColor', 'headsImage', 'tailsImage',
  'custom_css',
];

/* ── Salty Words ── */
export const SALTY_WORDS_STYLE_KEYS = [
  'accentColor', 'textColor', 'cardBg', 'custom_css',
];

/* ── Slot Requests ── */
export const SLOT_REQUESTS_STYLE_KEYS = [
  'fontFamily', 'fontSize', 'fontWeight', 'accentColor', 'textColor', 'mutedColor',
  'bgColor', 'cardBg', 'borderColor',
  'commandTrigger', 'maxQueueSize', 'preventDuplicates', 'cooldownSeconds',
  'showRequester', 'showNumbers', 'maxDisplay', 'autoSpeed',
  'srSeEnabled', 'srSeCost',
  'srMsgAccepted', 'srMsgAcceptedCost', 'srMsgNotEnough', 'srMsgDuplicate', 'srMsgRejected',
  'srMsgNoMatch', 'srMsgCooldown', 'srMsgQueueFull',
  'custom_css',
];

/* ── Single Slot ── */
export const SINGLE_SLOT_STYLE_KEYS = [
  'accentColor', 'bgColor', 'textColor', 'mutedColor', 'fontFamily', 'custom_css',
];

/* ── BH Stats ── */
export const BH_STATS_STYLE_KEYS = [
  'fontFamily', 'fontSize', 'fontWeight',
  'bgColor', 'cardBg', 'textColor', 'mutedColor', 'accentColor', 'borderColor',
  'progressColor', 'progressBgColor', 'bestColor', 'worstColor',
  'borderRadius', 'showTitle',
  'custom_css',
];

/* ── Bonus Buys ── */
export const BONUS_BUYS_STYLE_KEYS = [
  'bgColor', 'accentColor', 'textColor', 'mutedColor', 'fontFamily', 'custom_css',
];

/* ── Registry map ── */
const STYLE_KEYS_MAP = {
  bonus_hunt: BONUS_HUNT_STYLE_KEYS,
  current_slot: CURRENT_SLOT_STYLE_KEYS,
  tournament: TOURNAMENT_STYLE_KEYS,
  giveaway: GIVEAWAY_STYLE_KEYS,
  navbar: NAVBAR_STYLE_KEYS,
  chat: CHAT_STYLE_KEYS,
  random_slot_picker: RANDOM_SLOT_PICKER_STYLE_KEYS,
  image_slideshow: IMAGE_SLIDESHOW_STYLE_KEYS,
  rtp_stats: RTP_STATS_STYLE_KEYS,
  background: BACKGROUND_STYLE_KEYS,
  spotify_now_playing: SPOTIFY_STYLE_KEYS,
  coin_flip: COIN_FLIP_STYLE_KEYS,
  salty_words: SALTY_WORDS_STYLE_KEYS,
  slot_requests: SLOT_REQUESTS_STYLE_KEYS,
  single_slot: SINGLE_SLOT_STYLE_KEYS,
  bh_stats: BH_STATS_STYLE_KEYS,
  bonus_buys: BONUS_BUYS_STYLE_KEYS,
};

/** Look up per-style keys for a widget type. Returns null if not registered. */
export function getStyleKeysForWidget(widgetType) {
  return STYLE_KEYS_MAP[widgetType] || null;
}
