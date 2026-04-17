/**
 * useAnalytics.js — React hook for the analytics tracking SDK.
 *
 * Auto-initializes on mount, tracks page views on route changes,
 * and identifies users when they log in via Twitch.
 */
import { useEffect, useRef } from 'react';
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

  // Initialize on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (location.pathname !== lastPath.current) {
      lastPath.current = location.pathname;
      trackPageView(location.pathname + location.search);
    }
  }, [location]);

  // Identify user when they log in
  useEffect(() => {
    if (user && !identified.current) {
      identified.current = true;
      const meta = user.user_metadata || {};
      identifyUser({
        user_id: user.id,
        twitch_id: meta.provider_id || meta.sub || null,
        twitch_username: meta.preferred_username || meta.user_name || meta.full_name || null,
        twitch_avatar: meta.avatar_url || meta.picture || null,
      });
    }
  }, [user]);

  return {
    updateConsent,
  };
}

export default useAnalytics;
