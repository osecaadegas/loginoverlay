/**
 * trackOfferClick.js — Logs every casino-offer click to Supabase.
 *
 * Captures: offer_id, casino_name, logged-in user_id, SE username,
 * IP address (via a free API), user-agent, and the page source.
 */
import { supabase } from '../config/supabaseClient';

let cachedIp = null;

async function getIp() {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    cachedIp = data.ip;
    return cachedIp;
  } catch {
    return null;
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
    const [ipResult, userResult] = await Promise.all([
      getIp(),
      supabase.auth.getUser(),
    ]);

    const userId = userResult?.data?.user?.id || null;

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
      ip_address: ipResult || null,
      user_agent: navigator.userAgent,
      page_source: pageSource,
    });
  } catch (err) {
    // Fire-and-forget — never block the user
    console.error('[trackOfferClick]', err);
  }
}
