import { getWidgetColourTheme } from "../widgets/shared/colourThemePalettes";
import { candyWidgetPalette } from '../../../effects/ThemeEffects/candy/candyTheme.js';
function widgetPalette(type, palette) {
  const resolved = candyWidgetPalette(type, palette);
  return type === 'giveaway' && resolved?.key === 'solverde' ? { ...resolved, background:'#EEE7D6', surface:'#EEE7D6', raised:'#F6F0E3', text:'#06231C', muted:'#315C47', accent:'#087C40' } : resolved;
}
import {
  getScopedAppearanceConfigValue,
  setScopedAppearanceConfigValue,
  validateAppearanceRoute,
} from "../appearance/v2/appearanceRouting";

const COLOUR_KEYS = {
 camera:{},slot_window:{},
  slot_requests:{backgroundColor:'background',cardColor:'surface',borderColor:'accent',textColor:'text',mutedColor:'muted'},
  current_slot: { panelColor: 'surface', badgeColor: 'raised', coverColor: 'background', backgroundColor: 'background', accentColor: 'accent', borderColor: 'border', textColor: 'text', mutedColor: 'muted', portraitPanelColor:'surface', portraitAccentColor:'accent' },
  slot_bingo: {
    backgroundColor: "background",
    panelColor: "surface",
    cardColor: "raised",
    borderColor: "border",
    accentColor: "accent",
    secondaryColor: "secondary",
    completedColor: "accent",
    textColor: "text",
    mutedColor: "muted",
  },
  connect_four: { boardColor: "surface", boardBorderColor: "border", titleColor: "accent", textColor: "text", mutedColor: "muted" },
  raid_shoutout: { backgroundColor: "background", accentColor: "accent", secondaryColor: "secondary", textColor: "text", mutedColor: "muted" },
  slideshow_frame: { frameColor: "border", accentColor: "accent", backgroundColor: "surface", panelHi: "raised", panelLo: "background", textColor: "text", mutedColor: "muted" },
  bonus_hunt: { headerAccent: "accent", accentColor: "accent", headerColor: "surface", bgColor: "surface" },
  giveaway: { panelHi: "raised", bgColor: "surface", panelLo: "background", cardHi: "raised", cardLo: "surface", lineColor: "border", textColor: "text", mutedColor: "muted", secondaryTextColor: "muted", accentColor: "accent", deepAccentColor: "secondary" },
  navbar: { bgColor: "background", textColor: "text", mutedColor: "muted", accentColor: "accent", accentBlue: "secondary", accentGold: "accent", ctaColor: "accent", borderColor: "border", navbarTopColor: "raised", navbarBottomColor: "background", navbarBorderColor: "border" },
  chat: { textColor:"text", headerText:"text", headerBg:"surface", cardBg:"surface", cardTextColor:"text", glow: "accent", username: "accent", text: "text", bubble: "raised", panel: "surface", panelHi: "raised", panelLo: "background", cardLo: "surface", borderColor: "border" },
  rtp_stats: { cBarTop: "raised", cBarMid: "surface", cBarBot: "background", cRim: "border", cValue: "text", cLabel: "muted", cBolt: "accent", cBrand: "muted", cEmA: "accent", cEmB: "secondary", cEmBase: "surface" },
  background: { color1: "background", color2: "secondary", color3: "accent", overlayColor: "background", fxParticleColor: "accent", fxGlimpseColor: "accent" },
  tournament: { bgColor: "surface", panelHi: "raised", panelLo: "background", borderColor: "border", cardBg: "raised", cardBorder: "border", nameColor: "text", slotNameColor: "muted", multiColor: "accent", swordColor: "accent", xIconColor: "muted", emptyTextColor: "muted", sbTextColor: "text", sbPayColor: "muted", sbMultiColor: "accent" },
  bets: {
    bgColor: "background",
    headerBg: "surface",
    headerText: "text",
    barBg: "raised",
    barFill: "accent",
    textColor: "text",
    accentColor: "accent",
    borderColor: "border",
    cardBg: "surface",
  },
};

