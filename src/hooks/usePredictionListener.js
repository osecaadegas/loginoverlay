/**
 * usePredictionListener.js — Persistent chat listener for bonus hunt predictions.
 *
 * Runs at app-level so prediction bet monitoring stays active regardless
 * of which page the user is on. Connects to Twitch IRC when a predictions
 * widget is active with gameStatus === 'open'.
 *
 * Chat command:  !bet <option number> <amount>
 *   e.g. !bet 5 500  →  bet 500 points on option 5
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import useTwitchChat from './useTwitchChat';
import useTwitchChannel from './useTwitchChannel';

export default function usePredictionListener() {
  const { user } = useAuth();
  const [predConfig, setPredConfig] = useState(null);
  const autoChannel = useTwitchChannel();
  const pendingBetsRef = useRef([]);
  const flushTimerRef = useRef(null);

  // ── Load predictions widget config ──
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('overlay_widgets')
        .select('id, config')
        .eq('user_id', user.id)
        .eq('widget_type', 'predictions')
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (data?.config) {
        setPredConfig({ widgetId: data.id, config: data.config });
      } else {
        setPredConfig(null);
      }
    }

    load();

    // Subscribe to config changes (status open/locked etc.)
    const channel = supabase
      .channel(`pred-listener-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'overlay_widgets',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const row = payload.new;
        if (!row || row.widget_type !== 'predictions') return;
        if (row.config) {
          setPredConfig({ widgetId: row.id, config: row.config });
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ── Batch flush bets to DB every 1.5s ──
  const predConfigRef = useRef(predConfig);
  predConfigRef.current = predConfig;

  useEffect(() => {
    if (!predConfig?.widgetId) return;

    flushTimerRef.current = setInterval(async () => {
      if (pendingBetsRef.current.length === 0) return;
      const batch = [...pendingBetsRef.current];
      pendingBetsRef.current = [];

      const wid = predConfigRef.current?.widgetId;
      if (!wid) return;

      try {
        // Read latest config atomically
        const { data } = await supabase
          .from('overlay_widgets')
          .select('config')
          .eq('id', wid)
          .single();
        if (!data) return;

        const cfg = data.config || {};
        if (cfg.gameStatus !== 'open') return; // Only accept bets when open

        const options = cfg.options || [];
        const bets = { ...(cfg.bets || {}) };
        const betters = { ...(cfg.betters || {}) };

        for (const bet of batch) {
          const optIdx = bet.optionIndex;
          if (optIdx < 0 || optIdx >= options.length) continue;

          // Check if user already bet (one bet per user)
          if (betters[bet.username]) continue;

          const key = `opt_${optIdx}`;
          bets[key] = (bets[key] || 0) + bet.amount;
          betters[bet.username] = { option: optIdx, amount: bet.amount };
        }

        await supabase
          .from('overlay_widgets')
          .update({
            config: { ...cfg, bets, betters },
            updated_at: new Date().toISOString(),
          })
          .eq('id', wid);
      } catch (err) {
        console.error('[PredictionListener] flush failed:', err);
        pendingBetsRef.current = [...batch, ...pendingBetsRef.current];
      }
    }, 1500);

    return () => clearInterval(flushTimerRef.current);
  }, [predConfig?.widgetId]);

  // ── Chat message handler ──
  const userRef = useRef(user);
  userRef.current = user;

  const handleMessage = useCallback((msg) => {
    const pc = predConfigRef.current;
    if (!pc?.config) return;
    if (pc.config.gameStatus !== 'open') return;

    const text = (msg.message || '').trim().toLowerCase();
    const trigger = (pc.config.commandTrigger || '!bet').toLowerCase();

    // Parse: !bet <option_number> <amount>
    if (!text.startsWith(trigger + ' ')) return;

    const parts = text.slice(trigger.length).trim().split(/\s+/);
    if (parts.length < 2) return;

    const optionNum = parseInt(parts[0], 10);
    const amount = parseInt(parts[1], 10);

    if (isNaN(optionNum) || isNaN(amount) || amount <= 0) return;

    const optionIndex = optionNum - 1; // Convert 1-based to 0-based
    const options = pc.config.options || [];
    if (optionIndex < 0 || optionIndex >= options.length) return;

    const username = (msg.username || '').toLowerCase();
    if (!username) return;

    // Check if user already bet (quick local check)
    const existingBetters = pc.config.betters || {};
    if (existingBetters[username]) return;

    pendingBetsRef.current.push({
      username,
      optionIndex,
      amount,
    });
  }, []);

  // ── Connect to Twitch chat ──
  const isOpen = predConfig?.config?.gameStatus === 'open';
  const twitchChannel = (predConfig?.config?.twitchChannel || '').trim().toLowerCase().replace(/^#/, '') || autoChannel || '';
  useTwitchChat(isOpen ? twitchChannel : '', handleMessage);
}
