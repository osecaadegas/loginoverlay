import { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { getSlotIdentity, readSlotPersonalBest, recordMatchesSlot } from '../../shared/slotPersonalBest.js';

// A rotating slot card can remount every few seconds. Keep its last successful
// lookup briefly so the same slot does not download its history every lap.
const sharedLookups = new Map();
const recentLookups = new Map();
const REFRESH_MS = 60_000;
const REMOUNT_CACHE_MS = REFRESH_MS;
const MAX_RECENT_LOOKUPS = 200;
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('slot-result-saved', () => recentLookups.clear());
}
export default function useSlotPersonalBest({ userId, slot, publicOverlayId, overlayToken }) {
  const { id, name, provider } = getSlotIdentity(slot);
  const scope = JSON.stringify([userId, id, name, provider, publicOverlayId, overlayToken]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if ((!userId && !publicOverlayId && !overlayToken) || (!id && !name)) return undefined;
    const existing = sharedLookups.get(scope);
    if (existing) {
      existing.listeners.add(setResult);
      setResult(existing.result);
      return () => existing.release(setResult);
    }
    const cached = recentLookups.get(scope);
    const cacheAge = cached ? Date.now() - cached.at : Infinity;
    const freshCache = cacheAge >= 0 && cacheAge < REMOUNT_CACHE_MS;
    const entry = {listeners:new Set([setResult]),result:freshCache ? cached.result : null,release:null};
    sharedLookups.set(scope,entry);
    if (entry.result) setResult(entry.result);
    const activeSlot = { id, name, provider };
    const isPublic = Boolean(publicOverlayId || overlayToken);
    let cancelled = false;
    let revision = 0;
    let retryTimer;
    const controller = new AbortController();

    async function refresh() {
      const requestRevision = ++revision;
      try {
        let best;
        if (isPublic) {
          const params = new URLSearchParams({ slotId: id, slotName: name, provider });
          if (publicOverlayId) params.set('publicOverlayId', publicOverlayId);
          else params.set('overlayToken', overlayToken);
          const response = await fetch(`/api/slot-personal-best?${params}`, { signal: controller.signal });
          if (!response.ok) throw new Error('Personal best lookup failed');
          best = (await response.json()).best;
        } else {
          best = await readSlotPersonalBest(supabase, userId, activeSlot);
        }
        if (!cancelled && revision === requestRevision) {
          clearTimeout(retryTimer);
          entry.result = { scope, best: best && recordMatchesSlot(best, activeSlot) ? best : null };
          recentLookups.delete(scope);
          recentLookups.set(scope, { result: entry.result, at: Date.now() });
          if (recentLookups.size > MAX_RECENT_LOOKUPS) recentLookups.delete(recentLookups.keys().next().value);
          entry.listeners.forEach(listener => listener(entry.result));
        }
      } catch (error) {
        // Keep the same slot's last successful value during a temporary outage.
        if (!cancelled && revision === requestRevision) {
          console.warn('Personal best lookup failed:', error?.message);
          if (!isPublic) retryTimer = setTimeout(refresh, REFRESH_MS);
        }
      }
    }

    window.addEventListener('slot-result-saved', refresh);
    if (!freshCache) refresh();
    // Anonymous OBS sources cannot receive private-table realtime events.
    let pollTimer;
    const firstPoll = setTimeout(() => {
      refresh();
      pollTimer = setInterval(refresh, REFRESH_MS);
    }, freshCache ? REFRESH_MS - cacheAge : REFRESH_MS);
    const channel = isPublic ? null : supabase.channel(`bestwin_${scope}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_slot_records', filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE' || recordMatchesSlot(payload.new, activeSlot)) refresh();
      }).on('postgres_changes', { event: '*', schema: 'public', table: 'user_slot_results', filter: `user_id=eq.${userId}` }, refresh).subscribe();

    const dispose = () => {
      window.removeEventListener('slot-result-saved', refresh);
      cancelled = true;
      controller.abort();
      clearTimeout(retryTimer);
      clearTimeout(firstPoll);
      clearInterval(pollTimer);
      if (channel) supabase.removeChannel(channel);
    };
    entry.release = listener => {
      entry.listeners.delete(listener);
      if (!entry.listeners.size) {
        dispose();
        if (sharedLookups.get(scope) === entry) sharedLookups.delete(scope);
      }
    };
    return () => entry.release(setResult);
  }, [userId, id, name, provider, publicOverlayId, overlayToken, scope]);

  return result?.scope === scope ? result.best : null;
}
