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

  // PRIORITY: Try to get IPv4 first (for affiliate dashboard matching)
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (res.ok) {
      const d = await res.json();
      const ipv4 = d.ip || null;
      
      // If we got IPv4, use ipwho.is to get geo data
      if (ipv4 && !ipv4.includes(':')) {
        try {
          const geoRes = await fetch(`https://ipwho.is/${ipv4}`);
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.success !== false) {
              cachedGeo = {
                ip: ipv4,
                country: geoData.country || null,
                countryCode: geoData.country_code || null,
                region: geoData.region || null,
                city: geoData.city || null,
              };
              return cachedGeo;
            }
          }
        } catch { /* continue with IPv4 only */ }
        
        // Got IPv4 but no geo data
        cachedGeo = { ...empty, ip: ipv4 };
        return cachedGeo;
      }
    }
  } catch { /* fall through to fallbacks */ }

  // Fallback 1: ipwho.is (may return IPv6)
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

  // Fallback 2: ipapi.co
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

  return empty;
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
