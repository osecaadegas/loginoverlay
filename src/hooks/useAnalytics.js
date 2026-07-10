/**
 * useAnalytics.js — React hook for the analytics tracking SDK.
 *
 * Auto-initializes on mount, tracks page views on route changes,
 * and identifies users when they log in via Twitch.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  initAnalytics,
  trackPageView,
  identifyUser,
  updateConsent,
} from '../utils/analytics';

export function useAnalytics() {
  const { user } = useAuth();
  const location = useLocation();
  const identified = useRef(false);
  const lastPath = useRef('');
  const [ready, setReady] = useState(false);

  // Initialize on mount
  useEffect(() => {
    let cancelled = false;
    initAnalytics().then((result) => {
      if (!cancelled && result?.session_id) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Track page views on route change
  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    if (ready && path !== lastPath.current) {
      lastPath.current = path;
      trackPageView(location.pathname + location.search);
    }
  }, [location, ready]);

  // Identify user when they log in
  useEffect(() => {
    if (ready && user && !identified.current) {
      identified.current = true;
      const meta = user.user_metadata || {};
      identifyUser({
        user_id: user.id,
        twitch_id: meta.provider_id || meta.sub || null,
        twitch_username: meta.preferred_username || meta.user_name || meta.full_name || null,
        twitch_avatar: meta.avatar_url || meta.picture || null,
      });
    }
  }, [user, ready]);

  return {
    updateConsent,
  };
}

export default useAnalytics;
