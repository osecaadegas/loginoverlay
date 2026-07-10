import { supabase } from '../../config/supabaseClient';

async function getToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again.');
  return token;
}

function query(params = {}) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') usp.set(key, value);
  }
  return usp.toString();
}

async function request(path, { method = 'GET', body, raw = false } = {}) {
  const token = await getToken();
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (raw) {
    if (!response.ok) throw new Error(`Export failed (${response.status})`);
    return response;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Request failed (${response.status})`);
    err.status = response.status;
    err.access = data.access;
    throw err;
  }
  return data;
}

export function getPlayerAccess() {
  return request('/api/player-bonus-hunt?action=access');
}

export function getDashboard(params = {}) {
  return request(`/api/player-bonus-hunt?action=dashboard&${query(params)}`);
}

export function listHunts(params = {}) {
  return request(`/api/player-bonus-hunt?action=list-hunts&${query(params)}`);
}

export function getHunt(huntId) {
  return request(`/api/player-bonus-hunt?action=hunt&huntId=${encodeURIComponent(huntId)}`);
}

export function createHunt(payload) {
  return request('/api/player-bonus-hunt?action=create-hunt', { method: 'POST', body: payload });
}

export function updateHunt(payload) {
  return request('/api/player-bonus-hunt?action=update-hunt', { method: 'PATCH', body: payload });
}

export function addBonus(payload) {
  return request('/api/player-bonus-hunt?action=add-bonus', { method: 'POST', body: payload });
}

export function updateBonus(payload) {
  return request('/api/player-bonus-hunt?action=update-bonus', { method: 'PATCH', body: payload });
}

export function deleteBonus(bonusId) {
  return request(`/api/player-bonus-hunt?action=delete-bonus&bonusId=${encodeURIComponent(bonusId)}`, { method: 'DELETE' });
}

export function archiveHunt(huntId) {
  return request('/api/player-bonus-hunt?action=archive-hunt', { method: 'POST', body: { huntId } });
}

export function deleteHunt(huntId) {
  return request(`/api/player-bonus-hunt?action=delete-hunt&huntId=${encodeURIComponent(huntId)}`, { method: 'DELETE' });
}

export function duplicateHunt(huntId) {
  return request('/api/player-bonus-hunt?action=duplicate-hunt', { method: 'POST', body: { huntId } });
}

export function getLibrary(params = {}) {
  return request(`/api/player-bonus-hunt?action=library&${query(params)}`);
}

export function searchSlots(q) {
  return request(`/api/player-bonus-hunt?action=slot-search&q=${encodeURIComponent(q)}`);
}

export async function downloadPlayerExport(params = {}) {
  const response = await request(`/api/player-bonus-hunt?action=export&${query(params)}`, { raw: true });
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'player-bonus-hunt-export.csv';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function getPlayerSubscriptionStatus() {
  return request('/api/player-subscription?action=status');
}

export function startPlayerCheckout() {
  return request('/api/player-subscription?action=checkout', { method: 'POST', body: { action: 'checkout' } });
}

export function openPlayerBillingPortal() {
  return request('/api/player-subscription?action=portal', { method: 'POST', body: { action: 'portal' } });
}
