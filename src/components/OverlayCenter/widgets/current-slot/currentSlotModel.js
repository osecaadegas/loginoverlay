export const CURRENT_SLOT_DEFAULTS = Object.freeze({
  displayStyle: 'immersive_current', currency: '€', slot: null,
  artworkBySlot: {}, accentColor: '#00e6ae', backgroundColor: '#080d0f',
  panelColor: '#050b0d', badgeColor: '#06231b', coverColor: '#050b0d',
  textColor: '#f5f7fa', mutedColor: '#8ba8b5', borderColor: '#134d44',
  portraitAccentColor: '#d7a847', portraitPanelColor: '#06162f',
  fontFamily: "'Rajdhani', sans-serif", backgroundOpacity: 0.24,
  showArtwork: true, showBackdrop: true, showPersonalRecords: true,
});

export function currentSlotIdentity(config = {}) {
  const stored = config.slot || {};
  const changed = config.slotId && config.slotId !== stored.id;
  return changed ? { id: config.slotId, name: config.slotName || '', provider: config.provider || '', image: config.imageUrl || '' }
    : { ...stored, id: config.slotId || stored.id, name: config.slotName || stored.name || '', provider: config.provider || stored.provider || '', image: config.imageUrl || stored.image || '' };
}

export function safeArtworkUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  value = value.trim();
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}

export const COMPACT_SLOT_DEFAULTS=Object.freeze({borderColor:'#526672'});
export function currentSlotConfig(config = {}) {
  return { ...CURRENT_SLOT_DEFAULTS, ...(config.displayStyle==='portrait_compact'?COMPACT_SLOT_DEFAULTS:{}), ...config, backgroundOpacity: Math.max(0, Math.min(0.6, Number(config.backgroundOpacity ?? 0.24) || 0)) };
}

// Explicit current-game/variant metadata takes precedence over catalogue defaults.
export function resolveCurrentSlotMetadata(selected, catalog) {
  return { ...(catalog || {}), ...Object.fromEntries(Object.entries(selected).filter(([,value])=>value !== undefined && value !== null && value !== '')) };
}

export function slotMetric(value, suffix = '') {
  if (value === undefined || value === null || value === '' || !Number.isFinite(Number(value))) return '—';
  return `${Number(value).toLocaleString(undefined,{maximumFractionDigits:2})}${suffix}`;
}

const text = label=>({label,kind:'text',capabilities:['typography']});
const surface = label=>({label,kind:'container',capabilities:['surface','border','spacing']});
const portraitElements={container:surface('Portrait frame'),coverFrame:surface('Artwork area'),slotImage:{label:'Slot cover',kind:'image',capabilities:['image']},slotTitle:text('Title for clean artwork'),provider:text('Provider for clean artwork'),info:surface('Statistics surface'),...Object.fromEntries(['potential','rtp','volatility','bestMulti'].flatMap(id=>[[id,surface(id+' row')],[id+'Label',text(id+' label')],[id+'Value',text(id+' value')]]))};
export const COMPACT_CURRENT_SLOT_STYLE=Object.freeze({id:'portrait_compact',label:'Portrait',description:'Compact 145 × 370 cover with four broadcast statistics.',strictElementIds:true,elementIds:Object.keys(portraitElements),elements:portraitElements,capabilities:{colours:true,fonts:true,fontSizes:true,borders:true,images:true,imageFit:true,opacity:true}});
