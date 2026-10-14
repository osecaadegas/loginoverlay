if (!globalThis.__streamersCenterSlotCaptureLoaded) {
globalThis.__streamersCenterSlotCaptureLoaded = true;
const captureApi = globalThis.StreamersCenterCaptureCandidates;
const isDashboardOrigin = /(^|\.)streamerscenter\.com$/i.test(location.hostname) || location.hostname === 'localhost';
let lastDetectionSignature = '';
let detectionTimer = null;
let selectorState = null;
let trackedSelection = null;
let trackedObserver = null;

function safeText(value, max = 160) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().replace(/\s+/g, ' ').slice(0, max);
}

function sanitizedPageDetection() {
  const frameDomains = [...document.querySelectorAll('iframe[src]')].slice(0, 8).map((frame) => {
    try { return new URL(frame.src, location.href).hostname; } catch { return ''; }
  }).filter(Boolean);
  return {
    topUrl: location.href,
    title: safeText(document.title),
    textHints: [document.title, document.querySelector('[data-game-name]')?.dataset.gameName, document.querySelector('h1')?.textContent]
      .map((value) => safeText(value)).filter(Boolean),
    frameUrls: frameDomains.map((domain) => `https://${domain}/`),
    iframeSupported: true,
    crossOriginUnsupported: false,
    extensionVersion: chrome.runtime.getManifest().version,
  };
}

function sendDetection() {
  if (isDashboardOrigin) return;
  const payload = sanitizedPageDetection();
  const signature = JSON.stringify(payload);
  if (signature === lastDetectionSignature) return;
  lastDetectionSignature = signature;
  chrome.runtime.sendMessage({ type: 'slot-detector:detection', payload }).catch(() => {});
}

function scheduleDetection(delay = 600) {
  clearTimeout(detectionTimer);
  detectionTimer = setTimeout(sendDetection, delay);
}

function reportCandidates() {
  const candidates = captureApi?.collectCandidates() || [];
  chrome.runtime.sendMessage({
    type: 'slot-capture:candidates',
    payload: { candidates, pageTitle: safeText(document.title), pageDomain: location.hostname },
  }).catch(() => {});
  return candidates;
}

function removeSelector() {
  if (!selectorState) return;
  selectorState.overlay.remove();
  selectorState.label.remove();
  selectorState.hitboxes.forEach((hitbox) => hitbox.remove());
  selectorState.abort.abort();
  selectorState = null;
}

function selectElement(element, candidate) {
  removeSelector();
  if (!element || !candidate) return;
  trackedSelection = { element, candidateId: candidate.candidateId, lastBounds: candidate.bounds };
  trackedObserver?.disconnect();
  trackedObserver = new ResizeObserver(() => reportTrackedGeometry());
  trackedObserver.observe(element);
  chrome.runtime.sendMessage({ type: 'slot-capture:selected', payload: candidate }).catch(() => {});
}

function reportTrackedGeometry() {
  if (!trackedSelection?.element?.isConnected) {
    chrome.runtime.sendMessage({ type: 'slot-capture:disconnected', payload: { candidateId: trackedSelection?.candidateId } }).catch(() => {});
    trackedObserver?.disconnect();
    trackedSelection = null;
    return;
  }
  const candidate = captureApi.serializeCandidate(trackedSelection.element, 0);
  if (!candidate) return;
  const signature = JSON.stringify(candidate.bounds);
  if (signature === JSON.stringify(trackedSelection.lastBounds)) return;
  trackedSelection.lastBounds = candidate.bounds;
  chrome.runtime.sendMessage({ type: 'slot-capture:geometry', payload: candidate }).catch(() => {});
}

function startSelector() {
  removeSelector();
  const candidates = reportCandidates();
  const byElement = new Map();
  for (const candidate of candidates) {
    const element = captureApi.findCandidate(candidate.candidateId);
    if (element) byElement.set(element, candidate);
  }
  const abort = new AbortController();
  const overlay = document.createElement('div');
  const label = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', zIndex: '2147483646', pointerEvents: 'none', border: '3px solid #22d3ee',
    background: 'rgba(34,211,238,.12)', boxShadow: '0 0 0 99999px rgba(2,6,23,.28),0 0 24px rgba(34,211,238,.72)', display: 'none',
  });
  Object.assign(label.style, {
    position: 'fixed', zIndex: '2147483647', pointerEvents: 'none', padding: '6px 9px', color: '#ecfeff',
    background: '#071827', border: '1px solid #22d3ee', borderRadius: '5px', font: '700 12px system-ui', display: 'none',
  });
  const hitboxes = [];
  document.documentElement.append(overlay, label);
  selectorState = { overlay, label, hitboxes, abort, hovered: null };

  for (const [element, candidate] of byElement) {
    const rect = element.getBoundingClientRect();
    const hitbox = document.createElement('div');
    Object.assign(hitbox.style, {
      position: 'fixed', zIndex: String(2147483000 + candidate.confidence), cursor: 'crosshair',
      left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, background: 'transparent',
    });
    hitbox.addEventListener('pointerenter', () => {
      Object.assign(overlay.style, { display: 'block', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      Object.assign(label.style, { display: 'block', left: `${Math.max(8, rect.left)}px`, top: `${Math.max(8, rect.top - 34)}px` });
      label.textContent = `${candidate.type.toUpperCase()} · ${candidate.bounds.width}×${candidate.bounds.height} · ${candidate.confidence}%`;
      selectorState.hovered = { element, candidate };
    }, { signal: abort.signal });
    hitbox.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectElement(element, candidate);
    }, { capture: true, signal: abort.signal });
    hitboxes.push(hitbox);
    document.documentElement.append(hitbox);
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') removeSelector();
  }, { capture: true, signal: abort.signal });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'slot-capture:collect') {
    sendResponse({ ok: true, candidates: reportCandidates() });
    return false;
  }
  if (message?.type === 'slot-capture:start-selector') {
    startSelector();
    sendResponse({ ok: true });
    return false;
  }
  if (message?.type === 'slot-capture:cancel-selector') {
    removeSelector();
    sendResponse({ ok: true });
    return false;
  }
  return false;
});

if (isDashboardOrigin) {
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'streamerscenter-dashboard') return;
    const { requestId, command, payload } = event.data;
    chrome.runtime.sendMessage({ type: 'slot-capture:dashboard-command', command, payload })
      .then((response) => window.postMessage({ source: 'streamerscenter-extension', requestId, response }, location.origin))
      .catch((error) => window.postMessage({ source: 'streamerscenter-extension', requestId, response: { ok: false, error: error.message } }, location.origin));
  });
} else {
  scheduleDetection(300);
  reportCandidates();
  window.addEventListener('focus', () => scheduleDetection(800));
  window.addEventListener('scroll', reportTrackedGeometry, { passive: true });
  window.addEventListener('resize', reportTrackedGeometry, { passive: true });
  document.addEventListener('visibilitychange', () => {
    chrome.runtime.sendMessage({ type: 'slot-capture:visibility', payload: { hidden: document.hidden } }).catch(() => {});
    if (!document.hidden) scheduleDetection(500);
  });
  const observer = new MutationObserver(() => {
    scheduleDetection(900);
    reportTrackedGeometry();
  });
  observer.observe(document.documentElement, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['src', 'style', 'class', 'title', 'data-game-name'],
  });
}
}
