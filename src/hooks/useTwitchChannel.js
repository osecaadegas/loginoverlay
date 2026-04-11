/**
 * useTwitchChannel.js — Returns the logged-in user's Twitch channel name.
 *
 * Resolution order:
 *   1. localStorage 'twitchChannel' (set by ProfileSection on login)
 *   2. Supabase auth user_metadata (preferred_username / user_name)
 *
 * Always lowercase, trimmed. Returns '' while loading.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';

let cached = null;

export default function useTwitchChannel() {
  const [channel, setChannel] = useState(cached || '');

  useEffect(() => {
    if (cached) { setChannel(cached); return; }

    // 1. Try localStorage first (fastest, set by ProfileSection on every save)
    const ls = (localStorage.getItem('twitchChannel') || '').trim().toLowerCase();
    if (ls) { cached = ls; setChannel(ls); return; }

    // 2. Fallback: Supabase auth metadata
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const meta = data?.user?.user_metadata || {};
        const ch = (meta.preferred_username || meta.user_name || meta.twitch_username || '').trim().toLowerCase();
        if (ch) { cached = ch; setChannel(ch); }
      } catch { /* ignore */ }
    })();
  }, []);

  return channel;
}
