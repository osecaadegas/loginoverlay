import { supabase } from '../config/supabaseClient';

function twitchLogin(value) {
  const login = String(value || '').trim().replace(/^@/, '').replace(/^https?:\/\/(?:www\.)?twitch\.tv\//i, '').replace(/\/$/, '').toLowerCase();
  return /^[a-z0-9_]{3,25}$/.test(login) ? login : '';
}

export function safeAvatarUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export async function resolveTournamentPlayers(players, { client = supabase, fetcher = fetch } = {}) {
  const logins = [...new Set(players.map((player) => twitchLogin(player.twitchUsername || player.name)).filter(Boolean))];
  let profiles = {};
  let warning = '';

  if (logins.length) {
    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (error || !session?.access_token) throw new Error('Session unavailable');
      const response = await fetcher('/api/tournament-participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ logins }),
      });
      if (!response.ok) throw new Error('Profile lookup unavailable');
      profiles = (await response.json()).profiles || {};
    } catch {
      warning = 'Twitch avatars could not be loaded. The tournament will use saved avatars or fallback icons.';
    }
  }

  return {
    players: players.map((player) => {
      const login = twitchLogin(player.twitchUsername || player.name);
      const profile = profiles[login];
      const avatarUrl = safeAvatarUrl(player.avatarOverrideUrl) || safeAvatarUrl(profile?.avatarUrl) || safeAvatarUrl(player.avatarUrl);
      return { ...player, name: profile?.username || player.name, avatarUrl };
    }),
    warning,
  };
}
