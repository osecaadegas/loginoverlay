import { createSupabaseAdmin, requireUser, parseBody } from './api-auth.js';
import { resolveSlotRequestSettings, slotRequestCost } from '../../shared/slotRequestSettings.js';
import { verifyStreamElementsCommunity, loadVerifiedCommunity, twitchIdentityId, communityBalance, changeCommunityPoints } from './streamelements-community.js';

const SE_BASE = 'https://api.streamelements.com/kappa/v2';
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const fill = (template, values) => String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

async function settingsFor(db, userId) {
  const { data, error } = await db.from('overlay_widgets').select('id,widget_type,config,updated_at')
    .eq('user_id', userId).in('widget_type', ['bonus_hunt', 'slot_requests']);
  if (error) throw fail('Could not load request settings.', 503);
  return resolveSlotRequestSettings(data || []);
}

async function say(connection, message, fetcher) {
  if (!connection) return;
  try {
    await fetcher(`${SE_BASE}/bot/${connection.se_channel_id}/say`, {
      method: 'POST', headers: { Authorization: `Bearer ${connection.se_jwt_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }), signal: AbortSignal.timeout(5000),
    });
  } catch { /* A chat notification must never retry a successful charge. */ }
}

async function findSlot(db, name) {
  const escaped = name.replace(/[\\%_]/g, '\\$&');
  for (const pattern of [escaped, `%${escaped}%`]) {
    const { data, error } = await db.from('slots').select('name,image').ilike('name', pattern).limit(1);
    if (error) throw fail('Slot search is unavailable.', 503);
    if (data?.length) return data[0];
  }
  const stopWords = new Set(['of','the','a','an','and','in','on','at','to','for','by','or','is','it','vs']);
  const words = name.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
  if (!words.length) return null;
  let query = db.from('slots').select('name,image');
  for (const word of words) query = query.ilike('name', `%${word.replace(/[\\%_]/g, '\\$&')}%`);
  const { data, error } = await query.limit(20);
  if (error) throw fail('Slot search is unavailable.', 503);
  return (data || []).sort((a, b) => {
    const size = slot => slot.name.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w)).length || 1;
    return words.length / size(b) - words.length / size(a) || a.name.length - b.name.length;
  })[0] || null;
}

async function updateRequest(db, request, fromStatus, values) {
  const { data, error } = await db.from('slot_requests').update(values).eq('id', request.id)
    .eq('user_id', request.user_id).eq('status', fromStatus).select('*').maybeSingle();
  if (error || !data) throw fail('Request state could not be saved. Check Points review before retrying.', 503);
  return data;
}

export async function createSlotRequest(db, user, params, { fetcher = fetch, lookupTwitchUser }) {
  const viewer = String(params.requester || '').replace(/^@/, '').trim().toLowerCase();
  const messageId = String(params.message_id || '');
  const slotName = String(params.slot || '').trim();
  if (!/^[a-z0-9_]{1,25}$/.test(viewer) || !/^[a-f0-9-]{36}$/i.test(messageId) || !slotName || slotName.length > 200) throw fail('Invalid chat request identity or slot name.');
  const broadcasterId = twitchIdentityId(user);
  if (!broadcasterId || String(params.broadcaster_id) !== broadcasterId) throw fail('The chat listener must use your signed-in Twitch channel.', 403);
  const settings = await settingsFor(db, user.id);
  if (!settings) throw fail('Configure Bonus Hunt requests first.', 409);
  const config = settings.config;
  if (config.srChatEnabled === false) return { success: false, message: 'Slot requests are currently paused.' };
  const cost = slotRequestCost(config);
  let connection = null;
  if (cost > 0) {
    connection = await loadVerifiedCommunity(db, user, fetcher);
    const viewerId = await lookupTwitchUser(viewer);
    if (!viewerId || viewerId !== String(params.chatter_id || '')) throw fail('Twitch viewer identity mismatch.', 403);
  } else {
    try { connection = await loadVerifiedCommunity(db, user, fetcher); } catch { /* Free requests do not require StreamElements. */ }
  }
  const slot = await findSlot(db, slotName);
  const values = { user: viewer, slot: slot?.name || slotName, cost };
  const reply = async (message, success = false) => { await say(connection, message, fetcher); return { success, message }; };
  if (!slot) return reply(fill(config.srMsgNoMatch || '{user}, could not find that slot. Please try again.', values));
  const maxQueue = Math.min(500, Math.max(1, parseInt(config.maxQueueSize, 10) || 50));
  const cooldown = Math.min(86400, Math.max(0, parseInt(config.cooldownSeconds, 10) || 0));
  const { data: reservation, error } = await db.rpc('reserve_slot_request', {
    p_user_id: user.id, p_slot_name: slot.name, p_slot_image: slot.image, p_viewer: viewer,
    p_viewer_id: String(params.chatter_id || ''), p_message_id: messageId, p_cost: cost,
    p_channel_id: connection?.se_channel_id || null, p_max_queue: maxQueue, p_cooldown: cooldown,
  });
  if (error) throw fail('Could not reserve the request. No points were charged.', 503);
  const request = reservation.request;
  if (reservation.result === 'replay') return { success: request.status === 'pending', replay: true, status: request.status };
  if (reservation.result === 'duplicate') return reply(fill(config.srMsgDuplicate || '{user}, "{slot}" is already queued. No points taken.', { ...values, by: request.requested_by }));
  if (reservation.result === 'full') return reply(fill(config.srMsgQueueFull || '{user}, the slot queue is full.', values));
  if (reservation.result === 'cooldown') return reply(fill(config.srMsgCooldown || '{user}, please wait before requesting another slot.', values));
  if (reservation.result !== 'reserved') return reply(`${viewer}, your previous points operation is still processing or needs review.`);
  if (cost > 0) {
    let balance;
    try { balance = await communityBalance(connection, viewer, fetcher); }
    catch (error) {
      await updateRequest(db, request, 'charging', { status: 'denied', rejection_reason: 'Balance lookup failed; no charge attempted' });
      throw error;
    }
    if (balance < cost) {
      await updateRequest(db, request, 'charging', { status: 'denied', rejection_reason: 'Insufficient points' });
      return reply(fill(config.srMsgNotEnough || '{user}, you need {cost} points (you have {points}).', { ...values, points: balance }));
    }
    const outcome = await changeCommunityPoints(connection, viewer, -cost, fetcher);
    await updateRequest(db, request, 'charging', {
      status: outcome === 'confirmed' ? 'pending' : outcome === 'failed' ? 'denied' : 'charge_unknown',
      points_deducted: outcome === 'confirmed' ? cost : 0,
      rejection_reason: outcome === 'confirmed' ? null : outcome === 'failed' ? 'StreamElements rejected the charge' : 'Charge response uncertain; do not retry before reconciliation',
    });
    if (outcome !== 'confirmed') return reply(outcome === 'unknown'
      ? `${viewer}, the points result needs review. The charge will not be retried automatically.`
      : `${viewer}, StreamElements rejected the charge. No request was queued.`);
  }
  return reply(fill(cost > 0
    ? config.srMsgAcceptedCost || 'Added "{slot}" for {user}; {cost} points deducted.'
    : config.srMsgAccepted || 'Added "{slot}" to the queue (requested by {user}).', values), true);
}

export async function refundSlotRequest(db, user, requestId, { fetcher = fetch, connection, messageTemplate } = {}) {
  // Claim before any external side effect, including clear-all and retry buttons.
  const { data: request, error } = await db.from('slot_requests').update({ status: 'refunding' })
    .eq('user_id', user.id).eq('id', requestId).in('status', ['pending', 'refund_failed']).select('*').maybeSingle();
  if (error) throw fail('Could not claim refund.', 503);
  if (!request) return { success: false, status: 'already_processed' };
  const amount = Math.max(0, Number(request.points_deducted) || 0);
  let outcome = 'confirmed';
  let reason = null;
  if (amount > 0) {
    try {
      connection ||= await loadVerifiedCommunity(db, user, fetcher);
      if (!request.charged_channel_id || connection.se_channel_id !== request.charged_channel_id) throw new Error('Original charged community is missing or differs from the current connection.');
    } catch (error) {
      outcome = 'failed'; reason = error.message;
    }
    if (outcome === 'confirmed') outcome = await changeCommunityPoints(connection, request.requested_by, amount, fetcher);
  }
  const status = outcome === 'confirmed' ? 'refunded' : outcome === 'failed' ? 'refund_failed' : 'refund_unknown';
  await updateRequest(db, request, 'refunding', {
    status, refunded_points: outcome === 'confirmed' ? amount : null,
    refunded_at: outcome === 'confirmed' && amount > 0 ? new Date().toISOString() : null,
    rejection_reason: reason || (outcome === 'confirmed' ? null : outcome === 'failed' ? 'Refund rejected; safe to retry after fixing connection' : 'Refund response uncertain; manual reconciliation required'),
  });
  if (outcome === 'confirmed') await say(connection, fill(messageTemplate || '{user}, your request for "{slot}" was rejected. {refund}', {
    user: request.requested_by, slot: request.slot_name, cost: amount, refund: amount > 0 ? `${amount} points refunded.` : '',
  }), fetcher);
  return { success: outcome === 'confirmed', status, pointsRefunded: outcome === 'confirmed' ? amount : 0 };
}

export async function slotRequestHandler(req, res, dependencies = {}) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use the authenticated chat listener; public GET requests cannot charge points.' });
  try {
    const db = dependencies.db || createSupabaseAdmin();
    const user = await requireUser(req, db);
    const params = parseBody(req);
    if (params.user_id && params.user_id !== user.id) throw fail('Forbidden', 403);
    const cmd = req.query?.cmd || params.cmd;
    if (cmd === 'sr') return res.status(200).json(await createSlotRequest(db, user, params, dependencies));
    const settings = await settingsFor(db, user.id);
    const options = { ...dependencies, messageTemplate: settings?.config?.srMsgRejected };
    if (cmd === 'sr-reject') {
      if (!params.request_id) throw fail('Missing request id.');
      const result = await refundSlotRequest(db, user, params.request_id, options);
      return res.status(result.success ? 200 : 409).json(result);
    }
    const { data, error } = await db.from('slot_requests').select('id').eq('user_id', user.id).in('status', ['pending', 'refund_failed']).limit(500);
    if (error) throw fail('Could not load requests. Nothing was cleared.', 503);
    let refunded = 0;
    let failed = 0;
    // Keep one server invocation bounded; remaining rows stay intact for the next clear.
    for (const request of (data || []).slice(0, 3)) {
      const result = await refundSlotRequest(db, user, request.id, options);
      if (result.success) refunded++; else failed++;
    }
    return res.status(200).json({ success: !failed && data.length <= 3, refunded, failed, remaining: Math.max(0, data.length - 3) });
  } catch (error) {
    console.error('[slot-requests]', error.statusCode || 'operation_failed');
    return res.status(error.statusCode || 503).json({ error: error.statusCode ? error.message : 'Points service unavailable. Check the connection and Points review.' });
  }
}

export async function streamElementsConnectionHandler(req, res, dependencies = {}) {
  if (!['GET','POST','DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  try {
    const db = dependencies.db || createSupabaseAdmin();
    const user = await requireUser(req, db);
    if (req.method === 'DELETE') {
      const { error } = await db.from('streamelements_connections').delete().eq('user_id', user.id);
      if (error) throw fail('Could not clear the connection.', 503);
      return res.status(200).json({ success: true });
    }
    let connection = parseBody(req);
    if (req.method === 'GET' || connection.use_saved) {
      const { data, error } = await db.from('streamelements_connections').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw fail('Could not load the connection.', 503);
      connection = data;
    }
    let verified;
    try { verified = await verifyStreamElementsCommunity(user, connection, dependencies.fetcher || fetch); }
    catch (error) { throw fail(error.message, 409); }
    const { pointsWarning, ...toStore } = verified;
    if (req.method === 'POST' && !connection.test_only) {
      const { error } = await db.from('streamelements_connections').upsert({ ...toStore, user_id: user.id, connected_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw fail('Verification passed, but saving failed. Please retry.', 503);
    }
    return res.status(200).json({ success: true, username: verified.se_username, verified_at: verified.verified_at, verified_twitch_id: verified.verified_twitch_id, pointsWarning: verified.pointsWarning || null });
  } catch (error) { return res.status(error.statusCode || 503).json({ error: error.statusCode ? error.message : 'Connection verification is unavailable.' }); }
}
