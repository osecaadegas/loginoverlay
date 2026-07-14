/**
 * slotRecordService.js — Per-user slot records tracking.
 * Called when a bonus hunt is saved to update individual slot stats.
 */
import { supabase } from '../config/supabaseClient';

function cleanText(value) {
  return (value ?? '').toString().trim();
}

function normaliseText(value) {
  return cleanText(value).replace(/\s+/g, ' ').toLowerCase();
}

function normalizeUuid(value) {
  const text = cleanText(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function escapeIlikePattern(value) {
  return cleanText(value).replace(/[\\%_]/g, '\\$&');
}

export function getSlotIdentity(slotLike = {}) {
  const nested = slotLike.slot || {};
  return {
    id: cleanText(slotLike.slotId || slotLike.slot_id || slotLike.id || nested.id || nested.slot_id),
    name: cleanText(slotLike.slotName || slotLike.slot_name || slotLike.name || nested.name || nested.slotName),
    provider: cleanText(slotLike.provider || slotLike.slot_provider || nested.provider || nested.slot_provider),
    image: cleanText(slotLike.imageUrl || slotLike.slot_image || slotLike.image || nested.image || nested.imageUrl || nested.slot_image),
  };
}

export function recordMatchesSlot(record, slotLike = {}) {
  const slot = getSlotIdentity(slotLike);
  if (!record || (!slot.id && !slot.name)) return false;
  if (slot.id && record.slot_id) return record.slot_id === slot.id;
  if (slot.name && normaliseText(record.slot_name) !== normaliseText(slot.name)) return false;
  if (slot.provider && record.slot_provider) {
    return normaliseText(record.slot_provider) === normaliseText(slot.provider);
  }
  return true;
}

export async function findUserSlotRecord(userId, slotLike = {}, columns = '*') {
  const slot = getSlotIdentity(slotLike);
  const slotId = normalizeUuid(slot.id);
  if (!userId || (!slot.id && !slot.name)) return null;

  const base = () => supabase
    .from('user_slot_records')
    .select(columns)
    .eq('user_id', userId);

  if (slotId) {
    const { data, error } = await base()
      .eq('slot_id', slotId)
      .limit(1)
      .maybeSingle();
    if (!error && data) return data;
  }

  if (slot.name && slot.provider) {
    const { data, error } = await base()
      .ilike('slot_name', escapeIlikePattern(slot.name))
      .ilike('slot_provider', escapeIlikePattern(slot.provider))
      .limit(1)
      .maybeSingle();
    if (!error && data) return data;
  }

  if (slot.name) {
    const { data, error } = await base()
      .ilike('slot_name', escapeIlikePattern(slot.name))
      .order('updated_at', { ascending: false })
      .limit(2);
    if (!error && data?.length === 1) return data[0];
  }

  return null;
}

function buildResultFromBonus(bonus = {}, huntName = null) {
  const slotIdentity = getSlotIdentity(bonus);
  const payout = Number(bonus.payout) || Number(bonus.result) || 0;
  const bet = Number(bonus.betSize) || Number(bonus.bet_size) || 0;
  const multiplier = bet > 0 ? Math.round((payout / bet) * 100) / 100 : 0;

  if (!slotIdentity.name || payout <= 0) return null;

  return {
    slot_id: normalizeUuid(slotIdentity.id),
    slot_name: slotIdentity.name,
    slot_provider: slotIdentity.provider || null,
    slot_image: slotIdentity.image || null,
    bet_size: bet,
    payout,
    multiplier,
    hunt_name: huntName || null,
  };
}

function shapeBestWinRecord(result, existing = {}) {
  const bestWin = Math.max(Number(existing.best_win || 0), Number(result.payout || 0));
  const bestMultiplier = Math.max(Number(existing.best_multiplier || 0), Number(result.multiplier || 0));

  return {
    slot_id: result.slot_id || existing.slot_id || null,
    slot_name: result.slot_name || existing.slot_name,
    slot_provider: result.slot_provider || existing.slot_provider || null,
    slot_image: result.slot_image || existing.slot_image || null,
    best_win: bestWin,
    best_multiplier: bestMultiplier,
    last_bet_size: result.bet_size,
    last_payout: result.payout,
    last_multi: result.multiplier,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Store the current personal best for one slot without incrementing aggregate
 * totals. This is safe to call while a payout field is edited; the full hunt
 * history updater remains responsible for totals and result logs.
 */
export async function saveSlotPersonalBestFromBonus(userId, bonus, huntName) {
  if (!userId) return null;

  const result = buildResultFromBonus(bonus, huntName);
  if (!result) return null;

  const existing = await findUserSlotRecord(userId, {
    slotId: result.slot_id,
    slotName: result.slot_name,
    provider: result.slot_provider,
  });
  const bestRecord = shapeBestWinRecord(result, existing || {});

  if (existing) {
    const { data, error } = await supabase
      .from('user_slot_records')
      .update(bestRecord)
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select('slot_id, slot_name, slot_provider, slot_image, best_win, best_multiplier, last_bet_size, last_payout, last_multi')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('user_slot_records')
    .insert({
      user_id: userId,
      ...bestRecord,
      total_bonuses: 0,
      total_wagered: 0,
      total_won: 0,
      average_multi: 0,
    })
    .select('slot_id, slot_name, slot_provider, slot_image, best_win, best_multiplier, last_bet_size, last_payout, last_multi')
    .single();
  if (error) throw error;
  return data;
}

export async function hydrateSlotPersonalBestFromHistory(userId, slotLike = {}) {
  const slot = getSlotIdentity(slotLike);
  if (!userId || (!slot.id && !slot.name)) return null;

  const { data, error } = await supabase
    .from('bonus_hunt_history')
    .select('hunt_name, bonuses, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(250);

  if (error) throw error;

  let best = null;
  for (const hunt of data || []) {
    const bonuses = Array.isArray(hunt.bonuses) ? hunt.bonuses : [];
    for (const bonus of bonuses) {
      const result = buildResultFromBonus(bonus, hunt.hunt_name);
      if (!result) continue;
      if (!recordMatchesSlot(result, slot)) continue;
      if (
        !best
        || Number(result.payout) > Number(best.payout)
        || (Number(result.payout) === Number(best.payout) && Number(result.multiplier) > Number(best.multiplier))
      ) {
        best = result;
      }
    }
  }

  return best ? saveSlotPersonalBestFromBonus(userId, {
    slotId: best.slot_id,
    slotName: best.slot_name,
    provider: best.slot_provider,
    imageUrl: best.slot_image,
    betSize: best.bet_size,
    payout: best.payout,
    opened: true,
  }, best.hunt_name) : null;
}

/**
 * Process all opened bonuses from a hunt and update per-user slot records.
 * @param {string} userId
 * @param {Array} bonuses — array of bonus objects from the hunt
 * @param {string} huntName — name of the hunt for logging
 */
export async function updateSlotRecordsFromHunt(userId, bonuses, huntName) {
  if (!userId || !bonuses?.length) return;

  const opened = bonuses.filter(b => b.opened && (Number(b.payout) || 0) > 0);
  if (opened.length === 0) return;

  for (const bonus of opened) {
    const slotIdentity = getSlotIdentity(bonus);
    const slotId = normalizeUuid(slotIdentity.id);
    const slotName = slotIdentity.name;
    if (!slotName) continue;

    const bet = Number(bonus.betSize) || 0;
    const pay = Number(bonus.payout) || Number(bonus.result) || 0;
    const multi = bet > 0 ? Math.round((pay / bet) * 100) / 100 : 0;

    try {
      // 1. Insert individual result log
      await supabase.from('user_slot_results').insert({
        user_id: userId,
        slot_name: slotName,
        slot_provider: slotIdentity.provider || null,
        bet_size: bet,
        payout: pay,
        multiplier: multi,
        hunt_name: huntName || null,
        is_super_bonus: bonus.isSuperBonus || false,
      });

      // 2. Upsert aggregate record
      const existing = await findUserSlotRecord(userId, slotIdentity);

      if (existing) {
        const newTotal = (existing.total_bonuses || 0) + 1;
        const newWagered = Number(existing.total_wagered || 0) + bet;
        const newWon = Number(existing.total_won || 0) + pay;
        const newBestMulti = Math.max(Number(existing.best_multiplier || 0), multi);
        const newBestWin = Math.max(Number(existing.best_win || 0), pay);
        // Running average: ((old_avg * old_count) + new_multi) / new_count
        const newAvg = Math.round(((Number(existing.average_multi || 0) * (newTotal - 1) + multi) / newTotal) * 100) / 100;

        await supabase.from('user_slot_records')
          .update({
            total_bonuses: newTotal,
            total_wagered: newWagered,
            total_won: newWon,
            best_multiplier: newBestMulti,
            best_win: newBestWin,
            average_multi: newAvg,
            last_bet_size: bet,
            last_payout: pay,
            last_multi: multi,
            slot_id: slotId || existing.slot_id || null,
            slot_provider: slotIdentity.provider || existing.slot_provider,
            slot_image: slotIdentity.image || existing.slot_image,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .eq('user_id', userId);
      } else {
        await supabase.from('user_slot_records').insert({
          user_id: userId,
          slot_id: slotId || null,
          slot_name: slotName,
          slot_provider: slotIdentity.provider || null,
          slot_image: slotIdentity.image || null,
          total_bonuses: 1,
          total_wagered: bet,
          total_won: pay,
          best_multiplier: multi,
          best_win: pay,
          average_multi: multi,
          last_bet_size: bet,
          last_payout: pay,
          last_multi: multi,
        });
      }
    } catch (err) {
      // Don't break the hunt save if records fail — just log
      console.warn(`Failed to update slot record for "${slotName}":`, err?.message);
    }
  }
}
