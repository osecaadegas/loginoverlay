import { detectPage } from './adapters/index.js';

let lastSignature = '';
let timer = null;

function signature(payload) {
  return JSON.stringify({
    title: payload.title,
    topUrl: payload.topUrl,
    gameId: payload.gameId,
    frameUrls: payload.frameUrls,
    textHints: payload.textHints,
  });
}

function sendDetection() {
  const payload = detectPage();
  const nextSignature = signature(payload);
  if (nextSignature === lastSignature) return;
  lastSignature = nextSignature;
  chrome.runtime.sendMessage({ type: 'slot-detector:detection', payload }).catch(() => {});
}

function scheduleDetection(delay = 600) {
  window.clearTimeout(timer);
  timer = window.setTimeout(sendDetection, delay);
}

scheduleDetection(300);
window.addEventListener('focus', () => scheduleDetection(1000));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) scheduleDetection(700);
});

const observer = new MutationObserver(() => scheduleDetection(1200));
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'title', 'data-game-name', 'data-slot-name'] });

const originalPushState = history.pushState;
history.pushState = function pushState(...args) {
  originalPushState.apply(this, args);
  scheduleDetection(500);
};
window.addEventListener('popstate', () => scheduleDetection(500));
