import { PLAYER_PRODUCT_CODE } from '../../src/features/playerBonusHunt/domain.js';

const ACTIVE_PLAYER_STATUSES = new Set(['trialing', 'active']);

export function isSubscriptionEntitled(subscription, now = new Date()) {
  if (!subscription || !ACTIVE_PLAYER_STATUSES.has(subscription.status)) return false;
  if (subscription.status === 'trialing' && subscription.trial_ends_at) {
    return new Date(subscription.trial_ends_at) > now;
  }
  if (subscription.status === 'active' && subscription.current_period_end) {
    return new Date(subscription.current_period_end) > now || subscription.cancel_at_period_end === false;
  }
  return true;
}

export async function getPlayerSubscription(supabase, userId) {
  const { data, error } = await supabase
    .from('user_product_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('product_code', PLAYER_PRODUCT_CODE)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function userHasAdminAccess(supabase, userId) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, is_active')
    .eq('user_id', userId)
    .in('role', ['admin', 'superadmin'])
    .eq('is_active', true)
    .limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}

export async function getPlayerAccess(supabase, userId) {
  const [subscription, adminAccess] = await Promise.all([
    getPlayerSubscription(supabase, userId),
    userHasAdminAccess(supabase, userId),
  ]);
  const entitled = adminAccess || isSubscriptionEntitled(subscription);
  return {
    entitled,
    adminAccess,
    subscription,
    reason: entitled ? null : 'A Player plan or active trial is required for Bonus Hunt.',
  };
}

export async function requirePlayerAccess(supabase, userId) {
  const access = await getPlayerAccess(supabase, userId);
  if (!access.entitled) {
    const err = new Error(access.reason);
    err.statusCode = 402;
    err.access = access;
    throw err;
  }
  return access;
}
