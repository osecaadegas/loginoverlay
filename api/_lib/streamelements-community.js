const SE_BASE = 'https://api.streamelements.com/kappa/v2';

export function twitchIdentityId(user) {
  return String(user?.identities?.find(identity => identity.provider === 'twitch')?.identity_data?.sub || '');
}

export async function verifyStreamElementsCommunity(user, connection, fetcher = fetch) {
  const twitchId = twitchIdentityId(user);
  if (!twitchId) throw new Error('Sign in with your Twitch account before connecting community points.');
  const channelId = String(connection?.se_channel_id || '').trim();
  const token = String(connection?.se_jwt_token || '').trim();
  if (!/^[a-f0-9]{24}$/i.test(channelId) || !token || token.length > 8192) throw new Error('Enter valid StreamElements credentials.');
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  const response = await fetcher(`${SE_BASE}/channels/me`, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('StreamElements authorization failed. Reconnect with your own channel JWT.');
  const channel = await response.json();
  if (String(channel._id) !== channelId || channel.provider !== 'twitch' || String(channel.providerId) !== twitchId) {
    throw new Error('These credentials belong to a different community than your signed-in Twitch account.');
  }
  const points = await fetcher(`${SE_BASE}/points/${channelId}`, { headers, signal: AbortSignal.timeout(8000) });
  if (!points.ok) throw new Error('StreamElements points access is unavailable. Check the JWT and Loyalty settings.');
  return { se_channel_id: channelId, se_jwt_token: token, se_username: channel.username, verified_twitch_id: twitchId, verified_at: new Date().toISOString() };
}

export async function loadVerifiedCommunity(supabase, user, fetcher = fetch) {
  const { data, error } = await supabase.from('streamelements_connections').select('*').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!data?.verified_at || data.verified_twitch_id !== twitchIdentityId(user)) throw new Error('Verify your own StreamElements connection in Integrations first.');
  return verifyStreamElementsCommunity(user, data, fetcher);
}

export async function changeCommunityPoints(connection, viewer, amount, fetcher = fetch) {
  // This API has no documented idempotency key. Never retry an ambiguous PUT.
  try {
    const response = await fetcher(`${SE_BASE}/points/${connection.se_channel_id}/${encodeURIComponent(viewer)}/${amount}`, {
      method: 'PUT', headers: { Authorization: `Bearer ${connection.se_jwt_token}` }, signal: AbortSignal.timeout(8000),
    });
    if (response.ok) return 'confirmed';
    return [400, 401, 403, 404, 422, 429].includes(response.status) ? 'failed' : 'unknown';
  } catch { return 'unknown'; }
}

export async function communityBalance(connection, viewer, fetcher = fetch) {
  const response = await fetcher(`${SE_BASE}/points/${connection.se_channel_id}/${encodeURIComponent(viewer)}`, {
    headers: { Authorization: `Bearer ${connection.se_jwt_token}` }, signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Could not check viewer points. No new charge was attempted.');
  const body = await response.json();
  if (!Number.isFinite(body.points) || body.points < 0) throw new Error('Invalid points balance from StreamElements.');
  return body.points;
}
