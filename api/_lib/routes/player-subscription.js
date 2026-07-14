import {
  createBillingPortalSession,
  createCheckoutSession,
} from '../mollie-billing.js';
import {
  createSupabaseAdmin,
  parseBody,
  requireUser,
  setCors,
} from '../api-auth.js';
import { getPlayerAccess, playerSubscriptionRequired } from '../player-access.js';
import { PLAYER_PLAN_CODE, PLAYER_PRODUCT_CODE } from '../../../src/features/playerBonusHunt/domain.js';

async function handleStatus(req, res, supabase, user) {
  const subscriptionRequired = playerSubscriptionRequired();
  const access = await getPlayerAccess(supabase, user.id);
  return res.status(200).json({
    productCode: PLAYER_PRODUCT_CODE,
    planCode: PLAYER_PLAN_CODE,
    planName: subscriptionRequired ? 'Player' : 'Player Bonus Hunt',
    monthlyPrice: subscriptionRequired ? 3 : 0,
    currency: 'EUR',
    trialDays: 0,
    subscriptionRequired,
    ...access,
  });
}

async function handleCheckout(req, res, supabase, user) {
  if (!playerSubscriptionRequired()) {
    const access = await getPlayerAccess(supabase, user.id);
    return res.status(200).json({
      message: 'Player Bonus Hunt is currently free for authenticated users.',
      access,
    });
  }

  const access = await getPlayerAccess(supabase, user.id);
  if (access.entitled) {
    return res.status(409).json({
      error: 'You already have Player Bonus Hunt access.',
      access,
    });
  }

  const session = await createCheckoutSession({
    req,
    supabase,
    user,
    planId: PLAYER_PLAN_CODE,
    successPath: '/player/subscription',
    cancelPath: '/player/subscription',
  });
  return res.status(200).json({
    id: session.id,
    url: session.url,
    trialPeriodDays: 0,
  });
}

async function handlePortal(req, res, supabase, user) {
  if (!playerSubscriptionRequired()) {
    const access = await getPlayerAccess(supabase, user.id);
    return res.status(200).json({
      message: 'No billing portal is needed while Player Bonus Hunt is free.',
      access,
    });
  }

  const session = await createBillingPortalSession({
    req,
    returnPath: '/player/subscription',
  });
  return res.status(200).json({ id: session.id, url: session.url, message: session.message });
}

export default async function handler(req, res) {
  setCors(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createSupabaseAdmin();
    const user = await requireUser(req, supabase);
    const body = parseBody(req);
    const action = req.query.action || body.action || (req.method === 'GET' ? 'status' : '');

    if (action === 'status') return handleStatus(req, res, supabase, user);
    if (action === 'checkout') return handleCheckout(req, res, supabase, user);
    if (action === 'portal') return handlePortal(req, res, supabase, user);
    return res.status(404).json({ error: 'Unknown subscription action' });
  } catch (err) {
    console.error('[player-subscription]', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Subscription request failed' });
  }
}