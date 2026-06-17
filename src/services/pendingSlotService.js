/**
 * pendingSlotService.js — CRUD for the pending_slots approval queue.
 */
import { supabase } from '../config/supabaseClient';
import { getErrorMessage } from '../utils/errorUtils';

function throwSlotError(error, fallback) {
  if (error) throw new Error(getErrorMessage(error, fallback));
}

/* ─── Submit a new slot (premium user) ─── */
export async function submitSlot(userId, slotData) {
  const { data, error } = await supabase
    .from('pending_slots')
    .insert({
      submitted_by: userId,
      name: slotData.name,
      provider: slotData.provider,
      image: slotData.image,
      rtp: slotData.rtp,
      volatility: slotData.volatility,
      max_win_multiplier: slotData.max_win_multiplier,
    })
    .select()
    .single();

  throwSlotError(error, 'Failed to submit slot.');
  return data;
}

/* ─── Get my submissions (premium user) ─── */
export async function getMySubmissions(userId) {
  const { data, error } = await supabase
    .from('pending_slots')
    .select('*')
    .eq('submitted_by', userId)
    .order('submitted_at', { ascending: false });

  throwSlotError(error, 'Failed to load slot submissions.');
  return data || [];
}

/* ─── Get all pending slots (admin) — includes submitter username ─── */
export async function getPendingSlots() {
  const { data, error } = await supabase
    .from('pending_slots')
    .select('*')
    .order('submitted_at', { ascending: false });

  throwSlotError(error, 'Failed to load pending slots.');

  // Fetch SE usernames for all unique submitters
  const submitterIds = [...new Set((data || []).map(s => s.submitted_by).filter(Boolean))];
  let usernameMap = {};
  if (submitterIds.length > 0) {
    // Primary: StreamElements username
    const { data: connections } = await supabase
      .from('streamelements_connections')
      .select('user_id, se_username')
      .in('user_id', submitterIds);
    if (connections) {
      connections.forEach(c => { usernameMap[c.user_id] = c.se_username; });
    }
    // Fallback: twitch_username from user_profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, twitch_username')
      .in('user_id', submitterIds);
    if (profiles) {
      profiles.forEach(p => {
        if (!usernameMap[p.user_id] && p.twitch_username) {
          usernameMap[p.user_id] = p.twitch_username;
        }
      });
    }
  }

  return (data || []).map(s => ({
    ...s,
    se_username: usernameMap[s.submitted_by] || `user:${String(s.submitted_by).substring(0, 8)}`,
  }));
}

/* ─── Approve a slot (admin) — copies to real slots table ─── */
export async function approveSlot(pendingId, adminId) {
  // 1. Fetch the pending row
  const { data: pending, error: fetchErr } = await supabase
    .from('pending_slots')
    .select('*')
    .eq('id', pendingId)
    .single();

  throwSlotError(fetchErr, 'Failed to load pending slot.');

  // 2. Insert into the real slots table
  const { error: insertErr } = await supabase
    .from('slots')
    .insert({
      name: pending.name,
      provider: pending.provider,
      image: pending.image,
      rtp: pending.rtp,
      volatility: pending.volatility,
      max_win_multiplier: pending.max_win_multiplier,
      status: 'live',
      created_by: pending.submitted_by,
    });

  throwSlotError(insertErr, 'Failed to add slot to the database.');

  // 3. Mark as approved
  const { error: updateErr } = await supabase
    .from('pending_slots')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', pendingId);

  throwSlotError(updateErr, 'Failed to mark slot as approved.');
}

/* ─── Deny a slot (admin) ─── */
export async function denySlot(pendingId, adminId, note = '') {
  const { error } = await supabase
    .from('pending_slots')
    .update({
      status: 'denied',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    })
    .eq('id', pendingId);

  throwSlotError(error, 'Failed to deny slot.');
}

/* ─── Update a pending slot (admin edit before approve/deny) ─── */
export async function updatePendingSlot(pendingId, fields) {
  const allowed = {};
  if (fields.name != null) allowed.name = fields.name;
  if (fields.provider != null) allowed.provider = fields.provider;
  if (fields.image != null) allowed.image = fields.image;
  if (fields.rtp != null) allowed.rtp = fields.rtp;
  if (fields.volatility != null) allowed.volatility = fields.volatility;
  if (fields.max_win_multiplier != null) allowed.max_win_multiplier = fields.max_win_multiplier;

  const { error } = await supabase
    .from('pending_slots')
    .update(allowed)
    .eq('id', pendingId);

  throwSlotError(error, 'Failed to update pending slot.');
}
