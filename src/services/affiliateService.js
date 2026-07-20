import { supabase } from '../config/supabaseClient';

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

async function affiliateRequest(action, { method = 'GET', body, params } = {}) {
  const token = await getToken();
  const search = new URLSearchParams({ action });
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });

  const response = await fetch(`/api/affiliate?${search.toString()}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === 'object' ? payload.error : payload;
    const error = new Error(message || 'Affiliate request failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function fetchAffiliateDashboard(params) {
  return affiliateRequest('me', { params });
}

export function fetchAdminAffiliateOverview(params) {
  return affiliateRequest('admin-overview', { params });
}

export function saveAffiliateBrand(payload) {
  return affiliateRequest('save-brand', { method: 'POST', body: payload });
}

export function saveAffiliateOffer(payload) {
  return affiliateRequest('save-offer', { method: 'POST', body: payload });
}

export function saveAffiliateLink(payload) {
  return affiliateRequest('save-link', { method: 'POST', body: payload });
}

export function affiliateRoleAction(payload) {
  return affiliateRequest('role', { method: 'POST', body: payload });
}

export function addAffiliateStats(payload) {
  return affiliateRequest('stats', { method: 'POST', body: payload });
}

export function previewAffiliateCsv(payload) {
  return affiliateRequest('csv-import', { method: 'POST', body: { ...payload, previewOnly: true } });
}

export function commitAffiliateCsv(payload) {
  return affiliateRequest('csv-import', { method: 'POST', body: payload });
}

export async function downloadAffiliateExport() {
  const token = await getToken();
  const response = await fetch('/api/affiliate?action=export', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Export failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'affiliate-links.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function formatMoneyMinor(amountMinor = 0, currency = 'EUR') {
  const value = Number(amountMinor || 0) / 100;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
}

export function formatPercent(value = 0) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export async function copyText(value) {
  await navigator.clipboard.writeText(value);
}
