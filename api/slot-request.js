import { createClient } from '@supabase/supabase-js';

/**
 * /api/slot-request
 *
 * Called by StreamElements custom command:
 *   !sr <slot name>
 *   → ${customapi.https://yoursite.com/api/slot-request?slot=${querystring}&user_id=STREAMER_USER_ID&requester=${user}}
 *
 * Query params:
 *   slot      — slot name to request (required)
 *   user_id   — Supabase user ID of the streamer (required)
 *   requester — viewer's Twitch username (optional, filled by SE ${user})
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slot, user_id, requester } = req.query;

  if (!slot || !slot.trim()) {
    return res.status(200).send('Usage: !sr <slot name>');
  }
  if (!user_id) {
    return res.status(200).send('Missing streamer user_id');
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(200).send('Server config error');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const slotName = slot.trim();
  const viewer = (requester || 'anonymous').trim();

  try {
    // Check for duplicate — same slot still pending for this streamer
    const { data: existing } = await supabase
      .from('slot_requests')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .ilike('slot_name', slotName)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(200).send(`"${slotName}" is already in the queue!`);
    }

    // Try to find the slot in the slots database for an image
    let slotImage = null;
    const { data: matchedSlot } = await supabase
      .from('slots')
      .select('name, image')
      .ilike('name', `%${slotName}%`)
      .limit(1);

    if (matchedSlot && matchedSlot.length > 0 && matchedSlot[0].image) {
      slotImage = matchedSlot[0].image;
    }

    // Insert the request
    const { error: insertErr } = await supabase
      .from('slot_requests')
      .insert({
        user_id,
        slot_name: slotName,
        slot_image: slotImage,
        requested_by: viewer,
        status: 'pending',
      });

    if (insertErr) {
      console.error('Insert error:', insertErr);
      return res.status(200).send('Could not add request. Try again later.');
    }

    if (slotImage) {
      return res.status(200).send(`🎰 Added "${slotName}" to the queue (requested by ${viewer})`);
    } else {
      return res.status(200).send(`🎰 Added "${slotName}" to the queue (requested by ${viewer})`);
    }
  } catch (err) {
    console.error('Slot request error:', err);
    return res.status(200).send('Something went wrong. Try again later.');
  }
}
