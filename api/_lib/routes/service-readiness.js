import { createClient } from '@supabase/supabase-js';
import { serviceLinks } from '../../../shared/serviceLinks.js';
import {
  READINESS_STATUSES,
  SERVICE_IDS,
  normalizeSetupDetails,
  validateCommandConfiguration,
  validatePointSettings,
  summarizeReadiness,
} from '../../../shared/serviceSetupModel.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || process.env.VITE_TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || process.env.VITE_SPOTIFY_CLIENT_ID;

function check({ id, service, status, title, message, blocking = false, action, lastCheckedAt = new Date().toISOString(), meta = {} }) {
  return { id, service, status, title, message, blocking, lastCheckedAt, action, meta };
}

function json(res, status, payload) {
  res.status(status).json(payload);
}

function sanitizedProviderMessage(kind) {
  if (kind === 'expired') return 'Your connection expired. Reconnect this service and check again.';
  if (kind === 'unavailable') return 'The external service could not be reached. Your setup is saved, and you can check again shortly.';
  if (kind === 'missing_permission') return 'The connection is missing a required permission. Reconnect the service to grant access.';
  return 'We could not verify this service right now. Check the settings and try again.';
}

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

async function verifyUser(supabase, req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function getProfile(supabase, userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('twitch_id, twitch_username, twitch_display_name, display_name, username')
    .eq('user_id', userId)
    .maybeSingle();
  return data || {};
}

async function getTwitchAppToken() {
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) return null;
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchTwitchUser(login) {
  const token = await getTwitchAppToken();
  if (!token?.access_token || !TWITCH_CLIENT_ID) return { status: 'unavailable' };
  const response = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, {
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token.access_token}`,
    },
  });
  if (!response.ok) return { status: 'unavailable' };
  const data = await response.json().catch(() => ({}));
  const user = data?.data?.[0] || null;
  return user ? { status: 'ready', user } : { status: 'not_found' };
}

async function checkTwitchReadiness({ supabase, user, profile, details, selectedTools }) {
  const normalized = normalizeSetupDetails(details, {
    twitchChannel: profile.twitch_username || user.user_metadata?.preferred_username || user.user_metadata?.user_name,
    twitchDisplayName: profile.twitch_display_name || profile.display_name || user.user_metadata?.name,
  });
  const checks = [];
  const needsChat = selectedTools.some(type => ['chat', 'giveaway', 'slot_requests', 'bets'].includes(type));
  const provider = user.app_metadata?.provider || user.identities?.[0]?.provider || '';
  const metadataLogin = String(user.user_metadata?.preferred_username || user.user_metadata?.user_name || user.user_metadata?.twitch_username || profile.twitch_username || '').trim().toLowerCase();
  const channelLogin = normalized.twitchChannel;
  const commandValidation = validateCommandConfiguration(normalized);

  checks.push(check({
    id: 'twitch-account-connected',
    service: SERVICE_IDS.TWITCH,
    status: provider === 'twitch' || metadataLogin ? READINESS_STATUSES.READY : READINESS_STATUSES.ERROR,
    title: 'Twitch account connected',
    message: provider === 'twitch' || metadataLogin
      ? `Connected as ${metadataLogin || channelLogin}.`
      : 'Connect Twitch so Streamers Center can identify your streaming channel.',
    blocking: needsChat,
    action: provider === 'twitch' ? undefined : { label: 'Connect Twitch', type: 'connect', destination: '/login' },
    meta: { login: metadataLogin || channelLogin },
  }));

  if (!channelLogin) {
    checks.push(check({
      id: 'twitch-channel-confirmed',
      service: SERVICE_IDS.TWITCH,
      status: READINESS_STATUSES.ERROR,
      title: 'Channel selected',
      message: 'Choose the Twitch channel viewers use for chat commands.',
      blocking: needsChat,
    }));
  } else {
    const twitchResult = await fetchTwitchUser(channelLogin).catch(() => ({ status: 'unavailable' }));
    const matchesConnected = !metadataLogin || metadataLogin === channelLogin;
    checks.push(check({
      id: 'twitch-channel-confirmed',
      service: SERVICE_IDS.TWITCH,
      status: twitchResult.status === 'ready' && matchesConnected
        ? READINESS_STATUSES.READY
        : twitchResult.status === 'not_found'
          ? READINESS_STATUSES.ERROR
          : matchesConnected
            ? READINESS_STATUSES.WARNING
            : READINESS_STATUSES.ERROR,
      title: 'Channel identity confirmed',
      message: twitchResult.status === 'ready' && matchesConnected
        ? `Verified Twitch channel ${twitchResult.user.display_name || channelLogin}.`
        : twitchResult.status === 'not_found'
          ? 'Twitch could not find that channel. Check the spelling or reconnect Twitch.'
          : !matchesConnected
            ? `The entered channel does not match your connected Twitch account (${metadataLogin}).`
            : 'Twitch identity is saved, but live channel lookup is temporarily unavailable. You can check again shortly.',
      blocking: needsChat && (twitchResult.status === 'not_found' || !matchesConnected),
      action: channelLogin ? { label: 'View my Twitch channel', type: 'external', destination: serviceLinks.twitch.channel(channelLogin) } : undefined,
      meta: { login: channelLogin, displayName: twitchResult.user?.display_name || normalized.twitchDisplayName || channelLogin },
    }));
  }

  checks.push(check({
    id: 'twitch-chat-auth-valid',
    service: SERVICE_IDS.TWITCH,
    status: provider === 'twitch' || channelLogin ? READINESS_STATUSES.READY : READINESS_STATUSES.ERROR,
    title: 'Chat authorization valid',
    message: provider === 'twitch'
      ? 'Twitch sign-in is active for this setup session.'
      : channelLogin
        ? 'A channel is configured. Reconnect Twitch if chat commands stop responding.'
        : 'Connect Twitch before enabling chat-driven tools.',
    blocking: needsChat && !channelLogin,
    action: { label: provider === 'twitch' ? 'Reconnect Twitch' : 'Connect Twitch', type: 'connect', destination: '/login' },
  }));

  checks.push(check({
    id: 'twitch-chat-readable',
    service: SERVICE_IDS.TWITCH,
    status: needsChat ? (channelLogin ? READINESS_STATUSES.READY : READINESS_STATUSES.ERROR) : READINESS_STATUSES.OPTIONAL,
    title: 'Chat connection mode ready',
    message: needsChat
      ? (channelLogin ? 'Streamers Center can use the configured Twitch channel for chat-driven widgets.' : 'Select a Twitch channel so chat-driven widgets know where to listen.')
      : 'No selected tool currently requires chat.',
    blocking: needsChat && !channelLogin,
    action: { label: 'Check chat again', type: 'retry' },
  }));

  checks.push(check({
    id: 'twitch-commands-valid',
    service: SERVICE_IDS.TWITCH,
    status: commandValidation.errors.length ? READINESS_STATUSES.ERROR : commandValidation.warnings.length ? READINESS_STATUSES.WARNING : READINESS_STATUSES.READY,
    title: 'Commands valid and unique',
    message: commandValidation.errors[0] || commandValidation.warnings[0] || 'Slot request, bet and giveaway commands are valid and do not conflict.',
    blocking: needsChat && commandValidation.errors.length > 0,
  }));

  return checks;
}

async function checkStreamElementsReadiness({ supabase, user, details, profile, selectedTools }) {
  const normalized = normalizeSetupDetails(details);
  const checks = [];
  const required = normalized.pointSource === 'streamelements' && selectedTools.some(type => ['slot_requests', 'bets', 'giveaway'].includes(type));
  if (!required) {
    checks.push(check({
      id: 'se-mode',
      service: SERVICE_IDS.STREAMELEMENTS,
      status: normalized.pointSource === 'internal' ? READINESS_STATUSES.FALLBACK : READINESS_STATUSES.OPTIONAL,
      title: 'Viewer point source',
      message: normalized.pointSource === 'internal'
        ? 'Using Streamers Center internal points, so StreamElements is not required.'
        : 'Points are disabled, so StreamElements is optional.',
      blocking: false,
    }));
    return checks;
  }

  const { data: seAccount } = await supabase
    .from('streamelements_connections')
    .select('se_channel_id, se_username, connected_at, last_sync')
    .eq('user_id', user.id)
    .maybeSingle();
  const { data: seSecret } = await supabase
    .from('streamelements_connections')
    .select('se_channel_id, se_jwt_token, se_username')
    .eq('user_id', user.id)
    .maybeSingle();
  const pointValidation = validatePointSettings(normalized);
  const twitchLogin = normalizeSetupDetails(details, { twitchChannel: profile.twitch_username }).twitchChannel;
  const seUsername = String(seAccount?.se_username || '').toLowerCase();
  const channelMatches = !seUsername || !twitchLogin || seUsername === twitchLogin;

  checks.push(check({
    id: 'se-account-linked',
    service: SERVICE_IDS.STREAMELEMENTS,
    status: seAccount?.se_channel_id ? READINESS_STATUSES.READY : READINESS_STATUSES.ERROR,
    title: 'StreamElements account linked',
    message: seAccount?.se_channel_id ? 'StreamElements credentials are saved for this account.' : 'Connect StreamElements before charging loyalty points.',
    blocking: required,
    action: { label: seAccount?.se_channel_id ? 'Check connection again' : 'Connect StreamElements', type: seAccount?.se_channel_id ? 'retry' : 'internal', destination: '/overlay-center/integrations' },
  }));

  checks.push(check({
    id: 'se-channel-matches-twitch',
    service: SERVICE_IDS.STREAMELEMENTS,
    status: channelMatches ? READINESS_STATUSES.READY : READINESS_STATUSES.ERROR,
    title: 'Correct Twitch channel selected',
    message: channelMatches ? 'StreamElements is linked to the selected Twitch channel.' : `StreamElements appears linked to ${seUsername}, not ${twitchLogin}.`,
    blocking: required && !channelMatches,
    action: { label: 'Manage linked channels', type: 'external', destination: serviceLinks.streamElements.channels },
  }));

  checks.push(check({
    id: 'se-point-settings-valid',
    service: SERVICE_IDS.STREAMELEMENTS,
    status: pointValidation.errors.length ? READINESS_STATUSES.ERROR : READINESS_STATUSES.READY,
    title: 'Point settings valid',
    message: pointValidation.errors[0] || 'Point costs and bet limits are valid.',
    blocking: required && pointValidation.errors.length > 0,
    action: { label: 'Open Loyalty Settings', type: 'external', destination: serviceLinks.streamElements.loyalty },
  }));

  if (!seSecret?.se_channel_id || !seSecret?.se_jwt_token) {
    checks.push(check({
      id: 'se-api-valid',
      service: SERVICE_IDS.STREAMELEMENTS,
      status: READINESS_STATUSES.ERROR,
      title: 'StreamElements API authorization valid',
      message: 'StreamElements credentials are missing or incomplete.',
      blocking: required,
      action: { label: 'Connect StreamElements', type: 'internal', destination: '/overlay-center/integrations' },
    }));
    return checks;
  }

  try {
    const response = await fetch(`https://api.streamelements.com/kappa/v2/points/${encodeURIComponent(seSecret.se_channel_id)}`, {
      headers: { Authorization: `Bearer ${seSecret.se_jwt_token}`, Accept: 'application/json' },
    });
    checks.push(check({
      id: 'se-api-valid',
      service: SERVICE_IDS.STREAMELEMENTS,
      status: response.ok ? READINESS_STATUSES.READY : response.status === 401 || response.status === 403 ? READINESS_STATUSES.ERROR : READINESS_STATUSES.WARNING,
      title: 'Required API authorization valid',
      message: response.ok
        ? 'Streamers Center can read the StreamElements points API.'
        : response.status === 401 || response.status === 403
          ? 'Your StreamElements authorization is invalid. Reconnect StreamElements.'
          : sanitizedProviderMessage('unavailable'),
      blocking: required && (response.status === 401 || response.status === 403),
      action: { label: 'Check connection again', type: 'retry' },
    }));
    checks.push(check({
      id: 'se-loyalty-enabled',
      service: SERVICE_IDS.STREAMELEMENTS,
      status: response.ok ? READINESS_STATUSES.READY : READINESS_STATUSES.WARNING,
      title: 'Loyalty enabled',
      message: response.ok ? 'The loyalty points endpoint is available.' : 'Open Loyalty Settings and confirm points are enabled.',
      blocking: false,
      action: { label: 'Open Loyalty Settings', type: 'external', destination: serviceLinks.streamElements.loyalty },
    }));
  } catch {
    checks.push(check({
      id: 'se-api-valid',
      service: SERVICE_IDS.STREAMELEMENTS,
      status: READINESS_STATUSES.WARNING,
      title: 'Required API authorization valid',
      message: sanitizedProviderMessage('unavailable'),
      blocking: false,
      action: { label: 'Check connection again', type: 'retry' },
    }));
  }

  checks.push(check({
    id: 'se-bot-available',
    service: SERVICE_IDS.STREAMELEMENTS,
    status: READINESS_STATUSES.WARNING,
    title: 'Bot available in chat',
    message: 'Streamers Center cannot safely send a test chat message automatically. Confirm the bot is joined in StreamElements, then check again.',
    blocking: false,
    action: { label: 'Open default commands', type: 'external', destination: serviceLinks.streamElements.defaultCommands },
  }));

  return checks;
}

