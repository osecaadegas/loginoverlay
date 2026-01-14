import { supabase } from '../config/supabaseClient';

// ==================== USER OVERLAY STATE ====================

export async function getUserOverlayState(userId) {
  const { data, error } = await supabase
    .from('user_overlay_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching user overlay state:', error);
    return null;
  }

  return data;
}

export async function upsertUserOverlayState(userId, state) {
  const { data, error } = await supabase
    .from('user_overlay_state')
    .upsert({
      user_id: userId,
      ...state,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting user overlay state:', error);
    throw error;
  }

  return data;
}

export async function updateOverlayBonuses(userId, bonuses, stats) {
  return await upsertUserOverlayState(userId, {
    bonuses: bonuses,
    total_cost: stats.totalCost,
    total_payout: stats.totalPayout,
    hunt_multiplier: stats.huntMultiplier,
    hunt_started: stats.huntStarted
  });
}

export async function updateCurrentOpeningBonus(userId, bonus) {
  return await upsertUserOverlayState(userId, {
    current_opening_bonus: bonus
  });
}

export async function updateCustomization(userId, customization) {
  return await upsertUserOverlayState(userId, customization);
}

// ==================== USER TOURNAMENTS ====================

export async function getUserTournament(userId) {
  const { data, error } = await supabase
    .from('user_tournaments')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user tournament:', error);
    return null;
  }

  return data;
}

export async function upsertUserTournament(userId, tournament) {
  const { data, error } = await supabase
    .from('user_tournaments')
    .upsert({
      user_id: userId,
      ...tournament,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting user tournament:', error);
    throw error;
  }

  return data;
}

export async function deleteTournament(userId) {
  const { error } = await supabase
    .from('user_tournaments')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting tournament:', error);
    throw error;
  }
}

// ==================== USER GIVEAWAYS ====================

export async function getUserGiveaway(userId) {
  const { data, error } = await supabase
    .from('user_giveaways')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user giveaway:', error);
    return null;
  }

  return data;
}

export async function upsertUserGiveaway(userId, giveaway) {
  const { data, error } = await supabase
    .from('user_giveaways')
    .upsert({
      user_id: userId,
      ...giveaway,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting user giveaway:', error);
    throw error;
  }

  return data;
}

export async function deleteGiveaway(userId) {
  const { error } = await supabase
    .from('user_giveaways')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting giveaway:', error);
    throw error;
  }
}

// ==================== USER RANDOM SLOT ====================

export async function getUserRandomSlot(userId) {
  const { data, error } = await supabase
    .from('user_random_slot')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user random slot:', error);
    return null;
  }

  return data;
}

export async function upsertUserRandomSlot(userId, randomSlotState) {
  const { data, error } = await supabase
    .from('user_random_slot')
    .upsert({
      user_id: userId,
      ...randomSlotState,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting user random slot:', error);
    throw error;
  }

  return data;
}

// ==================== REAL-TIME SUBSCRIPTIONS ====================
// ⚠️ DISABLED TO REDUCE EGRESS - Use polling instead

export function subscribeToOverlayState(userId, callback) {
  // REALTIME DISABLED - Implement polling in your component instead
  console.warn('subscribeToOverlayState: Realtime disabled for egress reduction. Use polling.');
  return { unsubscribe: () => {} };
  
  /* ORIGINAL REALTIME CODE (DISABLED):
  const subscription = supabase
    .channel(`overlay_state_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_overlay_state',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return subscription;
  */
}

export function subscribeToTournament(userId, callback) {
  // REALTIME DISABLED - Use polling instead
  console.warn('subscribeToTournament: Realtime disabled for egress reduction');
  return { unsubscribe: () => {} };
}

export function subscribeToGiveaway(userId, callback) {
  // REALTIME DISABLED - Use polling instead
  console.warn('subscribeToGiveaway: Realtime disabled for egress reduction');
  return { unsubscribe: () => {} };
}

export function subscribeToRandomSlot(userId, callback) {
  // REALTIME DISABLED - Use polling instead
  console.warn('subscribeToRandomSlot: Realtime disabled for egress reduction');
  return { unsubscribe: () => {} };
  
  /* ORIGINAL CODE (DISABLED):
  const subscription = supabase
    .channel(`random_slot_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_random_slot',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return subscription;
  */
}

export function unsubscribe(subscription) {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
}
