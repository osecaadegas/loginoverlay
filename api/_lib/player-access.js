import { PLAYER_PRODUCT_CODE } from '../../src/features/playerBonusHunt/domain.js';
import { resolvePremiumAccess } from './premium-data.js';

const ACTIVE_PLAYER_STATUSES = new Set(['trialing', 'active']);

export function playerSubscriptionRequired() {
  return String(process.env.PLAYER_BONUS_HUNT_REQUIRE_SUBSCRIPTION || '').toLowerCase() === 'true';
}

export function isSubscriptionEntitled(subscription, now = new Date()) {
  if (!subscription || !ACTIVE_PLAYER_STATUSES.has(subscription.status)) return false;
  if (subscription.status === 'trialing' && subscription.trial_ends_at) {
    return new Date(subscription.trial_ends_at) > now;
  }
  if (subscription.status === 'active' && subscription.current_period_end) {
    return new Date(subscription.current_period_end) > now;
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
  if (!playerSubscriptionRequired()) {
    return {
      entitled: true,
      adminAccess: false,
      freeAccess: true,
      subscription: null,
      reason: null,
    };
  }

  const [subscription, adminAccess, entitlement] = await Promise.all([
    getPlayerSubscription(supabase, userId),
    userHasAdminAccess(supabase, userId),
    resolvePremiumAccess(supabase, userId),
  ]);
  const entitled = adminAccess || entitlement.hasPlayerAccess || isSubscriptionEntitled(subscription);
  return {
    entitled,
    adminAccess,
    freeAccess: false,
    subscription,
    entitlement,
    trial: entitlement.trial || null,
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