async function refreshSpotify(refreshToken) {
  if (!SPOTIFY_CLIENT_ID || !refreshToken) return null;
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!response.ok) return null;
  return response.json();
}

async function checkMusicReadiness({ supabase, user, details, selectedTools }) {
  const normalized = normalizeSetupDetails(details);
  const checks = [];
  const musicSelected = selectedTools.some(type => ['navbar', 'spotify_now_playing'].includes(type));
  if (!musicSelected || normalized.musicMode === 'disabled') {
    checks.push(check({
      id: 'music-disabled',
      service: SERVICE_IDS.MUSIC,
      status: READINESS_STATUSES.OPTIONAL,
      title: 'Music intentionally disabled',
      message: 'Music is optional and will not block setup.',
      blocking: false,
    }));
    return checks;
  }
  if (normalized.musicMode === 'manual') {
    const validManual = Boolean(normalized.manualTrack || normalized.manualArtist || normalized.musicFallbackMessage);
    checks.push(check({
      id: 'music-manual-fallback',
      service: SERVICE_IDS.MUSIC,
      status: validManual ? READINESS_STATUSES.FALLBACK : READINESS_STATUSES.WARNING,
      title: 'Manual music fallback configured',
      message: validManual ? 'Manual music information is configured and counts as a valid fallback.' : 'Add a track, artist or fallback message for manual music display.',
      blocking: false,
    }));
    return checks;
  }

  const { data: tokenRow } = await supabase
    .from('spotify_tokens')
    .select('access_token, refresh_token, expires_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!tokenRow?.refresh_token) {
    checks.push(check({
      id: 'spotify-authorized',
      service: SERVICE_IDS.MUSIC,
      status: READINESS_STATUSES.ERROR,
      title: 'Spotify account authorized',
      message: 'Connect Spotify to use automatic now-playing data.',
      blocking: true,
      action: { label: 'Connect Spotify', type: 'internal', destination: '/overlay-center/integrations' },
    }));
    return checks;
  }

  const needsRefresh = Number(tokenRow.expires_at || 0) < Date.now() + 60000;
  let accessToken = tokenRow.access_token;
  let expiresAt = tokenRow.expires_at;
  if (needsRefresh) {
    const refreshed = await refreshSpotify(tokenRow.refresh_token).catch(() => null);
    if (!refreshed?.access_token) {
      checks.push(check({
        id: 'spotify-token-refresh',
        service: SERVICE_IDS.MUSIC,
        status: READINESS_STATUSES.ERROR,
        title: 'Spotify authorization valid',
        message: 'Your Spotify connection expired. Reconnect Spotify to continue using automatic music data.',
        blocking: true,
        action: { label: 'Reconnect Spotify', type: 'internal', destination: '/overlay-center/integrations' },
      }));
      return checks;
    }
    accessToken = refreshed.access_token;
    expiresAt = Date.now() + (Number(refreshed.expires_in) || 3600) * 1000;
    await supabase.from('spotify_tokens').update({
      access_token: accessToken,
      refresh_token: refreshed.refresh_token || tokenRow.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);
  }

  checks.push(check({
    id: 'spotify-authorized',
    service: SERVICE_IDS.MUSIC,
    status: READINESS_STATUSES.READY,
    title: 'Spotify account authorized',
    message: 'Spotify authorization is saved and can refresh server-side.',
    blocking: true,
    action: { label: 'Manage Spotify app access', type: 'external', destination: serviceLinks.spotify.appAccess },
  }));

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    checks.push(check({
      id: 'spotify-playback-readable',
      service: SERVICE_IDS.MUSIC,
      status: response.ok || response.status === 204 ? READINESS_STATUSES.READY : response.status === 401 ? READINESS_STATUSES.ERROR : READINESS_STATUSES.WARNING,
      title: 'Now-playing data readable',
      message: response.ok
        ? 'Streamers Center can retrieve current playback information.'
        : response.status === 204
          ? 'Spotify is connected. Nothing is playing right now, so your fallback behavior will be used.'
          : response.status === 401
            ? 'Spotify authorization expired. Reconnect Spotify.'
            : 'Spotify could not be reached right now. Your saved fallback behavior will be used.',
      blocking: response.status === 401,
      action: { label: 'Test now-playing data', type: 'retry' },
      meta: { lastSuccessfulPlaybackCheck: response.ok || response.status === 204 ? new Date().toISOString() : null },
    }));
  } catch {
    checks.push(check({
      id: 'spotify-playback-readable',
      service: SERVICE_IDS.MUSIC,
      status: READINESS_STATUSES.WARNING,
      title: 'Now-playing data readable',
      message: sanitizedProviderMessage('unavailable'),
      blocking: false,
      action: { label: 'Test now-playing data', type: 'retry' },
    }));
  }

  return checks;
}

