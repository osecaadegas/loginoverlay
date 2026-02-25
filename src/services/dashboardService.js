import { supabase } from '../config/supabaseClient';

// ============================================================================
// GAME / SLOT QUERIES
// ============================================================================

const SLOT_CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function getCached(key) {
  const entry = SLOT_CACHE.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  SLOT_CACHE.set(key, { data, ts: Date.now() });
}

/**
 * Fetch featured / trending slots
 */
export async function getTrendingSlots(limit = 20) {
  const cached = getCached(`trending-${limit}`);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('status', 'active')
    .order('popularity_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) { console.error('getTrendingSlots:', error); return []; }
  setCache(`trending-${limit}`, data);
  return data;
}

/**
 * Fetch slots by provider
 */
export async function getSlotsByProvider(provider, limit = 30) {
  const key = `provider-${provider}-${limit}`;
  const cached = getCached(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('provider', provider)
    .eq('status', 'active')
    .order('popularity_score', { ascending: false })
    .limit(limit);

  if (error) { console.error('getSlotsByProvider:', error); return []; }
  setCache(key, data);
  return data;
}

/**
 * Fetch slots by category
 */
export async function getSlotsByCategory(category, limit = 30) {
  const key = `category-${category}-${limit}`;
  const cached = getCached(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('category', category)
    .eq('status', 'active')
    .order('popularity_score', { ascending: false })
    .limit(limit);

  if (error) { console.error('getSlotsByCategory:', error); return []; }
  setCache(key, data);
  return data;
}

/**
 * Fetch featured slots
 */
export async function getFeaturedSlots(limit = 10) {
  const cached = getCached(`featured-${limit}`);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('is_featured', true)
    .eq('status', 'active')
    .order('popularity_score', { ascending: false })
    .limit(limit);

  if (error) { console.error('getFeaturedSlots:', error); return []; }
  setCache(`featured-${limit}`, data);
  return data;
}

/**
 * Search slots with debounce-friendly API
 */
export async function searchSlots(query, { provider, category, limit = 30 } = {}) {
  let q = supabase
    .from('slots')
    .select('*')
    .eq('status', 'active')
    .ilike('name', `%${query}%`)
    .order('popularity_score', { ascending: false })
    .limit(limit);

  if (provider) q = q.eq('provider', provider);
  if (category) q = q.eq('category', category);

  const { data, error } = await q;
  if (error) { console.error('searchSlots:', error); return []; }
  return data;
}

/**
 * Get all unique providers with slot counts
 */
export async function getProviderStats() {
  const cached = getCached('provider-stats');
  if (cached) return cached;

  const { data, error } = await supabase
    .from('slots')
    .select('provider')
    .eq('status', 'active');

  if (error) { console.error('getProviderStats:', error); return []; }

  const counts = {};
  data.forEach(s => { counts[s.provider] = (counts[s.provider] || 0) + 1; });
  const result = Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  setCache('provider-stats', result);
  return result;
}

/**
 * Get all unique categories
 */
export async function getCategories() {
  const cached = getCached('categories');
  if (cached) return cached;

  const { data, error } = await supabase
    .from('slots')
    .select('category')
    .eq('status', 'active');

  if (error) { console.error('getCategories:', error); return []; }

  const unique = [...new Set(data.map(s => s.category).filter(Boolean))];
  setCache('categories', unique);
  return unique;
}

/**
 * Increment popularity score (call on view / play)
 */
export async function incrementPopularity(slotId) {
  const { error } = await supabase.rpc('increment_popularity', { p_slot_id: slotId });
  if (error) console.error('incrementPopularity:', error);
}

// ============================================================================
// TOURNAMENT QUERIES
// ============================================================================

/**
 * Fetch active + upcoming tournaments
 */
export async function getActiveTournaments() {
  const cached = getCached('active-tournaments');
  if (cached) return cached;

  const { data, error } = await supabase
    .from('tournaments')
    .select('*, game:game_id(id, name, image, provider)')
    .in('status', ['active', 'upcoming'])
    .order('start_date', { ascending: true });

  if (error) { console.error('getActiveTournaments:', error); return []; }
  setCache('active-tournaments', data);
  return data;
}

/**
 * Fetch a single tournament with bracket data
 */
export async function getTournamentById(id) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*, game:game_id(id, name, image, provider)')
    .eq('id', id)
    .single();

  if (error) { console.error('getTournamentById:', error); return null; }
  return data;
}

/**
 * Fetch all tournaments (paginated)
 */
export async function getTournaments({ status, limit = 20, offset = 0 } = {}) {
  let q = supabase
    .from('tournaments')
    .select('*, game:game_id(id, name, image, provider)')
    .order('start_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) { console.error('getTournaments:', error); return []; }
  return data;
}

// ============================================================================
// LEADERBOARD QUERIES
// ============================================================================

/**
 * Fetch leaderboard for a tournament
 */
export async function getLeaderboard(tournamentId, limit = 50) {
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) { console.error('getLeaderboard:', error); return []; }
  return data;
}

/**
 * Subscribe to real-time leaderboard updates
 * @returns {Function} unsubscribe function
 */
export function subscribeToLeaderboard(tournamentId, callback) {
  const channel = supabase
    .channel(`leaderboard-${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leaderboard_entries',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to tournament status updates
 */
export function subscribeToTournament(tournamentId, callback) {
  const channel = supabase
    .channel(`tournament-${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tournaments',
        filter: `id=eq.${tournamentId}`,
      },
      (payload) => callback(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

export function invalidateDashboardCache(key) {
  if (key) {
    SLOT_CACHE.delete(key);
  } else {
    SLOT_CACHE.clear();
  }
}
