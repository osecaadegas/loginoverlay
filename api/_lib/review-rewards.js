export const REVIEW_REWARD_DAYS = 3;
export const REVIEW_REWARD_SECONDS = REVIEW_REWARD_DAYS * 86400;
export const PUBLIC_REVIEW_FIELDS = 'id,display_name,rating,body,product_code,created_at';

export function reviewError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

export function validateReview(input) {
  const display_name = typeof input.displayName === 'string' ? input.displayName.trim() : '';
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (display_name.length < 2 || display_name.length > 60) throw reviewError('Use a public name between 2 and 60 characters.');
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw reviewError('Choose a rating from 1 to 5.');
  if (body.length < 20 || body.length > 1500) throw reviewError('Write a review between 20 and 1,500 characters.');
  if (input.consent !== true) throw reviewError('Confirm that your name and review can be published.');
  return { display_name, body, rating: input.rating };
}

export function subscriptionPeriodEnd(subscription) {
  return Number(subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end);
}

// Eligibility comes from an owned billing record AND the current Stripe subscription.
export function verifyReviewOwnership(subscription, record, userId) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const owner = subscription.metadata?.supabase_user_id || subscription.metadata?.user_id;
  if (record.user_id !== userId || subscription.id !== record.stripe_subscription_id
    || customerId !== record.stripe_customer_id || (owner && owner !== userId)) {
    throw reviewError('Subscription ownership could not be verified.', 403);
  }
}

export function verifyReviewSubscription(subscription, record, userId, now = Date.now()) {
  verifyReviewOwnership(subscription, record, userId);
  if (!['streamer_premium', 'player_bonus_hunt'].includes(record.product_code)
    || !['active', 'trialing'].includes(subscription.status)
    || !(subscriptionPeriodEnd(subscription) > now / 1000)) {
    throw reviewError('An active subscription is required to leave a review.', 403);
  }
}

export function rewardPlan(subscription, now = Date.now()) {
  const end = subscriptionPeriodEnd(subscription);
  const items = subscription.items?.data || [];
  if (items.length !== 1 || items[0].price?.recurring?.usage_type !== 'licensed'
    || subscription.schedule || subscription.pending_update || subscription.pause_collection
    || (subscription.cancel_at && Number(subscription.cancel_at) !== end)
    || end + REVIEW_REWARD_SECONDS > Math.floor(now / 1000) + 730 * 86400) {
    throw reviewError('This subscription needs a billing review before we can add the free days. Please contact support.', 409);
  }
  return {
    original_period_end: end,
    reward_period_end: end + REVIEW_REWARD_SECONDS,
    cancel_at_period_end: !!subscription.cancel_at_period_end,
    original_cancel_at: subscription.cancel_at ? Number(subscription.cancel_at) : null,
  };
}

export function rewardUpdateParams(review) {
  const params = {
    trial_end: Number(review.reward_period_end),
    proration_behavior: 'none',
    'metadata[service_review_reward]': review.id,
  };
  // Preserve a scheduled cancellation; never restart a canceled subscription.
  if (review.cancel_at_period_end) params.cancel_at_period_end = true;
  else if (review.original_cancel_at) params.cancel_at = Number(review.reward_period_end);
  return params;
}

export function ownReview(review) {
  if (!review) return null;
  return {
    id: review.id, displayName: review.display_name, rating: review.rating, body: review.body,
    published: review.published, productCode: review.product_code,
    rewardStatus: review.reward_status, rewardDays: REVIEW_REWARD_DAYS,
    rewardEnd: new Date(Number(review.reward_period_end) * 1000).toISOString(),
  };
}
