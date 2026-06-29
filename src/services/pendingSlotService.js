/**
 * pendingSlotService.js — CRUD for the pending_slots approval queue.
 */
import { supabase } from '../config/supabaseClient';
import { getErrorMessage } from '../utils/errorUtils';

function throwSlotError(error, fallback) {
  if (error) throw new Error(getErrorMessage(error, fallback));
}

function cleanSubmitterName(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^user:[a-f0-9-]+$/i.test(trimmed)) return '';
  return trimmed;
}

function emailName(email) {
  if (typeof email !== 'string' || !email.includes('@')) return '';
  return email.split('@')[0]?.trim() || '';
}

function authUserName(user) {
  const meta = user?.user_metadata || {};
  return cleanSubmitterName(
    meta.full_name ||
    meta.name ||
    meta.display_name ||
    meta.preferred_username ||
    meta.user_name ||
    meta.twitch_username ||
    emailName(user?.email)
  );
}

async function getSubmitterProfiles(submitterIds) {
  const names = {};
  const handles = {};
  const sources = {};

  const setName = (userId, name, source, handle = '') => {
    if (!userId) return;
    const cleanName = cleanSubmitterName(name);
    const cleanHandle = cleanSubmitterName(handle);
    if (cleanHandle && !handles[userId] && cleanHandle !== cleanName) {
      handles[userId] = cleanHandle;
    }
    if (!cleanName || names[userId]) return;
    names[userId] = cleanName;
    sources[userId] = source;
  };

  const profileSelects = [
    'user_id, display_name, username, twitch_display_name, twitch_username',
    'user_id, twitch_display_name, twitch_username',
    'user_id, twitch_username',
  ];

  for (const select of profileSelects) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(select)
      .in('user_id', submitterIds);

    if (error) continue;
    (data || []).forEach(profile => {
      setName(
        profile.user_id,
        profile.display_name || profile.twitch_display_name || profile.username || profile.twitch_username,
        'profile',
        profile.twitch_username || profile.username
      );
    });
    break;
  }

  const { data: connections } = await supabase
    .from('streamelements_connections')
    .select('user_id, se_username')
    .in('user_id', submitterIds);

  (connections || []).forEach(connection => {
    setName(connection.user_id, connection.se_username, 'streamelements', connection.se_username);
  });

  const { data: authUsers, error: authError } = await supabase.rpc('get_all_auth_users');
  if (!authError) {
    (authUsers || [])
      .filter(authUser => submitterIds.includes(authUser.id))
      .forEach(authUser => {
        const meta = authUser.user_metadata || {};
        setName(
          authUser.id,
          authUserName(authUser),
          'account',
          meta.preferred_username || meta.user_name || meta.twitch_username || emailName(authUser.email)
        );
      });
  }

  return { names, handles, sources };
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

  const submitterIds = [...new Set((data || []).map(s => s.submitted_by).filter(Boolean))];
  const submitters = submitterIds.length > 0
    ? await getSubmitterProfiles(submitterIds)
    : { names: {}, handles: {}, sources: {} };

  return (data || []).map(s => ({
    ...s,
    submitter_name: submitters.names[s.submitted_by] || 'Unknown user',
    submitter_handle: submitters.handles[s.submitted_by] || '',
    submitter_source: submitters.sources[s.submitted_by] || 'unknown',
    se_username: submitters.names[s.submitted_by] || 'Unknown user',
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
