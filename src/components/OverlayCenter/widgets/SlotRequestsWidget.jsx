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
  const configRef = useRef(c);
  configRef.current = c;

  /* Dedup map: track recently submitted slot requests to avoid duplicates from chat */
  const recentSrRef = useRef(new Map());

  const handleMessageRef = useRef(null);
  handleMessageRef.current = async (msg) => {
    const text = (msg.message || '').trim();
    const match = text.match(/^!sr\s+(.+)/i);
    if (!match) return;
    const slotName = match[1].trim().toLowerCase();
    if (!slotName || !userIdRef.current) return;

    // When SE integration is enabled, the SE custom command on the SE dashboard
    // already intercepts !sr and calls the API.  The widget must NOT also call it
    // — each overlay instance would fire a duplicate request, causing chat spam.
    const conf = configRef.current || {};
    if (conf.srSeEnabled) return;

    // Skip if same slot was requested in the last 10 seconds
    const now = Date.now();
    const lastTime = recentSrRef.current.get(slotName);
    if (lastTime && now - lastTime < 10000) return;
    recentSrRef.current.set(slotName, now);

    // Clean old entries
    for (const [key, ts] of recentSrRef.current) {
      if (now - ts > 30000) recentSrRef.current.delete(key);
    }

    try {
      const params = new URLSearchParams({
        cmd: 'sr',
        user_id: userIdRef.current,
        requester: msg.username,
        slot: match[1].trim(),
      });
      // Pass SE points config if enabled
      const conf = configRef.current || {};
      if (conf.srSeEnabled && conf.srSeCost > 0) {
        params.set('se_enabled', '1');
        params.set('se_cost', String(conf.srSeCost));
      }
      await fetch(`${window.location.origin}/api/chat-commands?${params.toString()}`);
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
