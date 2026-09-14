import { supabase } from '../config/supabaseClient';
import { queryClient } from '../config/queryClient';
import { buildSlotProviderCatalog } from '../utils/slotProviderCatalog';

export const PROVIDER_QUERY_KEY = ['slot-provider-logos'];

export async function fetchManagedProviders() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('slot_providers')
      .select('id,name,slug,logo_url,website_url,is_active,aliases').order('id').range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export async function fetchSlotProviderCatalog({ force = false } = {}) {
  const managed = await queryClient.fetchQuery({ queryKey: PROVIDER_QUERY_KEY, queryFn: fetchManagedProviders, staleTime: force ? 0 : 300000 });
  const { data, error } = await supabase.rpc('get_slot_provider_counts');
  if (error) throw error;
  return buildSlotProviderCatalog(managed, data);
}

async function mutateProvider(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42703') throw new Error('Provider management requires the slot_provider_management database migration.');
    throw error;
  }
  await queryClient.invalidateQueries({ queryKey: PROVIDER_QUERY_KEY });
  return data;
}

export const saveSlotProvider = provider => mutateProvider('save_slot_provider', {
  p_provider_id: provider.id || null, p_name: provider.name,
  p_logo_url: provider.logo_url == null ? null : provider.logo_url.trim(),
  p_website_url: provider.website_url?.trim() || null, p_aliases: provider.aliases || [],
});

export async function ensureManagedProvider(provider) {
  return provider.id ? provider : (await saveSlotProvider(provider)).provider;
}

export const moveSlotProviderSlots = ({ sourceId = null, sourceAliases = [], targetId, slotIds = null, removeSource = false }) => mutateProvider('move_slot_provider_slots', {
  p_provider_id: sourceId, p_target_provider_id: targetId, p_slot_ids: slotIds, p_remove_source: removeSource, p_source_aliases: sourceAliases,
});

export const removeSlotProvider = id => mutateProvider('remove_slot_provider', { p_provider_id: id });