// Explicit existing element targets, not a global recolour of arbitrary descendants.
const REQUEST_ELEMENTS={container:{background:'background',borderColor:'border',textColor:'text'},header:{textColor:'accent'},command:{textColor:'muted'},playerCount:{textColor:'muted'},requestCard:{background:'surface',borderColor:'border'},slotTitle:{textColor:'text'},viewerName:{textColor:'muted'},position:{textColor:'accent'},emptyState:{textColor:'muted'}};
const ELEMENT_COLOURS = {
  slot_requests:REQUEST_ELEMENTS,
  current_slot: {
    container: { background: 'background', borderColor: 'border', textColor: 'text' },
    coverFrame: { background: 'background', borderColor: 'accent' },
    slotImage: { borderColor: 'accent' },
    slotTitle: { textColor: 'text' }, provider: { textColor: 'muted' },
    badge: { background: 'raised', borderColor: 'border', textColor: 'accent' },
    info: { borderColor: 'border' }, records: { borderColor: 'border' },
    infoTitle: { textColor: 'text' }, recordsTitle: { textColor: 'text' },
    ...Object.fromEntries(['potential', 'rtp', 'volatility', 'bestWin', 'bestMulti', 'averageWin'].flatMap(id => [
      [id, { background: 'surface', borderColor: 'border' }],
      [id + 'Label', { textColor: 'muted' }],
      [id + 'Value', { textColor: ['rtp', 'volatility','bestWin'].includes(id) ? 'text' : 'accent' }],
    ])),
  },
  slot_bingo: {
    container: { background: "background", borderColor: "border", textColor: "text" },
    header: { background: "surface", borderColor: "border" },
    title: { textColor: "accent" },
    progressBadge: { background: "raised", borderColor: "secondary", textColor: "text" },
    board: { background: "background" },
    square: { background: "raised", borderColor: "border" },
    incompleteSquare: { background: "raised", borderColor: "border", textColor: "muted" },
    completedSquare: { background: "surface", borderColor: "accent", textColor: "text", accentColor: "accent" },
    freeSquare: { background: "surface", borderColor: "secondary", textColor: "text", accentColor: "accent" },
    squareLabel: { textColor: "text" },
    squareMultiplier: { background: "background", borderColor: "accent", textColor: "accent" },
    completionIcon: { textColor: "accent", borderColor: "accent" },
  },
  chat: {
    container: { background: "surface", borderColor: "border" },
    header: { background: "surface", textColor: "accent", borderColor: "border" },
    message: { background: "raised", borderColor: "border" },
    username: { textColor: "accent" }, messageText: { textColor: "text" },
    emptyState: { textColor: "muted" },
  },
  bonus_hunt: {
    ...Object.fromEntries(Object.entries(REQUEST_ELEMENTS).map(([id,props])=>['requestImage'+id[0].toUpperCase()+id.slice(1),props])),
    container: { background: "surface", borderColor: "border" },
    header: { background: "surface", borderColor: "border" },
    title: { textColor: "text" }, statCard: { background: "raised", borderColor: "border" },
    statLabel: { textColor: "muted" }, statValue: { textColor: "text" },
    slotRow: { background: "raised", borderColor: "border" },
    carouselBackdrop: { background: "surface", borderColor: "border" },
    progressBarFill: { background: "accent" }, progressCount: { textColor: "text" },
    // Actual renderer targets, including appearances saved before Candy existed.
    headerTitle: { textColor: 'text' }, slotTitle: { textColor: 'text' },
    statCell: { background: 'raised', borderColor: 'border' },
    ...Object.fromEntries(['betValue', 'winValue', 'multiplierValue', 'rtpValue', 'maxWinValue', 'resultSlotName', 'resultStatValue', 'resultPayout'].map(id => [id, { textColor: 'text' }])),
    bestWinValue:{textColor:'text'}, bestMultiplierValue:{textColor:'accent'},
    ...Object.fromEntries(['betLabel', 'winLabel', 'multiplierLabel', 'rtpLabel', 'maxWinLabel', 'providerName', 'resultStatLabel'].map(id => [id, { textColor: 'muted' }])),
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
  bets: {
    widgetBackground: { background: "background", borderColor: "border", textColor: "text" },
    header: { background: "surface", borderColor: "border", textColor: "text" },
    status: { background: "accent", borderColor: "secondary", textColor: "background" },
    poolStat: { background: "raised", borderColor: "border", textColor: "text" },
    timerStat: { background: "raised", borderColor: "border", textColor: "text" },
    betsStat: { background: "raised", borderColor: "border", textColor: "text" },
    betCards: { background: "surface", borderColor: "border", textColor: "text" },
    individualBetCard: { background: "surface", borderColor: "border", textColor: "text", accentColor: "accent" },
    cardNumberBadge: { background: "accent", borderColor: "secondary", textColor: "background" },
    cardRangeText: { textColor: "text" },
    cardPercentageText: { textColor: "text" },
    cardLabel: { textColor: "muted" },
    progressBar: { background: "raised", fillColor: "accent", borderColor: "border" },
    footerInstruction: { textColor: "muted", borderColor: "border" },
  },
};

export function buildWidgetColourThemePatch(type, config, key) {
  const theme = widgetPalette(type, getWidgetColourTheme(key));
  if (!theme || !Object.hasOwn(COLOUR_KEYS, type)) return null;
  const patch = Object.fromEntries(Object.entries(COLOUR_KEYS[type])
    .map(([property, token]) => [property, theme[token]]));
  if(type==='current_slot'&&config.displayStyle==='portrait_compact') patch.portraitPanelColor=theme.surface;
  if(type==='bonus_hunt'&&config.requestImageCards){const colours={backgroundColor:theme.background,cardColor:theme.surface,borderColor:theme.border,textColor:theme.text,mutedColor:theme.muted};patch.requestImageCards={...config.requestImageCards,...colours};}
  if (type === "bets") patch.theme = theme.key;
  if (type === "bonus_hunt") patch.colour = `theme_${theme.key}`;
  if (type === "giveaway") patch.hue = theme.hue;
  if (type === "chat" && config.bgColor) patch.bgColor = theme.surface;
  if (type === 'giveaway') {
    for (const [property, token] of Object.entries({ titleColor: 'text', prizeColor: 'accent', labelColor: 'muted', valueColor: 'text', winnerColor: 'text' })) {
      if (theme.key === 'candy' || config[property]) patch[property] = theme[token];
    }
  }
  if (theme.key === 'candy') {
    patch.fontFamily = "'Rubik', Arial, sans-serif";
    if (type === 'chat') patch.font = patch.fontFamily;
    if (type === 'rtp_stats') { patch.fontBody = patch.fontFamily; patch.fontTitle = patch.fontFamily; }
    if (type === 'giveaway') { patch.titleFont = 'rubik'; patch.bodyFont = 'rubik'; }
  }
  if (['volcanic', 'solverde','street_art'].includes(theme.key)) {
    patch.fontFamily = "'Inter', Arial, sans-serif";
    if (type === 'chat') patch.font = patch.fontFamily;
    if (type === 'rtp_stats') { patch.fontBody = patch.fontFamily; patch.fontTitle = patch.fontFamily; }
    if (type === 'giveaway') { patch.titleFont = 'inter'; patch.bodyFont = 'inter'; }
  }
  if(theme.key==='galactic_command'){patch.fontFamily="'Rajdhani', sans-serif";if(type==='chat')patch.font=patch.fontFamily;if(type==='rtp_stats'){patch.fontBody=patch.fontFamily;patch.fontTitle=patch.fontFamily;}}
  if(theme.key==='starter_studio'){patch.fontFamily="'Barlow Condensed', Arial, sans-serif";if(type==='chat')patch.font=patch.fontFamily;}
  if (theme.key === 'solverde' && type === 'giveaway') patch.titleFont = 'serif';
  return patch;
}

// Material tokens follow the widget's existing Simple/Advanced colour fields.
// Element-level inline styles still win over these inherited defaults.
export function getWidgetColourThemeTokens(type, config, key) {
  const palette = { ...widgetPalette(type, getWidgetColourTheme(key)) };
  const assigned = new Set();
  // Older Clear Ice saves contain the first draft palette. Translate only those
  // exact defaults so existing themed overlays pick up Crystal Ice while any
  // custom per-widget colors continue to win.
  const legacyClearIceColors = key === 'clear_ice' ? {
    '#071827': '#0A2B4A', '#0D2A40': '#123254', '#153B56': '#0A2B4A',
    '#8DE2FF': '#89D9FF', '#DDF7FF': '#D8F3FB', '#60C8F1': '#659CD2',
    '#F3FAFF': '#EAF7FF', '#BDD6E4': '#A9CDE5', '#E9F7FA': '#0A2B4A',
    '#D8EFF5': '#123254', '#F5FCFD': '#0A2B4A', '#78BFD1': '#89D9FF',
  } : null;
  for (const [property, token] of Object.entries(COLOUR_KEYS[type] || {})) {
    const configuredColor = typeof config[property] === 'string' ? config[property] : '';
    const migratedColor = legacyClearIceColors?.[configuredColor.toUpperCase()] || configuredColor;
    if (!assigned.has(token) && configuredColor) {
      palette[token] = migratedColor;
      assigned.add(token);
    }
  }
  if(type === 'current_slot' && config.colourTheme === 'solverde' && config.solverde?.footer && config.backgroundColor) palette.background=config.backgroundColor;
  return palette;
}

function syncElementOverrides(config, type, theme) {
  let next = config;
  const widgetVariant = config.chatStyle || config.displayStyle || config.layout;
  for (const [elementId, properties] of Object.entries(ELEMENT_COLOURS[type] || {})) {
    for (const [propertyId, token] of Object.entries(properties)) {
      // Prediction ranges are semantic colours, including users' per-element
      // overrides. Orbital changes the tile material, not those colours.
      if (['orbital', 'volcanic'].includes(theme.key) && type === 'bets' && (
        (elementId === 'individualBetCard' && propertyId === 'accentColor') ||
        (elementId === 'cardNumberBadge' && ['background', 'borderColor', 'textColor'].includes(propertyId)) ||
        (elementId === 'progressBar' && propertyId === 'fillColor')
      )) continue;
      const value = theme.key === 'solverde' && type === 'chat' && elementId === 'header' && propertyId === 'textColor' ? theme.text : theme[token];
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
  return syncElementOverrides({ ...config, ...patch, colourTheme: key }, type, widgetPalette(type, getWidgetColourTheme(key)));
}

export function getSelectedWidgetColourTheme(type, config = {}) {
  const key = type === "bets" ? config.theme || config.betTheme || "neon" : config.colourTheme;
  if (type === "bets") return getWidgetColourTheme(key)?.key || null;
  const patch = buildWidgetColourThemePatch(type, config, key);
  if (!patch) return null;
  return Object.entries(patch).every(([property, value]) => (config[property] === value || (property==='requestImageCards' && Object.entries(value).every(([id,colour])=>config[property]?.[id]===colour)))) ? key : null;
}
