export const serviceLinks = Object.freeze({
  twitch: {
    dashboard: 'https://dashboard.twitch.tv/',
    channelSettings: 'https://dashboard.twitch.tv/settings/channel',
    channel: login => `https://www.twitch.tv/${encodeURIComponent(String(login || '').trim().toLowerCase())}`,
  },
  streamElements: {
    dashboard: 'https://streamelements.com/dashboard',
    channels: 'https://streamelements.com/dashboard/account/channels',
    loyalty: 'https://streamelements.com/dashboard/loyalty',
    defaultCommands: 'https://streamelements.com/dashboard/bot/commands/default',
    customCommands: 'https://streamelements.com/dashboard/bot/commands/custom',
    publicCommands: login => `https://streamelements.com/${encodeURIComponent(String(login || '').trim().toLowerCase())}/commands`,
  },
  spotify: {
    player: 'https://open.spotify.com/',
    appAccess: 'https://www.spotify.com/account/apps/',
  },
  slotProviders: {
    streamersCenter: {
      label: 'Streamers Center slot database',
      home: '/overlay-center/slots',
      dashboard: '/overlay-center/slots',
      documentation: null,
      internal: true,
    },
    sloteller: {
      label: 'Sloteller',
      home: 'https://sloteller.com/en',
      dashboard: null,
      documentation: null,
    },
    manual: {
      label: 'Manual slot entry',
      home: '/overlay-center/widgets/current-slot',
      dashboard: '/overlay-center/widgets/current-slot',
      documentation: null,
      internal: true,
    },
  },
});

export function safeExternalDestination(destination, fallback) {
  if (!destination) return fallback || '';
  try {
    const url = new URL(destination, 'https://streamerscenter.com');
    const sensitiveKeys = ['access_token', 'refresh_token', 'id_token', 'token', 'client_secret', 'secret', 'jwt'];
    const hasSensitiveQuery = sensitiveKeys.some(key => url.searchParams.has(key));
    const hasSensitiveHash = sensitiveKeys.some(key => url.hash.toLowerCase().includes(`${key}=`));
    if (hasSensitiveQuery || hasSensitiveHash) return fallback || '';
    if (url.protocol === 'https:' || url.protocol === 'http:') return destination;
  } catch {
    if (String(destination).startsWith('/')) return destination;
  }
  return fallback || '';
}