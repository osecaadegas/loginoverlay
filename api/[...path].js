import analyticsHandler from './_lib/routes/analytics.js';
import autoDrawWinnersHandler from './_lib/routes/auto-draw-winners.js';
import bettingHandler from './_lib/routes/betting.js';
import playerSubscriptionHandler from './_lib/routes/player-subscription.js';
import premiumHandler from './_lib/routes/premium.js';
import serviceReadinessHandler from './_lib/routes/service-readiness.js';
import streamerDataHandler from './_lib/streamer-data.js';

const ROUTES = {
  analytics: analyticsHandler,
  'auto-draw-winners': autoDrawWinnersHandler,
  betting: bettingHandler,
  'player-subscription': playerSubscriptionHandler,
  premium: premiumHandler,
  'service-readiness': serviceReadinessHandler,
  'streamer-data': streamerDataHandler,
};

function getRouteName(req) {
  const dynamicPath = req.query?.path;
  if (Array.isArray(dynamicPath) && dynamicPath[0]) return dynamicPath[0];
  if (typeof dynamicPath === 'string' && dynamicPath) return dynamicPath.split('/')[0];

  const pathname = new URL(req.url || '/', 'https://streamerscenter.com').pathname;
  return pathname.replace(/^\/api\/?/, '').split('/')[0];
}

export default async function handler(req, res) {
  const routeName = getRouteName(req);
  const routeHandler = ROUTES[routeName];

  if (!routeHandler) {
    return res.status(404).json({ error: 'API route not found' });
  }

  return routeHandler(req, res);
}