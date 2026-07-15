import crypto from 'node:crypto';
import {
  DEVICE_TOKEN_BYTES,
  PAIRING_CODE_BYTES,
} from './constants.js';

function detectorSecret() {
  return process.env.SLOT_DETECTOR_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || 'streamers-center-slot-detector-dev-secret';
}

export function hashDetectorSecret(value, secret = detectorSecret()) {
  return crypto
    .createHmac('sha256', secret)
    .update(String(value || ''), 'utf8')
    .digest('hex');
}

export function createPairingCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(PAIRING_CODE_BYTES);
  let code = '';
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

export function createDeviceToken() {
  return `scd_${crypto.randomBytes(DEVICE_TOKEN_BYTES).toString('base64url')}`;
}

export function safeTokenPreview(token) {
  const text = String(token || '');
  if (text.length <= 12) return text;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}
