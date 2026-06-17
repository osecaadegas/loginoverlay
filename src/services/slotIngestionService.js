import { supabase } from '../config/supabaseClient';

export async function ingestSlotToDatabase(slotData) {
  const name = String(slotData?.name || '').trim();
  const provider = String(slotData?.provider || '').trim();

  if (!name) {
    throw new Error('Slot name is required.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error('You must be signed in to add slots to the database.');
  }

  const response = await fetch('/api/slot-ai?action=ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name,
      ...(provider ? { provider } : {}),
      forceRefresh: !!slotData?.forceRefresh,
      skipImage: false,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.ok === false) {
    const message = payload.message || payload.error || payload.details?.message || `Ingestion failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

export function slotFromIngestionResult(result) {
  const slot = result?.slot;
  if (!slot?.name) return null;

  return {
    id: slot.id,
    name: slot.name,
    provider: slot.provider || '',
    image: slot.image || 'https://i.imgur.com/8E3ucNx.png',
    rtp: slot.rtp ?? null,
    volatility: slot.volatility || null,
    max_win_multiplier: slot.max_win_multiplier ?? null,
    theme: slot.theme || null,
    features: Array.isArray(slot.features) ? slot.features : [],
    twitch_safe: slot.twitch_safe ?? true,
    confidence_score: result.confidence ?? slot.confidence_score ?? null,
    status: 'live',
  };
}
