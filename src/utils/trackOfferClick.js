/**
 * trackOfferClick.js — Logs every casino-offer click to Supabase.
 *
 * Captures: offer_id, casino_name, logged-in user_id, SE username,
 * IP address + geo location (via a free API), user-agent, and the page source.
 */
import { supabase } from '../config/supabaseClient';

let cachedGeo = null;

async function getGeo() {
  if (cachedGeo) return cachedGeo;
  const empty = { ip: null, country: null, countryCode: null, region: null, city: null };

  // Try ipwho.is first (free, HTTPS, no key, generous limits)
  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const d = await res.json();
      if (d.success !== false) {
        cachedGeo = {
          ip: d.ip || null,
          country: d.country || null,
          countryCode: d.country_code || null,
          region: d.region || null,
          city: d.city || null,
        };
        return cachedGeo;
      }
    }
  } catch { /* fall through */ }

  // Fallback: ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const d = await res.json();
      if (!d.error) {
        cachedGeo = {
          ip: d.ip || null,
          country: d.country_name || null,
          countryCode: d.country_code || null,
          region: d.region || null,
          city: d.city || null,
        };
        return cachedGeo;
      }
    }
  } catch { /* fall through */ }

  // Last resort: IP only
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const d = await res.json();
    cachedGeo = { ...empty, ip: d.ip };
    return cachedGeo;
  } catch {
    return empty;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.offerId      – casino_offers.id
 * @param {string} opts.casinoName   – human label
 * @param {string} opts.pageSource   – 'offers' | 'landing'
 */
export default async function trackOfferClick({ offerId, casinoName, pageSource = 'offers' }) {
  try {
    const [geo, userResult] = await Promise.all([
      getGeo(),
      supabase.auth.getUser(),
    ]);

    const user = userResult?.data?.user || null;
    const userId = user?.id || null;
    const meta = user?.user_metadata || {};
    const twitchUsername = meta.preferred_username || meta.user_name || meta.full_name || null;

    // Separate try so a missing / RLS-blocked table never prevents the insert
    let seUsername = null;
    try {
      const seConn = await supabase.from('streamelements_connections').select('se_username').maybeSingle();
      seUsername = seConn?.data?.se_username || null;
    } catch { /* ignore */ }

    await supabase.from('offer_clicks').insert({
      offer_id: offerId,
      casino_name: casinoName || null,
      user_id: userId,
      se_username: seUsername,
      twitch_username: twitchUsername,
      ip_address: geo.ip || null,
      country: geo.country || null,
      country_code: geo.countryCode || null,
      region: geo.region || null,
      city: geo.city || null,
      user_agent: navigator.userAgent,
      page_source: pageSource,
    });
  } catch (err) {
    // Fire-and-forget — never block the user
    console.error('[trackOfferClick]', err);
  }
}
