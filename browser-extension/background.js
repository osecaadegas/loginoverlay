/**
 * background.js — Slot Auto-Tracker
 * Watches casino browser tabs for URL/title changes and reports
 * the detected slot name to Supabase for the overlay to pick up.
 */

// Load Supabase config (URL + anon key)
importScripts('config.js');

// Path segments that indicate a slot/game page
const GAME_PATH_SIGNALS = new Set([
  'play', 'game', 'launch', 'slot', 'slots', 'casino',
]);

// Segments to skip when looking for the slot name
const IGNORE_SEGMENTS = new Set([
  'play', 'game', 'launch', 'casino', 'slots', 'en', 'pt', 'br', 'se',
  'games', 'slot', 'real', 'demo', 'fun', 'lobby', 'category', 'en-se',
  'providers', 'provider', 'home', 'live', 'table', 'originals',
  'en-us', 'en-gb', 'pt-br', 'de', 'fr', 'es', 'it', 'nl', 'fi', 'no', 'sv',
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
// Works on ANY casino — detects game pages by URL path patterns
function extractSlotFromUrl(url) {
  try {
    const urlObj = new URL(url);
    if (!urlObj.protocol.startsWith('http')) return null;

    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    const lowerSegments = pathSegments.map(s => s.toLowerCase());

    // Check if URL path contains a game-related signal segment
    const hasGameSignal = lowerSegments.some(s => GAME_PATH_SIGNALS.has(s));

    // Also check query params for game identifiers
    const params = new URLSearchParams(urlObj.search);
    const paramKeys = ['game', 'gameId', 'gameName', 'gameSymbol', 'game_id', 'title', 'name', 'gameCode', 'slug'];
    let slug = '';
    for (const key of paramKeys) {
      const val = params.get(key);
      if (val) { slug = val; break; }
    }

    // If no game signal in path and no game query param, skip
    if (!hasGameSignal && !slug) return null;

    const cleanUrl = url.toLowerCase();

    // Detect provider from URL
    let provider = '';
    for (const [key, value] of Object.entries(PROVIDER_MAP)) {
      if (cleanUrl.includes(key)) { provider = value; break; }
    }

    // If no slug from params, find the last meaningful path segment
    if (!slug) {
      const meaningful = pathSegments.filter(
        s => s.length > 2 && !IGNORE_SEGMENTS.has(s.toLowerCase())
      );
      if (meaningful.length) slug = meaningful[meaningful.length - 1];
    }

    if (!slug) return null;

    // Clean slug — remove numeric prefixes like "235325-"
    slug = slug.toLowerCase().split('.')[0];
    slug = slug.replace(/^(game-|slot-|play-|casino-|provider-)/i, '');
    slug = slug.replace(/^\d+-/, ''); // strip leading ID numbers like "235325-"

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
