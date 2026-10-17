import { createSupabaseAdmin, requireUser, setCors } from '../api-auth.js';
import { resolvePremiumAccess } from '../premium-data.js';
import { releaseNotes } from '../release-notes.js';

// Dependencies are injectable for authorization tests; the deployed handler uses real auth.
export function createUpdatesHandler({ createClient = createSupabaseAdmin, authenticate = requireUser, resolveAccess = resolvePremiumAccess } = {}) {
  return async (req, res) => {
    setCors(res, 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, OPTIONS');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      // Reject missing credentials before even initializing the database client.
      if (!/^Bearer\s+\S+/i.test(req.headers.authorization || '')) return res.status(401).json({ error: 'Authentication required' });
      const client = createClient();
      const user = await authenticate(req, client);
      const access = await resolveAccess(client, user.id);
      if (!access.hasStreamerAccess) return res.status(403).json({ error: 'Premium membership required' });
      return res.status(200).json({ updates: releaseNotes });
    } catch (error) {
      const status = error.statusCode === 401 ? 401 : 503;
      return res.status(status).json({ error: status === 401 ? 'Invalid or expired session' : 'Updates are temporarily unavailable. Please try again.' });
    }
  };
}

export default createUpdatesHandler();
