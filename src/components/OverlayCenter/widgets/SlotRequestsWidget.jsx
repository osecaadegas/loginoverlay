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
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

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

  /* ── Twitch IRC listener — always-on when srChatEnabled ── */
  const chatEnabled = c.srChatEnabled !== false;
  const twitchChannel = (c.twitchChannel || '').trim().toLowerCase().replace(/^#/, '');
  const cmdTrigger = (c.commandTrigger || '!sr').trim().toLowerCase();
  const srSeEnabled = !!c.srSeEnabled;

  useEffect(() => {
    if (!chatEnabled || !twitchChannel || !userId) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      return;
    }

    let alive = true;

    // Build regex from command trigger: escape special chars, match rest of line
    const escaped = cmdTrigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cmdRegex = new RegExp(`:([\\w]+)![\\w]+@[\\w.]+\\.tmi\\.twitch\\.tv PRIVMSG #\\w+ :${escaped}\\s+(.+)`, 'i');

    const connect = () => {
      if (!alive) return;
      const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send('PASS SCHMOOPIIE');
        ws.send('NICK justinfan' + Math.floor(Math.random() * 100000));
        ws.send('JOIN #' + twitchChannel);
      };

      ws.onmessage = async (event) => {
        for (const line of event.data.split('\r\n')) {
          if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }

          // Skip when SE custom command handles points-based requests
          if (srSeEnabled) continue;

          const m = line.match(cmdRegex);
          if (m) {
            const requester = m[1];
            const slotName = m[2].trim();
            if (slotName) {
              try {
                await fetch(`${window.location.origin}/api/chat-commands?cmd=sr&user_id=${encodeURIComponent(userId)}&requester=${encodeURIComponent(requester)}&slot=${encodeURIComponent(slotName)}`);
              } catch (err) {
                console.error('[SR-IRC]', err);
              }
            }
          }
        }
      };

      ws.onclose = () => {
        if (alive) { reconnectRef.current = setTimeout(connect, 5000); }
      };
      ws.onerror = () => ws.close();
    };

    const debounce = setTimeout(connect, 600);
    return () => {
      alive = false;
      clearTimeout(debounce);
      clearTimeout(reconnectRef.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [chatEnabled, twitchChannel, cmdTrigger, srSeEnabled, userId]);

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
