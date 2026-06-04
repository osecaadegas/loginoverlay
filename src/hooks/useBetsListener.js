/**
 * useBetsListener.js — Persistent chat listener for the Bets widget.
 *
 * Runs at app-level so bet monitoring stays active regardless of
 * which page the user is on. Connects to Twitch IRC when a bets
 * widget is active with gameStatus === 'open'.
 *
 * Chat command (configurable):  !bet <option_number> [amount]
 *   e.g. !bet 3 500  →  bet 500 on option 3
 *   e.g. !bet 3      →  bet 1 (implicit single vote) on option 3
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
  const pendingBetsRef = useRef([]);
  const flushTimerRef = useRef(null);
  // Track the timestamp of the most-recent config we've applied so a late-
  // returning initial load never overwrites a fresher realtime event.
  const configTimestampRef = useRef(0);

  // ── Load bets widget config & subscribe to changes ──
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
      if (ts < configTimestampRef.current) return; // realtime already gave us newer data
      configTimestampRef.current = ts;
      if (data?.config) {
        setBetsConfig({ widgetId: data.id, config: data.config });
      } else {
        setBetsConfig(null);
      }
    }

    load();

    // Polling fallback: re-sync every 10s in case a realtime event was missed
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

  // ── Batch-flush bets to DB every 1.5 s ──
  const betsConfigRef = useRef(betsConfig);
  betsConfigRef.current = betsConfig;

  useEffect(() => {
    if (!betsConfig?.widgetId) return;

    flushTimerRef.current = setInterval(async () => {
      if (pendingBetsRef.current.length === 0) return;
      const batch = [...pendingBetsRef.current];
      pendingBetsRef.current = [];

      const wid = betsConfigRef.current?.widgetId;
      if (!wid) return;

      try {
        const { data } = await supabase
          .from('overlay_widgets')
          .select('config')
          .eq('id', wid)
          .single();
        if (!data) return;

        const cfg = data.config || {};
        if (cfg.gameStatus !== 'open') return;

        const options = cfg.options || [];
        const bets = { ...(cfg.bets || {}) };
        const betters = { ...(cfg.betters || {}) };

        for (const bet of batch) {
          const optIdx = bet.optionIndex;
          if (optIdx < 0 || optIdx >= options.length) continue;

          // One bet per user per round
          if (betters[bet.username]) continue;

          const key = `opt_${optIdx}`;
          bets[key] = (bets[key] || 0) + bet.amount;
          betters[bet.username] = { option: optIdx, amount: bet.amount };
        }

        const { error: updateErr } = await supabase
          .from('overlay_widgets')
          .update({
            config: { ...cfg, bets, betters },
            updated_at: new Date().toISOString(),
          })
          .eq('id', wid);
        if (updateErr) {
          console.error('[BetsListener] flush UPDATE failed:', updateErr.message);
          pendingBetsRef.current = [...batch, ...pendingBetsRef.current];
        }
      } catch (err) {
        console.error('[BetsListener] flush failed:', err);
        pendingBetsRef.current = [...batch, ...pendingBetsRef.current];
      }
    }, 1500);

    return () => clearInterval(flushTimerRef.current);
  }, [betsConfig?.widgetId]);

  // ── Parse incoming chat messages ──
  const handleMessage = useCallback((msg) => {
    const bc = betsConfigRef.current;
    if (!bc?.config) return;
    if (bc.config.gameStatus !== 'open') return;

    const text = (msg.message || '').trim().toLowerCase();
    const trigger = (bc.config.chatCommand || '!bet').toLowerCase();

    if (!text.startsWith(trigger + ' ') && text !== trigger) return;

    const parts = text.slice(trigger.length).trim().split(/\s+/).filter(Boolean);
    if (parts.length < 1) return;

    const optionNum = parseInt(parts[0], 10);
    // Amount is optional — default to 1 (pure vote mode)
    const amount = parts.length >= 2 ? parseInt(parts[1], 10) : 1;

    if (isNaN(optionNum) || isNaN(amount) || amount <= 0) return;

    const optionIndex = optionNum - 1;
    const options = bc.config.options || [];
    if (optionIndex < 0 || optionIndex >= options.length) return;

    const username = (msg.username || '').toLowerCase();
    if (!username) return;

    const existingBetters = bc.config.betters || {};
    if (existingBetters[username]) return;

    pendingBetsRef.current.push({ username, optionIndex, amount });
  }, []);

  // ── Connect to Twitch chat only when game is open ──
  const isOpen = betsConfig?.config?.gameStatus === 'open';
  const twitchChannel = (betsConfig?.config?.twitchChannel || '').trim().toLowerCase().replace(/^#/, '') || autoChannel || '';

  useTwitchChat(isOpen ? twitchChannel : '', handleMessage);
}
