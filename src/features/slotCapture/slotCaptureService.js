import { supabase } from '../../config/supabaseClient';
import { normalizeBounds } from './slotCaptureModel';

export async function listCaptureProfiles() {
  const { data, error } = await supabase.from('slot_capture_profiles').select(`*, slot_capture_sources(*), slot_capture_masks(*), slot_capture_filters(*), slot_capture_outputs(*)`).order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCaptureProfile(name = 'Nova captura') {
  const { data: profile, error } = await supabase.from('slot_capture_profiles').insert({ name }).select().single();
  if (error) throw error;
  const { error: outputError } = await supabase.from('slot_capture_outputs').insert({ profile_id: profile.id, user_id: profile.user_id, name: `${name} OBS` });
  if (outputError) {
    await supabase.from('slot_capture_profiles').delete().eq('id', profile.id);
    throw outputError;
  }
  return profile;
}

export async function updateCaptureProfile(id, patch) {
  const allowed = ['name', 'enabled', 'quality_preset', 'output_width', 'output_height', 'output_fps', 'transform', 'transition'];
  const safePatch = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)));
  const { data, error } = await supabase.from('slot_capture_profiles').update(safePatch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCaptureProfile(id) {
  const { error } = await supabase.from('slot_capture_profiles').delete().eq('id', id);
  if (error) throw error;
}

export async function saveCaptureSource(profile, selection) {
  const source = {
    profile_id: profile.id,
    user_id: profile.user_id,
    source_type: ['iframe', 'canvas'].includes(selection.type) ? selection.type : 'container',
    page_domain: selection.pageDomain || 'unknown.local',
    page_title: selection.pageTitle || '',
    element_fingerprint: selection.fingerprint,
    path_hash: selection.pathHash || '',
    normalized_bounds: normalizeBounds(selection.bounds, selection.viewport),
    aspect_ratio: selection.bounds?.height ? selection.bounds.width / selection.bounds.height : null,
    last_status: 'connected',
    last_seen_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('slot_capture_sources').upsert(source, { onConflict: 'profile_id' }).select().single();
  if (error) throw error;
  return data;
}

export async function addCaptureMask(profile, mask) {
  const { data, error } = await supabase.from('slot_capture_masks').insert({ ...mask, profile_id: profile.id, user_id: profile.user_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateCaptureMask(id, patch) {
  const { data, error } = await supabase.from('slot_capture_masks').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCaptureMask(id) {
  const { error } = await supabase.from('slot_capture_masks').delete().eq('id', id);
  if (error) throw error;
}

export async function addCaptureFilter(profile, filter) {
  const { data, error } = await supabase.from('slot_capture_filters').insert({ ...filter, profile_id: profile.id, user_id: profile.user_id }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCaptureFilter(id) {
  const { error } = await supabase.from('slot_capture_filters').delete().eq('id', id);
  if (error) throw error;
}
