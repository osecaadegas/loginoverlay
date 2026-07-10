/**
 * useBetsListener.js - Persistent chat listener for the Bets widget.
 *
 * Runs at app-level so bet monitoring stays active regardless of which page
 * the streamer has open. Incoming chat bets are sent to the server handler,
 * matching Slot Requests: the API owns validation, SE point deduction,
 * chat messages, and the widget config update.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import useTwitchChat from './useTwitchChat';
import useTwitchChannel from './useTwitchChannel';

export default function useBetsListener() {
  const { user } = useAuth();
  const [betsConfig, setBetsConfig] = useState(null);
  const autoChannel = useTwitchChannel();
  const configTimestampRef = useRef(0);
  const dedupRef = useRef(new Map());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('overlay_widgets')
        .select('id, config, updated_at')
        .eq('user_id', user.id)
        .eq('widget_type', 'bets')
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      const ts = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
      if (ts < configTimestampRef.current) return;
      configTimestampRef.current = ts;
      setBetsConfig(data?.config ? { widgetId: data.id, config: data.config } : null);
    }

    load();
    const pollTimer = setInterval(load, 10_000);

    const channel = supabase
      .channel(`bets-listener-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'overlay_widgets',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const row = payload.new;
        if (!row || row.widget_type !== 'bets') return;
        if (row.config) {
          const ts = row.updated_at ? new Date(row.updated_at).getTime() : Date.now();
          configTimestampRef.current = ts;
          setBetsConfig({ widgetId: row.id, config: row.config });
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const betsConfigRef = useRef(betsConfig);
  betsConfigRef.current = betsConfig;
  const userRef = useRef(user);
  userRef.current = user;

  const handleMessage = useCallback((msg) => {
    const bc = betsConfigRef.current;
    const u = userRef.current;
    if (!bc?.config || !u) return;
    if (bc.config.gameStatus !== 'open') return;

    const rawText = (msg.message || '').trim();
    const lowerText = rawText.toLowerCase();
    const trigger = (bc.config.chatCommand || '!bet').trim().toLowerCase();
    if (!trigger) return;
    if (!lowerText.startsWith(trigger + ' ') && lowerText !== trigger) return;

    const parts = rawText.slice(trigger.length).trim().split(/\s+/).filter(Boolean);
    if (parts.length < 1) return;

    const optionNum = parseInt(parts[0], 10);
    const fallbackAmount = parseInt(bc.config.betDefaultAmount ?? bc.config.betMinAmount, 10) || 1;
    const amount = parts.length >= 2 ? parseInt(parts[1], 10) : fallbackAmount;
    if (isNaN(optionNum) || isNaN(amount) || amount <= 0) return;

    const optionIndex = optionNum - 1;
    const options = bc.config.options || [];
    if (optionIndex < 0 || optionIndex >= options.length) return;

    const username = (msg.username || '').replace(/^@/, '').trim().toLowerCase();
    if (!username) return;

    const existingBetters = bc.config.betters || {};
    if (existingBetters[username]) return;

    const dedupKey = `${username}|${optionNum}|${amount}`;
    const now = Date.now();
    if (dedupRef.current.has(dedupKey) && now - dedupRef.current.get(dedupKey) < 10000) return;
    dedupRef.current.set(dedupKey, now);

    if (dedupRef.current.size > 100) {
      for (const [key, ts] of dedupRef.current) {
        if (now - ts > 30000) dedupRef.current.delete(key);
      }
    }

    fetch(
      `${window.location.origin}/api/chat-commands?cmd=bet&user_id=${encodeURIComponent(u.id)}&requester=${encodeURIComponent(username)}&option=${encodeURIComponent(optionNum)}&amount=${encodeURIComponent(amount)}`
    ).catch(err => {
      dedupRef.current.delete(dedupKey);
      console.error('[BetsListener]', err);
    });
  }, []);

  const isOpen = betsConfig?.config?.gameStatus === 'open';
  const twitchChannel = (betsConfig?.config?.twitchChannel || '').trim().toLowerCase().replace(/^#/, '') || autoChannel || '';

  useTwitchChat(isOpen ? twitchChannel : '', handleMessage);
}
