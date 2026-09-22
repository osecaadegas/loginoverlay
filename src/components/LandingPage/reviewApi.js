import { getAccessTokenWithFallback } from '../../utils/authSession';

export async function reviewRequest(action = 'public', { method = 'GET', body, signal, offset = 0 } = {}) {
  const authenticated = action !== 'public' || method !== 'GET';
  const headers = { 'Content-Type': 'application/json' };
  if (authenticated) {
    const token = await getAccessTokenWithFallback({ timeoutMs: 6000, label: 'Review session' });
    if (!token) throw new Error('Please sign in again to continue.');
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`/api/reviews?action=${action}&offset=${offset}`, {
    method, headers, signal, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Reviews are unavailable. Please try again.');
  return payload;
}
