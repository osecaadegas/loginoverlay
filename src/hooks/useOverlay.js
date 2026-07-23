/**
 * useOverlay.js — Main hook for the overlay control center.
 * Provides: instance, theme, widgets, state, realtime sync.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../config/supabaseClient";
import { findUserSlotRecord } from "../services/slotRecordService";
import { withTimeout } from "../utils/asyncTimeout";
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
} from "../services/overlayService";

function ignoreOverlayPersistError() {
  return undefined;
}

function buildDetectedSlotWidgetUpdates(widgets, targetTypes, update) {
  const updatedWidgets = [];
  const widgetsToPersist = [];

  for (const widget of widgets) {
    if (targetTypes.includes(widget.widget_type)) {
      const merged = { ...widget, config: { ...widget.config, ...update } };
      updatedWidgets.push(merged);
      widgetsToPersist.push(merged);
      continue;
    }

    if (widget.widget_type === "rtp_stats" && update.bestWin) {
      const cached = {
        slotId: update.slotId || null,
        slotName: update.slotName,
        provider: update.provider || null,
        best_win: update.bestWin,
        best_multiplier: update.bestMulti || 0,
      };
      const merged = {
        ...widget,
        config: { ...widget.config, _cachedBestWin: cached },
      };
      updatedWidgets.push(merged);
      widgetsToPersist.push(merged);
      continue;
    }

    updatedWidgets.push(widget);
  }

  return { updatedWidgets, widgetsToPersist };
}

function persistDetectedSlotWidgets(userId, instanceId, widgetsToPersist) {
  for (const widget of widgetsToPersist) {
    upsertWidget(userId, widget, instanceId).catch(ignoreOverlayPersistError);
  }
}

export function useOverlay() {
  const { user } = useAuth();
  const [instance, setInstance] = useState(null);
  const [theme, setTheme] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [overlayState, setOverlayState] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  // ── Load everything on mount ──
  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const inst = await withTimeout(
        getOrCreateInstance(
          user.id,
          user.user_metadata?.full_name || user.email,
        ),
        12000,
        "Overlay setup",
      );
      const [th, wdgs, st] = await withTimeout(
        Promise.all([
          getTheme(user.id, inst.id),
          getWidgets(user.id, inst.id),
          getOverlayState(user.id, inst.id),
        ]),
        12000,
        "Overlay data load",
      );
      setInstance(inst);
      setTheme(th);
      setWidgets(wdgs);
      setOverlayState(st);
    } catch (err) {
      console.error("[useOverlay] load error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!user || !instance?.id) return;
    channelRef.current = subscribeToOverlay(
      user.id,
      {
        onState: (s) => setOverlayState(s),
        onWidgets: () => getWidgets(user.id, instance.id).then(setWidgets),
        onTheme: (t) => setTheme(t),
      },
      instance.id,
    );
    return () => unsubscribeOverlay(channelRef.current);
  }, [instance?.id, user]);

  // ── Auto-tracker: listen for detected_slots changes and update current_slot / single_slot widgets ──
  const detectedChannelRef = useRef(null);
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`detected_slots_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "detected_slots",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const detected = payload.new;
          if (!detected?.slot_name) return;

          // Look up the slot in the database (fuzzy match)
          const term = detected.slot_name.trim();
          let slotData = null;
          try {
            const { data } = await supabase
              .from("slots")
              .select("id, name, provider, image, rtp")
              .ilike("name", `%${term}%`)
              .limit(1);
            if (data?.length) {
              slotData = data[0];
            }
          } catch {
            /* ignore lookup error */
          }

          // Build the update payload
          const update = {
            slotName: slotData?.name || detected.slot_name,
            provider: slotData?.provider || detected.provider || "",
            imageUrl: slotData?.image || "",
            slotId: slotData?.id || null,
          };
          if (slotData?.rtp) update.rtp = slotData.rtp;
          if (detected.bet_size != null) update.betSize = detected.bet_size;
          if (detected.last_win != null) update.lastWin = detected.last_win;

          // Also fetch user slot records so bestWin/averageMulti/etc reach OBS
          try {
            const resolvedName = slotData?.name || detected.slot_name;
            const rec = await findUserSlotRecord(user.id, {
              slotId: slotData?.id || null,
              slotName: resolvedName,
              provider: slotData?.provider || detected.provider || "",
            });
            if (rec) {
              update.averageMulti =
                Math.round((rec.average_multi || 0) * 10) / 10;
              update.bestMulti =
                Math.round((rec.best_multiplier || 0) * 10) / 10;
              update.totalBonuses = rec.total_bonuses || 0;
              update.bestWin = Math.round((rec.best_win || 0) * 10) / 10;
              update.lastBet = Number(rec.last_bet_size) || 0;
              update.lastPay = Math.round((rec.last_payout || 0) * 10) / 10;
              update.lastMulti = Math.round((rec.last_multi || 0) * 10) / 10;
              update.lastWinIndex = rec.total_bonuses || 0;
            }
          } catch {
            /* don't block slot detection if records lookup fails */
          }

          // Determine which widget(s) to target
          const detectedTarget = detected.target || "single_slot";
          const targetTypes =
            detectedTarget === "bonus_hunt" ? ["bonus_hunt"] : [detectedTarget]; // 'single_slot' or 'current_slot'

          // Update only the targeted widget type(s) + always update rtp_stats with bestWin
          setWidgets((prev) => {
            const { updatedWidgets, widgetsToPersist } =
              buildDetectedSlotWidgetUpdates(prev, targetTypes, update);
            persistDetectedSlotWidgets(user.id, instance?.id, widgetsToPersist);
            return updatedWidgets;
          });
        },
      )
      .subscribe();

    detectedChannelRef.current = channel;
    return () => {
      if (detectedChannelRef.current) {
        supabase.removeChannel(detectedChannelRef.current);
      }
    };
  }, [instance?.id, user]);

  // ── Actions ──
  const saveTheme = useCallback(
    async (patch) => {
      if (!user) return;
      const updated = await updateTheme(user.id, patch, instance?.id);
      setTheme(updated);
      return updated;
    },
    [instance?.id, user],
  );

  const addWidget = useCallback(
    async (widgetType, config) => {
      if (!user) {
        console.warn("[useOverlay] addWidget called but no user session");
        return;
      }
      try {
        const w = await createWidget(user.id, widgetType, config, instance?.id);
        setWidgets((prev) => [...prev, w]);
        return w;
      } catch (err) {
        console.error("[useOverlay] addWidget error:", err);
        throw err;
      }
    },
    [instance?.id, user],
  );

  // ── Debounced DB save for widgets ──
  // Keeps a per-widget timer so rapid keystrokes don't hammer the DB.
  // The optimistic update is instant; only the upsert is delayed.
  const saveTimersRef = useRef({});

  const saveWidget = useCallback(
    async (widget) => {
      if (!user) return;
      // Optimistic update — reflect changes in UI immediately
      setWidgets((prev) => prev.map((p) => (p.id === widget.id ? widget : p)));

      // Debounce the DB write per widget id (500ms)
      clearTimeout(saveTimersRef.current[widget.id]);
      saveTimersRef.current[widget.id] = setTimeout(async () => {
        try {
          await upsertWidget(user.id, widget, instance?.id);
        } catch (err) {
          console.error("[useOverlay] saveWidget error:", err);
        }
      }, 500);
    },
    [instance?.id, user],
  );

  const removeWidget = useCallback(
    async (widgetId) => {
      if (!user) return;
      await deleteWidget(user.id, widgetId, instance?.id);
      setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    },
    [instance?.id, user],
  );

  const updateState = useCallback(
    async (patch) => {
      if (!user) return;
      const updated = await patchOverlayState(user.id, patch, instance?.id);
      if (updated?.state) setOverlayState(updated.state);
      return updated;
    },
    [instance?.id, user],
  );

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
    error,
    saveTheme,
    addWidget,
    saveWidget,
    removeWidget,
    updateState,
    regenToken,
    reload: loadAll,
  };
}