async function checkSlotDataReadiness({ supabase, details, selectedTools }) {
  const normalized = normalizeSetupDetails(details);
  const checks = [];
  const slotSelected = selectedTools.some(type => ['bonus_hunt', 'current_slot', 'rtp_stats', 'slot_requests', 'bonus_buys', 'tournament'].includes(type));
  if (!slotSelected) {
    checks.push(check({
      id: 'slot-data-optional',
      service: SERVICE_IDS.SLOT_DATA,
      status: READINESS_STATUSES.OPTIONAL,
      title: 'Slot data optional',
      message: 'No selected tool currently requires slot metadata.',
      blocking: false,
    }));
    return checks;
  }

  checks.push(check({
    id: 'slot-currency-selected',
    service: SERVICE_IDS.SLOT_DATA,
    status: normalized.currencyCode ? READINESS_STATUSES.READY : READINESS_STATUSES.ERROR,
    title: 'Currency selected',
    message: normalized.currencyCode ? `Money widgets will store ${normalized.currencyCode}.` : 'Choose an ISO currency code for money widgets.',
    blocking: !normalized.currencyCode,
  }));

  if (normalized.slotSource === 'manual') {
    checks.push(check({
      id: 'slot-manual-fallback',
      service: SERVICE_IDS.SLOT_DATA,
      status: READINESS_STATUSES.FALLBACK,
      title: 'Manual slot entry fallback',
      message: 'Manual slot entry is enabled and can be used when no external source is available.',
      blocking: false,
      action: { label: 'Manage slot data', type: 'internal', destination: '/overlay-center/slots' },
    }));
    return checks;
  }

  try {
    const { data, error } = await supabase
      .from('slots')
      .select('id, name, provider, image, rtp, volatility')
      .ilike('name', `%${normalized.sampleSlotName}%`)
      .limit(1);
    const found = !error && data?.length > 0;
    checks.push(check({
      id: 'slot-sample-search',
      service: SERVICE_IDS.SLOT_DATA,
      status: found ? READINESS_STATUSES.READY : normalized.manualSlotFallback ? READINESS_STATUSES.FALLBACK : READINESS_STATUSES.ERROR,
      title: 'Sample slot search succeeds',
      message: found
        ? `Found ${data[0].name}${data[0].provider ? ` by ${data[0].provider}` : ''}.`
        : normalized.manualSlotFallback
          ? 'The sample search did not find a match, but manual fallback is enabled.'
          : 'The sample search did not find a match. Enable manual fallback or manage slot data.',
      blocking: !found && !normalized.manualSlotFallback,
      action: { label: 'Search sample slot', type: 'retry' },
      meta: found ? { sampleSlot: { name: data[0].name, provider: data[0].provider, hasImage: Boolean(data[0].image) } } : {},
    }));
    checks.push(check({
      id: 'slot-image-defaults',
      service: SERVICE_IDS.SLOT_DATA,
      status: READINESS_STATUSES.READY,
      title: 'Missing metadata has safe defaults',
      message: 'Unknown images, RTP and volatility have fallback behavior configured.',
      blocking: false,
    }));
  } catch {
    checks.push(check({
      id: 'slot-provider-reachable',
      service: SERVICE_IDS.SLOT_DATA,
      status: normalized.manualSlotFallback ? READINESS_STATUSES.FALLBACK : READINESS_STATUSES.WARNING,
      title: 'Slot provider reachable',
      message: normalized.manualSlotFallback ? 'Slot search is unavailable, but manual fallback is enabled.' : 'Slot search is unavailable. Enable manual fallback to continue safely.',
      blocking: !normalized.manualSlotFallback,
      action: { label: 'Use manual fallback', type: 'internal', destination: '/overlay-center/setup#slot-data' },
    }));
  }

  return checks;
}

