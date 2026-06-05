/**
 * /api/streamer-data — Public endpoint for external streamer websites.
 *
 * Auth: ?key=<api_key>  or  x-api-key header
 *
 * Actions (?action=):
 *   bonus_hunt          — Live bonus hunt (bonuses, stats, phase)
 *   bonus_hunt_history  — Completed hunt archive (paginated)
 *   overlay_state       — Current overlay scene / state
 *   widgets             — All widget configs (credentials stripped)
 *   profile             — Streamer public profile
 */
import handler from './_lib/streamer-data.js';

export default handler;
