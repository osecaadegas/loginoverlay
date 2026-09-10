const cleanText = (value) => (value ?? '').toString().trim();
const normaliseText = (value) => cleanText(value).replace(/\s+/g, ' ').toLowerCase();
const escapeIlikePattern = (value) => cleanText(value).replace(/[\\%_]/g, '\\$&');

export function normalizeUuid(value) {
  const text = cleanText(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text : null;
}

export function getSlotIdentity(slotLike = {}) {
  const nested = slotLike.slot || {};
  return {
    // A bonus has its own row ID, distinct from the catalogue slot ID.
    id: cleanText(slotLike.slotId || slotLike.slot_id || nested.id || nested.slot_id || slotLike.id),
    name: cleanText(slotLike.slotName || slotLike.slot_name || slotLike.name || nested.name || nested.slotName || (typeof nested === 'string' ? nested : '')),
    provider: cleanText(slotLike.provider || slotLike.slot_provider || nested.provider || nested.slot_provider),
    image: cleanText(slotLike.imageUrl || slotLike.slot_image || slotLike.image || nested.image || nested.imageUrl || nested.slot_image),
  };
}

export function recordMatchesSlot(record, slotLike = {}) {
  const slot = getSlotIdentity(slotLike);
  if (!record || (!slot.id && !slot.name)) return false;
  if (slot.id && record.slot_id) return record.slot_id === slot.id;
  if (!slot.name || normaliseText(record.slot_name) !== normaliseText(slot.name)) return false;
  return !slot.provider || !record.slot_provider || normaliseText(record.slot_provider) === normaliseText(slot.provider);
}

export async function queryUserSlotRecord(client, userId, slotLike = {}, columns = '*') {
  const slot = getSlotIdentity(slotLike);
  const slotId = normalizeUuid(slot.id);
  if (!userId || (!slotId && !slot.name)) return null;
  const base = () => client.from('user_slot_records').select(columns).eq('user_id', userId);
  if (slotId) {
    const { data, error } = await base().eq('slot_id', slotId).order('best_win', { ascending: false }).limit(1).maybeSingle();
    if (!error && data) return data;
  }
  if (slot.name && slot.provider) {
    const { data, error } = await base().ilike('slot_name', escapeIlikePattern(slot.name))
      .ilike('slot_provider', escapeIlikePattern(slot.provider)).order('best_win', { ascending: false }).limit(1).maybeSingle();
    if (!error && data) return data;
  }
  if (slot.name) {
    const { data, error } = await base().ilike('slot_name', escapeIlikePattern(slot.name))
      .order('updated_at', { ascending: false }).limit(2);
    if (!error && data?.length === 1) return data[0];
  }
  return null;
}

export function buildResultFromBonus(bonus = {}, huntName = null) {
  const slot = getSlotIdentity(bonus);
  const payout = Number(bonus.payout) || Number(bonus.result) || 0;
  const bet = Number(bonus.betSize) || Number(bonus.bet_size) || Number(bonus.bet) || Number(bonus.buy) || 0;
  if (!slot.name || !Number.isFinite(payout) || payout <= 0) return null;
  return {
    slot_id: normalizeUuid(slot.id), slot_name: slot.name,
    slot_provider: slot.provider || null, slot_image: slot.image || null,
    bet_size: bet, payout,
    multiplier: bet > 0 ? Math.round((payout / bet) * 100) / 100 : 0,
    hunt_name: huntName || null,
  };
}

export function pickPersonalBest(records) {
  return records.filter((record) => Number(record?.best_win) > 0)
    .sort((a, b) => Number(b.best_win) - Number(a.best_win) || Number(b.best_multiplier) - Number(a.best_multiplier))[0] || null;
}

export async function findSlotPersonalBestInHistory(client, userId, slotLike) {
  const slot = getSlotIdentity(slotLike);
  if (!userId || (!slot.id && !slot.name)) return null;
  let best = null;
  const pageSize = 50;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from('bonus_hunt_history').select('bonuses')
      .eq('user_id', userId).order('created_at', { ascending: false }).order('id')
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    for (const hunt of data || []) {
      for (const bonus of Array.isArray(hunt.bonuses) ? hunt.bonuses : []) {
        const result = buildResultFromBonus(bonus);
        if (!result || !recordMatchesSlot(result, slot)) continue;
        best = pickPersonalBest([best, {
          slot_id: result.slot_id, slot_name: result.slot_name, slot_provider: result.slot_provider,
          best_win: result.payout, best_multiplier: result.multiplier,
        }]);
      }
    }
    if (!data || data.length < pageSize) return best;
  }
}

export async function readSlotPersonalBest(client, userId, slotLike) {
  const record = await queryUserSlotRecord(client, userId, slotLike,
    'slot_id, slot_name, slot_provider, best_win, best_multiplier');
  if (Number(record?.best_win) > 0 && recordMatchesSlot(record, slotLike)) return record;
  // Reading a best must never require INSERT/UPDATE permission or successful hydration.
  return findSlotPersonalBestInHistory(client, userId, slotLike);
}
