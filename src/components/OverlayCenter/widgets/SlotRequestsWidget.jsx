/**
 * SlotRequestsWidget.jsx — Dispatcher: fetches data, manages IRC,
 * then delegates rendering to the selected display style.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import SlotRequestsWidgetList from './SlotRequestsWidgetList';
import SlotRequestsWidgetBoard from './SlotRequestsWidgetBoard';

export default function SlotRequestsWidget({ config, userId }) {
  const c = config || {};
  const [requests, setRequests] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const maxDisplay = c.maxDisplay || 20;

  /* ── Fetch requests ── */
  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from('slot_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(maxDisplay);
    if (data) setRequests(data);
  }, [maxDisplay]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  /* ── Realtime ── */
  useEffect(() => {
    const channel = supabase
      .channel('slot-requests-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slot_requests' }, () => {
        fetchRequests();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests]);

  /* ── Twitch IRC listener ── */
  useEffect(() => {
    const raw = c.twitchChannel;
    if (!raw || !userId) return;
    const ch = raw.trim().toLowerCase().replace(/^#/, '');
    if (!ch) return;
    let alive = true;
    let ws;
    const connect = () => {
      if (!alive) return;
      ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      wsRef.current = ws;
      ws.onopen = () => {
        ws.send('PASS SCHMOOPIIE');
        ws.send('NICK justinfan' + Math.floor(Math.random() * 100000));
        ws.send('JOIN #' + ch);
      };
      ws.onmessage = async (event) => {
        for (const line of event.data.split('\r\n')) {
          if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
          const m = line.match(/:(\w+)!\w+@[\w.]+\.tmi\.twitch\.tv PRIVMSG #\w+ :!sr (.+)/i);
          if (m) {
            const slotName = m[2].trim();
            if (slotName) {
              try { await fetch(`${window.location.origin}/api/chat-commands?cmd=sr&user_id=${encodeURIComponent(userId)}&requester=${encodeURIComponent(m[1])}&slot=${encodeURIComponent(slotName)}`); }
              catch {}
            }
          }
        }
      };
      ws.onclose = () => { if (alive) reconnectTimer.current = setTimeout(connect, 5000); };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => {
      alive = false;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [c.twitchChannel, userId]);

  /* ── Style dispatch ── */
  if (c.displayStyle === 'v2_board') {
    return <SlotRequestsWidgetBoard config={c} requests={requests} />;
  }

  return <SlotRequestsWidgetList config={c} requests={requests} />;
}
