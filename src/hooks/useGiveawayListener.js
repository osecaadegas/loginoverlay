/**
 * useGiveawayListener.js — Persistent giveaway chat listener.
 *
 * Runs at app-level so giveaway keyword monitoring stays active
 * regardless of which page the user is on.  Connects to Twitch / Kick
 * chat whenever a giveaway widget is active and flushes new participants
 * directly to Supabase every 2 seconds.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import useTwitchChat from './useTwitchChat';
import useKickChat from './useKickChat';

export default function useGiveawayListener() {
  const { user } = useAuth();
  const [giveaway, setGiveaway] = useState(null); // { widgetId, keyword, twitchChannel, kickChannelId, participants }

  // ── Load giveaway widget config from DB ──
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('overlay_widgets')
        .select('id, config')
        .eq('user_id', user.id)
        .eq('widget_type', 'giveaway')
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (data?.config?.isActive && data.config.keyword) {
        setGiveaway({
          widgetId: data.id,
          keyword: (data.config.keyword || '').toLowerCase().trim(),
          twitchChannel: data.config.twitchEnabled ? (data.config.twitchChannel || '') : '',
          kickChannelId: data.config.kickEnabled ? (data.config.kickChannelId || '') : '',
          participants: new Set(data.config.participants || []),
          winner: data.config.winner || '',
        });
      } else {
        setGiveaway(null);
      }
    }

    load();

    // Subscribe to realtime changes on the giveaway widget
    const channel = supabase
      .channel(`giveaway-listener-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'overlay_widgets',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const row = payload.new;
        if (!row || row.widget_type !== 'giveaway') return;

        if (row.config?.isActive && row.config.keyword && !row.config.winner) {
          setGiveaway(prev => ({
            widgetId: row.id,
            keyword: (row.config.keyword || '').toLowerCase().trim(),
            twitchChannel: row.config.twitchEnabled ? (row.config.twitchChannel || '') : '',
            kickChannelId: row.config.kickEnabled ? (row.config.kickChannelId || '') : '',
            participants: new Set(row.config.participants || []),
            winner: '',
          }));
        } else {
          setGiveaway(null);
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ── Pending participants: batch-flush to DB ──
  const pendingRef = useRef([]);
  const giveawayRef = useRef(giveaway);
  giveawayRef.current = giveaway;

  useEffect(() => {
    if (!giveaway?.widgetId) return;

    const timer = setInterval(async () => {
      if (pendingRef.current.length === 0) return;
      const batch = [...pendingRef.current];
      pendingRef.current = [];
      const wid = giveawayRef.current?.widgetId;
      if (!wid) return;

      try {
        const { data } = await supabase
          .from('overlay_widgets')
          .select('config')
          .eq('id', wid)
          .single();
        if (!data) return;
        const current = data.config?.participants || [];
        const merged = [...new Set([...current, ...batch])];
        if (merged.length === current.length) return;
        await supabase
          .from('overlay_widgets')
          .update({ config: { ...data.config, participants: merged }, updated_at: new Date().toISOString() })
          .eq('id', wid);
      } catch (err) {
        console.error('[GiveawayListener] flush failed:', err);
        pendingRef.current = [...batch, ...pendingRef.current];
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [giveaway?.widgetId]);

  // ── Chat message handler ──
  const handleMessage = useCallback((msg) => {
    const g = giveawayRef.current;
    if (!g?.keyword) return;
    const text = (msg.message || '').trim().toLowerCase();
    if (text === `!${g.keyword}` || text.startsWith(`!${g.keyword} `)) {
      const name = msg.username;
      if (name && !g.participants.has(name)) {
        g.participants.add(name);
        pendingRef.current.push(name);
      }
    }
  }, []);

  // ── Connect to chat platforms ──
  const listenTwitch = !!giveaway && !giveaway.winner && !!giveaway.twitchChannel;
  const listenKick = !!giveaway && !giveaway.winner && !!giveaway.kickChannelId;
  useTwitchChat(listenTwitch ? giveaway.twitchChannel : '', handleMessage);
  useKickChat(listenKick ? giveaway.kickChannelId : '', handleMessage);
}
