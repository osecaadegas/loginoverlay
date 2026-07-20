import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const AFFILIATE_SOURCE_VALUES = new Set([
  'instagram',
  'twitch',
  'kick',
  'youtube',
  'discord',
  'tiktok',
  'website',
  'telegram',
  'x',
  'facebook',
  'other',
]);

const RESERVED_SHORT_CODES = new Set([
  'admin',
  'api',
  'affiliate',
  'assets',
  'auth',
  'login',
  'logout',
  'go',
  'help',
  'support',
  'terms',
  'privacy',
  'undefined',
  'null',
]);

const SAFE_SHORT_CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{3,63}$/;
const SAFE_PROTOCOLS = new Set(['http:', 'https:']);
const BOT_UA_PATTERN = /bot|crawler|spider|preview|facebookexternalhit|facebot|twitterbot|slackbot|discordbot|telegrambot|whatsapp|linkedinbot|embedly|quora link preview|pinterest|vkshare|skypeuripreview|google-inspectiontool/i;

export function normalizeSlug(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function normalizeShortCode(value = '') {
  return String(value).trim();
}

export function validateShortCode(value) {
  const shortCode = normalizeShortCode(value);
  if (!SAFE_SHORT_CODE.test(shortCode)) {
    return { ok: false, error: 'Short code must be 4-64 URL-safe characters and start with a letter or number.' };
  }
  if (RESERVED_SHORT_CODES.has(shortCode.toLowerCase())) {
    return { ok: false, error: 'That short code is reserved.' };
  }
  return { ok: true, shortCode };
}

export function generateShortCode(size = 8) {
  return randomBytes(Math.max(6, size)).toString('base64url').replace(/[-_]/g, '').slice(0, size + 2);
}

export function validateDestinationUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || /[\r\n]/.test(raw)) return { ok: false, error: 'Destination URL is required.' };
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'Destination URL is malformed.' };
  }
  if (!SAFE_PROTOCOLS.has(url.protocol)) {
    return { ok: false, error: 'Destination URL must use HTTP or HTTPS.' };
  }
  if (!url.hostname || /[\s"'<>]/.test(url.hostname)) {
    return { ok: false, error: 'Destination URL must include a valid hostname.' };
  }
  return {
    ok: true,
    url: url.toString(),
    warnings: url.protocol === 'http:' ? ['HTTPS is strongly preferred for affiliate destinations.'] : [],
  };
}

export function getPublicBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'streamerscenter.com';
  return `${proto}://${host}`;
}

export function buildTrackingUrl(req, brandSlug, shortCode) {
  return `${getPublicBaseUrl(req)}/go/${encodeURIComponent(brandSlug)}/${encodeURIComponent(shortCode)}`;
}

export function sanitizeSource(value) {
  const source = String(value || '').trim().toLowerCase();
  if (!source) return null;
  return AFFILIATE_SOURCE_VALUES.has(source) ? source : 'other';
}

export function sanitizeCampaign(value) {
  const campaign = String(value || '').trim();
  if (!campaign) return null;
  return campaign.replace(/[^\w .:@/-]+/g, '').slice(0, 80) || null;
}

function configuredParam(mapping, key) {
  const value = String(mapping?.[key] || '').trim();
  if (!value || !/^[A-Za-z0-9_.-]{1,48}$/.test(value)) return null;
  return value;
}

export function buildRedirectDestination(destinationUrl, { source, campaign, clickId, parameterMapping = {} } = {}) {
  const destination = new URL(destinationUrl);
  const sourceParam = configuredParam(parameterMapping, 'source_parameter');
  const campaignParam = configuredParam(parameterMapping, 'campaign_parameter');
  const clickParam = configuredParam(parameterMapping, 'click_id_parameter');

  if (source && sourceParam && !destination.searchParams.has(sourceParam)) destination.searchParams.append(sourceParam, source);
  if (campaign && campaignParam && !destination.searchParams.has(campaignParam)) destination.searchParams.append(campaignParam, campaign);
  if (clickId && clickParam && !destination.searchParams.has(clickParam)) destination.searchParams.append(clickParam, clickId);
  return destination.toString();
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
}

