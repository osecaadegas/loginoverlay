function twitchLogin(value) {
  const login = String(value || '').trim().replace(/^@/, '').replace(/^https?:\/\/(?:www\.)?twitch\.tv\//i, '').replace(/\/$/, '');
  return /^[a-z0-9_]{3,25}$/i.test(login) ? login : '';
}

export function safeAvatarUrl(value) {
  const source = String(value || '').trim();
  if (source.startsWith('/') && !source.startsWith('//') && !source.startsWith('/\\')) return source;
  try {
    const url = new URL(source);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

// The existing chat widget uses unavatar.io/twitch for viewer portraits.
// Resolve from the same image service without adding a serverless endpoint.
export function resolveTournamentPlayers(players) {
  return players.map((player) => {
    const twitchUsername = twitchLogin(player.twitchUsername);
    const login = twitchUsername || twitchLogin(player.name);
    const avatarUrl = safeAvatarUrl(player.avatarOverrideUrl)
      || safeAvatarUrl(player.avatarUrl)
      || (login ? `https://unavatar.io/twitch/${encodeURIComponent(login.toLowerCase())}` : '');
    return { ...player, name: twitchUsername || player.name, avatarUrl };
  });
}
