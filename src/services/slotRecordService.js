/**
 * slotRecordService.js — Per-user slot records tracking.
 * Called when a bonus hunt is saved to update individual slot stats.
 */
import { supabase } from '../config/supabaseClient';

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
    const slotName = bonus.slotName || bonus.slot?.name;
    if (!slotName) continue;

    const bet = Number(bonus.betSize) || 0;
    const pay = Number(bonus.payout) || Number(bonus.result) || 0;
    const multi = bet > 0 ? Math.round((pay / bet) * 100) / 100 : 0;

    try {
      // 1. Insert individual result log
      await supabase.from('user_slot_results').insert({
        user_id: userId,
        slot_name: slotName,
        slot_provider: bonus.slot?.provider || null,
        bet_size: bet,
        payout: pay,
        multiplier: multi,
        hunt_name: huntName || null,
        is_super_bonus: bonus.isSuperBonus || false,
      });

      // 2. Upsert aggregate record
      const { data: existing } = await supabase
        .from('user_slot_records')
        .select('*')
        .eq('user_id', userId)
        .eq('slot_name', slotName)
        .maybeSingle();

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
            slot_provider: bonus.slot?.provider || existing.slot_provider,
            slot_image: bonus.slot?.image || existing.slot_image,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('user_slot_records').insert({
          user_id: userId,
          slot_id: bonus.slot?.id || null,
          slot_name: slotName,
          slot_provider: bonus.slot?.provider || null,
          slot_image: bonus.slot?.image || null,
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
