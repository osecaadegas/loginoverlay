import { createSupabaseAdmin, setCors } from '../api-auth.js';
import { findSlotPersonalBestInHistory, getSlotIdentity, queryUserSlotRecord, recordMatchesSlot } from '../../../shared/slotPersonalBest.js';

const PUBLIC_ID = /^bo_[a-f0-9]{48}$/i;
const LEGACY_TOKEN = /^[a-f0-9]{48}$/i;
const historyCache = new Map();

export async function loadOverlayPersonalBest(req, client) {
  const publicOverlayId = String(req.query.publicOverlayId || '');
  const overlayToken = String(req.query.overlayToken || '');
  const isPublication = PUBLIC_ID.test(publicOverlayId) && !overlayToken;
  const isLegacy = LEGACY_TOKEN.test(overlayToken) && !publicOverlayId;
  const slot = getSlotIdentity(req.query);
  if ((!isPublication && !isLegacy) || (!slot.name && !slot.id) ||
      slot.name.length > 300 || slot.provider.length > 200 || slot.id.length > 100) {
    return { status: 400, body: { error: 'Invalid overlay or slot' } };
  }

  // Resolve ownership from an active secret URL, never from a caller-supplied user ID.
  const query = isPublication
    ? client.from('better_overlay_publications').select('owner_user_id')
      .eq('public_overlay_id', publicOverlayId).is('revoked_at', null)
    : client.from('overlay_instances').select('user_id')
      .eq('overlay_token', overlayToken).eq('is_active', true);
  const { data: overlay, error } = await query.maybeSingle();
  if (error) throw error;
  const ownerId = overlay?.owner_user_id || overlay?.user_id;
  if (!ownerId) return { status: 404, body: { error: 'Overlay not found' } };

  let best = await queryUserSlotRecord(client, ownerId, slot,
    'slot_id, slot_name, slot_provider, best_win, best_multiplier');
  if (!(Number(best?.best_win) > 0 && recordMatchesSlot(best, slot))) {
    const key = JSON.stringify([ownerId, slot.id, slot.name, slot.provider]);
    const cached = historyCache.get(key);
    best = cached?.expiresAt > Date.now() ? cached.best : undefined;
    if (best === undefined) {
      best = await findSlotPersonalBestInHistory(client, ownerId, slot);
      // Cache the expensive fallback, but always check for a newly saved aggregate.
      if (historyCache.size >= 500) historyCache.delete(historyCache.keys().next().value);
      historyCache.set(key, { best, expiresAt: Date.now() + 300_000 });
    }
  }
  return { status: 200, body: { best } };
}

export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = await loadOverlayPersonalBest(req, createSupabaseAdmin());
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[slot-personal-best] Lookup failed:', error?.message);
    return res.status(500).json({ error: 'Failed to load personal best' });
  }
}
