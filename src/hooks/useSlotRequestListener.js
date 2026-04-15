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
  const dedupRef = useRef(new Map());

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
        const row = payload.new;
        if (!row || row.widget_type !== 'slot_requests') return;

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

    // Dedup: skip if same viewer+slot within 15s
    const dedupKey = `${requester.toLowerCase()}|${slotName.toLowerCase()}`;
    const now = Date.now();
    if (dedupRef.current.has(dedupKey) && now - dedupRef.current.get(dedupKey) < 15000) return;
    dedupRef.current.set(dedupKey, now);

    // Clean old entries
    if (dedupRef.current.size > 50) {
      for (const [k, t] of dedupRef.current) { if (now - t > 30000) dedupRef.current.delete(k); }
    }

    // Fire to the API
    fetch(`${window.location.origin}/api/chat-commands?cmd=sr&user_id=${encodeURIComponent(u.id)}&requester=${encodeURIComponent(requester)}&slot=${encodeURIComponent(slotName)}`)
      .catch(err => console.error('[SR-Listener]', err));
  }, []);

  // ── Connect to Twitch chat ──
  const channel = srConfig?.twitchChannel || autoChannel || '';
  useTwitchChat(srConfig ? channel : '', handleMessage);
}
