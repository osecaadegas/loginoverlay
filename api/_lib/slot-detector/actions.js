import {
  AUTH_USER_RATE_LIMIT,
  DEFAULT_TARGET,
  DETECTOR_SCOPES,
  DEVICE_RATE_LIMIT,
  HIGH_CONFIDENCE_THRESHOLD,
  PAIRING_CODE_TTL_MINUTES,
  USER_RATE_LIMIT,
} from './constants.js';
import {
  canUpdateActiveSlot,
  normalizeTarget,
  requireClientEventId,
  validateDetectedAt,
  validateDeviceRecord,
  validatePairingRecord,
} from './core.js';
import {
  createDeviceToken,
  createPairingCode,
  hashDetectorSecret,
} from './crypto.js';
import { matchSlotFromEvidence } from './matching.js';
import { assertRateLimit } from './rate-limit.js';
import {
  normalizeKey,
  normalizeText,
  sanitizeDetectionPayload,
} from './sanitize.js';

function statusError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
}

function normalizePairingCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function publicDevice(device) {
  return {
    id: device.id,
    user_id: device.user_id,
    device_name: device.device_name,
    browser_name: device.browser_name,
    token_version: device.token_version,
    token_scopes: device.token_scopes,
    is_revoked: device.is_revoked,
    revoked_at: device.revoked_at,
    last_seen_at: device.last_seen_at,
    last_seen_domain: device.last_seen_domain,
    created_at: device.created_at,
    updated_at: device.updated_at,
  };
}

