export const CURRENT_SLOT_DEFAULTS = Object.freeze({
  displayStyle: 'immersive_current', currency: '€', slot: null,
  artworkBySlot: {}, accentColor: '#28edac', backgroundColor: '#060d10',
  panelColor: '#010806', badgeColor: '#06231b', coverColor: '#050b0d',
  textColor: '#f3f6f5', mutedColor: '#94a6aa', borderColor: '#32695c',
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

export function currentSlotConfig(config = {}) {
  return { ...CURRENT_SLOT_DEFAULTS, ...config, backgroundOpacity: Math.max(0, Math.min(0.6, Number(config.backgroundOpacity ?? 0.24) || 0)) };
}
