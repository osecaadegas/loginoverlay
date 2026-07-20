import { createHash, randomUUID } from 'node:crypto';
import {
  buildRedirectDestination,
  buildTrackingUrl,
  createClickId,
  escapeCsvFormula,
  generateShortCode,
  getClientIp,
  getReferrerDomain,
  hashValue,
  isSuspectedBotRequest,
  normalizeShortCode,
  normalizeSlug,
  parseCsv,
  parseDateRange,
  parseUserAgent,
  requireAdminUser,
  requireAffiliateUser,
  rowsToObjects,
  safeEqualText,
  sanitizeCampaign,
  sanitizeSource,
  summarizeMoneyByCurrency,
  toMinorUnits,
  userHasRole,
  validateDestinationUrl,
  validateShortCode,
  writeAudit,
} from '../affiliate.js';
import {
  createSupabaseAdmin,
  parseBody,
  requireUser,
  sendCsv,
  setCors,
} from '../api-auth.js';

const ADMIN_ENTITY_FIELDS = {
  brand: [
    'name', 'slug', 'logo_url', 'website_url', 'affiliate_platform_name', 'affiliate_manager_name',
    'affiliate_manager_email', 'default_currency', 'status', 'reporting_mode', 'parameter_mapping',
    'tracking_notes', 'postback_allowed_ips',
  ],
  offer: [
    'brand_id', 'name', 'slug', 'title', 'description', 'geo', 'allowed_countries', 'restricted_countries',
    'offer_type', 'cpa_amount_minor', 'revenue_share_percentage', 'hybrid_terms', 'minimum_deposit_minor',
    'currency', 'terms_url', 'public_status', 'affiliate_status', 'start_date', 'end_date',
  ],
  link: [
    'affiliate_user_id', 'brand_id', 'offer_id', 'destination_url', 'short_code', 'campaign_name',
    'source_name', 'status', 'expires_at', 'affiliate_can_create_variants',
  ],
};

function pick(input = {}, allowed = []) {
  return Object.fromEntries(Object.entries(input || {}).filter(([key]) => allowed.includes(key)));
}

