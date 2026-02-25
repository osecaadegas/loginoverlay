/**
 * useOverlay.js — Main hook for the overlay control center.
 * Provides: instance, theme, widgets, state, realtime sync.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
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

  // ── Actions ──
  const saveTheme = useCallback(async (patch) => {
    if (!user) return;
    const updated = await updateTheme(user.id, patch);
    setTheme(updated);
    return updated;
  }, [user]);

  const addWidget = useCallback(async (widgetType, config) => {
    if (!user) return;
    const w = await createWidget(user.id, widgetType, config);
    setWidgets(prev => [...prev, w]);
    return w;
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
