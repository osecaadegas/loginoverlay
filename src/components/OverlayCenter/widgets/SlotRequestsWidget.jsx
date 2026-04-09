/**
 * SlotRequestsWidget.jsx — Dispatcher: fetches data,
 * then delegates rendering to the selected display style.
 * IRC !sr handling lives in ProfileSection to avoid duplicate connections.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import SlotRequestsWidgetList from './SlotRequestsWidgetList';
import SlotRequestsWidgetBoard from './SlotRequestsWidgetBoard';
import SlotRequestsWidgetCompact from './SlotRequestsWidgetCompact';
import SlotRequestsWidgetFloat from './SlotRequestsWidgetFloat';

export default function SlotRequestsWidget({ config, userId }) {
  const c = config || {};
  const [requests, setRequests] = useState([]);
  const maxDisplay = c.maxDisplay || 20;

  /* ── Fetch requests ── */
  const fetchRequests = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('slot_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(maxDisplay);
    if (data) setRequests(data);
  }, [userId, maxDisplay]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  /* ── Realtime ── */
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`slot-requests-widget-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'slot_requests',
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchRequests();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests, userId]);

  /* ── IRC !sr is handled by ProfileSection to avoid duplicate connections ── */

  /* ── Style dispatch ── */
  if (c.displayStyle === 'v2_board') {
    return <SlotRequestsWidgetBoard config={c} requests={requests} />;
  }
  if (c.displayStyle === 'v3_compact') {
    return <SlotRequestsWidgetCompact config={c} requests={requests} />;
  }
  if (c.displayStyle === 'v4_float') {
    return <SlotRequestsWidgetFloat config={c} requests={requests} />;
  }

  return <SlotRequestsWidgetList config={c} requests={requests} />;
}
