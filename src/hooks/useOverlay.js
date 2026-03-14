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

        // Update current_slot and single_slot widgets
        setWidgets(prev => {
          const updated = [];
          for (const w of prev) {
            if (w.widget_type === 'current_slot' || w.widget_type === 'single_slot') {
              const merged = { ...w, config: { ...w.config, ...update } };
              updated.push(merged);
              // Persist to DB (fire-and-forget)
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
    const w = await upsertWidget(user.id, widget);
    setWidgets(prev => prev.map(p => p.id === w.id ? w : p));
    return w;
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
