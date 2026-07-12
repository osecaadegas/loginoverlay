/**
 * overlayService.js — Core CRUD + realtime for the Overlay Control Center.
 * All Supabase interactions for overlay_instances, overlay_themes,
 * overlay_widgets, overlay_state tables.
 */
import { supabase } from '../config/supabaseClient';

// ─── Helpers ────────────────────────────────────────────
const generateToken = () => {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
};

// ─── OVERLAY INSTANCE ───────────────────────────────────

export async function getOrCreateInstance(userId, displayName) {
  // Try fetch first
  let { data, error } = await supabase
    .from('overlay_instances')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data) return data;

  // Create new instance
  const token = generateToken();
  const { data: created, error: createErr } = await supabase
    .from('overlay_instances')
    .insert({
      user_id: userId,
      overlay_token: token,
      display_name: displayName || 'My Overlay',
      is_active: true,
    })
    .select()
    .single();

  if (createErr) throw createErr;

  // Also create default theme row
  await supabase.from('overlay_themes').insert({ user_id: userId, overlay_id: created.id }).select();

  // Create default state row
  await supabase.from('overlay_state').insert({ user_id: userId, overlay_id: created.id, state: {} }).select();

  return created;
}

export async function getInstanceByToken(token) {
  const { data, error } = await supabase
    .from('overlay_instances')
    .select('*')
    .eq('overlay_token', token)
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

export async function regenerateToken(userId) {
  const token = generateToken();
  const { data, error } = await supabase
    .from('overlay_instances')
    .update({ overlay_token: token, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── THEME / CUSTOMIZATION ──────────────────────────────

export async function getTheme(userId, overlayId = null) {
  let query = supabase
    .from('overlay_themes')
    .select('*')
    .eq('user_id', userId);
  if (overlayId) query = query.eq('overlay_id', overlayId);
  const { data } = await query.maybeSingle();
  return data;
}

export async function updateTheme(userId, patch, overlayId = null) {
  const payload = { user_id: userId, ...patch, updated_at: new Date().toISOString() };
  if (overlayId) payload.overlay_id = overlayId;
  const { data, error } = await supabase
    .from('overlay_themes')
    .upsert(payload, { onConflict: overlayId ? 'overlay_id' : 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── WIDGETS ────────────────────────────────────────────

export async function getWidgets(userId, overlayId = null) {
  let query = supabase
    .from('overlay_widgets')
    .select('*')
    .eq('user_id', userId);
  if (overlayId) query = query.eq('overlay_id', overlayId);
  const { data, error } = await query.order('z_index', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertWidget(userId, widget, overlayId = null) {
  const payload = { user_id: userId, ...widget, updated_at: new Date().toISOString() };
  if (overlayId) payload.overlay_id = overlayId;
  const { data, error } = await supabase
    .from('overlay_widgets')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createWidget(userId, widgetType, config = {}, overlayId = null) {
  const { data, error } = await supabase
    .from('overlay_widgets')
    .insert({
      user_id: userId,
      overlay_id: overlayId,
      widget_type: widgetType,
      label: widgetType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      is_visible: true,
      position_x: 20 + Math.random() * 40,
      position_y: 20 + Math.random() * 40,
      width: 400,
      height: 300,
      z_index: 1,
      config,
      animation: 'fade',
    })
    .select()
    .single();
  if (error) {
    console.error('[overlayService] createWidget failed:', error);
    throw error;
  }
  return data;
}

export async function deleteWidget(userId, widgetId, overlayId = null) {
  let query = supabase.from('overlay_widgets').delete().eq('id', widgetId).eq('user_id', userId);
  if (overlayId) query = query.eq('overlay_id', overlayId);
  const { error } = await query;
  if (error) throw error;
}

// ─── OVERLAY STATE (ephemeral real-time state) ──────────

export async function getOverlayState(userId, overlayId = null) {
  let query = supabase
    .from('overlay_state')
    .select('*')
    .eq('user_id', userId);
  if (overlayId) query = query.eq('overlay_id', overlayId);
  const { data } = await query.maybeSingle();
  return data?.state || {};
}

export async function setOverlayState(userId, state, overlayId = null) {
  const payload = { user_id: userId, state, updated_at: new Date().toISOString() };
  if (overlayId) payload.overlay_id = overlayId;
  const { data, error } = await supabase
    .from('overlay_state')
    .upsert(payload, { onConflict: overlayId ? 'overlay_id' : 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function patchOverlayState(userId, patch, overlayId = null) {
  const current = await getOverlayState(userId, overlayId);
  return setOverlayState(userId, { ...current, ...patch }, overlayId);
}

// ─── REALTIME SUBSCRIPTIONS ─────────────────────────────

export function subscribeToOverlay(userId, { onState, onWidgets, onTheme }, overlayId = null) {
  const channel = supabase.channel(`overlay_sync_${overlayId || userId}`);
  const filter = overlayId ? `overlay_id=eq.${overlayId}` : `user_id=eq.${userId}`;

  if (onState) {
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'overlay_state',
      filter,
    }, payload => onState(payload.new?.state || {}));
  }

  if (onWidgets) {
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'overlay_widgets',
      filter,
    }, () => onWidgets());
  }

  if (onTheme) {
    channel.on('postgres_changes', {
      event: '*', schema: 'public', table: 'overlay_themes',
      filter,
    }, payload => onTheme(payload.new));
  }

  channel.subscribe();
  return channel;
}

export function unsubscribeOverlay(channel) {
  if (channel) supabase.removeChannel(channel);
}

// ─── SHARED / GLOBAL PRESETS ────────────────────────────

export async function getSharedPresets() {
  const { data, error } = await supabase
    .from('shared_overlay_presets')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveSharedPreset(name, snapshot, userId) {
  const { data, error } = await supabase
    .from('shared_overlay_presets')
    .upsert(
      { name, snapshot, created_by: userId, updated_at: new Date().toISOString() },
      { onConflict: 'name' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSharedPreset(id) {
  const { error } = await supabase
    .from('shared_overlay_presets')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── BONUS HUNT HISTORY ─────────────────────────────────

export async function getBonusHuntHistory(userId) {
  const { data, error } = await supabase
    .from('bonus_hunt_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveBonusHuntToHistory(userId, huntData) {
  const { data, error } = await supabase
    .from('bonus_hunt_history')
    .insert({ user_id: userId, ...huntData })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBonusHuntHistory(id) {
  const { error } = await supabase
    .from('bonus_hunt_history')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
