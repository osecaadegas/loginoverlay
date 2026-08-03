import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../../../config/supabaseClient';

export function useSlotRequestsData({ config = {}, userId, enabled = true, channelPrefix = 'sr-widget', publicOverlayId, runtime } = {}) {
  const c = config || {};
  const maxDisplay = Number(c.maxDisplay) > 0 ? Number(c.maxDisplay) : 20;
  const usePublicOverlayApi = runtime === 'obs' && !!publicOverlayId;
  const previewRequests = useMemo(() => (
    Array.isArray(c.__appearancePreviewRequests)
      ? c.__appearancePreviewRequests.slice(0, maxDisplay)
      : null
  ), [c.__appearancePreviewRequests, maxDisplay]);
  const [requests, setRequests] = useState(() => previewRequests || []);
  const mountedRef = useRef(true);
  const fetchSeqRef = useRef(0);

  const fetchRequests = useCallback(async () => {
    if (!enabled) return;
    if (previewRequests) return;
    if (!userId && !usePublicOverlayApi) return;
    const seq = ++fetchSeqRef.current;
    let data = null;
    let error = null;
    if (usePublicOverlayApi) {
      try {
        const params = new URLSearchParams({
          publicOverlayId,
          limit: String(maxDisplay),
        });
        const response = await fetch(`/api/public-slot-requests?${params}`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        const payload = await response.json();
        data = Array.isArray(payload.requests) ? payload.requests : [];
      } catch (fetchError) {
        error = fetchError;
      }
    } else {
      ({ data, error } = await supabase
        .from('slot_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(maxDisplay));
    }
    if (seq !== fetchSeqRef.current) return;
    if (!error && data && mountedRef.current) setRequests(data);
  }, [enabled, maxDisplay, previewRequests, publicOverlayId, usePublicOverlayApi, userId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (enabled || previewRequests) return;
    setRequests([]);
  }, [enabled, previewRequests]);

  useEffect(() => {
    if (!previewRequests) return;
    setRequests(previewRequests);
  }, [previewRequests]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (previewRequests) return undefined;
    if (usePublicOverlayApi) return undefined;
    if (!userId) return undefined;
    const channel = supabase
      .channel(`${channelPrefix}-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'slot_requests',
        filter: `user_id=eq.${userId}`,
      }, () => { fetchRequests(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelPrefix, enabled, fetchRequests, previewRequests, usePublicOverlayApi, userId]);

  useEffect(() => {
    if (!enabled || previewRequests || !usePublicOverlayApi) return undefined;
    const interval = window.setInterval(fetchRequests, 5000);
    return () => window.clearInterval(interval);
  }, [enabled, fetchRequests, previewRequests, usePublicOverlayApi]);

  useEffect(() => (
    () => { mountedRef.current = false; }
  ), []);

  return {
    requests: enabled ? requests : [],
    maxDisplay,
    isPreview: !!previewRequests,
    refresh: fetchRequests,
  };
}

export default useSlotRequestsData;
