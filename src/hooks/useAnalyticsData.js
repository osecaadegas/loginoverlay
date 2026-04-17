/**
 * useAnalyticsData.js — React hook for fetching analytics dashboard data.
 * Uses the admin API endpoints with auth token.
 */
import { useState, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';

const API_BASE = '/api/analytics';

async function adminFetch(action, params = {}, method = 'GET', body = null) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const url = method === 'GET'
    ? `${API_BASE}?action=${action}&${new URLSearchParams(params).toString()}`
    : `${API_BASE}?action=${action}`;

  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  };
  if (body && method === 'POST') opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export function useAnalyticsData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const withLoading = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Overview stats
  const fetchOverview = useCallback((period = '7d') =>
    withLoading(() => adminFetch('overview', { period })), [withLoading]);

  // Visitors
  const fetchVisitors = useCallback((params = {}) =>
    withLoading(() => adminFetch('visitors', params)), [withLoading]);

  // Visitor detail
  const fetchVisitorDetail = useCallback((id) =>
    withLoading(() => adminFetch('visitor', { id })), [withLoading]);

  // Sessions
  const fetchSessions = useCallback((params = {}) =>
    withLoading(() => adminFetch('sessions', params)), [withLoading]);

  // Events
  const fetchEvents = useCallback((params = {}) =>
    withLoading(() => adminFetch('events', params)), [withLoading]);

  // Offer performance
  const fetchOffers = useCallback((params = {}) =>
    withLoading(() => adminFetch('offers', params)), [withLoading]);

  // Offer detail (individual clicks with user/geo/IP)
  const fetchOfferDetail = useCallback((params = {}) =>
    withLoading(() => adminFetch('offer-detail', params)), [withLoading]);

  // Realtime
  const fetchRealtime = useCallback(() =>
    withLoading(() => adminFetch('realtime')), [withLoading]);

  // Traffic sources
  const fetchTraffic = useCallback((params = {}) =>
    withLoading(() => adminFetch('traffic', params)), [withLoading]);

  // Geo analytics
  const fetchGeo = useCallback((params = {}) =>
    withLoading(() => adminFetch('geo', params)), [withLoading]);

  // Fraud logs
  const fetchFraud = useCallback((params = {}) =>
    withLoading(() => adminFetch('fraud', params)), [withLoading]);

  // Config
  const fetchConfig = useCallback(() =>
    withLoading(() => adminFetch('config')), [withLoading]);

  const updateConfig = useCallback((body) =>
    withLoading(() => adminFetch('config', {}, 'POST', body)), [withLoading]);

  // Resolve fraud
  const resolveFraud = useCallback((id) =>
    adminFetch('resolve-fraud', {}, 'POST', { id }), []);

  // Delete data (GDPR)
  const deleteData = useCallback((body) =>
    adminFetch('delete-data', {}, 'POST', body), []);

  // Export CSV
  const exportCSV = useCallback((type = 'events', since) =>
    withLoading(() => adminFetch('export', { type, since })), [withLoading]);

  // Funnel
  const fetchFunnel = useCallback((steps, since) =>
    withLoading(() => adminFetch('funnel', { steps: JSON.stringify(steps), since })), [withLoading]);

  return {
    loading, error,
    fetchOverview, fetchVisitors, fetchVisitorDetail, fetchSessions,
    fetchEvents, fetchOffers, fetchOfferDetail, fetchRealtime, fetchTraffic, fetchGeo,
    fetchFraud, fetchConfig, updateConfig, resolveFraud, deleteData,
    exportCSV, fetchFunnel,
  };
}

export default useAnalyticsData;
