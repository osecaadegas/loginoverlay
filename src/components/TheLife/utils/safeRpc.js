import { supabase } from '../../../config/supabaseClient';

/**
 * Call an RPC function with automatic fallback to direct DB update if the function doesn't exist.
 * This handles the case where the SQL migration hasn't been run yet.
 * Error code 42883 = "function does not exist" in PostgreSQL.
 */

/**
 * Adjust player cash via RPC, with fallback to direct update.
 * @param {number} amount - positive to add, negative to deduct
 * @param {object} player - current player state (for fallback)
 * @param {string} userId - auth user id (for fallback)
 * @returns {{ success: boolean, player?: object, error?: string }}
 */
export async function adjustPlayerCash(amount, player, userId) {
  // Try RPC first
  const { data, error } = await supabase.rpc('adjust_player_cash', { p_amount: amount });
  
  if (error && error.code === '42883') {
    // RPC doesn't exist yet — fallback to direct update
    return await directCashUpdate(amount, player, userId);
  }
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  // data might be null if RPC exists but returned nothing
  if (!data) {
    return { success: false, error: 'No response from server' };
  }
  
  return data;
}

/**
 * Adjust player cash and stamina via RPC, with fallback.
 */
export async function adjustPlayerCashAndStamina(cashChange, staminaChange, player, userId) {
  const { data, error } = await supabase.rpc('adjust_player_cash_and_stamina', { 
    p_cash_change: cashChange, 
    p_stamina_change: staminaChange 
  });
  
  if (error && error.code === '42883') {
    // Fallback: do cash update + stamina update directly
    const newCash = (player.cash || 0) + cashChange;
    const newStamina = Math.max(0, Math.min((player.stamina || 0) + staminaChange, player.max_stamina || 300));
    
    if (newCash < 0) return { success: false, error: 'Insufficient cash' };
    if ((player.stamina || 0) + staminaChange < 0) return { success: false, error: 'Insufficient stamina' };
    
    const { data: updated, error: updateError } = await supabase
      .from('the_life_players')
      .update({ cash: newCash, stamina: newStamina, last_stamina_refill: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) return { success: false, error: updateError.message };
    return { success: true, player: updated, new_cash: newCash, new_stamina: newStamina };
  }
  
  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'No response from server' };
  return data;
}

/**
 * Upgrade player skill via RPC, with fallback.
 */
export async function upgradePlayerSkill(skillName, player, userId) {
  const { data, error } = await supabase.rpc('upgrade_player_skill', { p_skill_name: skillName });
  
  if (error && error.code === '42883') {
    // Fallback: calculate cost and update directly
    const currentLevel = player[skillName] || 0;
    const cost = Math.floor(500 * Math.pow(1.15, currentLevel));
    
    if (currentLevel >= 100) return { success: false, error: 'Skill already at max level (100)' };
    if (player.cash < cost) return { success: false, error: 'Insufficient cash', cost, current_cash: player.cash };

    const updates = { cash: player.cash - cost };
    updates[skillName] = currentLevel + 1;
    
    const { data: updated, error: updateError } = await supabase
      .from('the_life_players')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) return { success: false, error: updateError.message };
    return { 
      success: true, 
      player: updated, 
      skill: skillName, 
      new_level: currentLevel + 1, 
      cost, 
      new_cash: updated.cash 
    };
  }
  
  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'No response from server' };
  return data;
}

/**
 * Direct cash update fallback when RPC doesn't exist.
 */
async function directCashUpdate(amount, player, userId) {
  const newCash = (player.cash || 0) + amount;
  if (newCash < 0) {
    return { success: false, error: 'Insufficient cash' };
  }
  
  const { data: updated, error: updateError } = await supabase
    .from('the_life_players')
    .update({ cash: newCash })
    .eq('user_id', userId)
    .select()
    .single();
  
  if (updateError) {
    return { success: false, error: updateError.message };
  }
  
  return { success: true, new_cash: updated.cash, player: updated };
}
