/**
 * shoutoutService.js — Frontend service for raid shoutout alerts.
 *
 * Handles:
 * - Subscribing to realtime shoutout alerts (for overlay)
 * - Triggering shoutouts from the admin panel
 * - Marking alerts as shown / dismissed
 */
import { supabase } from '../config/supabaseClient';

/**
 * Subscribe to new shoutout alerts for a user via Supabase Realtime.
 * The callback fires whenever a new 'pending' alert is inserted.
 *
 * @param {string} userId - The overlay owner's user ID
 * @param {function} onAlert - Callback receiving the new alert row
 * @returns {object} Supabase channel (call .unsubscribe() to clean up)
 */
export function subscribeToShoutoutAlerts(userId, onAlert) {
  const channel = supabase
    .channel(`shoutout_alerts_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'shoutout_alerts',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new && payload.new.status === 'pending') {
          onAlert(payload.new);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from shoutout alerts channel.
 */
export function unsubscribeShoutoutAlerts(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

/**
 * Mark an alert as "shown" (currently playing on overlay).
 */
export async function markAlertShown(alertId) {
  const { error } = await supabase
    .from('shoutout_alerts')
    .update({ status: 'shown', shown_at: new Date().toISOString() })
    .eq('id', alertId);

  if (error) console.error('[ShoutoutService] markAlertShown error:', error);
}

/**
 * Mark an alert as "dismissed" (finished playing / closed).
 */
export async function markAlertDismissed(alertId) {
  const { error } = await supabase
    .from('shoutout_alerts')
    .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
    .eq('id', alertId);

  if (error) console.error('[ShoutoutService] markAlertDismissed error:', error);
}

/**
 * Fetch any pending (unseen) alerts for a user.
 * Used on overlay load to catch alerts that arrived while offline.
 */
export async function getPendingAlerts(userId) {
  const { data, error } = await supabase
    .from('shoutout_alerts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5);

  if (error) {
    console.error('[ShoutoutService] getPendingAlerts error:', error);
    return [];
  }
  return data || [];
}

/**
 * Fetch recent shoutout history for the admin panel.
 */
export async function getShoutoutHistory(userId, limit = 20) {
  const { data, error } = await supabase
    .from('shoutout_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ShoutoutService] getShoutoutHistory error:', error);
    return [];
  }
  return data || [];
}

/**
 * Trigger a shoutout from the frontend admin panel.
 * Calls the API endpoint which fetches clips + inserts the alert.
 */
export async function triggerShoutout(raiderUsername, triggeredBy = 'manual') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch('/api/raid-shoutout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      raiderUsername,
      userId: session.user.id,
      triggeredBy,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to trigger shoutout');
  }

  return result;
}

/**
 * Test the shoutout alert with a sample clip.
 * Useful for previewing in the config panel.
 */
export async function triggerTestShoutout() {
  return triggerShoutout('shroud', 'test'); // Uses Shroud as test subject (always has clips)
}
