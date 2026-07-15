import { supabase } from '../../config/supabaseClient';

async function getToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again.');
  return token;
}

async function request(action, { method = 'GET', body, params = {} } = {}) {
  const token = await getToken();
  const query = new URLSearchParams({ action });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const response = await fetch(`/api/slot-detector?${query}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Slot Detector request failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  return data;
}

export function createPairingCode(deviceName = 'Browser extension') {
  return request('create-pairing-code', { method: 'POST', body: { deviceName } });
}

export function listDevices() {
  return request('list-devices');
}

export function revokeDevice(deviceId) {
  return request('revoke-device', { method: 'POST', body: { deviceId } });
}

export function rotateDevice(deviceId) {
  return request('rotate-device', { method: 'POST', body: { deviceId } });
}

export function getSettings() {
  return request('settings');
}

export function updateSettings(settings) {
  return request('update-settings', { method: 'PATCH', body: settings });
}

export function getActiveSlot(target = 'current_slot') {
  return request('active-slot', { params: { target } });
}

export function getEvents(limit = 30) {
  return request('events', { params: { limit } });
}

export function getUnmatched() {
  return request('unmatched');
}

export function confirmMatch(payload) {
  return request('confirm-match', { method: 'POST', body: payload });
}

export async function searchSlots(q) {
  if (!q || q.trim().length < 2) return [];
  const { data, error } = await supabase
    .from('slots')
    .select('id, name, provider, image, rtp, volatility, max_win_multiplier')
    .ilike('name', `%${q.trim().replace(/[\\%_]/g, '\\$&')}%`)
    .limit(10);
  if (error) throw error;
  return data || [];
}
