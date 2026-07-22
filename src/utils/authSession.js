import { supabase } from '../config/supabaseClient';
import { withTimeout } from './asyncTimeout';

const getProjectRef = () => {
  try {
    return new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0];
  } catch {
    return null;
  }
};

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
  return atob(padded);
};

const decodeJwtPayload = (token) => {
  try {
    const [, payload] = String(token || '').split('.');
    return payload ? JSON.parse(decodeBase64Url(payload)) : null;
  } catch {
    return null;
  }
};

const isExpiredSession = (session) => {
  const nowMs = Date.now();
  if (session?.expires_at && Number(session.expires_at) * 1000 <= nowMs) return true;
  const payload = decodeJwtPayload(session?.access_token);
  return Boolean(payload?.exp && Number(payload.exp) * 1000 <= nowMs);
};

export function getStoredSupabaseSession() {
  try {
    const projectRef = getProjectRef();
    if (!projectRef) return null;

    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const session = parsed?.currentSession || parsed?.session || parsed;
    if (!session?.access_token || isExpiredSession(session)) return null;

    if (session.user) return session;

    const payload = decodeJwtPayload(session.access_token);
    if (!payload?.sub) return session;

    return {
      ...session,
      user: {
        id: payload.sub,
        email: payload.email || null,
        aud: payload.aud || 'authenticated',
        role: payload.role || 'authenticated',
        app_metadata: payload.app_metadata || {},
        user_metadata: payload.user_metadata || {},
      },
    };
  } catch (error) {
    console.warn('[Auth] Failed to read cached Supabase session:', error);
    return null;
  }
}

export async function getSessionWithFallback({ timeoutMs = 10000, label = 'Auth session check' } = {}) {
  try {
    const { data } = await withTimeout(supabase.auth.getSession(), timeoutMs, label);
    return data?.session || null;
  } catch (error) {
    const cachedSession = getStoredSupabaseSession();
    if (cachedSession) {
      console.warn(`[Auth] ${label} timed out; using cached browser session.`);
      return cachedSession;
    }
    throw error;
  }
}

export async function getAccessTokenWithFallback(options) {
  const session = await getSessionWithFallback(options);
  return session?.access_token || '';
}