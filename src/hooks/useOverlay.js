/**
 * useOverlay.js — Main hook for the overlay control center.
 * Provides: instance, theme, widgets, state, realtime sync.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabaseClient';
import {
  getOrCreateInstance,
  getTheme,
  updateTheme,
  getWidgets,
  createWidget,
  upsertWidget,
  deleteWidget,
  getOverlayState,
  patchOverlayState,
  subscribeToOverlay,
  unsubscribeOverlay,
  regenerateToken,
} from '../services/overlayService';

export function useOverlay() {
  const { user } = useAuth();
  const [instance, setInstance] = useState(null);
  const [theme, setTheme] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [overlayState, setOverlayState] = useState({});
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  // ── Load everything on mount ──
  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [inst, th, wdgs, st] = await Promise.all([
        getOrCreateInstance(user.id, user.user_metadata?.full_name || user.email),
        getTheme(user.id),
        getWidgets(user.id),
        getOverlayState(user.id),
      ]);
      setInstance(inst);
      setTheme(th);
      setWidgets(wdgs);
      setOverlayState(st);
    } catch (err) {
      console.error('[useOverlay] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!user) return;
    channelRef.current = subscribeToOverlay(user.id, {
      onState: (s) => setOverlayState(s),
      onWidgets: () => getWidgets(user.id).then(setWidgets),
      onTheme: (t) => setTheme(t),
    });
    return () => unsubscribeOverlay(channelRef.current);
  }, [user]);

  // ── Auto-tracker: listen for detected_slots changes and update current_slot / single_slot widgets ──
  const detectedChannelRef = useRef(null);
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`detected_slots_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'detected_slots',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const detected = payload.new;
        if (!detected?.slot_name) return;

        // Look up the slot in the database (fuzzy match)
        const term = detected.slot_name.trim();
        let slotData = null;
        try {
          const { data } = await supabase.from('slots')
            .select('id, name, provider, image, rtp')
            .ilike('name', `%${term}%`)
            .limit(1);
          if (data?.length) {
            slotData = data[0];
          }
        } catch { /* ignore lookup error */ }

        // Build the update payload
        const update = {
          slotName: slotData?.name || detected.slot_name,
          provider: slotData?.provider || detected.provider || '',
          imageUrl: slotData?.image || '',
          slotId: slotData?.id || null,
        };
        if (slotData?.rtp) update.rtp = slotData.rtp;
        if (detected.bet_size != null) update.betSize = detected.bet_size;
        if (detected.last_win != null) update.lastWin = detected.last_win;

        // Also fetch user slot records so bestWin/averageMulti/etc reach OBS
        try {
          const resolvedName = slotData?.name || detected.slot_name;
          const { data: rec } = await supabase
            .from('user_slot_records')
            .select('*')
            .eq('user_id', user.id)
            .eq('slot_name', resolvedName)
            .maybeSingle();
          if (rec) {
            update.averageMulti = Math.round((rec.average_multi || 0) * 10) / 10;
            update.bestMulti = Math.round((rec.best_multiplier || 0) * 10) / 10;
            update.totalBonuses = rec.total_bonuses || 0;
            update.bestWin = Math.round((rec.best_win || 0) * 10) / 10;
            update.lastBet = Number(rec.last_bet_size) || 0;
            update.lastPay = Math.round((rec.last_payout || 0) * 10) / 10;
            update.lastMulti = Math.round((rec.last_multi || 0) * 10) / 10;
            update.lastWinIndex = rec.total_bonuses || 0;
          }
        } catch { /* don't block slot detection if records lookup fails */ }

        // Determine which widget(s) to target
        const detectedTarget = detected.target || 'single_slot';
        const targetTypes = detectedTarget === 'bonus_hunt'
          ? ['bonus_hunt']
          : [detectedTarget]; // 'single_slot' or 'current_slot'

        // Update only the targeted widget type(s) + always update rtp_stats with bestWin
        setWidgets(prev => {
          const updated = [];
          for (const w of prev) {
            if (targetTypes.includes(w.widget_type)) {
              const merged = { ...w, config: { ...w.config, ...update } };
              updated.push(merged);
              // Persist to DB (fire-and-forget)
              upsertWidget(user.id, merged).catch(() => {});
            } else if (w.widget_type === 'rtp_stats' && update.bestWin) {
              // Also cache bestWin into rtp_stats config so OBS can read it (no auth → RLS blocks direct DB query)
              const cached = { slotName: update.slotName, best_win: update.bestWin, best_multiplier: update.bestMulti || 0 };
              const merged = { ...w, config: { ...w.config, _cachedBestWin: cached } };
              updated.push(merged);
              upsertWidget(user.id, merged).catch(() => {});
            } else {
              updated.push(w);
            }
          }
          return updated;
        });
      })
      .subscribe();

    detectedChannelRef.current = channel;
    return () => {
      if (detectedChannelRef.current) {
        supabase.removeChannel(detectedChannelRef.current);
      }
    };
  }, [user]);

  // ── Actions ──
  const saveTheme = useCallback(async (patch) => {
    if (!user) return;
    const updated = await updateTheme(user.id, patch);
    setTheme(updated);
    return updated;
  }, [user]);

  const addWidget = useCallback(async (widgetType, config) => {
    if (!user) {
      console.warn('[useOverlay] addWidget called but no user session');
      return;
    }
    try {
      const w = await createWidget(user.id, widgetType, config);
      setWidgets(prev => [...prev, w]);
      return w;
    } catch (err) {
      console.error('[useOverlay] addWidget error:', err);
      throw err;
    }
  }, [user]);

  const saveWidget = useCallback(async (widget) => {
    if (!user) return;
    // Optimistic update — reflect changes in UI immediately
    setWidgets(prev => prev.map(p => p.id === widget.id ? widget : p));
    try {
      const w = await upsertWidget(user.id, widget);
      // Sync with DB response (authoritative)
      setWidgets(prev => prev.map(p => p.id === w.id ? w : p));
      return w;
    } catch (err) {
      console.error('[useOverlay] saveWidget error:', err);
    }
  }, [user]);

  const removeWidget = useCallback(async (widgetId) => {
    await deleteWidget(widgetId);
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  }, []);

  const updateState = useCallback(async (patch) => {
    if (!user) return;
    return patchOverlayState(user.id, patch);
  }, [user]);

  const regenToken = useCallback(async () => {
    if (!user) return;
    const inst = await regenerateToken(user.id);
    setInstance(inst);
    return inst;
  }, [user]);

  return {
    instance,
    theme,
    widgets,
    overlayState,
    loading,
    saveTheme,
    addWidget,
    saveWidget,
    removeWidget,
    updateState,
    regenToken,
    reload: loadAll,
  };
}
