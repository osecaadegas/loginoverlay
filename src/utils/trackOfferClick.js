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
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    cachedGeo = {
      ip: data.ip || null,
      country: data.country_name || null,
      countryCode: data.country_code || null,
      region: data.region || null,
      city: data.city || null,
    };
    return cachedGeo;
  } catch {
    // Fallback to just IP
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      cachedGeo = { ip: data.ip, country: null, countryCode: null, region: null, city: null };
      return cachedGeo;
    } catch {
      return { ip: null, country: null, countryCode: null, region: null, city: null };
    }
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
