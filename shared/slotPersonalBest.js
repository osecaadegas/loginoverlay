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
        const highestMultiplier = Math.max(Number(best?.best_multiplier || 0), result.multiplier);
        best = pickPersonalBest([best, {
          slot_id: result.slot_id, slot_name: result.slot_name, slot_provider: result.slot_provider,
          best_win: result.payout, best_multiplier: result.multiplier,
        }]);
        best.best_multiplier = highestMultiplier;
      }
    }
    if (!data || data.length < pageSize) return best;
  }
}

async function readLegacyPersonalBest(client, userId, slotLike) {
  const record = await queryUserSlotRecord(client, userId, slotLike,
    'slot_id, slot_name, slot_provider, best_win, best_multiplier');
  if (Number(record?.best_win) > 0 && recordMatchesSlot(record, slotLike)) return record;
  // Reading a best must never require INSERT/UPDATE permission or successful hydration.
  return findSlotPersonalBestInHistory(client, userId, slotLike);
}

// Both Bonus Hunt and Current Game append to this existing, owner-scoped ledger.
export async function readSlotResults(client, userId, slotLike) {
  const slot = getSlotIdentity(slotLike);
  if (!userId || !slot.name) return [];
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    let query = client.from('user_slot_results')
      .select('id, slot_name, slot_provider, bet_size, payout, multiplier, hunt_name, created_at')
      .eq('user_id', userId).ilike('slot_name', escapeIlikePattern(slot.name))
      .order('created_at', { ascending: false }).order('id').range(offset, offset + 999);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []).filter(row => recordMatchesSlot(row, slot)));
    if (!data || data.length < 1000) return rows;
  }
}

export function combineSlotResults(legacy, results, slotLike) {
  const slot = getSlotIdentity(slotLike);
  const rows = results.filter(row => recordMatchesSlot(row, slot) && Number.isFinite(Number(row.payout)) && Number(row.payout) >= 0 && Number(row.bet_size) > 0);
  if (!rows.length) return legacy;
  const win = rows.reduce((a, b) => Number(b.payout) > Number(a.payout) ? b : a);
  const multi = rows.reduce((a, b) => Number(b.multiplier) > Number(a.multiplier) ? b : a);
  const bestWin = Math.max(Number(legacy?.best_win || 0), Number(win.payout));
  const bestMultiplier = Math.max(Number(legacy?.best_multiplier || 0), Number(multi.multiplier));
  return {
    slot_id: normalizeUuid(slot.id), slot_name: slot.name, slot_provider: slot.provider || null,
    best_win: bestWin, best_multiplier: bestMultiplier,
    best_win_bet: Number(win.payout) === bestWin ? Number(win.bet_size) : null,
    best_multiplier_bet: Number(multi.multiplier) === bestMultiplier ? Number(multi.bet_size) : null,
    average_win: rows.reduce((sum, row) => sum + Number(row.payout), 0) / rows.length,
    average_bet: rows.reduce((sum, row) => sum + Number(row.bet_size), 0) / rows.length,
    result_count: rows.length,
  };
}

export async function readSlotPersonalBest(client, userId, slotLike) {
  const [legacy, results] = await Promise.all([
    readLegacyPersonalBest(client, userId, slotLike), readSlotResults(client, userId, slotLike),
  ]);
  return combineSlotResults(legacy, results, slotLike);
}

export function buildCurrentGameResult(userId, slotLike, betSize, payout, resultId) {
  const slot = getSlotIdentity(slotLike);
  const bet = Number(betSize), pay = Number(payout);
  if (!userId || !normalizeUuid(resultId) || !normalizeUuid(slot.id) || !slot.name) throw new Error('Select a catalog slot before saving.');
  if (String(betSize).trim() === '' || String(payout).trim() === '' || !Number.isFinite(bet) || bet < 0.01 || bet >= 100000000 || !Number.isFinite(pay) || pay < 0 || pay >= 10000000000) throw new Error('Enter a positive bet and a payout of zero or more.');
  if (Math.abs(bet * 100 - Math.round(bet * 100)) > 0.00001 || Math.abs(pay * 100 - Math.round(pay * 100)) > 0.00001) throw new Error('Use at most two decimal places for bet and payout.');
  const multiplier = Math.round(pay / bet * 100) / 100;
  if (multiplier >= 100000000) throw new Error('The multiplier is outside the supported range.');
  return { id: resultId, user_id: userId, slot_name: slot.name, slot_provider: slot.provider || null,
    bet_size: Math.round(bet * 100) / 100, payout: Math.round(pay * 100) / 100, multiplier,
    hunt_name: 'Current Game', is_super_bonus: false };
}

export async function persistCurrentGameResult(client, result) {
  const { error } = await client.from('user_slot_results').insert(result);
  if (!error) return result;
  if (error.code !== '23505') throw error;
  // An uncertain network response can be retried with the same ID without duplicating a payment.
  const { data, error: readError } = await client.from('user_slot_results').select('*')
    .eq('id', result.id).eq('user_id', result.user_id).maybeSingle();
  if (readError) throw readError;
  if (!data || ['slot_name', 'slot_provider', 'bet_size', 'payout', 'multiplier'].some(key => String(data[key]) !== String(result[key]))) throw new Error('This result ID has already been used. Reload before saving a different result.');
  return data;
}
