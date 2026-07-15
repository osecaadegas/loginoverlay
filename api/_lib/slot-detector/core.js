import {
  ALLOWED_TARGETS,
  DEFAULT_TARGET,
  MAX_EVENT_AGE_MS,
  MAX_EVENT_FUTURE_SKEW_MS,
} from './constants.js';

export function normalizeTarget(value, fallback = DEFAULT_TARGET) {
  const target = String(value || '').trim();
  return ALLOWED_TARGETS.has(target) ? target : fallback;
}

export function validatePairingRecord(record, now = new Date()) {
  if (!record) return { ok: false, reason: 'not_found' };
  if (record.used_at) return { ok: false, reason: 'used' };
  if (new Date(record.expires_at).getTime() <= now.getTime()) return { ok: false, reason: 'expired' };
  return { ok: true };
}

export function validateDeviceRecord(device) {
  if (!device) return { ok: false, reason: 'not_found' };
  if (device.is_revoked || device.revoked_at) return { ok: false, reason: 'revoked' };
  if (!Array.isArray(device.token_scopes) || !device.token_scopes.includes('slot:detect')) {
    return { ok: false, reason: 'scope' };
  }
  return { ok: true };
}

export function validateDetectedAt(value, now = new Date()) {
  const detectedAt = new Date(value);
  if (!value || Number.isNaN(detectedAt.getTime())) {
    return { ok: false, reason: 'invalid_detected_at', detectedAt: null };
  }
  const delta = now.getTime() - detectedAt.getTime();
  if (delta > MAX_EVENT_AGE_MS) return { ok: false, reason: 'stale', detectedAt };
  if (delta < -MAX_EVENT_FUTURE_SKEW_MS) return { ok: false, reason: 'future', detectedAt };
  return { ok: true, detectedAt };
}

export function canUpdateActiveSlot(current, incomingDetectedAt) {
  if (!current?.detected_at) return true;
  const currentTime = new Date(current.detected_at).getTime();
  const incomingTime = new Date(incomingDetectedAt).getTime();
  return Number.isFinite(incomingTime) && (!Number.isFinite(currentTime) || incomingTime >= currentTime);
}

export function requireClientEventId(value) {
  const id = String(value || '').trim();
  if (!/^[a-zA-Z0-9._:-]{8,120}$/.test(id)) {
    const err = new Error('clientEventId is required and must be stable');
    err.statusCode = 400;
    throw err;
  }
  return id;
}

export function assertOwnedRecord(record, userId, label = 'Record') {
  if (!record || record.user_id !== userId) {
    const err = new Error(`${label} not found`);
    err.statusCode = 404;
    throw err;
  }
  return record;
}
