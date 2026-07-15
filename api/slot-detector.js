import {
  createSupabaseAdmin,
  parseBody,
  requireUser,
  setCors,
} from './_lib/api-auth.js';
import {
  handleActiveSlot,
  handleConfirmMatch,
  handleCreatePairingCode,
  handleEvents,
  handleExchangePairingCode,
  handleHeartbeat,
  handleListDevices,
  handleRevokeDevice,
  handleRotateDevice,
  handleSettings,
  handleSubmitEvent,
  handleUnmatched,
  handleUpdateSettings,
  requireDevice,
} from './_lib/slot-detector/actions.js';

const USER_ACTIONS = new Set([
  'create-pairing-code',
  'list-devices',
  'revoke-device',
  'rotate-device',
  'settings',
  'update-settings',
  'active-slot',
  'events',
  'unmatched',
  'confirm-match',
]);

const DEVICE_ACTIONS = new Set([
  'exchange-pairing-code',
  'heartbeat',
  'submit-event',
]);

function statusCode(err) {
  return err.statusCode || 500;
}

function userFacingError(err) {
  const text = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();
  if (err?.code === '42P01' || err?.code === 'PGRST205' || text.includes('slot_detector') || text.includes('detected_slots')) {
    const setup = new Error('Slot Detector database tables are missing. Apply migrations/027_slot_detector.sql in Supabase.');
    setup.statusCode = 503;
    return setup;
  }
  return err;
}

export default async function handler(req, res) {
  setCors(res, 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const action = String(req.query.action || '').trim();
    if (!action) return res.status(400).json({ error: 'Missing action' });
    const supabase = createSupabaseAdmin();
    const body = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) ? parseBody(req) : {};

    if (USER_ACTIONS.has(action)) {
      const user = await requireUser(req, supabase);
      if (action === 'create-pairing-code') return handleCreatePairingCode(req, res, supabase, user, body);
      if (action === 'list-devices') return handleListDevices(req, res, supabase, user);
      if (action === 'revoke-device') return handleRevokeDevice(req, res, supabase, user, body);
      if (action === 'rotate-device') return handleRotateDevice(req, res, supabase, user, body);
      if (action === 'settings') return handleSettings(req, res, supabase, user);
      if (action === 'update-settings') return handleUpdateSettings(req, res, supabase, user, body);
      if (action === 'active-slot') return handleActiveSlot(req, res, supabase, user);
      if (action === 'events') return handleEvents(req, res, supabase, user);
      if (action === 'unmatched') return handleUnmatched(req, res, supabase, user);
      if (action === 'confirm-match') return handleConfirmMatch(req, res, supabase, user, body);
    }

    if (DEVICE_ACTIONS.has(action)) {
      if (action === 'exchange-pairing-code') return handleExchangePairingCode(req, res, supabase, body);
      const device = await requireDevice(req, supabase);
      if (action === 'heartbeat') return handleHeartbeat(req, res, supabase, device, body);
      if (action === 'submit-event') return handleSubmitEvent(req, res, supabase, device, body);
    }

    return res.status(404).json({ error: 'Unknown Slot Detector action' });
  } catch (rawError) {
    const err = userFacingError(rawError);
    if (statusCode(err) >= 500) console.error('[slot-detector]', rawError);
    if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));
    return res.status(statusCode(err)).json({ error: err.message || 'Slot Detector request failed' });
  }
}