function parseJsonField(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function mapBrand(row = {}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    affiliatePlatformName: row.affiliate_platform_name,
    affiliateManagerName: row.affiliate_manager_name,
    affiliateManagerEmail: row.affiliate_manager_email,
    defaultCurrency: row.default_currency,
    status: row.status,
    reportingMode: row.reporting_mode,
    parameterMapping: row.parameter_mapping || {},
    trackingNotes: row.tracking_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOffer(row = {}) {
  return {
    id: row.id,
    brandId: row.brand_id,
    brandName: row.affiliate_brands?.name,
    brandSlug: row.affiliate_brands?.slug,
    name: row.name,
    slug: row.slug,
    title: row.title,
    description: row.description,
    geo: row.geo,
    allowedCountries: row.allowed_countries || [],
    restrictedCountries: row.restricted_countries || [],
    offerType: row.offer_type,
    cpaAmountMinor: row.cpa_amount_minor,
    revenueSharePercentage: row.revenue_share_percentage,
    hybridTerms: row.hybrid_terms,
    minimumDepositMinor: row.minimum_deposit_minor,
    currency: row.currency,
    termsUrl: row.terms_url,
    publicStatus: row.public_status,
    affiliateStatus: row.affiliate_status,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLink(row = {}, req = null) {
  const brand = row.affiliate_brands || {};
  const offer = row.affiliate_offers || {};
  let destinationDomain = '';
  try {
    destinationDomain = new URL(row.destination_url).hostname;
  } catch {
    destinationDomain = '';
  }
  return {
    id: row.id,
    affiliateUserId: row.affiliate_user_id,
    affiliateDisplayName: row.affiliate_profiles?.display_name || row.user_profiles?.display_name || row.user_profiles?.username,
    affiliateEmail: row.auth_users?.email,
    brandId: row.brand_id,
    brandName: brand.name,
    brandSlug: brand.slug,
    brandLogoUrl: brand.logo_url,
    offerId: row.offer_id,
    offerName: offer.name,
    offerType: offer.offer_type,
    destinationUrl: row.destination_url,
    destinationDomain,
    shortCode: row.short_code,
    trackingUrl: req && brand.slug ? buildTrackingUrl(req, brand.slug, row.short_code) : '',
    campaignName: row.campaign_name,
    sourceName: row.source_name,
    status: row.status,
    expiresAt: row.expires_at,
    affiliateCanCreateVariants: row.affiliate_can_create_variants,
    clickTotals: row.clickTotals || {},
    statsTotals: row.statsTotals || {},
    lastClickedAt: row.last_clicked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sendError(res, err, label = 'affiliate') {
  console.error(`[${label}]`, err);
  return res.status(err.statusCode || 500).json({ error: err.message || 'Affiliate request failed', code: err.code });
}

async function loadAuthContext(req, supabase, requireAuth = true) {
  if (!requireAuth) return null;
  return requireUser(req, supabase);
}

async function handleRedirect(req, res, supabase) {
  const brandSlug = normalizeSlug(req.query.brandSlug || req.query.brand || req.query?.path?.[1] || '');
  const shortCode = normalizeShortCode(req.query.shortCode || req.query.code || req.query?.path?.[2] || '');
  const validCode = validateShortCode(shortCode);
  if (!brandSlug || !validCode.ok) return res.status(404).send('Affiliate link not found');

  const { data: brand, error: brandError } = await supabase
    .from('affiliate_brands')
    .select('*')
    .eq('slug', brandSlug)
    .maybeSingle();
  if (brandError) throw brandError;
  if (!brand || brand.status !== 'active' || brand.archived_at) return res.status(404).send('Affiliate link not found');

  const { data: link, error: linkError } = await supabase
    .from('affiliate_links')
    .select('*, affiliate_offers(*)')
    .eq('short_code', validCode.shortCode)
    .eq('brand_id', brand.id)
    .maybeSingle();
  if (linkError) throw linkError;
  if (!link || link.status !== 'active' || link.archived_at) return res.status(404).send('Affiliate link not found');
  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) return res.status(410).send('Affiliate link expired');
  if (link.affiliate_offers?.affiliate_status && link.affiliate_offers.affiliate_status !== 'active') return res.status(404).send('Affiliate offer not active');

  const urlValidation = validateDestinationUrl(link.destination_url);
  if (!urlValidation.ok) return res.status(502).send('Affiliate destination unavailable');

  const clickId = createClickId();
  const source = sanitizeSource(req.query.src || req.query.source || link.source_name);
  const campaign = sanitizeCampaign(req.query.campaign || req.query.cmp || link.campaign_name);
  const destination = buildRedirectDestination(urlValidation.url, {
    source,
    campaign,
    clickId,
    parameterMapping: brand.parameter_mapping || {},
  });

  const ip = getClientIp(req);
  const ua = String(req.headers['user-agent'] || '');
  const parsedUa = parseUserAgent(ua);
  const sessionHash = hashValue(`${link.id}:${ip}:${ua}`);
  const isBot = isSuspectedBotRequest(req);
  const clickPayload = {
    tracking_link_id: link.id,
    affiliate_user_id: link.affiliate_user_id,
    brand_id: link.brand_id,
    offer_id: link.offer_id || null,
    click_id: clickId,
    source,
    campaign,
    country_code: req.headers['x-vercel-ip-country'] || null,
    region: req.headers['x-vercel-ip-country-region'] || null,
    device_type: parsedUa.device,
    browser_family: parsedUa.browser,
    operating_system: parsedUa.os,
    referrer_domain: getReferrerDomain(req.headers.referer || req.headers.referrer),
    is_unique: true,
    is_suspected_bot: isBot,
    user_agent_hash: hashValue(ua),
    ip_hash: hashValue(ip),
    session_hash: sessionHash,
    metadata: {
      method: req.method,
      accept: req.headers.accept || null,
      previewSuspected: isBot,
    },
  };

  const insertClick = async () => {
    try {
      if (sessionHash) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recent } = await supabase
          .from('affiliate_clicks')
          .select('id')
          .eq('tracking_link_id', link.id)
          .eq('session_hash', sessionHash)
          .gte('occurred_at', since)
          .limit(1);
        clickPayload.is_unique = !(recent || []).length;
      }
      await supabase.from('affiliate_clicks').insert(clickPayload);
      await supabase.from('affiliate_links').update({ last_clicked_at: new Date().toISOString() }).eq('id', link.id);
    } catch (error) {
      console.error('[affiliate-redirect] click logging failed', error);
      await supabase.from('affiliate_audit_logs').insert({
        action: 'click_logging_failed',
        entity_type: 'affiliate_link',
        entity_id: link.id,
        after_data: { clickId, error: error.message },
      }).catch(() => {});
    }
  };
  insertClick();

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.redirect(302, destination);
}

async function fetchLinksWithTotals(supabase, req, filters = {}) {
  let query = supabase
    .from('affiliate_links')
    .select('*, affiliate_brands(*), affiliate_offers(*)')
    .order('created_at', { ascending: false });
  if (filters.affiliateUserId) query = query.eq('affiliate_user_id', filters.affiliateUserId);
  if (filters.brandId) query = query.eq('brand_id', filters.brandId);
  if (filters.offerId) query = query.eq('offer_id', filters.offerId);
  if (filters.status) query = query.eq('status', filters.status);

  const { data: links, error } = await query;
  if (error) throw error;
  const linkIds = (links || []).map((link) => link.id);
  if (!linkIds.length) return [];
  const affiliateIds = [...new Set((links || []).map((link) => link.affiliate_user_id).filter(Boolean))];
  const [{ data: affiliateProfiles }, { data: userProfiles }] = await Promise.all([
    supabase.from('affiliate_profiles').select('user_id,display_name').in('user_id', affiliateIds),
    supabase.from('user_profiles').select('user_id,display_name,username,avatar_url').in('user_id', affiliateIds),
  ]);
  const affiliateProfilesByUser = new Map((affiliateProfiles || []).map((profile) => [profile.user_id, profile]));
  const userProfilesByUser = new Map((userProfiles || []).map((profile) => [profile.user_id, profile]));

  const { start, end } = parseDateRange(req.query || {});
  const { data: clicks } = await supabase
    .from('affiliate_clicks')
    .select('tracking_link_id,is_unique,is_suspected_bot,occurred_at')
    .in('tracking_link_id', linkIds)
    .gte('occurred_at', start.toISOString())
    .lte('occurred_at', end.toISOString());
  const { data: stats } = await supabase
    .from('affiliate_stats')
    .select('tracking_link_id,registrations,ftds,cpa_commission_minor,revenue_share_commission_minor,adjustments_minor,currency')
    .in('tracking_link_id', linkIds);

  const clickTotals = {};
  for (const click of clicks || []) {
    const total = clickTotals[click.tracking_link_id] || { allClicks: 0, humanClicks: 0, uniqueClicks: 0, suspectedBotClicks: 0 };
    total.allClicks += 1;
    if (!click.is_suspected_bot) total.humanClicks += 1;
    if (click.is_unique && !click.is_suspected_bot) total.uniqueClicks += 1;
    if (click.is_suspected_bot) total.suspectedBotClicks += 1;
    clickTotals[click.tracking_link_id] = total;
  }
  const statsTotals = {};
  for (const stat of stats || []) {
    const total = statsTotals[stat.tracking_link_id] || { registrations: 0, ftds: 0, commissionByCurrency: {} };
    total.registrations += Number(stat.registrations || 0);
    total.ftds += Number(stat.ftds || 0);
    const currency = stat.currency || 'EUR';
    total.commissionByCurrency[currency] = (total.commissionByCurrency[currency] || 0)
      + Number(stat.cpa_commission_minor || 0)
      + Number(stat.revenue_share_commission_minor || 0)
      + Number(stat.adjustments_minor || 0);
    statsTotals[stat.tracking_link_id] = total;
  }

  return links.map((link) => mapLink({
    ...link,
    affiliate_profiles: affiliateProfilesByUser.get(link.affiliate_user_id) || null,
    user_profiles: userProfilesByUser.get(link.affiliate_user_id) || null,
    clickTotals: clickTotals[link.id] || { allClicks: 0, humanClicks: 0, uniqueClicks: 0, suspectedBotClicks: 0 },
    statsTotals: statsTotals[link.id] || { registrations: 0, ftds: 0, commissionByCurrency: {} },
  }, req));
}

async function handleAffiliateMe(req, res, supabase, user) {
  const profile = await requireAffiliateUser(supabase, user);
  await supabase.from('affiliate_profiles').update({ last_dashboard_activity_at: new Date().toISOString() }).eq('user_id', user.id);
  const links = await fetchLinksWithTotals(supabase, req, { affiliateUserId: user.id });
  const linkIds = links.map((link) => link.id);
  const { start, end } = parseDateRange(req.query || {});
  const { data: clicks } = linkIds.length
    ? await supabase.from('affiliate_clicks').select('*').in('tracking_link_id', linkIds).gte('occurred_at', start.toISOString()).lte('occurred_at', end.toISOString())
    : { data: [] };
  const { data: stats } = await supabase.from('affiliate_stats').select('*').eq('affiliate_user_id', user.id);
  const totals = {
    trackedClicks: (clicks || []).length,
    humanLikelyClicks: (clicks || []).filter((click) => !click.is_suspected_bot).length,
    uniqueClicks: (clicks || []).filter((click) => click.is_unique && !click.is_suspected_bot).length,
    suspectedBotClicks: (clicks || []).filter((click) => click.is_suspected_bot).length,
    partnerClicks: (stats || []).reduce((sum, row) => sum + Number(row.partner_clicks || 0), 0),
    registrations: (stats || []).reduce((sum, row) => sum + Number(row.registrations || 0), 0),
    ftds: (stats || []).reduce((sum, row) => sum + Number(row.ftds || 0), 0),
    depositsByCurrency: summarizeMoneyByCurrency(stats || [], ['deposit_amount_minor']),
    commissionByCurrency: summarizeMoneyByCurrency(stats || [], ['cpa_commission_minor', 'revenue_share_commission_minor', 'adjustments_minor']),
    activeLinks: links.filter((link) => link.status === 'active').length,
  };
  const clicksByDay = {};
  for (const click of clicks || []) {
    const day = String(click.occurred_at || '').slice(0, 10);
    clicksByDay[day] = clicksByDay[day] || { day, allClicks: 0, humanClicks: 0, uniqueClicks: 0 };
    clicksByDay[day].allClicks += 1;
    if (!click.is_suspected_bot) clicksByDay[day].humanClicks += 1;
    if (click.is_unique && !click.is_suspected_bot) clicksByDay[day].uniqueClicks += 1;
  }
  return res.status(200).json({
    profile,
    links,
    totals,
    analytics: {
      clicksByDay: Object.values(clicksByDay).sort((a, b) => a.day.localeCompare(b.day)),
      bySource: aggregateRows(clicks || [], 'source'),
      byCampaign: aggregateRows(clicks || [], 'campaign'),
      byCountry: aggregateRows(clicks || [], 'country_code'),
      byDevice: aggregateRows(clicks || [], 'device_type'),
      byBrowser: aggregateRows(clicks || [], 'browser_family'),
      byReferrer: aggregateRows(clicks || [], 'referrer_domain'),
    },
    metricNotes: {
      trackedClicks: 'Recorded independently by Streamers Center.',
      registrations: 'Reported by the affiliate partner.',
      estimatedCommission: 'May differ from the final approved partner payout.',
    },
  });
}

function aggregateRows(rows, field) {
  const totals = {};
  for (const row of rows || []) {
    const key = row[field] || 'unknown';
    totals[key] = (totals[key] || 0) + 1;
  }
  return Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

async function handleAdminOverview(req, res, supabase) {
  const [usersResult, brandsResult, offersResult, links] = await Promise.all([
    supabase.rpc('get_all_auth_users'),
    supabase.from('affiliate_brands').select('*').order('name'),
    supabase.from('affiliate_offers').select('*, affiliate_brands(name,slug)').order('created_at', { ascending: false }),
    fetchLinksWithTotals(supabase, req),
  ]);
  if (usersResult.error) throw usersResult.error;
  if (brandsResult.error) throw brandsResult.error;
  if (offersResult.error) throw offersResult.error;

  const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*');
  if (rolesError) throw rolesError;
  const { data: profiles, error: profilesError } = await supabase.from('affiliate_profiles').select('*');
  if (profilesError) throw profilesError;
  const { data: notes } = await supabase.from('affiliate_admin_notes').select('*').order('created_at', { ascending: false }).limit(100);

  const rolesByUser = new Map();
  for (const role of roles || []) {
    if (!rolesByUser.has(role.user_id)) rolesByUser.set(role.user_id, []);
    rolesByUser.get(role.user_id).push(role);
  }
  const profilesByUser = new Map((profiles || []).map((profile) => [profile.user_id, profile]));
  const linksByUser = {};
  for (const link of links) {
    linksByUser[link.affiliateUserId] = linksByUser[link.affiliateUserId] || [];
    linksByUser[link.affiliateUserId].push(link);
  }

  const users = (usersResult.data || []).map((user) => {
    const userRoles = rolesByUser.get(user.id) || [];
    const profile = profilesByUser.get(user.id) || null;
    const userLinks = linksByUser[user.id] || [];
    const clickTotal = userLinks.reduce((sum, link) => sum + Number(link.clickTotals?.humanClicks || 0), 0);
    const registrations = userLinks.reduce((sum, link) => sum + Number(link.statsTotals?.registrations || 0), 0);
    const ftds = userLinks.reduce((sum, link) => sum + Number(link.statsTotals?.ftds || 0), 0);
    return {
      id: user.id,
      email: user.email,
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      displayName: profile?.display_name || user.user_metadata?.name || user.user_metadata?.full_name || user.email,
      username: user.user_metadata?.preferred_username || user.user_metadata?.user_name || '',
      accountType: user.user_metadata?.selected_experience || user.app_metadata?.provider || 'player',
      roles: userRoles,
      affiliateProfile: profile,
      activeLinkCount: userLinks.filter((link) => link.status === 'active').length,
      totalTrackedClicks: clickTotal,
      totalRegistrations: registrations,
      totalFtds: ftds,
      totalCommissionByCurrency: mergeCommission(userLinks),
      grantedAt: profile?.affiliate_access_granted_at,
      lastDashboardActivityAt: profile?.last_dashboard_activity_at,
    };
  });

  return res.status(200).json({
    users,
    brands: (brandsResult.data || []).map(mapBrand),
    offers: (offersResult.data || []).map(mapOffer),
    links,
    notes: notes || [],
    totals: {
      affiliateUsers: users.filter((user) => user.roles.some((role) => role.role === 'affiliate' && role.is_active)).length,
      activeLinks: links.filter((link) => link.status === 'active').length,
      humanClicks: links.reduce((sum, link) => sum + Number(link.clickTotals?.humanClicks || 0), 0),
      registrations: links.reduce((sum, link) => sum + Number(link.statsTotals?.registrations || 0), 0),
      ftds: links.reduce((sum, link) => sum + Number(link.statsTotals?.ftds || 0), 0),
    },
  });
}

function mergeCommission(links) {
  const result = {};
  for (const link of links || []) {
    for (const [currency, amount] of Object.entries(link.statsTotals?.commissionByCurrency || {})) {
      result[currency] = (result[currency] || 0) + amount;
    }
  }
  return result;
}

async function handleSaveBrand(req, res, supabase, user) {
  const body = parseBody(req);
  const values = pick(body.values || body, ADMIN_ENTITY_FIELDS.brand);
  values.slug = normalizeSlug(values.slug || values.name);
  values.parameter_mapping = parseJsonField(values.parameter_mapping, {});
  values.postback_allowed_ips = parseJsonField(values.postback_allowed_ips, []);
  if (!values.name || !values.slug) return res.status(400).json({ error: 'Brand name and slug are required.' });
  const id = body.id || values.id;
  const before = id ? (await supabase.from('affiliate_brands').select('*').eq('id', id).maybeSingle()).data : null;
  const result = id
    ? await supabase.from('affiliate_brands').update(values).eq('id', id).select('*').single()
    : await supabase.from('affiliate_brands').insert(values).select('*').single();
  if (result.error) throw result.error;
  await writeAudit(supabase, user.id, id ? 'brand_updated' : 'brand_created', 'affiliate_brand', result.data.id, before, result.data, body.reason);
  return res.status(200).json({ brand: mapBrand(result.data) });
}

async function handleSaveOffer(req, res, supabase, user) {
  const body = parseBody(req);
  const values = pick(body.values || body, ADMIN_ENTITY_FIELDS.offer);
  values.slug = normalizeSlug(values.slug || values.name);
  values.allowed_countries = parseJsonField(values.allowed_countries, []);
  values.restricted_countries = parseJsonField(values.restricted_countries, []);
  if ('cpa_amount' in (body.values || body)) values.cpa_amount_minor = toMinorUnits((body.values || body).cpa_amount);
  if ('minimum_deposit' in (body.values || body)) values.minimum_deposit_minor = toMinorUnits((body.values || body).minimum_deposit);
  if (!values.brand_id || !values.name || !values.slug) return res.status(400).json({ error: 'Offer brand, name and slug are required.' });
  const id = body.id || values.id;
  const before = id ? (await supabase.from('affiliate_offers').select('*').eq('id', id).maybeSingle()).data : null;
  const result = id
    ? await supabase.from('affiliate_offers').update(values).eq('id', id).select('*, affiliate_brands(name,slug)').single()
    : await supabase.from('affiliate_offers').insert(values).select('*, affiliate_brands(name,slug)').single();
  if (result.error) throw result.error;
  await writeAudit(supabase, user.id, id ? 'offer_updated' : 'offer_created', 'affiliate_offer', result.data.id, before, result.data, body.reason);
  return res.status(200).json({ offer: mapOffer(result.data) });
}

async function createUniqueShortCode(supabase, requested) {
  if (requested) {
    const valid = validateShortCode(requested);
    if (!valid.ok) throw Object.assign(new Error(valid.error), { statusCode: 400 });
    const { data: existing } = await supabase.from('affiliate_links').select('id').eq('short_code', valid.shortCode).maybeSingle();
    if (existing) throw Object.assign(new Error('Short code is already in use.'), { statusCode: 409 });
    return valid.shortCode;
  }
  for (let i = 0; i < 8; i += 1) {
    const shortCode = generateShortCode(8);
    const { data: existing } = await supabase.from('affiliate_links').select('id').eq('short_code', shortCode).maybeSingle();
    if (!existing) return shortCode;
  }
  throw Object.assign(new Error('Could not generate a unique short code.'), { statusCode: 500 });
}

async function handleSaveLink(req, res, supabase, user) {
  const body = parseBody(req);
  const raw = body.values || body;
  const values = pick(raw, ADMIN_ENTITY_FIELDS.link);
  const validation = validateDestinationUrl(values.destination_url);
  if (!validation.ok) return res.status(400).json({ error: validation.error });
  values.destination_url = validation.url;
  values.short_code = body.id ? normalizeShortCode(values.short_code) : await createUniqueShortCode(supabase, values.short_code);
  if (values.source_name) values.source_name = sanitizeSource(values.source_name);
  if (values.campaign_name) values.campaign_name = sanitizeCampaign(values.campaign_name);
  if (!values.affiliate_user_id || !values.brand_id || !values.destination_url) {
    return res.status(400).json({ error: 'Affiliate user, brand, and destination URL are required.' });
  }
  const duplicate = await supabase
    .from('affiliate_links')
    .select('id,affiliate_user_id')
    .eq('destination_url', values.destination_url)
    .neq('affiliate_user_id', values.affiliate_user_id)
    .limit(5);
  const id = body.id || raw.id;
  const before = id ? (await supabase.from('affiliate_links').select('*').eq('id', id).maybeSingle()).data : null;
  const payload = { ...values, created_by: id ? undefined : user.id };
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  const result = id
    ? await supabase.from('affiliate_links').update(payload).eq('id', id).select('*, affiliate_brands(*), affiliate_offers(*)').single()
    : await supabase.from('affiliate_links').insert(payload).select('*, affiliate_brands(*), affiliate_offers(*)').single();
  if (result.error) throw result.error;
  await supabase.from('user_roles').upsert({ user_id: values.affiliate_user_id, role: 'affiliate', is_active: true }, { onConflict: 'user_id,role' });
  await supabase.from('affiliate_profiles').upsert({
    user_id: values.affiliate_user_id,
    status: 'active',
    affiliate_access_granted_at: new Date().toISOString(),
    affiliate_access_granted_by: user.id,
  }, { onConflict: 'user_id' });
  await writeAudit(supabase, user.id, id ? 'link_changed' : 'link_created', 'affiliate_link', result.data.id, before, result.data, body.reason);
  return res.status(200).json({
    link: mapLink(result.data, req),
    warnings: [
      ...(validation.warnings || []),
      ...((duplicate.data || []).length ? ['This destination URL is assigned to other affiliate users.'] : []),
    ],
  });
}

async function handleRoleAction(req, res, supabase, user) {
  const body = parseBody(req);
  const targetUserId = body.userId;
  if (!targetUserId) return res.status(400).json({ error: 'Missing user id.' });
  const action = body.action;
  let before = null;
  const existing = await supabase.from('affiliate_profiles').select('*').eq('user_id', targetUserId).maybeSingle();
  before = existing.data;
  if (action === 'grant') {
    await supabase.from('user_roles').upsert({ user_id: targetUserId, role: 'affiliate', is_active: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id,role' });
    await supabase.from('affiliate_profiles').upsert({
      user_id: targetUserId,
      status: 'active',
      display_name: body.displayName || before?.display_name || null,
      payment_currency: body.paymentCurrency || before?.payment_currency || 'EUR',
      affiliate_access_granted_at: before?.affiliate_access_granted_at || new Date().toISOString(),
      affiliate_access_granted_by: before?.affiliate_access_granted_by || user.id,
      suspended_at: null,
      suspended_by: null,
      suspension_reason: null,
    }, { onConflict: 'user_id' });
  } else if (action === 'remove') {
    await supabase.from('user_roles').delete().eq('user_id', targetUserId).eq('role', 'affiliate');
    await supabase.from('affiliate_profiles').update({ status: 'inactive' }).eq('user_id', targetUserId);
  } else if (action === 'suspend') {
    await supabase.from('affiliate_profiles').upsert({
      user_id: targetUserId,
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_by: user.id,
      suspension_reason: body.reason || 'Suspended by admin',
    }, { onConflict: 'user_id' });
  } else if (action === 'reactivate') {
    await supabase.from('user_roles').upsert({ user_id: targetUserId, role: 'affiliate', is_active: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id,role' });
    await supabase.from('affiliate_profiles').update({ status: 'active', suspended_at: null, suspended_by: null, suspension_reason: null }).eq('user_id', targetUserId);
  } else if (action === 'note') {
    await supabase.from('affiliate_admin_notes').insert({ affiliate_user_id: targetUserId, note: body.note || '', created_by: user.id });
  } else {
    return res.status(400).json({ error: 'Unknown role action.' });
  }
  const after = (await supabase.from('affiliate_profiles').select('*').eq('user_id', targetUserId).maybeSingle()).data;
  await writeAudit(supabase, user.id, `affiliate_${action}`, 'affiliate_profile', after?.id || before?.id || null, before, after, body.reason || body.note);
  return res.status(200).json({ ok: true, profile: after });
}

async function handleStats(req, res, supabase, user) {
  const body = parseBody(req);
  const values = body.values || body;
  const payload = {
    affiliate_user_id: values.affiliate_user_id,
    tracking_link_id: values.tracking_link_id || null,
    brand_id: values.brand_id,
    offer_id: values.offer_id || null,
    partner_clicks: Number(values.partner_clicks || 0),
    registrations: Number(values.registrations || 0),
    qualified_registrations: Number(values.qualified_registrations || 0),
    ftds: Number(values.ftds || 0),
    deposit_amount_minor: toMinorUnits(values.deposit_amount) || Number(values.deposit_amount_minor || 0),
    withdrawal_amount_minor: toMinorUnits(values.withdrawal_amount) || Number(values.withdrawal_amount_minor || 0),
    cpa_commission_minor: toMinorUnits(values.cpa_commission) || Number(values.cpa_commission_minor || 0),
    revenue_share_commission_minor: toMinorUnits(values.revenue_share_commission) || Number(values.revenue_share_commission_minor || 0),
    adjustments_minor: toMinorUnits(values.adjustments) || Number(values.adjustments_minor || 0),
    currency: values.currency || 'EUR',
    reporting_period_start: values.reporting_period_start,
    reporting_period_end: values.reporting_period_end,
    notes: values.notes || '',
    source: values.source || 'manual',
    created_by: user.id,
    idempotency_key: values.idempotency_key || null,
  };
  if (!payload.affiliate_user_id || !payload.brand_id || !payload.reporting_period_start || !payload.reporting_period_end) {
    return res.status(400).json({ error: 'Affiliate user, brand and reporting period are required.' });
  }
  const { data, error } = await supabase.from('affiliate_stats').insert(payload).select('*').single();
  if (error) throw error;
  await writeAudit(supabase, user.id, 'statistics_manually_changed', 'affiliate_stats', data.id, null, data, values.notes);
  return res.status(200).json({ stat: data });
}

function readCsvValue(row, mapping, target, aliases = []) {
  const data = row.data || {};
  const mappedKey = mapping?.[target];
  if (mappedKey && data[mappedKey] !== undefined) return data[mappedKey];
  const normalizedAliases = [target, ...aliases].map((value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, ''));
  const foundKey = Object.keys(data).find((key) => normalizedAliases.includes(String(key).toLowerCase().replace(/[^a-z0-9]/g, '')));
  return foundKey ? data[foundKey] : '';
}

function normalizeCsvStat(row, mapping) {
  return {
    email: String(readCsvValue(row, mapping, 'affiliate_email', ['email', 'user_email', 'streamer_email'])).trim().toLowerCase(),
    shortCode: normalizeShortCode(readCsvValue(row, mapping, 'short_code', ['code', 'tracking_code', 'link_code'])),
    trackingLinkId: String(readCsvValue(row, mapping, 'tracking_link_id', ['link_id'])).trim(),
    reportingPeriodStart: String(readCsvValue(row, mapping, 'reporting_period_start', ['period_start', 'start_date', 'date'])).trim(),
    reportingPeriodEnd: String(readCsvValue(row, mapping, 'reporting_period_end', ['period_end', 'end_date', 'date'])).trim(),
    partnerClicks: Number(readCsvValue(row, mapping, 'partner_clicks', ['clicks', 'visits']) || 0),
    registrations: Number(readCsvValue(row, mapping, 'registrations', ['signups', 'regs']) || 0),
    qualifiedRegistrations: Number(readCsvValue(row, mapping, 'qualified_registrations', ['qualified_regs']) || 0),
    ftds: Number(readCsvValue(row, mapping, 'ftds', ['first_deposits', 'depositors']) || 0),
    depositAmount: readCsvValue(row, mapping, 'deposit_amount', ['deposits', 'deposit_value']),
    withdrawalAmount: readCsvValue(row, mapping, 'withdrawal_amount', ['withdrawals']),
    cpaCommission: readCsvValue(row, mapping, 'cpa_commission', ['cpa']),
    revenueShareCommission: readCsvValue(row, mapping, 'revenue_share_commission', ['revshare', 'rev_share']),
    adjustments: readCsvValue(row, mapping, 'adjustments', ['adjustment']),
    currency: String(readCsvValue(row, mapping, 'currency', ['ccy']) || 'EUR').trim().slice(0, 3).toUpperCase(),
    notes: String(readCsvValue(row, mapping, 'notes', ['comment']) || '').slice(0, 500),
    externalReference: String(readCsvValue(row, mapping, 'external_reference', ['external_id', 'report_id']) || '').slice(0, 200),
  };
}

async function handleCsvImport(req, res, supabase, user) {
  const body = parseBody(req);
  const csv = String(body.csv || '');
  const brandId = body.brandId;
  if (!csv || !brandId) return res.status(400).json({ error: 'CSV content and brand are required.' });
  const fileHash = createHash('sha256').update(csv).digest('hex');
  const rows = rowsToObjects(parseCsv(csv));
  const mapping = body.mapping || {};
  const normalizedRows = rows.map((row) => ({ ...row, normalized: normalizeCsvStat(row, mapping) }));
  if (body.previewOnly) return res.status(200).json({ rowsTotal: rows.length, previewRows: normalizedRows.slice(0, 20), fileHash });

  const { data: existing } = await supabase.from('affiliate_imports').select('id,status').eq('brand_id', brandId).eq('file_hash', fileHash).maybeSingle();
  if (existing && !body.confirmDuplicate) return res.status(409).json({ error: 'This CSV appears to have already been imported.', code: 'duplicate_import', importId: existing.id });

  const importResult = await supabase.from('affiliate_imports').insert({
    filename: body.filename || 'affiliate-import.csv',
    file_hash: fileHash,
    brand_id: brandId,
    rows_total: rows.length,
    imported_by: user.id,
    column_mapping: body.mapping || {},
  }).select('*').single();
  if (importResult.error) throw importResult.error;

  const [{ data: brandLinks }, usersResult] = await Promise.all([
    supabase.from('affiliate_links').select('id,affiliate_user_id,brand_id,offer_id,short_code').eq('brand_id', brandId),
    supabase.rpc('get_all_auth_users'),
  ]);
  const linksById = new Map((brandLinks || []).map((link) => [link.id, link]));
  const linksByCode = new Map((brandLinks || []).map((link) => [String(link.short_code || '').toLowerCase(), link]));
  const usersByEmail = new Map((usersResult.data || []).map((authUser) => [String(authUser.email || '').toLowerCase(), authUser.id]));
  const statsPayload = [];
  const importRows = normalizedRows.map((row) => {
    const normalized = row.normalized;
    const link = linksById.get(normalized.trackingLinkId) || linksByCode.get(String(normalized.shortCode || '').toLowerCase()) || null;
    const affiliateUserId = link?.affiliate_user_id || usersByEmail.get(normalized.email) || null;
    const matched = Boolean(affiliateUserId && normalized.reportingPeriodStart && normalized.reportingPeriodEnd);
    if (matched) {
      statsPayload.push({
        affiliate_user_id: affiliateUserId,
        tracking_link_id: link?.id || null,
        brand_id: brandId,
        offer_id: link?.offer_id || null,
        partner_clicks: Number(normalized.partnerClicks || 0),
        registrations: Number(normalized.registrations || 0),
        qualified_registrations: Number(normalized.qualifiedRegistrations || 0),
        ftds: Number(normalized.ftds || 0),
        deposit_amount_minor: toMinorUnits(normalized.depositAmount) || 0,
        withdrawal_amount_minor: toMinorUnits(normalized.withdrawalAmount) || 0,
        cpa_commission_minor: toMinorUnits(normalized.cpaCommission) || 0,
        revenue_share_commission_minor: toMinorUnits(normalized.revenueShareCommission) || 0,
        adjustments_minor: toMinorUnits(normalized.adjustments) || 0,
        currency: normalized.currency || 'EUR',
        reporting_period_start: normalized.reportingPeriodStart,
        reporting_period_end: normalized.reportingPeriodEnd,
        source: 'csv',
        external_reference: normalized.externalReference || null,
        notes: normalized.notes,
        import_id: importResult.data.id,
        created_by: user.id,
      });
    }
    return {
    import_id: importResult.data.id,
    row_number: row.rowNumber,
    raw_data: row.data,
      normalized_data: normalized,
      match_status: matched ? 'matched' : 'unmatched',
      matched_link_id: link?.id || null,
      matched_affiliate_user_id: affiliateUserId,
    };
  });
  if (importRows.length) await supabase.from('affiliate_import_rows').insert(importRows);
  if (statsPayload.length) await supabase.from('affiliate_stats').insert(statsPayload);
  await supabase.from('affiliate_imports').update({
    rows_matched: importRows.filter((row) => row.match_status === 'matched').length,
    rows_unmatched: importRows.filter((row) => row.match_status !== 'matched').length,
    status: 'processed',
  }).eq('id', importResult.data.id);
  await writeAudit(supabase, user.id, 'csv_imported', 'affiliate_import', importResult.data.id, null, importResult.data, body.reason);
  return res.status(200).json({
    import: {
      ...importResult.data,
      rows_matched: importRows.filter((row) => row.match_status === 'matched').length,
      rows_unmatched: importRows.filter((row) => row.match_status !== 'matched').length,
    },
    statsInserted: statsPayload.length,
    rowsTotal: rows.length,
  });
}

async function handlePostback(req, res, supabase) {
  const brandSlug = normalizeSlug(req.query.brandSlug || req.query.brand || '');
  const { data: brand, error } = await supabase.from('affiliate_brands').select('*').eq('slug', brandSlug).maybeSingle();
  if (error) throw error;
  if (!brand || brand.status !== 'active') return res.status(404).json({ error: 'Unknown brand' });
  const body = parseBody(req);
  const token = String(req.query.token || body.token || '');
  const expected = brand.postback_secret_hash || '';
  if (expected && !safeEqualText(hashValue(token), expected)) return res.status(401).json({ error: 'Invalid postback signature' });
  const idempotencyKey = String(body.idempotency_key || body.event_id || req.headers['x-idempotency-key'] || randomUUID()).slice(0, 200);
  const clickId = String(body.click_id || body.clickid || body.subid || '');
  const eventType = String(body.event_type || body.type || 'registration').toLowerCase();
  const { data: click } = clickId
    ? await supabase.from('affiliate_clicks').select('*').eq('click_id', clickId).maybeSingle()
    : { data: null };
  const insert = await supabase.from('affiliate_postback_events').upsert({
    brand_id: brand.id,
    idempotency_key: idempotencyKey,
    event_type: eventType,
    click_id: clickId || null,
    tracking_link_id: click?.tracking_link_id || null,
    affiliate_user_id: click?.affiliate_user_id || null,
    external_event_id: String(body.external_event_id || body.event_id || '') || null,
    payload: body,
    signature_valid: true,
    processed: Boolean(click),
    unmatched: !click,
  }, { onConflict: 'brand_id,idempotency_key' }).select('*').single();
  if (insert.error) throw insert.error;
  if (click) {
    await supabase.from('affiliate_conversions').upsert({
      affiliate_user_id: click.affiliate_user_id,
      tracking_link_id: click.tracking_link_id,
      brand_id: click.brand_id,
      offer_id: click.offer_id,
      click_id: clickId,
      external_event_id: String(body.external_event_id || body.event_id || idempotencyKey),
      event_type: eventType,
      amount_minor: toMinorUnits(body.amount) || null,
      currency: body.currency || 'EUR',
      metadata: body,
    }, { onConflict: 'brand_id,external_event_id' });
  }
  return res.status(200).json({ ok: true, unmatched: !click });
}

async function handleAffiliateExport(req, res, supabase, user) {
  await requireAffiliateUser(supabase, user);
  const links = await fetchLinksWithTotals(supabase, req, { affiliateUserId: user.id });
  const rows = [
    ['Brand', 'Offer', 'Tracking URL', 'Status', 'Campaign', 'Source', 'Human clicks', 'Unique clicks', 'Registrations', 'FTDs'],
    ...links.map((link) => [
      escapeCsvFormula(link.brandName || ''),
      escapeCsvFormula(link.offerName || ''),
      link.trackingUrl,
      link.status,
      escapeCsvFormula(link.campaignName || ''),
      escapeCsvFormula(link.sourceName || ''),
      link.clickTotals?.humanClicks || 0,
      link.clickTotals?.uniqueClicks || 0,
      link.statsTotals?.registrations || 0,
      link.statsTotals?.ftds || 0,
    ]),
  ];
  return sendCsv(res, 'affiliate-links.csv', rows);
}

export default async function handler(req, res) {
  setCors(res, 'GET, POST, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createSupabaseAdmin();
    const action = req.query.action || 'me';
    if (action === 'redirect') return handleRedirect(req, res, supabase);
    if (action === 'postback') return handlePostback(req, res, supabase);

    const user = await loadAuthContext(req, supabase);

    if (action === 'me') return handleAffiliateMe(req, res, supabase, user);
    if (action === 'export') return handleAffiliateExport(req, res, supabase, user);

    await requireAdminUser(supabase, user);
    if (action === 'admin-overview') return handleAdminOverview(req, res, supabase);
    if (action === 'save-brand') return handleSaveBrand(req, res, supabase, user);
    if (action === 'save-offer') return handleSaveOffer(req, res, supabase, user);
    if (action === 'save-link') return handleSaveLink(req, res, supabase, user);
    if (action === 'role') return handleRoleAction(req, res, supabase, user);
    if (action === 'stats') return handleStats(req, res, supabase, user);
    if (action === 'csv-import') return handleCsvImport(req, res, supabase, user);

    return res.status(400).json({ error: 'Unknown affiliate action.' });
  } catch (err) {
    return sendError(res, err);
  }
}
