/**
 * SlotRequestsWidget.jsx — Main dispatcher for the Slot Requests widget.
 *
 * Responsibilities:
 *   1. Fetch pending slot_requests from Supabase for this user
 *   2. Subscribe to realtime changes (INSERT/UPDATE/DELETE)
 *   3. Listen to Twitch IRC for !sr commands (always-on when srChatEnabled)
 *   4. Delegate rendering to the active display style component
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import SlotRequestsMinimal from './SlotRequestsMinimal';
import SlotRequestsCardStack from './SlotRequestsCardStack';
import SlotRequestsCompactOverlay from './SlotRequestsCompactOverlay';

export default function SlotRequestsWidget({ config, userId }) {
  const c = config || {};
  const maxDisplay = c.maxDisplay || 20;
  const [requests, setRequests] = useState([]);
  const mountedRef = useRef(true);

  /* ── Fetch pending requests ── */
  const fetchRequests = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('slot_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(maxDisplay);
    if (!error && data && mountedRef.current) setRequests(data);
  }, [userId, maxDisplay]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  /* ── Realtime subscription ── */
  useEffect(() => {
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
  }, [fetchRequests, userId]);

  /* ── NOTE: Twitch IRC chat listener has been moved to useSlotRequestListener.js ── */
  /* ── (app-level persistent hook) — no widget-scoped WebSocket needed anymore ── */

  /* ── Cleanup ref ── */
  useEffect(() => {
    mountedRef.current = true;
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
