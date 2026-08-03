import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../../../config/supabaseClient";

const REQUEST_ACTION_WINDOW_MS = 20000;

function normalizeRequestAction(row) {
  const status = row?.action || row?.status;
  const action =
    status === "accepted" || status === "played"
      ? "accepted"
      : status === "rejected" ||
          status === "refunded" ||
          status === "refund_failed"
        ? "rejected"
        : "";
  if (!action || !row?.id) return null;
  return {
    ...row,
    action,
    action_at: row.action_at || row.updated_at || row.created_at,
  };
}

export function useSlotRequestsData({
  config = {},
  userId,
  enabled = true,
  channelPrefix = "sr-widget",
  publicOverlayId,
  runtime,
} = {}) {
  const c = config || {};
  const maxDisplay = Number(c.maxDisplay) > 0 ? Number(c.maxDisplay) : 20;
  const usePublicOverlayApi = runtime === "obs" && !!publicOverlayId;
  const previewRequests = useMemo(
    () =>
      Array.isArray(c.__appearancePreviewRequests)
        ? c.__appearancePreviewRequests.slice(0, maxDisplay)
        : null,
    [c.__appearancePreviewRequests, maxDisplay],
  );
  const [requests, setRequests] = useState(() => previewRequests || []);
  const [requestActions, setRequestActions] = useState([]);
  const mountedRef = useRef(true);
  const fetchSeqRef = useRef(0);
  const seenActionKeysRef = useRef(new Set());

  const recordActions = useCallback((rows) => {
    const fresh = (Array.isArray(rows) ? rows : [])
      .map(normalizeRequestAction)
      .filter(Boolean)
      .filter((row) => {
        const key = `${row.id}:${row.action}:${row.action_at || ""}`;
        if (seenActionKeysRef.current.has(key)) return false;
        seenActionKeysRef.current.add(key);
        return true;
      });
    if (!fresh.length || !mountedRef.current) return;
    setRequestActions((current) => [...current, ...fresh].slice(-20));
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!enabled) return;
    if (previewRequests) return;
    if (!userId && !usePublicOverlayApi) return;
    const seq = ++fetchSeqRef.current;
    let data = null;
    let actionData = [];
    let error = null;
    if (usePublicOverlayApi) {
      try {
        const params = new URLSearchParams({
          publicOverlayId,
          limit: String(maxDisplay),
        });
        const response = await fetch(`/api/public-slot-requests?${params}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        const payload = await response.json();
        data = Array.isArray(payload.requests) ? payload.requests : [];
        actionData = Array.isArray(payload.actions) ? payload.actions : [];
      } catch (fetchError) {
        error = fetchError;
      }
    } else {
      const actionCutoff = new Date(
        Date.now() - REQUEST_ACTION_WINDOW_MS,
      ).toISOString();
      const [requestsResult, actionsResult] = await Promise.all([
        supabase
          .from("slot_requests")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(maxDisplay),
        supabase
          .from("slot_requests")
          .select(
            "id,slot_name,slot_image,requested_by,status,created_at,updated_at",
          )
          .eq("user_id", userId)
          .in("status", ["played", "refunded", "refund_failed"])
          .gte("updated_at", actionCutoff)
          .order("updated_at", { ascending: true })
          .limit(20),
      ]);
      data = requestsResult.data;
      actionData = actionsResult.data || [];
      error = requestsResult.error || actionsResult.error;
    }
    if (seq !== fetchSeqRef.current) return;
    if (!error && data && mountedRef.current) {
      setRequests(data);
      recordActions(actionData);
    }
  }, [
    enabled,
    maxDisplay,
    previewRequests,
    publicOverlayId,
    recordActions,
    usePublicOverlayApi,
    userId,
  ]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (enabled || previewRequests) return;
    setRequests([]);
  }, [enabled, previewRequests]);

  useEffect(() => {
    if (!previewRequests) return;
    setRequests(previewRequests);
  }, [previewRequests]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (previewRequests) return undefined;
    if (usePublicOverlayApi) return undefined;
    if (!userId) return undefined;
    const channel = supabase
      .channel(`${channelPrefix}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "slot_requests",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchRequests();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    channelPrefix,
    enabled,
    fetchRequests,
    previewRequests,
    usePublicOverlayApi,
    userId,
  ]);

  useEffect(() => {
    if (!enabled || previewRequests || !usePublicOverlayApi) return undefined;
    const interval = window.setInterval(fetchRequests, 5000);
    return () => window.clearInterval(interval);
  }, [enabled, fetchRequests, previewRequests, usePublicOverlayApi]);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  return {
    requests: enabled ? requests : [],
    requestActions: enabled ? requestActions : [],
    maxDisplay,
    isPreview: !!previewRequests,
    refresh: fetchRequests,
  };
}

export default useSlotRequestsData;
