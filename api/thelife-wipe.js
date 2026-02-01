import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  
  // Verify the user is an admin
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Check if user is admin
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { wipeSettings } = req.body;
  if (!wipeSettings) {
    return res.status(400).json({ error: 'Wipe settings required' });
  }

  const results = [];

  try {
    // Execute wipes based on settings - using admin client to bypass RLS
    if (wipeSettings.wipe_inventory) {
      const { error } = await supabaseAdmin.from('the_life_player_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_inventory', success: !error, error: error?.message });
    }

    if (wipeSettings.wipe_cash) {
      const { error } = await supabaseAdmin.from('the_life_players').update({ cash: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_cash', success: !error, error: error?.message });
    }

    if (wipeSettings.wipe_bank) {
      const { error } = await supabaseAdmin.from('the_life_players').update({ bank_balance: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_bank', success: !error, error: error?.message });
    }

    if (wipeSettings.wipe_level) {
      const { error } = await supabaseAdmin.from('the_life_players').update({ level: 1, xp: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_level', success: !error, error: error?.message });
    }

    if (wipeSettings.wipe_skills) {
      const { error } = await supabaseAdmin.from('the_life_players').update({ power: 1, defense: 1, intelligence: 1 }).neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_skills', success: !error, error: error?.message });
    }

    if (wipeSettings.wipe_businesses) {
      await supabaseAdmin.from('the_life_player_businesses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('the_life_businesses').update({ 
        owner_id: null, 
        purchased_at: null,
        last_production: null,
        stored_product: 0
      }).neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_businesses', success: true });
    }

    if (wipeSettings.wipe_upgrades) {
      const { error } = await supabaseAdmin.from('the_life_players').update({ 
        power_level: 1, defense_level: 1, intelligence_level: 1,
        max_hp: 100, max_stamina: 100
      }).neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_upgrades', success: !error, error: error?.message });
    }

    if (wipeSettings.wipe_brothel_workers) {
      await supabaseAdmin.from('the_life_player_brothel_workers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('the_life_player_workers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('the_life_brothels').update({ 
        additional_slots: 0, 
        slots_upgrade_cost: 50000,
        workers: 0,
        income_per_hour: 0,
        last_collection: new Date().toISOString()
      }).neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_brothel_workers', success: true });
    }

    if (wipeSettings.wipe_stocks) {
      await supabaseAdmin.from('the_life_stock_portfolios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('the_life_stock_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('the_life_player_stocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_stocks', success: true });
    }

    if (wipeSettings.wipe_addiction) {
      const { error } = await supabaseAdmin.from('the_life_players').update({ addiction: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_addiction', success: !error, error: error?.message });
    }

    if (wipeSettings.wipe_health_stamina) {
      const { data: players } = await supabaseAdmin.from('the_life_players').select('id, max_hp, max_stamina');
      if (players) {
        for (const p of players) {
          await supabaseAdmin.from('the_life_players').update({ hp: p.max_hp, stamina: p.max_stamina }).eq('id', p.id);
        }
      }
      results.push({ action: 'wipe_health_stamina', success: true });
    }

    if (wipeSettings.wipe_jail_hospital) {
      const { error } = await supabaseAdmin.from('the_life_players').update({ jail_until: null, hospital_until: null }).neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_jail_hospital', success: !error, error: error?.message });
    }

    if (wipeSettings.wipe_pvp_stats) {
      const { error } = await supabaseAdmin.from('the_life_players').update({ pvp_wins: 0, pvp_losses: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_pvp_stats', success: !error, error: error?.message });
    }

    if (wipeSettings.wipe_cooldowns) {
      const { error } = await supabaseAdmin.from('the_life_players').update({ 
        last_crime: null, 
        last_robbery: null,
        last_daily_wheel: null
      }).neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_cooldowns', success: !error, error: error?.message });
    }

    if (wipeSettings.wipe_docks) {
      await supabaseAdmin.from('the_life_dock_deliveries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error } = await supabaseAdmin.from('the_life_players').update({ 
        dock_xp: 0, 
        dock_level: 1,
        dock_deliveries: 0
      }).neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_docks', success: !error, error: error?.message });
    }

    if (wipeSettings.wipe_game_leaderboard) {
      await supabaseAdmin.from('game_leaderboard').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('game_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      results.push({ action: 'wipe_game_leaderboard', success: true });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Wipe executed successfully',
      results 
    });

  } catch (error) {
    console.error('Wipe error:', error);
    return res.status(500).json({ 
      error: 'Wipe failed', 
      details: error.message,
      results 
    });
  }
}
