/**
 * background.js — Slot Auto-Tracker
 * Watches casino browser tabs for URL/title changes and reports
 * the detected slot name to Supabase for the overlay to pick up.
 */

// Load Supabase config (URL + anon key)
importScripts('config.js');

// ── Casino URL patterns ──
const CASINO_HOSTS = [
  'stake.com', 'stake.games', 'roobet.com', 'duelbits.com',
  'gamdom.com', 'rollbit.com', 'bc.game', 'csgoempire.com',
  'metaspins.com', 'shuffle.com', 'jackpotcity.com', 'casumo.com',
  '888casino.com', 'betsson.com', 'leovegas.com', 'cloudbet.com',
];

// Segments to ignore when parsing URL path
const IGNORE_SEGMENTS = new Set([
  'play', 'game', 'launch', 'casino', 'slots', 'en', 'pt', 'br',
  'games', 'slot', 'real', 'demo', 'fun', 'lobby', 'category',
  'providers', 'provider', 'home', 'live', 'table', 'originals',
]);

// Provider keywords in URL
const PROVIDER_MAP = {
  pragmatic: 'Pragmatic Play', ppgames: 'Pragmatic Play', gs2c: 'Pragmatic Play',
  hacksaw: 'Hacksaw Gaming', nolimit: 'NoLimit City',
  playngo: "Play'n GO", pushgaming: 'Push Gaming',
  relax: 'Relax Gaming', elk: 'ELK Studios', thunderkick: 'Thunderkick',
  netent: 'NetEnt', redtiger: 'Red Tiger', pgsoft: 'PG Soft',
  blueprint: 'Blueprint Gaming', bigtime: 'Big Time Gaming',
  quickspin: 'Quickspin', yggdrasil: 'Yggdrasil', avatarux: 'AvatarUX',
  evolution: 'Evolution', spribe: 'Spribe',
};

let lastDetectedSlug = '';

// ── Extract slot name from URL ──
function extractSlotFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();

    // Check if it's a casino site
    if (!CASINO_HOSTS.some(h => host.includes(h))) return null;

    const cleanUrl = url.toLowerCase();

    // Detect provider
    let provider = '';
    for (const [key, value] of Object.entries(PROVIDER_MAP)) {
      if (cleanUrl.includes(key)) { provider = value; break; }
    }

    // Try query params first
    const params = new URLSearchParams(urlObj.search);
    const paramKeys = ['game', 'gameId', 'gameName', 'gameSymbol', 'game_id', 'title', 'name', 'gameCode', 'slug'];
    let slug = '';
    for (const key of paramKeys) {
      const val = params.get(key);
      if (val) { slug = val; break; }
    }

    // Fallback: last meaningful path segment
    if (!slug) {
      const segments = urlObj.pathname.split('/').filter(
        s => s.length > 2 && !IGNORE_SEGMENTS.has(s.toLowerCase())
      );
      if (segments.length) slug = segments[segments.length - 1];
    }

    if (!slug) return null;

    // Clean slug
    slug = slug.toLowerCase().split('.')[0];
    slug = slug.replace(/^(game-|slot-|play-|casino-|provider-)/i, '');

    // Skip if it's just a category/lobby page
    if (IGNORE_SEGMENTS.has(slug)) return null;

    // Convert to readable name
    let raw = slug;
    if (raw.startsWith('vs') && /\d/.test(raw)) raw = raw.replace(/^vs\d+/, '');
    raw = raw.replace(/[-_]/g, ' ');
    raw = raw.replace(/([a-z])([A-Z])/g, '$1 $2');
    raw = raw.replace(/([a-zA-Z])(\d)/g, '$1 $2');
    raw = raw.replace(/(\d)([a-zA-Z])/g, '$1 $2');
    const name = raw.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase()).trim();

    if (!name || name.length < 2) return null;

    return { name, provider, slug, url };
  } catch {
    return null;
  }
}

// ── Send to Supabase ──
async function sendToSupabase(slotData) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = CONFIG;
  const settings = await chrome.storage.local.get(['userId']);
  const { userId } = settings;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_PROJECT')) {
    console.log('[SlotTracker] config.js not configured — update SUPABASE_URL and SUPABASE_ANON_KEY.');
    return;
  }

  if (!userId) {
    console.log('[SlotTracker] No User ID set — open extension popup to enter it.');
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/detected_slots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: userId,
        slot_name: slotData.name,
        provider: slotData.provider || '',
        url: slotData.url || '',
        detected_at: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      console.log(`[SlotTracker] ✅ Detected: ${slotData.name}`);
      chrome.storage.local.set({ lastSlotName: slotData.name, lastProvider: slotData.provider || '' });
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#4ade80' });
    } else {
      const err = await response.text();
      console.error('[SlotTracker] ❌ Supabase error:', err);
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#f87171' });
    }
  } catch (err) {
    console.error('[SlotTracker] ❌ Network error:', err);
  }
}

// ── Tab listeners ──
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title) {
    const url = changeInfo.url || tab.url;
    if (!url) return;
    const result = extractSlotFromUrl(url);
    if (result && result.slug !== lastDetectedSlug) {
      lastDetectedSlug = result.slug;
      sendToSupabase(result);
    }
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab.url) return;
    const result = extractSlotFromUrl(tab.url);
    if (result && result.slug !== lastDetectedSlug) {
      lastDetectedSlug = result.slug;
      sendToSupabase(result);
    }
  } catch { /* tab might be gone */ }
});

console.log('[SlotTracker] Background service worker started.');
