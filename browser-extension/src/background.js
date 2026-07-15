import { makeClientEventId } from './shared/sanitize.js';

const DEFAULT_API_BASE = 'https://streamerscenter.com';
const recentByTab = new Map();

async function getSettings() {
  return chrome.storage.local.get(['apiBase', 'detectorToken', 'device']);
}

async function submitDetection(tabId, payload) {
  const { apiBase = DEFAULT_API_BASE, detectorToken } = await getSettings();
  if (!detectorToken) return { ok: false, reason: 'not_paired' };
  const signature = JSON.stringify({ url: payload.topUrl, title: payload.title, gameId: payload.gameId, frames: payload.frameUrls });
  const recent = recentByTab.get(tabId);
  const now = Date.now();
  if (recent?.signature === signature && now - recent.at < 5000) return { ok: true, skipped: true };
  recentByTab.set(tabId, { signature, at: now });

  const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/slot-detector?action=submit-event`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${detectorToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      clientEventId: makeClientEventId(),
      detectedAt: new Date().toISOString(),
      target: 'current_slot',
    }),
  });
  const data = await response.json().catch(() => ({}));
  await chrome.storage.local.set({
    lastSubmit: {
      ok: response.ok,
      status: response.status,
      at: new Date().toISOString(),
      match: data.match || null,
      error: data.error || null,
    },
  });
  if (!response.ok) throw new Error(data.error || `Submit failed (${response.status})`);
  return data;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'slot-detector:detection') return false;
  submitDetection(sender.tab?.id || 0, message.payload)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  if (!settings.apiBase) await chrome.storage.local.set({ apiBase: DEFAULT_API_BASE });
});
