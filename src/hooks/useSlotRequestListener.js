/**
 * useSlotRequestListener.js — Persistent chat listener for !sr commands.
 *
 * Runs at app-level (like useGiveawayListener) so slot request monitoring
 * stays active regardless of which page the user is on. Connects to Twitch
 * IRC whenever a slot_requests widget exists and srChatEnabled is true.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import useTwitchChat from './useTwitchChat';
import useTwitchChannel from './useTwitchChannel';

export default function useSlotRequestListener() {
  const { user } = useAuth();
  const [srConfig, setSrConfig] = useState(null);
  const autoChannel = useTwitchChannel();
  // Use a Set of Twitch message IDs instead of a time-based Map.
  // Every Twitch PRIVMSG carries a globally unique `id` tag.
  // Two browser tabs receiving the same message get the same ID — only the
  // first tab to POST it will win the DB unique index; the second is a no-op.
  const seenMsgIds = useRef(new Set());

  // ── Load slot_requests widget config ──
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('overlay_widgets')
        .select('id, config')
        .eq('user_id', user.id)
        .eq('widget_type', 'slot_requests')
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (data?.config?.srChatEnabled !== false) {
        setSrConfig({
          widgetId: data?.id,
          twitchChannel: (data?.config?.twitchChannel || '').trim().toLowerCase().replace(/^#/, ''),
          commandTrigger: (data?.config?.commandTrigger || '!sr').trim().toLowerCase(),
        });
      } else {
        setSrConfig(null);
      }
    }

    load();

    // Subscribe to config changes
    const channel = supabase
      .channel(`sr-listener-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'overlay_widgets',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        // For DELETE events, payload.new is null — use payload.old or refetch
        const row = payload.new || payload.old;
        if (!row || row.widget_type !== 'slot_requests') return;

        if (payload.eventType === 'DELETE') {
          setSrConfig(null);
          return;
        }

        if (row.config?.srChatEnabled !== false) {
          setSrConfig({
            widgetId: row.id,
            twitchChannel: (row.config?.twitchChannel || '').trim().toLowerCase().replace(/^#/, ''),
            commandTrigger: (row.config?.commandTrigger || '!sr').trim().toLowerCase(),
          });
        } else {
          setSrConfig(null);
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ── Chat message handler ──
  const srConfigRef = useRef(srConfig);
  srConfigRef.current = srConfig;
  const userRef = useRef(user);
  userRef.current = user;

  const handleMessage = useCallback((msg) => {
    const cfg = srConfigRef.current;
    const u = userRef.current;
    if (!cfg || !u) return;

    const trigger = cfg.commandTrigger || '!sr';
    const text = (msg.message || '').trim();
    const lower = text.toLowerCase();

    if (!lower.startsWith(trigger + ' ') && lower !== trigger) return;

    const slotName = text.slice(trigger.length).trim();
    if (!slotName) return;

    const requester = msg.username;
    if (!requester) return;

    // Primary dedup: Twitch message ID (same message in two tabs has the same ID)
    const msgId = msg.id;
    if (msgId) {
      if (seenMsgIds.current.has(msgId)) return;
      seenMsgIds.current.add(msgId);
      // Keep the Set bounded — prune oldest half when it grows past 300 entries
      if (seenMsgIds.current.size > 300) {
        const arr = [...seenMsgIds.current];
        seenMsgIds.current = new Set(arr.slice(-150));
      }
    }

    // Fire to the API — POST with JSON body to avoid sensitive data in query string
    fetch(`${window.location.origin}/api/chat-commands?cmd=sr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: u.id, requester, slot: slotName }),
    }).catch(err => console.error('[SR-Listener]', err));
  }, []);

  // ── Connect to Twitch chat ──
  const channel = srConfig?.twitchChannel || autoChannel || '';
  useTwitchChat(srConfig ? channel : '', handleMessage);
}
