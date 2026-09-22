import { createSupabaseAdmin, parseBody, requireUser, setCors } from '../api-auth.js';
import { userHasAdminAccess } from '../premium-data.js';
import { retrieveSubscription, stripeRequest, syncStripeSubscription } from '../stripe-billing.js';
import {
  PUBLIC_REVIEW_FIELDS, ownReview, reviewError, rewardPlan, rewardUpdateParams,
  subscriptionPeriodEnd, validateReview, verifyReviewSubscription, verifyReviewOwnership,
} from '../review-rewards.js';

function checked(result) {
  if (result.error) throw result.error;
  return result.data;
}

async function findReview(db, userId) {
  return checked(await db.from('service_reviews').select('*').eq('user_id', userId).maybeSingle());
}

async function eligibleSubscription(db, userId, retrieve) {
  const records = checked(await db.from('billing_subscriptions').select('*')
    .eq('user_id', userId).eq('provider', 'stripe').in('status', ['active', 'trialing'])
    .in('product_code', ['streamer_premium', 'player_bonus_hunt'])
    .gt('current_period_end', new Date().toISOString()).order('current_period_end', { ascending: false }));
  // A Streamer subscription includes Player access, so extend that first.
  records.sort((a, b) => Number(b.product_code === 'streamer_premium') - Number(a.product_code === 'streamer_premium'));
  for (const record of records) {
    const subscription = await retrieve(record.stripe_subscription_id);
    if (!['active', 'trialing'].includes(subscription.status) || subscriptionPeriodEnd(subscription) <= Date.now() / 1000) continue;
    verifyReviewSubscription(subscription, record, userId);
    return { record, subscription, plan: rewardPlan(subscription) };
  }
  return null;
}

export async function applyReviewReward(db, review, { retrieve, updateStripe, sync }) {
  if (review.reward_status === 'applied') return review;
  let subscription = await retrieve(review.stripe_subscription_id);
  verifyReviewOwnership(subscription, review, review.user_id);
  const receipt = subscription.metadata?.service_review_reward;
  if (receipt !== review.id) {
    verifyReviewSubscription(subscription, review, review.user_id);
    const current = rewardPlan(subscription);
    if (current.original_period_end !== Number(review.original_period_end)
      || current.cancel_at_period_end !== review.cancel_at_period_end
      || current.original_cancel_at !== (review.original_cancel_at ? Number(review.original_cancel_at) : null)) {
      throw reviewError('Your subscription changed. Contact support to finish applying your saved reward.', 409);
    }
    subscription = await updateStripe(`/v1/subscriptions/${review.stripe_subscription_id}`, {
      params: rewardUpdateParams(review), idempotencyKey: `service-review-${review.id}`,
    });
    if (subscription.metadata?.service_review_reward !== review.id
      || subscriptionPeriodEnd(subscription) !== Number(review.reward_period_end)) {
      throw reviewError('The billing extension could not be confirmed. Your reward is saved for retry.', 503);
    }
  }
  if (Number(subscription.trial_end) !== Number(review.reward_period_end)) {
    throw reviewError('The saved reward needs a billing review. Please contact support.', 409);
  }
  // A Stripe receipt survives network failures and its idempotency retention window.
  // Retrieve on retry, then sync the latest state so we never revive ended access.
  await sync(db, subscription, review.user_id);
  return checked(await db.from('service_reviews').update({ reward_status: 'applied', rewarded_at: new Date().toISOString() })
    .eq('id', review.id).select('*').single());
}

export function createReviewsHandler(overrides = {}) {
  const deps = {
    createDb: createSupabaseAdmin, authenticate: requireUser, isAdmin: userHasAdminAccess,
    retrieve: retrieveSubscription, updateStripe: stripeRequest, sync: syncStripeSubscription,
    ...overrides,
  };
  return async function handler(req, res) {
    setCors(res, 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.status(200).end();
    try {
      const db = deps.createDb();
      const action = req.query?.action || 'public';
      if (req.method === 'GET' && action === 'public') {
        const offset = Number(req.query?.offset || 0);
        if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) throw reviewError('Invalid review page.');
        const reviews = checked(await db.from('service_reviews').select(PUBLIC_REVIEW_FIELDS)
          .eq('published', true).order('created_at', { ascending: false }).order('id').range(offset, offset + 5));
        const summary = checked(await db.rpc('service_review_summary'));
        return res.status(200).json({ reviews, summary, nextOffset: reviews.length === 6 && offset + 6 <= 1000000 ? offset + 6 : null });
      }
      if (!['GET', 'POST', 'PATCH'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
      const user = await deps.authenticate(req, db);
      if (action === 'admin') {
        if (!await deps.isAdmin(db, user.id)) throw reviewError('Administrator access required.', 403);
        if (req.method === 'GET') {
          const reviews = checked(await db.from('service_reviews').select('*').order('created_at', { ascending: false }).limit(100));
          return res.status(200).json({ reviews: reviews.map((review) => ({ ...ownReview(review), createdAt: review.created_at })) });
        }
        if (req.method === 'PATCH') {
          const body = parseBody(req);
          if (typeof body.published !== 'boolean' || !/^[0-9a-f-]{36}$/i.test(body.id || '')) throw reviewError('Invalid review update.');
          checked(await db.from('service_reviews').update({ published: body.published, moderated_by: user.id, moderated_at: new Date().toISOString() }).eq('id', body.id));
          return res.status(200).json({ ok: true });
        }
        if (req.method === 'POST') {
          const body = parseBody(req);
          const review = checked(await db.from('service_reviews').select('*').eq('id', body.id).single());
          return res.status(200).json({ review: ownReview(await applyReviewReward(db, review, deps)) });
        }
      }
      let review = await findReview(db, user.id);
      if (req.method === 'GET' && action === 'mine') {
        if (review) return res.status(200).json({ review: ownReview(review), eligible: false });
        const eligible = await eligibleSubscription(db, user.id, deps.retrieve);
        return res.status(200).json({ review: null, eligible: !!eligible, productCode: eligible?.record.product_code });
      }
      if (req.method === 'POST' && action === 'public') {
        if (!review) {
          const values = validateReview(parseBody(req));
          const eligible = await eligibleSubscription(db, user.id, deps.retrieve);
          if (!eligible) throw reviewError('An active subscription is required to leave a review.', 403);
          const result = await db.from('service_reviews').insert({
            ...values, ...eligible.plan, user_id: user.id,
            product_code: eligible.record.product_code,
            stripe_subscription_id: eligible.record.stripe_subscription_id,
            stripe_customer_id: eligible.record.stripe_customer_id,
          }).select('*').single();
          if (result.error?.code === '23505') review = await findReview(db, user.id);
          else review = checked(result);
        }
        try {
          review = await applyReviewReward(db, review, deps);
          return res.status(200).json({ review: ownReview(review) });
        } catch (error) {
          console.error('[reviews] reward pending', review.id, error.statusCode || error.code || 'error');
          return res.status(202).json({ review: ownReview(review), message: 'Your review is saved. The three-day reward is pending. Retry below, or contact support if it remains pending.' });
        }
      }
      return res.status(404).json({ error: 'Unknown review action' });
    } catch (error) {
      const status = error.statusCode || (error instanceof SyntaxError ? 400 : 500);
      console.error('[reviews]', status, error.code || 'request_failed');
      return res.status(status).json({ error: status < 500 ? error.message : 'Reviews are temporarily unavailable. Please try again shortly.' });
    }
  };
}

export default createReviewsHandler();
