import {normalizeChromaKeyColor} from '../../../components/OverlayCenter/widgets/background/backgroundSource.js';
export const STREET_ART_TOKENS = Object.freeze({
  background: '#090C0E', surface: '#101416', raised: '#1B2023', border: '#AAAFAA',
  highlight:'#FFE600', accent: '#00D5ED', secondary: '#FF149A', text: '#F1EFE8', muted: '#B8BDBF',
});
export const STREET_ART_ASSETS = Object.freeze({
  background: '/theme-effects/street-art/concrete.webp',
  props: '/theme-effects/street-art/spray-cluster.webp',
  can: '/theme-effects/street-art/spray-can.webp',
});
export const STREET_ART_GAMEPLAY = Object.freeze({ x: 458, y: 106, width: 1022, height: 790 });
const text = label => ({label,kind:'text',capabilities:['typography']});
export const STREET_ART_RTP_STYLE = Object.freeze({id:'street_art_strip',label:'Street Art information strip',hiddenInQuickEditor:true,strictElementIds:true,
  elements:{container:{label:'Strip surface',kind:'container',capabilities:['surface','border']},statCard:{label:'Statistic cell',kind:'container',capabilities:['surface','border']},provider:{label:'Provider identity',kind:'container',capabilities:['typography','spacing']},slotTitle:text('Slot name'),label:text('Statistic labels'),rtpValue:text('RTP'),maxWin:text('Potential'),volatility:text('Volatility'),bestWin:text('Best win')},
  capabilities:{colours:true,fonts:true,fontSizes:true,borders:true}});
export const STREET_ART_HUNT_STYLE = Object.freeze({id:'street_art_hunt',label:'Street Art compact hunt',hiddenInQuickEditor:true,strictElementIds:true,
  elements:{
    ...Object.fromEntries(['container','mainStatsContainer','statCell','slotListContainer','slotRow','footerContainer'].map(id=>[id,{label:id,kind:'container',capabilities:['surface','border','spacing']}])),
    ...Object.fromEntries(['headerTitle','statLabel','statValue','slotTitle','winLabel','winValue','multiplierLabel','multiplierValue','betLabel','betValue','progressCount','footerLabel','footerTotalValue'].map(id=>[id,text(id)])),
    progressBar:{label:'Progress track',kind:'progress',capabilities:['progress']},progressBarFill:{label:'Opened progress',kind:'progress',capabilities:['progress']},
  },capabilities:{colours:true,fonts:true,fontSizes:true,borders:true}});
const bounded = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
export function normalizeStreetArtSettings(config = {}) {
  const c = config.streetArt || {};
  const frame = c.gameplay || {};
  const x = bounded(frame.x, 0, 1820, STREET_ART_GAMEPLAY.x), y = bounded(frame.y, 0, 1000, STREET_ART_GAMEPLAY.y);
  return { background: c.background !== false, transparentGameplay: c.transparentGameplay !== false,
    gameplayChromaKey:c.gameplayChromaKey===true,gameplayChromaColor:normalizeChromaKeyColor(c.gameplayChromaColor),
    gameplay: {x,y,width:bounded(frame.width,100,1920-x,Math.min(1920-x,STREET_ART_GAMEPLAY.width)),height:bounded(frame.height,80,1080-y,Math.min(1080-y,STREET_ART_GAMEPLAY.height)),radius:bounded(frame.radius,0,100,18)},
    gameplayFrame: c.gameplayFrame === true, splashes: c.splashes !== false, props: c.props !== false,
    textureIntensity: bounded(c.textureIntensity, 0, 100, 55), panelOpacity: bounded(c.panelOpacity, 0, 100, 100),
    borderWidth: bounded(c.borderWidth, 0, 8, 2), headerFont: c.headerFont || "'Permanent Marker', Impact, sans-serif",
    contentFont: c.contentFont || config.fontFamily || "'Barlow', Arial, sans-serif",
    primary: c.primary || STREET_ART_TOKENS.accent, secondary: c.secondary || STREET_ART_TOKENS.secondary,
    accent: c.accent || '#FFE600', heading: c.heading,
  };
}
export function streetArtStyleVariables(tokens = STREET_ART_TOKENS, config = {}) {
  const c = normalizeStreetArtSettings(config);
  return { '--street-panel': tokens.surface, '--street-text': tokens.text, '--street-muted': tokens.muted,
    '--street-cyan': c.primary, '--street-pink': c.secondary, '--street-yellow': c.accent,
    '--street-border': tokens.border, '--street-border-width': `${c.borderWidth}px`,
    '--street-grain': c.textureIntensity / 100, '--street-opacity': c.panelOpacity / 100,
    '--street-heading-font': c.headerFont, '--street-content-font': c.contentFont };
}
