import { supabase } from '../config/supabaseClient';
import { trackOfferClick as trackAnalyticsOfferClick } from './analytics';

/**
 * Logs an offer click through the analytics API and keeps the legacy
 * offer_clicks table populated for older admin surfaces.
 */
export default async function trackOfferClick({ offerId, casinoName, pageSource = 'offers' }) {
  trackAnalyticsOfferClick(offerId, { casino_name: casinoName, page_source: pageSource });

  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    const meta = user?.user_metadata || {};
    const twitchUsername = meta.preferred_username || meta.user_name || meta.full_name || null;

    let seUsername = null;
    try {
      const seConn = await supabase
        .from('streamelements_connections')
        .select('se_username')
        .maybeSingle();
      seUsername = seConn?.data?.se_username || null;
    } catch {
      // Legacy context only; analytics API remains the source of truth.
    }

    await supabase.from('offer_clicks').insert({
      offer_id: offerId,
      casino_name: casinoName || null,
      user_id: user?.id || null,
      se_username: seUsername,
      twitch_username: twitchUsername,
      user_agent: navigator.userAgent,
      page_source: pageSource,
    });
  } catch (err) {
    console.warn('[trackOfferClick]', err.message);
  }
}
