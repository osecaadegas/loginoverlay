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
import { resolveSlotRequestSettings } from '../../shared/slotRequestSettings.js';

export default function useSlotRequestListener() {
  const { user } = useAuth();
  const [srConfig, setSrConfig] = useState(null);
  const autoChannel = useTwitchChannel();
  const dedupRef = useRef(new Map());

  // ── Load slot_requests widget config ──
  useEffect(() => {
    setSrConfig(null);
    dedupRef.current.clear();
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from('overlay_widgets')
        .select('id, widget_type, config, updated_at')
        .eq('user_id', user.id)
        .in('widget_type', ['bonus_hunt', 'slot_requests']);

      if (cancelled) return;

      const settings = !error && resolveSlotRequestSettings(data || []);
      if (settings && settings.config.srChatEnabled !== false) {
        setSrConfig({
          widgetId: settings.widgetId,
          commandTrigger: (settings.config.commandTrigger || '!sr').trim().toLowerCase(),
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
        if (payload.eventType === 'DELETE' || ['bonus_hunt', 'slot_requests'].includes(payload.new?.widget_type)) load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ── Chat message handler ──
  const srConfigRef = useRef(srConfig);
  srConfigRef.current = srConfig;
  const userRef = useRef(user);
  userRef.current = user;

  const handleMessage = useCallback(async (msg) => {
    const cfg = srConfigRef.current;
    const u = userRef.current;
    if (!cfg || !u) return;

    const trigger = cfg.commandTrigger || '!sr';
    const text = (msg.message || '').trim();
    const lower = text.toLowerCase();

    if (!lower.startsWith(trigger + ' ') && lower !== trigger) return;

    const slotName = text.slice(trigger.length).trim();
    if (!slotName) return;

    const requester = msg.login || msg.username;
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

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || session.user.id !== u.id) return;
      const response = await fetch('/api/chat-commands?cmd=sr', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: u.id, requester, slot: slotName, message_id: msg.id,
          chatter_id: msg.twitchUserId, broadcaster_id: msg.broadcasterId }),
      });
      const result = await response.json();
      if (!response.ok) console.error('[SR-Listener]', result.error || 'Request failed');
    } catch (err) { console.error('[SR-Listener]', err); }
  }, []);

  // ── Connect to Twitch chat ──
  const identity = user?.identities?.find(item => item.provider === 'twitch')?.identity_data;
  const channel = identity?.preferred_username || identity?.nickname || identity?.slug || autoChannel || '';
  useTwitchChat(srConfig ? channel : '', handleMessage);
}
