import { readSlotPersonalBest, SLOT_PERSONAL_BEST_BATCH_SIZE } from '../../shared/slotPersonalBest.js';
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../config/supabaseClient";
import {
  getSlotIdentity,
  pickPersonalBest,
  recordMatchesSlot,
} from "../../shared/slotPersonalBest.js";

export function slotPersonalBestKey(slotLike) {
  const slot = getSlotIdentity(slotLike);
  return JSON.stringify([
    slot.id.toLowerCase(),
    slot.name.toLowerCase(),
    slot.provider.toLowerCase(),
  ]);
}

function matchBests(slots, records) {
  return Object.fromEntries(
    slots.map((slot) => [
      slotPersonalBestKey(slot),
      pickPersonalBest(
        (records || []).filter(
          (record) =>
            Number(record?.best_win) > 0 && recordMatchesSlot(record, slot),
        ),
      ),
    ]),
  );
}

export default function useSlotPersonalBests({
  enabled = true,
  userId,
  slots = [],
  publicOverlayId,
  overlayToken,
}) {
  const scope = JSON.stringify(
    slots.map((slot) => getSlotIdentity(slot)).map(({ id, name, provider }) => [
      id,
      name,
      provider,
    ]),
  );
  const identities = useMemo(
    () => [...new Map(JSON.parse(scope).map(([id, name, provider]) => {
      const slot = { id, name, provider };
      return [slotPersonalBestKey(slot), slot];
    })).values()].filter(slot => slot.id || slot.name),
    [scope],
  );
  const requestScope = JSON.stringify([
    userId || "",
    publicOverlayId || "",
    overlayToken || "",
    scope,
  ]);
  const channelSuffix = useMemo(
    () => {
      let hash = 0;
      for (let index = 0; index < requestScope.length; index += 1) {
        hash = (hash * 31 + requestScope.charCodeAt(index)) | 0;
      }
      return Math.abs(hash).toString(36);
    },
    [requestScope],
  );
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!enabled || identities.length === 0) return undefined;
    const isPublic = Boolean(publicOverlayId || overlayToken);
    if (!isPublic && !userId) return undefined;

    let cancelled = false;
    let revision = 0;
    const controller = new AbortController();

    async function refresh() {
      const requestRevision = ++revision;
      try {
        let bests;
        if (isPublic) {
          const records = [];
          // Large hunts must respect the same API limit as small lookups. Never
          // truncate the hunt: every unique slot gets its own all-time record.
          for (let offset = 0; offset < identities.length; offset += SLOT_PERSONAL_BEST_BATCH_SIZE) {
            if (cancelled || revision !== requestRevision) return;
            const response = await fetch("/api/slot-personal-best", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicOverlayId, overlayToken, slots: identities.slice(offset, offset + SLOT_PERSONAL_BEST_BATCH_SIZE) }),
              signal: controller.signal,
            });
            if (!response.ok) throw new Error("Personal best list lookup failed");
            const payload = await response.json();
            records.push(...(payload.bests || []));
          }
          bests = matchBests(identities, records);
        } else {
          const data = [];
          for (let offset = 0; offset < identities.length && !cancelled && revision === requestRevision; offset += 4) {
            data.push(...await Promise.all(identities.slice(offset, offset + 4).map(slot => readSlotPersonalBest(supabase, userId, slot))));
          }
          bests = matchBests(identities, data.filter(Boolean));
        }
        if (!cancelled && revision === requestRevision) setResult({ requestScope, bests });
      } catch (error) {
        if (!cancelled && error?.name !== "AbortError") {
          console.warn("Personal best list lookup failed:", error?.message);
        }
      }
    }

    window.addEventListener('slot-result-saved', refresh);
    refresh();
    const timer = setInterval(refresh, 60_000);
    const channel = isPublic
      ? null
      : supabase
          .channel(`bestwins_${userId}_${channelSuffix}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "user_slot_records",
              filter: `user_id=eq.${userId}`,
            },
            refresh,
          )
          .on('postgres_changes', { event: '*', schema: 'public', table: 'user_slot_results', filter: `user_id=eq.${userId}` }, refresh)
          .subscribe();

    return () => {
      window.removeEventListener('slot-result-saved', refresh);
      cancelled = true;
      controller.abort();
      if (timer) clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [enabled, userId, publicOverlayId, overlayToken, requestScope, identities, channelSuffix]);

  return enabled && result?.requestScope === requestScope ? result.bests : {};
}
