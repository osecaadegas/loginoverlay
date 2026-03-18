/**
 * SlotRequestsWidget.jsx — Dispatcher: fetches data, manages IRC,
 * then delegates rendering to the selected display style.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import useTwitchChat from '../../../hooks/useTwitchChat';
import useKickChat from '../../../hooks/useKickChat';
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

  /* ── IRC !sr listener (always on when channel is configured) ── */
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const handleMessageRef = useRef(null);
  handleMessageRef.current = async (msg) => {
    const text = (msg.message || '').trim();
    const match = text.match(/^!sr\s+(.+)/i);
    if (!match) return;
    const slotName = match[1].trim();
    if (!slotName || !userIdRef.current) return;
    try {
      await fetch(`${window.location.origin}/api/chat-commands?cmd=sr&user_id=${encodeURIComponent(userIdRef.current)}&requester=${encodeURIComponent(msg.username)}&slot=${encodeURIComponent(slotName)}`);
    } catch (err) {
      console.error('[SlotRequestsWidget] !sr error', err);
    }
  };

  const handleMessage = useCallback((msg) => {
    handleMessageRef.current?.(msg);
  }, []);

  const listenTwitch = !!c.twitchChannel;
  const listenKick = !!c.kickChannelId;
  useTwitchChat(listenTwitch ? c.twitchChannel : '', handleMessage);
  useKickChat(listenKick ? c.kickChannelId : '', handleMessage);

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
