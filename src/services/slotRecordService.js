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

function escapeIlikePattern(value) {
  return cleanText(value).replace(/[\\%_]/g, '\\$&');
}

export function getSlotIdentity(slotLike = {}) {
  const nested = slotLike.slot || {};
  return {
    id: cleanText(slotLike.slotId || slotLike.slot_id || nested.id || nested.slot_id),
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
  if (!userId || (!slot.id && !slot.name)) return null;

  const base = () => supabase
    .from('user_slot_records')
    .select(columns)
    .eq('user_id', userId);

  if (slot.id) {
    const { data, error } = await base()
      .eq('slot_id', slot.id)
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
            slot_id: slotIdentity.id || existing.slot_id || null,
            slot_provider: slotIdentity.provider || existing.slot_provider,
            slot_image: slotIdentity.image || existing.slot_image,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('user_slot_records').insert({
          user_id: userId,
          slot_id: slotIdentity.id || null,
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
