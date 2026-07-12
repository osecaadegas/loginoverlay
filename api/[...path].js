import analyticsHandler from './_lib/routes/analytics.js';
import bettingHandler from './_lib/routes/betting.js';
import serviceReadinessHandler from './_lib/routes/service-readiness.js';

const ROUTES = {
  analytics: analyticsHandler,
  betting: bettingHandler,
  'service-readiness': serviceReadinessHandler,
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