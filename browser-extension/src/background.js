import { makeClientEventId } from './shared/sanitize.js';

const DEFAULT_API_BASE = 'https://streamerscenter.com';
const NATIVE_HOST = 'com.streamerscenter.slot_capture';
const recentByTab = new Map();
const candidatesByTab = new Map();
let nativePort = null;
let agentState = { connected: false, version: null, error: 'Agente local desligado' };

async function getSettings() {
  return chrome.storage.local.get(['apiBase', 'detectorToken', 'device', 'captureProfiles']);
}

async function setAgentState(patch) {
  agentState = { ...agentState, ...patch, updatedAt: new Date().toISOString() };
  await chrome.storage.local.set({ slotCaptureAgent: agentState });
}

function connectNativeAgent() {
  if (nativePort) return nativePort;
  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST);
    nativePort.onMessage.addListener((message) => {
      if (message?.type === 'agent:hello' || message?.type === 'agent:status') {
        setAgentState({ connected: true, version: message.version || agentState.version, error: null, ...message.status });
      }
      chrome.runtime.sendMessage({ type: 'slot-capture:agent-event', payload: message }).catch(() => {});
    });
    nativePort.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError?.message || 'Agente local desligado';
      nativePort = null;
      setAgentState({ connected: false, error });
    });
    nativePort.postMessage({ type: 'extension:hello', version: chrome.runtime.getManifest().version });
  } catch (error) {
    nativePort = null;
    setAgentState({ connected: false, error: error.message });
  }
  return nativePort;
}

function postToAgent(message) {
  const port = connectNativeAgent();
  if (!port) return { ok: false, error: agentState.error };
  try {
    port.postMessage(message);
    return { ok: true };
  } catch (error) {
    setAgentState({ connected: false, error: error.message });
    return { ok: false, error: error.message };
  }
}

async function submitDetection(tabId, payload) {
  const { apiBase = DEFAULT_API_BASE, detectorToken } = await getSettings();
  if (!detectorToken) return { ok: false, reason: 'not_paired' };
  const signature = JSON.stringify({ url: payload.topUrl, title: payload.title, frames: payload.frameUrls });
  const recent = recentByTab.get(tabId);
  const now = Date.now();
  if (recent?.signature === signature && now - recent.at < 5000) return { ok: true, skipped: true };
  recentByTab.set(tabId, { signature, at: now });
  const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/slot-detector?action=submit-event`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${detectorToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, clientEventId: makeClientEventId(), detectedAt: new Date().toISOString(), target: 'current_slot' }),
  });
  const data = await response.json().catch(() => ({}));
  await chrome.storage.local.set({ lastSubmit: { ok: response.ok, status: response.status, at: new Date().toISOString(), match: data.match || null, error: data.error || null } });
  if (!response.ok) throw new Error(data.error || `Submit failed (${response.status})`);
  return data;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('Não existe um separador ativo.');
  return tab;
}

async function ensureCaptureScripts(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: 'slot-capture:collect' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ['src/captureCandidates.js', 'src/content.js'] });
    return chrome.tabs.sendMessage(tabId, { type: 'slot-capture:collect' });
  }
}

async function refreshCandidates() {
  const tab = await activeTab();
  const response = await ensureCaptureScripts(tab.id);
  return { tab: { id: tab.id, windowId: tab.windowId, title: tab.title, url: tab.url }, candidates: response?.candidates || candidatesByTab.get(tab.id)?.candidates || [] };
}

async function startSelector() {
  const tab = await activeTab();
  await ensureCaptureScripts(tab.id);
  await chrome.tabs.sendMessage(tab.id, { type: 'slot-capture:start-selector' });
  return { ok: true, tabId: tab.id };
}

async function dashboardCommand(command, payload) {
  if (command === 'status') {
    connectNativeAgent();
    const stored = await chrome.storage.local.get(['slotCaptureAgent', 'lastCaptureSelection']);
    return { ok: true, agent: stored.slotCaptureAgent || agentState, selection: stored.lastCaptureSelection || null };
  }
  if (command === 'start-selector') return startSelector();
  if (command === 'refresh-candidates') return { ok: true, ...(await refreshCandidates()) };
  if (command === 'agent-command') return postToAgent({ type: 'dashboard:command', command: payload?.command, payload: payload?.payload });
  throw new Error('Comando de captura não suportado.');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id || 0;
  const frameId = sender.frameId || 0;
  if (message?.type === 'slot-detector:detection') {
    submitDetection(tabId, message.payload).then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === 'slot-capture:candidates') {
    const current = candidatesByTab.get(tabId) || { frames: {} };
    current.frames[frameId] = message.payload;
    current.candidates = Object.values(current.frames).flatMap((frame) => frame.candidates || []);
    candidatesByTab.set(tabId, current);
    sendResponse({ ok: true });
    return false;
  }
  if (message?.type === 'slot-capture:selected') {
    const selection = {
      captureId: crypto.randomUUID(), tabId, frameId, windowId: sender.tab?.windowId,
      pageDomain: (() => { try { return new URL(sender.tab?.url || '').hostname; } catch { return ''; } })(),
      pageTitle: String(sender.tab?.title || '').slice(0, 160),
      ...message.payload,
      selectedAt: new Date().toISOString(),
    };
    chrome.storage.local.set({ lastCaptureSelection: selection });
    const result = postToAgent({ type: 'capture:register', selection });
    sendResponse(result);
    return false;
  }
  if (message?.type === 'slot-capture:geometry' || message?.type === 'slot-capture:visibility' || message?.type === 'slot-capture:disconnected') {
    sendResponse(postToAgent({ type: message.type.replace('slot-capture:', 'capture:'), tabId, frameId, payload: message.payload }));
    return false;
  }
  if (message?.type === 'slot-capture:dashboard-command') {
    let trustedDashboard = false;
    try {
      const hostname = new URL(sender.tab?.url || sender.url || '').hostname;
      trustedDashboard = hostname === 'streamerscenter.com' || hostname.endsWith('.streamerscenter.com') || hostname === 'localhost';
    } catch { trustedDashboard = false; }
    if (!trustedDashboard) { sendResponse({ ok: false, error: 'Origem do dashboard inválida.' }); return false; }
    dashboardCommand(message.command, message.payload).then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === 'slot-capture:popup-state') {
    Promise.all([getSettings(), chrome.storage.local.get(['slotCaptureAgent', 'lastCaptureSelection'])])
      .then(([settings, capture]) => sendResponse({ ok: true, paired: Boolean(settings.device), device: settings.device || null, agent: capture.slotCaptureAgent || agentState, selection: capture.lastCaptureSelection || null, candidateCount: candidatesByTab.get(tabId)?.candidates?.length || 0 }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === 'slot-capture:popup-select') {
    startSelector().then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  candidatesByTab.delete(tabId);
  postToAgent({ type: 'capture:tab-closed', tabId });
});
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  if (!settings.apiBase) await chrome.storage.local.set({ apiBase: DEFAULT_API_BASE });
});
chrome.runtime.onStartup.addListener(connectNativeAgent);
