import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getTrendingSlots,
  getSlotsByProvider,
  getSlotsByCategory,
  getFeaturedSlots,
  getProviderStats,
  getCategories,
  getActiveTournaments,
  getTournamentById,
  getLeaderboard,
  subscribeToLeaderboard,
  subscribeToTournament,
  searchSlots,
  invalidateDashboardCache,
} from '../services/dashboardService';

// ============================================================================
// useDashboard — loads all dashboard sections in parallel
// ============================================================================
export function useDashboard() {
  const [trending, setTrending] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, f, p, c, tour] = await Promise.all([
        getTrendingSlots(20),
        getFeaturedSlots(10),
        getProviderStats(),
        getCategories(),
        getActiveTournaments(),
      ]);
      setTrending(t);
      setFeatured(f);
      setProviders(p);
      setCategories(c);
      setTournaments(tour);
    } catch (err) {
      console.error('useDashboard load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => {
    invalidateDashboardCache();
    load();
  }, [load]);

  return { trending, featured, providers, categories, tournaments, loading, error, refresh };
}

// ============================================================================
// useProviderSlots — fetch slots for a single provider (lazy)
// ============================================================================
export function useProviderSlots(provider, limit = 30) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider) return;
    let cancelled = false;
    setLoading(true);
    getSlotsByProvider(provider, limit).then(data => {
      if (!cancelled) { setSlots(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [provider, limit]);

  return { slots, loading };
}

// ============================================================================
// useCategorySlots — fetch slots for a single category (lazy)
// ============================================================================
export function useCategorySlots(category, limit = 30) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    setLoading(true);
    getSlotsByCategory(category, limit).then(data => {
      if (!cancelled) { setSlots(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [category, limit]);

  return { slots, loading };
}

// ============================================================================
// useSlotSearch — debounced search
// ============================================================================
export function useSlotSearch(delay = 300) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const data = await searchSlots(query);
      setResults(data);
      setSearching(false);
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [query, delay]);

  return { query, setQuery, results, searching };
}

// ============================================================================
// useTournament — single tournament + bracket + live leaderboard
// ============================================================================
export function useTournament(tournamentId) {
  const [tournament, setTournament] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [t, lb] = await Promise.all([
        getTournamentById(tournamentId),
        getLeaderboard(tournamentId),
      ]);
      if (!cancelled) {
        setTournament(t);
        setLeaderboard(lb);
        setLoading(false);
      }
    })();

    // Real-time subscriptions
    const unsubLb = subscribeToLeaderboard(tournamentId, async () => {
      const fresh = await getLeaderboard(tournamentId);
      if (!cancelled) setLeaderboard(fresh);
    });

    const unsubTour = subscribeToTournament(tournamentId, (payload) => {
      if (!cancelled) setTournament(prev => ({ ...prev, ...payload.new }));
    });

    return () => {
      cancelled = true;
      unsubLb();
      unsubTour();
    };
  }, [tournamentId]);

  return { tournament, leaderboard, loading };
}
