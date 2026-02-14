/**
 * PLAYER MANAGEMENT EDGE FUNCTION
 * Comprehensive admin tools for managing player accounts
 * 
 * Actions:
 * - search: Search players by username/ID/Twitch
 * - view: Get full player profile
 * - edit:money: Add/remove cash/bank
 * - edit:level: Change XP/level
 * - edit:inventory: Add/remove items
 * - edit:stats: Modify player stats
 * - ban:temp: Temporary ban (up to 7 days)
 * - ban:perm: Permanent ban
 * - unban: Remove ban
 * - reset:economy: Wipe player economy
 * - reset:inventory: Wipe player inventory
 * - reset:full: Full account wipe
 * - notes:add: Add internal note
 * - notes:view: View all notes
 * - rollback: Undo previous action
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  authenticateAdmin,
  requirePermission,
  checkQuota,
  logAction,
  createSnapshot,
  executeRollback,
  getSupabaseAdmin,
  type AdminContext
} from '../admin-middleware/index.ts';

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { action, ...params } = await req.json();

    // Authenticate admin
    const adminContext = await authenticateAdmin(req);

    // Route to handlers
    switch (action) {
      case 'search':
        return await handleSearch(supabase, adminContext, params);
      case 'view':
        return await handleView(supabase, adminContext, params);
      case 'edit:money':
        return await handleEditMoney(supabase, adminContext, params);
      case 'edit:level':
        return await handleEditLevel(supabase, adminContext, params);
      case 'edit:inventory':
        return await handleEditInventory(supabase, adminContext, params);
      case 'edit:stats':
        return await handleEditStats(supabase, adminContext, params);
      case 'ban:temp':
        return await handleTempBan(supabase, adminContext, params);
      case 'ban:perm':
        return await handlePermBan(supabase, adminContext, params);
      case 'unban':
        return await handleUnban(supabase, adminContext, params);
      case 'reset:economy':
        return await handleResetEconomy(supabase, adminContext, params);
      case 'reset:inventory':
        return await handleResetInventory(supabase, adminContext, params);
      case 'reset:full':
        return await handleResetFull(supabase, adminContext, params);
      case 'notes:add':
        return await handleAddNote(supabase, adminContext, params);
      case 'notes:view':
        return await handleViewNotes(supabase, adminContext, params);
      case 'rollback':
        return await handleRollback(supabase, adminContext, params);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Player management error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: error.message.includes('Access denied') ? 403 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// =====================================================
// SEARCH PLAYERS
// =====================================================

async function handleSearch(supabase: any, adminContext: AdminContext, params: any) {
  await requirePermission(supabase, adminContext, 'player:view');
  await checkQuota(supabase, adminContext, 'player:view');

  const { query, searchBy = 'username', limit = 50 } = params;

  if (!query) {
    throw new Error('Search query required');
  }

  let searchQuery = supabase
    .from('the_life_players')
    .select('id, username, level, cash, bank, is_banned, is_flagged, created_at, last_login')
    .limit(limit);

  // Search by different fields
  switch (searchBy) {
    case 'username':
      searchQuery = searchQuery.ilike('username', `%${query}%`);
      break;
    case 'id':
      searchQuery = searchQuery.eq('id', query);
      break;
    case 'twitch_id':
      searchQuery = searchQuery.eq('twitch_id', query);
      break;
    default:
      throw new Error('Invalid searchBy parameter');
  }

  const { data: players, error } = await searchQuery.order('created_at', { ascending: false });

  if (error) {
    throw new Error('Search failed: ' + error.message);
  }

  return new Response(JSON.stringify({ 
    success: true, 
    players,
    count: players.length
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// =====================================================
// VIEW PLAYER PROFILE
// =====================================================

async function handleView(supabase: any, adminContext: AdminContext, params: any) {
  await requirePermission(supabase, adminContext, 'player:view');
  await checkQuota(supabase, adminContext, 'player:view');

  const { playerId } = params;

  if (!playerId) {
    throw new Error('Player ID required');
  }

  // Get full player data
  const { data: player, error } = await supabase
    .from('the_life_players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (error || !player) {
    throw new Error('Player not found');
  }

  // Get inventory
  const { data: inventory } = await supabase
    .from('player_inventory')
    .select('*')
    .eq('player_id', playerId);

  // Get businesses
  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', playerId);

  // Get risk score
  const { data: riskScore } = await supabase
    .from('player_risk_scores')
    .select('*')
    .eq('player_id', playerId)
    .single();

  // Get recent alerts
  const { data: alerts } = await supabase
    .from('security_alerts')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get admin notes (if has permission)
  let notes = [];
  const canViewNotes = await hasPermission(supabase, adminContext.userId, 'player:notes:view');
  if (canViewNotes) {
    const { data: notesData } = await supabase
      .from('admin_notes')
      .select('*')
      .eq('player_id', playerId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    notes = notesData || [];
  }

  // Get recent actions
  const { data: recentActions } = await supabase
    .from('admin_actions')
    .select('*')
    .eq('target_player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(20);

  return new Response(JSON.stringify({ 
    success: true, 
    player: {
      ...player,
      inventory: inventory || [],
      businesses: businesses || [],
      riskScore: riskScore || null,
      alerts: alerts || [],
      notes: notes,
      recentActions: recentActions || []
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// =====================================================
// EDIT MONEY
// =====================================================

async function handleEditMoney(supabase: any, adminContext: AdminContext, params: any) {
  await requirePermission(supabase, adminContext, 'economy:edit:money');
  await checkQuota(supabase, adminContext, 'economy:edit:money');

  const { playerId, field, amount, reason } = params;

  if (!playerId || !field || amount === undefined || !reason) {
    throw new Error('Missing required parameters: playerId, field, amount, reason');
  }

  if (!['cash', 'bank'].includes(field)) {
    throw new Error('Field must be "cash" or "bank"');
  }

  // Get current state
  const { data: player } = await supabase
    .from('the_life_players')
    .select('id, username, cash, bank')
    .eq('id', playerId)
    .single();

  if (!player) {
    throw new Error('Player not found');
  }

  const beforeValue = { cash: player.cash, bank: player.bank };
  const newValue = player[field] + amount;

  // Validation
  if (newValue < 0) {
    throw new Error(`Cannot set ${field} to negative value`);
  }

  // Create snapshot for rollback
  const actionId = crypto.randomUUID();
  await createSnapshot(supabase, actionId, {
    player_id: playerId,
    tables: ['the_life_players'],
    data: {
      the_life_players: [player]
    }
  });

  // Update player
  const { error: updateError } = await supabase
    .from('the_life_players')
    .update({ [field]: newValue })
    .eq('id', playerId);

  if (updateError) {
    throw new Error('Failed to update player: ' + updateError.message);
  }

  const afterValue = { ...beforeValue, [field]: newValue };

  // Log action
  await logAction(supabase, adminContext, {
    actionType: 'economy:edit:money',
    actionCategory: 'economy',
    targetPlayerId: playerId,
    targetPlayerUsername: player.username,
    fieldChanged: field,
    beforeValue,
    afterValue,
    reason
  });

  return new Response(JSON.stringify({ 
    success: true, 
    message: `Updated ${field} by ${amount}`,
    before: beforeValue,
    after: afterValue
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// =====================================================
// EDIT LEVEL/XP
// =====================================================

async function handleEditLevel(supabase: any, adminContext: AdminContext, params: any) {
  await requirePermission(supabase, adminContext, 'player:edit:stats');
  await checkQuota(supabase, adminContext, 'player:edit:stats');

  const { playerId, level, xp, reason } = params;

  if (!playerId || (!level && !xp) || !reason) {
    throw new Error('Missing required parameters');
  }

  // Get current state
  const { data: player } = await supabase
    .from('the_life_players')
    .select('id, username, level, xp')
    .eq('id', playerId)
    .single();

  if (!player) {
    throw new Error('Player not found');
  }

  const beforeValue = { level: player.level, xp: player.xp };
  const updates: any = {};
  
  if (level !== undefined) updates.level = level;
  if (xp !== undefined) updates.xp = xp;

  // Create snapshot
  const actionId = crypto.randomUUID();
  await createSnapshot(supabase, actionId, {
    player_id: playerId,
    tables: ['the_life_players'],
    data: { the_life_players: [player] }
  });

  // Update
  const { error } = await supabase
    .from('the_life_players')
    .update(updates)
    .eq('id', playerId);

  if (error) {
    throw new Error('Failed to update: ' + error.message);
  }

  const afterValue = { ...beforeValue, ...updates };

  await logAction(supabase, adminContext, {
    actionType: 'player:edit:level',
    actionCategory: 'player',
    targetPlayerId: playerId,
    targetPlayerUsername: player.username,
    fieldChanged: 'level/xp',
    beforeValue,
    afterValue,
    reason
  });

  return new Response(JSON.stringify({ 
    success: true,
    before: beforeValue,
    after: afterValue
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// =====================================================
// BAN PLAYER (TEMP)
// =====================================================

async function handleTempBan(supabase: any, adminContext: AdminContext, params: any) {
  await requirePermission(supabase, adminContext, 'player:ban:temp');
  await checkQuota(supabase, adminContext, 'player:ban:temp');

  const { playerId, duration, reason } = params;

  if (!playerId || !duration || !reason) {
    throw new Error('Missing required parameters: playerId, duration (hours), reason');
  }

  if (duration > 168) { // 7 days max
    throw new Error('Temp bans cannot exceed 7 days (168 hours)');
  }

  const { data: player } = await supabase
    .from('the_life_players')
    .select('id, username, is_banned, ban_expires_at')
    .eq('id', playerId)
    .single();

  if (!player) {
    throw new Error('Player not found');
  }

  const beforeValue = { is_banned: player.is_banned, ban_expires_at: player.ban_expires_at };
  const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();

  // Update ban status
  const { error } = await supabase
    .from('the_life_players')
    .update({ 
      is_banned: true, 
      ban_expires_at: expiresAt,
      ban_reason: reason
    })
    .eq('id', playerId);

  if (error) {
    throw new Error('Failed to ban player: ' + error.message);
  }

  // Add admin note
  await supabase
    .from('admin_notes')
    .insert({
      player_id: playerId,
      player_username: player.username,
      admin_id: adminContext.userId,
      admin_username: adminContext.username,
      admin_role: adminContext.role,
      note_type: 'ban_reason',
      note_content: reason,
      is_visible_to_player: true
    });

  const afterValue = { is_banned: true, ban_expires_at: expiresAt };

  await logAction(supabase, adminContext, {
    actionType: 'player:ban:temp',
    actionCategory: 'security',
    targetPlayerId: playerId,
    targetPlayerUsername: player.username,
    fieldChanged: 'ban_status',
    beforeValue,
    afterValue,
    reason
  });

  return new Response(JSON.stringify({ 
    success: true,
    message: `Player banned for ${duration} hours`,
    expiresAt
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// =====================================================
// BAN PLAYER (PERMANENT)
// =====================================================

async function handlePermBan(supabase: any, adminContext: AdminContext, params: any) {
  await requirePermission(supabase, adminContext, 'player:ban:perm');
  await checkQuota(supabase, adminContext, 'player:ban:perm');

  const { playerId, reason } = params;

  if (!playerId || !reason) {
    throw new Error('Missing required parameters: playerId, reason');
  }

  const { data: player } = await supabase
    .from('the_life_players')
    .select('id, username, is_banned')
    .eq('id', playerId)
    .single();

  if (!player) {
    throw new Error('Player not found');
  }

  const beforeValue = { is_banned: player.is_banned };

  // Permanent ban = no expiry
  const { error } = await supabase
    .from('the_life_players')
    .update({ 
      is_banned: true, 
      ban_expires_at: null,
      ban_reason: reason
    })
    .eq('id', playerId);

  if (error) {
    throw new Error('Failed to ban player: ' + error.message);
  }

  // Add note
  await supabase
    .from('admin_notes')
    .insert({
      player_id: playerId,
      player_username: player.username,
      admin_id: adminContext.userId,
      admin_username: adminContext.username,
      admin_role: adminContext.role,
      note_type: 'ban_reason',
      note_content: `PERMANENT BAN: ${reason}`,
      is_visible_to_player: true
    });

  await logAction(supabase, adminContext, {
    actionType: 'player:ban:perm',
    actionCategory: 'security',
    targetPlayerId: playerId,
    targetPlayerUsername: player.username,
    fieldChanged: 'ban_status',
    beforeValue,
    afterValue: { is_banned: true, permanent: true },
    reason,
    isDestructive: true
  });

  return new Response(JSON.stringify({ 
    success: true,
    message: 'Player permanently banned'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// =====================================================
// UNBAN PLAYER
// =====================================================

async function handleUnban(supabase: any, adminContext: AdminContext, params: any) {
  await requirePermission(supabase, adminContext, 'player:ban:temp');

  const { playerId, reason } = params;

  if (!playerId || !reason) {
    throw new Error('Missing required parameters');
  }

  const { data: player } = await supabase
    .from('the_life_players')
    .select('id, username, is_banned, ban_expires_at')
    .eq('id', playerId)
    .single();

  if (!player) {
    throw new Error('Player not found');
  }

  if (!player.is_banned) {
    throw new Error('Player is not banned');
  }

  const beforeValue = { is_banned: true, ban_expires_at: player.ban_expires_at };

  const { error } = await supabase
    .from('the_life_players')
    .update({ 
      is_banned: false, 
      ban_expires_at: null,
      ban_reason: null
    })
    .eq('id', playerId);

  if (error) {
    throw new Error('Failed to unban: ' + error.message);
  }

  await logAction(supabase, adminContext, {
    actionType: 'player:unban',
    actionCategory: 'security',
    targetPlayerId: playerId,
    targetPlayerUsername: player.username,
    fieldChanged: 'ban_status',
    beforeValue,
    afterValue: { is_banned: false },
    reason
  });

  return new Response(JSON.stringify({ 
    success: true,
    message: 'Player unbanned'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// =====================================================
// ADD NOTE
// =====================================================

async function handleAddNote(supabase: any, adminContext: AdminContext, params: any) {
  await requirePermission(supabase, adminContext, 'player:notes:add');
  await checkQuota(supabase, adminContext, 'player:notes:add');

  const { playerId, noteType, noteContent, tags = [] } = params;

  if (!playerId || !noteType || !noteContent) {
    throw new Error('Missing required parameters');
  }

  const { data: player } = await supabase
    .from('the_life_players')
    .select('username')
    .eq('id', playerId)
    .single();

  if (!player) {
    throw new Error('Player not found');
  }

  const { error } = await supabase
    .from('admin_notes')
    .insert({
      player_id: playerId,
      player_username: player.username,
      admin_id: adminContext.userId,
      admin_username: adminContext.username,
      admin_role: adminContext.role,
      note_type: noteType,
      note_content: noteContent,
      tags: tags,
      is_visible_to_player: false
    });

  if (error) {
    throw new Error('Failed to add note: ' + error.message);
  }

  return new Response(JSON.stringify({ 
    success: true,
    message: 'Note added'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// =====================================================
// ROLLBACK ACTION
// =====================================================

async function handleRollback(supabase: any, adminContext: AdminContext, params: any) {
  await requirePermission(supabase, adminContext, 'system:rollback');
  await checkQuota(supabase, adminContext, 'system:rollback');

  const { actionId, reason } = params;

  if (!actionId || !reason) {
    throw new Error('Missing required parameters: actionId, reason');
  }

  // Execute rollback
  await executeRollback(supabase, adminContext, actionId, reason);

  return new Response(JSON.stringify({ 
    success: true,
    message: 'Action rolled back successfully'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Helper to check permission
async function hasPermission(supabase: any, userId: string, permission: string): Promise<boolean> {
  const { data } = await supabase.rpc('has_admin_permission', {
    user_id: userId,
    permission_name: permission
  });
  return data === true;
}
