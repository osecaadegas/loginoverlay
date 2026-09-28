import { createSupabaseAdmin, setCors } from '../api-auth.js';
import { findSlotPersonalBestInHistory, getSlotIdentity, queryUserSlotRecord, recordMatchesSlot } from '../../../shared/slotPersonalBest.js';

const PUBLIC_ID = /^bo_[a-f0-9]{48}$/i;
const LEGACY_TOKEN = /^[a-f0-9]{48}$/i;
const historyCache = new Map();

function validOverlayReference(publicOverlayId, overlayToken) {
  const isPublication = PUBLIC_ID.test(publicOverlayId) && !overlayToken;
  const isLegacy = LEGACY_TOKEN.test(overlayToken) && !publicOverlayId;
  return { isPublication, isLegacy, valid: isPublication || isLegacy };
}

async function resolveOverlayOwner(client, publicOverlayId, overlayToken) {
  const { isPublication, valid } = validOverlayReference(publicOverlayId, overlayToken);
  if (!valid) return { status: 400, ownerId: null };
  const query = isPublication
    ? client.from('better_overlay_publications').select('owner_user_id')
      .eq('public_overlay_id', publicOverlayId).is('revoked_at', null)
    : client.from('overlay_instances').select('user_id')
      .eq('overlay_token', overlayToken).eq('is_active', true);
  const { data: overlay, error } = await query.maybeSingle();
  if (error) throw error;
  return {
    status: overlay?.owner_user_id || overlay?.user_id ? 200 : 404,
    ownerId: overlay?.owner_user_id || overlay?.user_id || null,
  };
}

function validSlot(slot) {
  return Boolean(
    (slot.name || slot.id) &&
      slot.name.length <= 300 &&
      slot.provider.length <= 200 &&
      slot.id.length <= 100,
  );
}

async function loadOwnerPersonalBest(client, ownerId, slot) {
  let best = await queryUserSlotRecord(client, ownerId, slot,
    'slot_id, slot_name, slot_provider, best_win, best_multiplier');
  if (!(Number(best?.best_win) > 0 && recordMatchesSlot(best, slot))) {
    const key = JSON.stringify([ownerId, slot.id, slot.name, slot.provider]);
    const cached = historyCache.get(key);
    best = cached?.expiresAt > Date.now() ? cached.best : undefined;
    if (best === undefined) {
      best = await findSlotPersonalBestInHistory(client, ownerId, slot);
      if (historyCache.size >= 500) historyCache.delete(historyCache.keys().next().value);
      historyCache.set(key, { best, expiresAt: Date.now() + 300_000 });
    }
  }
  return best;
}

export async function loadOverlayPersonalBest(req, client) {
  const publicOverlayId = String(req.query.publicOverlayId || '');
  const overlayToken = String(req.query.overlayToken || '');
  const slot = getSlotIdentity(req.query);
  const reference = validOverlayReference(publicOverlayId, overlayToken);
  if (!reference.valid || !validSlot(slot)) {
    return { status: 400, body: { error: 'Invalid overlay or slot' } };
  }

  // Resolve ownership from an active secret URL, never from a caller-supplied user ID.
  const owner = await resolveOverlayOwner(client, publicOverlayId, overlayToken);
  if (!owner.ownerId) return { status: owner.status, body: { error: owner.status === 404 ? 'Overlay not found' : 'Invalid overlay' } };
  const best = await loadOwnerPersonalBest(client, owner.ownerId, slot);
  return { status: 200, body: { best } };
}

export async function loadOverlayPersonalBests(req, client) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const publicOverlayId = String(body.publicOverlayId || '');
  const overlayToken = String(body.overlayToken || '');
  const slots = Array.isArray(body.slots) ? body.slots.map(getSlotIdentity) : [];
  if (slots.length === 0 || slots.length > 40 || slots.some((slot) => !validSlot(slot))) {
    return { status: 400, body: { error: 'Invalid overlay or slots' } };
  }
  const owner = await resolveOverlayOwner(client, publicOverlayId, overlayToken);
  if (!owner.ownerId) return { status: owner.status, body: { error: owner.status === 404 ? 'Overlay not found' : 'Invalid overlay' } };

  const bests = [];
  for (let offset = 0; offset < slots.length; offset += 4) {
    const batch = slots.slice(offset, offset + 4);
    bests.push(...await Promise.all(
      batch.map((slot) => loadOwnerPersonalBest(client, owner.ownerId, slot)),
    ));
  }
  return { status: 200, body: { bests } };
}

export default async function handler(req, res) {
  setCors(res, 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  try {
    const client = createSupabaseAdmin();
    const result = req.method === 'POST'
      ? await loadOverlayPersonalBests(req, client)
      : await loadOverlayPersonalBest(req, client);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('[slot-personal-best] Lookup failed:', error?.message);
    return res.status(500).json({ error: 'Failed to load personal best' });
  }
}