export function hashValue(value, salt = process.env.AFFILIATE_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'streamerscenter-affiliate') {
  if (!value) return null;
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

export function getReferrerDomain(value = '') {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, '').slice(0, 160);
  } catch {
    return null;
  }
}

export function parseUserAgent(userAgent = '') {
  const ua = String(userAgent || '');
  let browser = 'Unknown';
  if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';

  let os = 'Unknown';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let device = 'desktop';
  if (/Mobi|Android|iPhone/i.test(ua)) device = 'mobile';
  if (/iPad|Tablet/i.test(ua)) device = 'tablet';
  return { browser, os, device };
}

export function isSuspectedBotRequest(req) {
  const ua = String(req.headers['user-agent'] || '');
  if (req.method && !['GET', 'HEAD'].includes(req.method)) return true;
  if (BOT_UA_PATTERN.test(ua)) return true;
  if (!req.headers.accept && !req.headers['accept-language']) return true;
  return false;
}

export async function getUserRoles(supabase, userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role,is_active,access_expires_at')
    .eq('user_id', userId)
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function userHasRole(supabase, userId, roles) {
  const allowed = new Set(Array.isArray(roles) ? roles : [roles]);
  const userRoles = await getUserRoles(supabase, userId);
  const now = Date.now();
  return userRoles.some((role) => (
    allowed.has(role.role)
    && (!role.access_expires_at || new Date(role.access_expires_at).getTime() > now)
  ));
}

export async function requireAdminUser(supabase, user) {
  if (!await userHasRole(supabase, user.id, ['admin', 'superadmin'])) {
    const err = new Error('Administrator access required');
    err.statusCode = 403;
    throw err;
  }
}

export async function requireAffiliateUser(supabase, user) {
  if (!await userHasRole(supabase, user.id, 'affiliate')) {
    const err = new Error('Affiliate access is not enabled for this account.');
    err.statusCode = 403;
    throw err;
  }
  const { data: profile, error } = await supabase
    .from('affiliate_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile || profile.status !== 'active') {
    const err = new Error(profile?.status === 'suspended' ? 'Affiliate access is suspended.' : 'Affiliate access is not active.');
    err.statusCode = 403;
    err.code = profile?.status || 'inactive';
    throw err;
  }
  return profile;
}

export async function writeAudit(supabase, actorUserId, action, entityType, entityId, beforeData, afterData, reason = '') {
  const { error } = await supabase.from('affiliate_audit_logs').insert({
    actor_user_id: actorUserId || null,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    before_data: beforeData || null,
    after_data: afterData || null,
    reason: reason || null,
  });
  if (error) console.warn('[affiliate-audit] insert failed', error);
}

export function toMinorUnits(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100);
}

export function fromMinorUnits(value) {
  return Math.round(Number(value || 0)) / 100;
}

export function summarizeMoneyByCurrency(rows, fields) {
  const totals = {};
  for (const row of rows || []) {
    const currency = row.currency || 'EUR';
    for (const field of fields) {
      totals[currency] = (totals[currency] || 0) + Number(row[field] || 0);
    }
  }
  return totals;
}

export function escapeCsvFormula(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function parseCsv(text = '') {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const input = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell.replace(/\r$/, ''));
  if (row.length > 1 || row[0]) rows.push(row);
  return rows;
}

export function rowsToObjects(rows = []) {
  const [headers = [], ...data] = rows;
  const cleanHeaders = headers.map((header) => String(header || '').trim());
  return data.map((row, index) => ({
    rowNumber: index + 2,
    data: Object.fromEntries(cleanHeaders.map((header, i) => [header, escapeCsvFormula(row[i] ?? '')])),
  }));
}

export function safeEqualText(first = '', second = '') {
  const a = Buffer.from(String(first));
  const b = Buffer.from(String(second));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseDateRange(query = {}) {
  const now = new Date();
  const end = query.end ? new Date(String(query.end)) : now;
  const start = query.start ? new Date(String(query.start)) : new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { start: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000), end: now };
  }
  return { start, end };
}

export function createClickId() {
  return randomUUID();
}
