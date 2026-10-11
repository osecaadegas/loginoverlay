import { useSyncExternalStore } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { withTimeout } from '../utils/asyncTimeout';
import { canUseOverlayAsset, blockedOverlayAsset } from '../utils/overlayAssetAccess';

const stores = new Map();
function getStore(owner) {
  const key = owner || 'public';
  if (!stores.has(key)) {
    const store = { snapshot: { assets: null, error: null }, listeners: new Set(), pending: null, timer: null };
    store.refresh = () => {
      if (store.pending) return store.pending;
      store.pending = (async () => {
        const previous = store.snapshot;
        try {
          const { data, error } = await withTimeout(supabase.rpc('get_overlay_asset_access', { p_owner: owner || null }), 8000, 'Overlay access');
          if (error) throw error;
          store.snapshot = { assets: data || [], error: null };
        } catch (error) {
          // Do not keep stale permission after a revocation or connectivity failure.
          store.snapshot = { assets: null, error: error.message || 'Unable to check overlay access' };
        } finally {
          store.pending = null;
          // Stable snapshots keep all OBS widgets/effect targets from rebuilding on each poll.
          if (JSON.stringify(previous) === JSON.stringify(store.snapshot)) store.snapshot = previous;
          else store.listeners.forEach(listener => listener());
        }
      })();
      return store.pending;
    };
    store.subscribe = listener => {
      store.listeners.add(listener);
      if (store.listeners.size === 1) {
        store.refresh();
        store.timer = setInterval(store.refresh, 15000);
        window.addEventListener('focus', store.refresh);
        window.addEventListener('online', store.refresh);
      }
      return () => {
        store.listeners.delete(listener);
        if (!store.listeners.size) {
          clearInterval(store.timer);
          window.removeEventListener('focus', store.refresh);
          window.removeEventListener('online', store.refresh);
        }
      };
    };
    store.getSnapshot = () => store.snapshot;
    stores.set(key, store);
  }
  return stores.get(key);
}

export function refreshOverlayAssetAccess() {
  return Promise.all([...stores.values()].map(store => store.refresh()));
}

export function useOverlayAssetAccess(ownerId) {
  const { user } = useAuth();
  const owner = ownerId === undefined ? user?.id : ownerId;
  const store = getStore(owner);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return {
    ...state, loading: !state.assets && !state.error,
    canUse: (kind, key) => canUseOverlayAsset(state.assets, kind, key),
    blocked: config => !state.assets || blockedOverlayAsset(config, state.assets),
    retry: store.refresh,
  };
}
