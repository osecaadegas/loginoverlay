/**
 * pendingSlotService.js — CRUD for the pending_slots approval queue.
 */
import { supabase } from '../config/supabaseClient';

/* ─── Submit a new slot (premium user) ─── */
export async function submitSlot(userId, slotData) {
  const { data, error } = await supabase
    .from('pending_slots')
    .insert({
      submitted_by: userId,
      name: slotData.name?.trim(),
      provider: slotData.provider?.trim(),
      image: slotData.image?.trim() || '',
      rtp: slotData.rtp || null,
      volatility: slotData.volatility || null,
      max_win_multiplier: slotData.max_win_multiplier || null,
      reels: slotData.reels?.trim() || null,
      min_bet: slotData.min_bet || 0.10,
      max_bet: slotData.max_bet || 100.00,
      features: slotData.features || [],
      tags: slotData.tags || [],
      description: slotData.description?.trim() || null,
      release_date: slotData.release_date || null,
      paylines: slotData.paylines?.trim() || null,
      theme: slotData.theme?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* ─── Get my submissions (premium user) ─── */
export async function getMySubmissions(userId) {
  const { data, error } = await supabase
    .from('pending_slots')
    .select('*')
    .eq('submitted_by', userId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/* ─── Get all pending slots (admin) ─── */
export async function getPendingSlots() {
  const { data, error } = await supabase
    .from('pending_slots')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/* ─── Approve a slot (admin) — copies to real slots table ─── */
export async function approveSlot(pendingId, adminId) {
  // 1. Fetch the pending row
  const { data: pending, error: fetchErr } = await supabase
    .from('pending_slots')
    .select('*')
    .eq('id', pendingId)
    .single();

  if (fetchErr) throw fetchErr;

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
      reels: pending.reels,
      min_bet: pending.min_bet,
      max_bet: pending.max_bet,
      features: pending.features,
      tags: pending.tags,
      description: pending.description,
      release_date: pending.release_date,
      paylines: pending.paylines,
      theme: pending.theme,
      status: 'live',
      created_by: pending.submitted_by,
    });

  if (insertErr) throw insertErr;

  // 3. Mark as approved
  const { error: updateErr } = await supabase
    .from('pending_slots')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', pendingId);

  if (updateErr) throw updateErr;
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

  if (error) throw error;
}