async function ensureSettings(supabase, userId) {
  const { data, error } = await supabase
    .from('slot_detector_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  const created = await supabase
    .from('slot_detector_settings')
    .insert({ user_id: userId })
    .select('*')
    .single();
  if (created.error) throw created.error;
  return created.data;
}

export async function requireDevice(req, supabase) {
  const token = getBearerToken(req);
  if (!token) throw statusError('Detector token required', 401);
  const tokenHash = hashDetectorSecret(token);
  const { data: device, error } = await supabase
    .from('slot_detector_devices')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (error) throw error;
  const validity = validateDeviceRecord(device);
  if (!validity.ok) throw statusError('Detector token is invalid or revoked', 401);
  return device;
}

async function loadSlotsByIds(supabase, slotIds) {
  const ids = [...new Set((slotIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('slots')
    .select('id, name, provider, image, rtp, volatility, max_win_multiplier')
    .in('id', ids);
  if (error) throw error;
  return data || [];
}

function escapeIlike(value) {
  return String(value || '').replace(/[\\%_]/g, '\\$&');
}

async function searchSlotsForEvidence(supabase, evidence) {
  const q = normalizeText(evidence.slotHint || evidence.pageTitleHint || '');
  if (!q || q.length < 2) return [];
  const terms = q.split(' ').filter((part) => part.length >= 3);
  const primary = terms[0] || q;
  const { data, error } = await supabase
    .from('slots')
    .select('id, name, provider, image, rtp, volatility, max_win_multiplier')
    .ilike('name', `%${escapeIlike(primary)}%`)
    .limit(80);
  if (error) throw error;
  return data || [];
}

async function loadMatchContext(supabase, userId, evidence) {
  const userFilter = `user_id.is.null,user_id.eq.${userId}`;
  const aliasNorm = normalizeText(evidence.slotHint || evidence.pageTitleHint || '');
  const gameCodeNorm = normalizeKey(evidence.safeGameId || '');

  const [aliasResult, gameCodeResult, searchedSlots] = await Promise.all([
    aliasNorm
      ? supabase
        .from('slot_detector_aliases')
        .select('*')
        .eq('alias_normalized', aliasNorm)
        .or(userFilter)
        .limit(30)
      : Promise.resolve({ data: [], error: null }),
    gameCodeNorm
      ? supabase
        .from('slot_detector_provider_game_codes')
        .select('*')
        .eq('game_code_normalized', gameCodeNorm)
        .or(userFilter)
        .limit(30)
      : Promise.resolve({ data: [], error: null }),
    searchSlotsForEvidence(supabase, evidence),
  ]);
  if (aliasResult.error) throw aliasResult.error;
  if (gameCodeResult.error) throw gameCodeResult.error;

  const mappedSlotIds = [
    ...(aliasResult.data || []).map((row) => row.slot_id),
    ...(gameCodeResult.data || []).map((row) => row.slot_id),
  ];
  const mappedSlots = await loadSlotsByIds(supabase, mappedSlotIds);
  const byId = new Map([...mappedSlots, ...searchedSlots].filter(Boolean).map((slot) => [slot.id, slot]));

  const aliases = (aliasResult.data || []).map((row) => ({ ...row, slot: byId.get(row.slot_id) || null }));
  const gameCodes = (gameCodeResult.data || []).map((row) => ({ ...row, slot: byId.get(row.slot_id) || null }));
  return {
    aliases,
    gameCodes,
    slots: [...byId.values()],
  };
}

async function bridgeConfirmedSlot({
  supabase,
  userId,
  deviceId = null,
  eventId = null,
  detectedAt,
  target = DEFAULT_TARGET,
  match,
  settings,
  force = false,
}) {
  if (!match?.slot?.name) return false;
  if (!force && !settings?.auto_update_enabled) return false;
  if (!force && Number(match.confidence || 0) < HIGH_CONFIDENCE_THRESHOLD) return false;

  const requestedTarget = normalizeTarget(target, settings?.default_target || DEFAULT_TARGET);
  const safeTarget = requestedTarget === 'bonus_hunt' && !settings?.auto_bonus_hunt_updates
    ? (settings?.default_target === 'bonus_hunt' ? DEFAULT_TARGET : settings?.default_target || DEFAULT_TARGET)
    : requestedTarget;

  const { data: current, error: loadError } = await supabase
    .from('slot_detector_active_slots')
    .select('*')
    .eq('user_id', userId)
    .eq('target', safeTarget)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!canUpdateActiveSlot(current, detectedAt)) return false;

  const activePayload = {
    user_id: userId,
    target: safeTarget,
    event_id: eventId,
    device_id: deviceId,
    slot_id: match.slot.id,
    slot_name: match.slot.name,
    provider_name: match.slot.provider || null,
    image_url: match.slot.image || null,
    server_confidence: Number(match.confidence || 0),
    detected_at: new Date(detectedAt).toISOString(),
    updated_at: new Date().toISOString(),
  };
  const upserted = await supabase
    .from('slot_detector_active_slots')
    .upsert(activePayload, { onConflict: 'user_id,target' })
    .select('*')
    .single();
  if (upserted.error) throw upserted.error;

  const detected = await supabase
    .from('detected_slots')
    .insert({
      user_id: userId,
      slot_id: match.slot.id,
      slot_name: match.slot.name,
      provider: match.slot.provider || null,
      target: safeTarget,
      source_event_id: eventId,
      detection_confidence: Number(match.confidence || 0),
      detected_at: new Date(detectedAt).toISOString(),
    })
    .select('*')
    .single();
  if (detected.error) throw detected.error;
  return true;
}

export async function handleCreatePairingCode(req, res, supabase, user, body) {
  assertRateLimit(`auth:${user.id}:create-pairing-code`, AUTH_USER_RATE_LIMIT);
  await ensureSettings(supabase, user.id);
  const code = createPairingCode();
  const compactCode = normalizePairingCode(code);
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MINUTES * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('slot_detector_pairing_codes')
    .insert({
      user_id: user.id,
      code_hash: hashDetectorSecret(compactCode),
      device_name: String(body.deviceName || 'Browser extension').slice(0, 120),
      expires_at: expiresAt,
    })
    .select('id, expires_at, created_at')
    .single();
  if (error) throw error;
  return res.status(201).json({
    pairingCode: code,
    expiresAt,
    ttlMinutes: PAIRING_CODE_TTL_MINUTES,
    id: data.id,
  });
}

export async function handleExchangePairingCode(req, res, supabase, body) {
  assertRateLimit(`ip:${getClientIp(req)}:exchange-pairing-code`, AUTH_USER_RATE_LIMIT);
  const compactCode = normalizePairingCode(body.code || body.pairingCode);
  if (!compactCode) throw statusError('Pairing code is required', 400);
  const nowIso = new Date().toISOString();
  const claimed = await supabase
    .from('slot_detector_pairing_codes')
    .update({ used_at: nowIso })
    .eq('code_hash', hashDetectorSecret(compactCode))
    .is('used_at', null)
    .gt('expires_at', nowIso)
    .select('*')
    .maybeSingle();
  if (claimed.error) throw claimed.error;
  if (!claimed.data) throw statusError('Pairing code is invalid, expired, or already used', 410);

  const token = createDeviceToken();
  const device = await supabase
    .from('slot_detector_devices')
    .insert({
      user_id: claimed.data.user_id,
      device_name: String(body.deviceName || claimed.data.device_name || 'Browser extension').slice(0, 120),
      browser_name: String(body.browserName || 'Chrome/Edge').slice(0, 80),
      token_hash: hashDetectorSecret(token),
      token_scopes: DETECTOR_SCOPES,
      last_seen_at: nowIso,
    })
    .select('*')
    .single();
  if (device.error) throw device.error;
  await supabase
    .from('slot_detector_pairing_codes')
    .update({ consumed_by_device_id: device.data.id })
    .eq('id', claimed.data.id);
  return res.status(201).json({
    token,
    device: publicDevice(device.data),
  });
}

export async function handleHeartbeat(req, res, supabase, device, body) {
  assertRateLimit(`device:${device.id}:heartbeat`, DEVICE_RATE_LIMIT);
  const sanitized = sanitizeDetectionPayload(body || {});
  const { data, error } = await supabase
    .from('slot_detector_devices')
    .update({
      last_seen_at: new Date().toISOString(),
      last_seen_domain: sanitized.domain || null,
    })
    .eq('id', device.id)
    .eq('user_id', device.user_id)
    .select('*')
    .single();
  if (error) throw error;
  return res.status(200).json({ ok: true, device: publicDevice(data) });
}

export async function handleSubmitEvent(req, res, supabase, device, body) {
  assertRateLimit(`device:${device.id}:submit-event`, DEVICE_RATE_LIMIT);
  assertRateLimit(`user:${device.user_id}:submit-event`, USER_RATE_LIMIT);
  const clientEventId = requireClientEventId(body.clientEventId);
  const timing = validateDetectedAt(body.detectedAt, new Date());
  if (!timing.ok) throw statusError(`Detection event rejected: ${timing.reason}`, timing.reason === 'invalid_detected_at' ? 400 : 409);

  const evidence = sanitizeDetectionPayload(body);
  const settings = await ensureSettings(supabase, device.user_id);
  const context = await loadMatchContext(supabase, device.user_id, evidence);
  const match = matchSlotFromEvidence({ evidence, ...context });
  const status = match.status;

  const eventPayload = {
    user_id: device.user_id,
    device_id: device.id,
    client_event_id: clientEventId,
    detected_at: timing.detectedAt.toISOString(),
    domain: evidence.domain,
    path_pattern: evidence.pathPattern,
    safe_game_id: evidence.safeGameId,
    device_panel_id: evidence.devicePanelId,
    provider_hint: evidence.providerHint,
    slot_hint: evidence.slotHint,
    page_title_hint: evidence.pageTitleHint,
    iframe_supported: evidence.iframeSupported,
    evidence: evidence.evidence,
    server_confidence: Number(match.confidence || 0),
    match_status: status,
    match_reasons: match.reasons || [],
    target: normalizeTarget(evidence.target, settings.default_target || DEFAULT_TARGET),
    slot_id: match.slot?.id || null,
    slot_name: match.slot?.name || null,
    provider_name: match.slot?.provider || null,
  };

  const inserted = await supabase
    .from('slot_detection_events')
    .insert(eventPayload)
    .select('*')
    .single();
  if (inserted.error) {
    if (inserted.error.code === '23505') {
      throw statusError('Duplicate detection event rejected', 409);
    }
    throw inserted.error;
  }

  const liveUpdated = await bridgeConfirmedSlot({
    supabase,
    userId: device.user_id,
    deviceId: device.id,
    eventId: inserted.data.id,
    detectedAt: timing.detectedAt,
    target: eventPayload.target,
    match,
    settings,
  });
  if (liveUpdated) {
    await supabase
      .from('slot_detection_events')
      .update({ live_update_applied: true })
      .eq('id', inserted.data.id)
      .eq('user_id', device.user_id);
  }

  await supabase
    .from('slot_detector_devices')
    .update({ last_seen_at: new Date().toISOString(), last_seen_domain: evidence.domain || null })
    .eq('id', device.id)
    .eq('user_id', device.user_id);

  return res.status(201).json({
    event: { ...inserted.data, live_update_applied: liveUpdated },
    match: {
      status,
      confidence: match.confidence,
      matchedBy: match.matchedBy,
      reasons: match.reasons,
      slot: match.slot,
    },
    liveUpdated,
  });
}

export async function handleListDevices(req, res, supabase, user) {
  const { data, error } = await supabase
    .from('slot_detector_devices')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return res.status(200).json({ devices: (data || []).map(publicDevice) });
}

export async function handleRevokeDevice(req, res, supabase, user, body) {
  const deviceId = body.deviceId || req.query.deviceId;
  const { data, error } = await supabase
    .from('slot_detector_devices')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('id', deviceId)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw statusError('Device not found', 404);
  return res.status(200).json({ device: publicDevice(data) });
}

export async function handleRotateDevice(req, res, supabase, user, body) {
  const deviceId = body.deviceId || req.query.deviceId;
  const existing = await supabase
    .from('slot_detector_devices')
    .select('*')
    .eq('id', deviceId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) throw statusError('Device not found', 404);
  const token = createDeviceToken();
  const { data, error } = await supabase
    .from('slot_detector_devices')
    .update({
      token_hash: hashDetectorSecret(token),
      token_version: Number(existing.data.token_version || 0) + 1,
      token_scopes: DETECTOR_SCOPES,
      is_revoked: false,
      revoked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deviceId)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw statusError('Device not found', 404);
  return res.status(200).json({ token, device: publicDevice(data) });
}

export async function handleSettings(req, res, supabase, user) {
  const settings = await ensureSettings(supabase, user.id);
  return res.status(200).json({ settings });
}

export async function handleUpdateSettings(req, res, supabase, user, body) {
  const payload = {
    user_id: user.id,
    auto_update_enabled: Boolean(body.auto_update_enabled ?? body.autoUpdateEnabled),
    auto_bonus_hunt_updates: Boolean(body.auto_bonus_hunt_updates ?? body.autoBonusHuntUpdates),
    default_target: normalizeTarget(body.default_target || body.defaultTarget || DEFAULT_TARGET),
  };
  const { data, error } = await supabase
    .from('slot_detector_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return res.status(200).json({ settings: data });
}

export async function handleActiveSlot(req, res, supabase, user) {
  const target = normalizeTarget(req.query.target || DEFAULT_TARGET);
  const { data, error } = await supabase
    .from('slot_detector_active_slots')
    .select('*')
    .eq('user_id', user.id)
    .eq('target', target)
    .maybeSingle();
  if (error) throw error;
  return res.status(200).json({ activeSlot: data || null });
}

export async function handleEvents(req, res, supabase, user) {
  const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);
  const { data, error } = await supabase
    .from('slot_detection_events')
    .select('*')
    .eq('user_id', user.id)
    .order('received_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return res.status(200).json({ events: data || [] });
}

function compactSuggestions(events = []) {
  const suggestions = [];
  const seen = new Set();
  for (const event of events) {
    const key = event.device_panel_id
      ? `${event.device_id || 'device'}:${event.device_panel_id}`
      : `${event.slot_id}:${event.domain || 'domain'}:${event.target || DEFAULT_TARGET}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(event);
  }
  return suggestions;
}

export async function handleSuggestions(req, res, supabase, user) {
  const limit = Math.min(Math.max(Number(req.query.limit || 80), 1), 150);
  const { data, error } = await supabase
    .from('slot_detection_events')
    .select('*')
    .eq('user_id', user.id)
    .not('slot_id', 'is', null)
    .is('suggestion_dismissed_at', null)
    .eq('live_update_applied', false)
    .in('match_status', ['matched', 'low_confidence'])
    .order('received_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return res.status(200).json({ suggestions: compactSuggestions(data || []) });
}

export async function handleDismissSuggestion(req, res, supabase, user, body) {
  const eventId = body.eventId || req.query.eventId;
  if (!eventId) throw statusError('eventId is required', 400);
  const { data, error } = await supabase
    .from('slot_detection_events')
    .update({ suggestion_dismissed_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw statusError('Suggestion not found', 404);
  return res.status(200).json({ event: data });
}

export async function handleUnmatched(req, res, supabase, user) {
  const { data, error } = await supabase
    .from('slot_detection_events')
    .select('*')
    .eq('user_id', user.id)
    .in('match_status', ['unmatched', 'low_confidence', 'unsupported'])
    .order('received_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return res.status(200).json({ events: data || [] });
}

export async function handleConfirmMatch(req, res, supabase, user, body) {
  const eventId = body.eventId;
  const slotId = body.slotId;
  if (!eventId || !slotId) throw statusError('eventId and slotId are required', 400);
  const eventResult = await supabase
    .from('slot_detection_events')
    .select('*')
    .eq('id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (eventResult.error) throw eventResult.error;
  if (!eventResult.data) throw statusError('Detection event not found', 404);

  const slotResult = await supabase
    .from('slots')
    .select('id, name, provider, image, rtp, volatility, max_win_multiplier')
    .eq('id', slotId)
    .maybeSingle();
  if (slotResult.error) throw slotResult.error;
  if (!slotResult.data) throw statusError('Slot not found', 404);
  const settings = await ensureSettings(supabase, user.id);
  const match = {
    slot: slotResult.data,
    confidence: 100,
    status: 'confirmed',
    matchedBy: 'manual_confirmation',
    reasons: ['manual_confirmation'],
  };
  const liveUpdated = await bridgeConfirmedSlot({
    supabase,
    userId: user.id,
    deviceId: eventResult.data.device_id,
    eventId: eventResult.data.id,
    detectedAt: eventResult.data.detected_at,
    target: body.target || eventResult.data.target,
    match,
    settings: { ...settings, auto_update_enabled: true },
    force: true,
  });
  const updated = await supabase
    .from('slot_detection_events')
    .update({
      match_status: 'confirmed',
      server_confidence: 100,
      slot_id: slotResult.data.id,
      slot_name: slotResult.data.name,
      provider_name: slotResult.data.provider,
      match_reasons: ['manual_confirmation'],
      live_update_applied: liveUpdated,
    })
    .eq('id', eventResult.data.id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (updated.error) throw updated.error;

  if (body.saveAlias && eventResult.data.slot_hint) {
    await supabase.from('slot_detector_aliases').insert({
      user_id: user.id,
      slot_id: slotResult.data.id,
      alias: eventResult.data.slot_hint,
      alias_normalized: normalizeText(eventResult.data.slot_hint),
      provider_name: slotResult.data.provider,
      source: 'manual_confirmation',
      confidence_weight: 96,
    });
  }
  if (body.saveGameCode && eventResult.data.safe_game_id) {
    await supabase.from('slot_detector_provider_game_codes').insert({
      user_id: user.id,
      slot_id: slotResult.data.id,
      provider_key: normalizeKey(eventResult.data.provider_hint || slotResult.data.provider || eventResult.data.domain || 'unknown'),
      domain: eventResult.data.domain,
      game_code: eventResult.data.safe_game_id,
      game_code_normalized: normalizeKey(eventResult.data.safe_game_id),
      source: 'manual_confirmation',
      confidence_weight: 99,
    });
  }

  return res.status(200).json({ event: updated.data, liveUpdated });
}