async function checkAll({ supabase, user, body }) {
  const selectedTools = Array.isArray(body.selectedTools) ? body.selectedTools : [];
  const profile = await getProfile(supabase, user.id);
  const details = normalizeSetupDetails(body.details || {}, {
    twitchChannel: profile.twitch_username || user.user_metadata?.preferred_username || user.user_metadata?.user_name,
    twitchDisplayName: profile.twitch_display_name || profile.display_name || user.user_metadata?.name,
  });
  const groups = await Promise.all([
    checkTwitchReadiness({ supabase, user, profile, details, selectedTools }),
    checkStreamElementsReadiness({ supabase, user, profile, details, selectedTools }),
    checkMusicReadiness({ supabase, user, details, selectedTools }),
    checkSlotDataReadiness({ supabase, details, selectedTools }),
  ]);
  const checks = groups.flat();
  const summary = summarizeReadiness(checks);
  return {
    details,
    checks,
    summary,
    checkedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const supabase = getSupabase();
  if (!supabase) return json(res, 503, { error: 'Readiness validation is not configured on this server.' });
  const user = await verifyUser(supabase, req);
  if (!user) return json(res, 401, { error: 'Authentication required' });

  try {
    const body = req.body || {};
    const action = body.action || 'check_all';
    if (action !== 'check_all') return json(res, 400, { error: 'Unsupported readiness action' });
    const result = await checkAll({ supabase, user, body });
    return json(res, 200, result);
  } catch (error) {
    console.error('[service-readiness] validation failed', error?.message || error);
    return json(res, 500, {
      error: 'Readiness checks could not be completed. Your setup is saved, and you can check again shortly.',
    });
  }
}