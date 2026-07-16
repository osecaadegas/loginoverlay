/**
 * SlotRequestsWidget.jsx — Main dispatcher for the Slot Requests widget.
 *
 * Responsibilities:
 *   1. Fetch pending slot_requests from Supabase for this user
 *   2. Subscribe to realtime changes (INSERT/UPDATE/DELETE)
 *   3. Listen to Twitch IRC for !sr commands (always-on when srChatEnabled)
 *   4. Delegate rendering to the active display style component
 */
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import SlotRequestsMinimal from './SlotRequestsMinimal';
import SlotRequestsCardStack from './SlotRequestsCardStack';
import SlotRequestsCompactOverlay from './SlotRequestsCompactOverlay';

export default function SlotRequestsWidget({ config, userId }) {
  const c = config || {};
  const maxDisplay = c.maxDisplay || 20;
  const previewRequests = useMemo(() => (
    Array.isArray(c.__appearancePreviewRequests)
      ? c.__appearancePreviewRequests.slice(0, maxDisplay)
      : null
  ), [c.__appearancePreviewRequests, maxDisplay]);
  const [requests, setRequests] = useState(previewRequests || []);
  const mountedRef = useRef(true);
  // Monotonic counter — stale in-flight fetches are silently discarded.
  const fetchSeqRef = useRef(0);

  /* ── Fetch pending requests (stale-result protected) ── */
  const fetchRequests = useCallback(async () => {
    if (previewRequests) return;
    if (!userId) return;
    const seq = ++fetchSeqRef.current;
    const { data, error } = await supabase
      .from('slot_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(maxDisplay);
    if (seq !== fetchSeqRef.current) return; // stale result — discard
    if (!error && data && mountedRef.current) setRequests(data);
  }, [userId, maxDisplay, previewRequests]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    if (!previewRequests) return;
    setRequests(previewRequests);
  }, [previewRequests]);

  /* ── Realtime subscription ── */
  useEffect(() => {
    if (previewRequests) return;
    if (!userId) return;
    const channel = supabase
      .channel(`sr-widget-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'slot_requests',
        filter: `user_id=eq.${userId}`,
      }, () => { fetchRequests(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests, previewRequests, userId]);

  /* ── NOTE: Twitch IRC chat listener has been moved to useSlotRequestListener.js ── */
  /* ── (app-level persistent hook) — no widget-scoped WebSocket needed anymore ── */

  /* ── Cleanup ref ── */
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  /* ── Style dispatch (all hooks above — safe for React rules) ── */
  const ds = c.displayStyle || 'v1_minimal';

  if (ds === 'v2_card_stack') {
    return <SlotRequestsCardStack config={c} requests={requests} />;
  }
  if (ds === 'v3_compact') {
    return <SlotRequestsCompactOverlay config={c} requests={requests} />;
  }

  return <SlotRequestsMinimal config={c} requests={requests} />;
}
