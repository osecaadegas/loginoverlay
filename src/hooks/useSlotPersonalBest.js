import { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { getSlotIdentity, readSlotPersonalBest, recordMatchesSlot } from '../../shared/slotPersonalBest.js';

export default function useSlotPersonalBest({ userId, slot, publicOverlayId, overlayToken }) {
  const { id, name, provider } = getSlotIdentity(slot);
  const scope = JSON.stringify([userId, id, name, provider, publicOverlayId, overlayToken]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if ((!userId && !publicOverlayId && !overlayToken) || (!id && !name)) return undefined;
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
          setResult({ scope, best: best && recordMatchesSlot(best, activeSlot) ? best : null });
        }
      } catch (error) {
        // Keep the same slot's last successful value during a temporary outage.
        if (!cancelled && revision === requestRevision) {
          console.warn('Personal best lookup failed:', error?.message);
          if (!isPublic) retryTimer = setTimeout(refresh, 60_000);
        }
      }
    }

    window.addEventListener('slot-result-saved', refresh);
    refresh();
    // Anonymous OBS sources cannot receive private-table realtime events.
    const timer = setInterval(refresh, 60_000);
    const channel = isPublic ? null : supabase.channel(`bestwin_${scope}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_slot_records', filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE' || recordMatchesSlot(payload.new, activeSlot)) refresh();
      }).on('postgres_changes', { event: '*', schema: 'public', table: 'user_slot_results', filter: `user_id=eq.${userId}` }, refresh).subscribe();

    return () => {
      window.removeEventListener('slot-result-saved', refresh);
      cancelled = true;
      controller.abort();
      clearTimeout(retryTimer);
      if (timer) clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, id, name, provider, publicOverlayId, overlayToken, scope]);

  return result?.scope === scope ? result.best : null;
}
