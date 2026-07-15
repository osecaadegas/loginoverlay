import { safeText, sanitizeUrl } from '../shared/sanitize.js';

const PROVIDER_HOSTS = [
  ['pragmaticplay', 'Pragmatic Play'],
  ['hacksaw', 'Hacksaw Gaming'],
  ['nolimit', 'Nolimit City'],
  ['relax-gaming', 'Relax Gaming'],
  ['playngo', "Play'n GO"],
];

function inferProviderFromUrl(url) {
  const clean = sanitizeUrl(url);
  if (!clean?.domain) return '';
  const match = PROVIDER_HOSTS.find(([needle]) => clean.domain.includes(needle));
  return match?.[1] || '';
}

function metaContent(selector) {
  return document.querySelector(selector)?.getAttribute('content') || '';
}

function collectTextHints() {
  const hints = [
    document.title,
    metaContent('meta[property="og:title"]'),
    metaContent('meta[name="twitter:title"]'),
    metaContent('meta[name="description"]'),
    document.querySelector('[data-game-name]')?.getAttribute('data-game-name'),
    document.querySelector('[data-slot-name]')?.getAttribute('data-slot-name'),
    document.querySelector('[aria-label*="slot" i]')?.getAttribute('aria-label'),
    document.querySelector('h1')?.textContent,
  ];
  return [...new Set(hints.map((hint) => safeText(hint)).filter(Boolean))].slice(0, 8);
}

function collectFrameUrls() {
  return [...document.querySelectorAll('iframe[src]')]
    .map((frame) => frame.getAttribute('src'))
    .filter(Boolean)
    .slice(0, 8);
}

export function detectPage() {
  const frameUrls = collectFrameUrls();
  const providerHint = inferProviderFromUrl(location.href) || frameUrls.map(inferProviderFromUrl).find(Boolean) || '';
  const textHints = collectTextHints();
  const urlInfo = sanitizeUrl(location.href);
  return {
    topUrl: location.href,
    title: safeText(document.title),
    gameId: urlInfo?.safeGameId || null,
    providerHint,
    textHints,
    frameUrls,
    iframeSupported: false,
    crossOriginUnsupported: frameUrls.length > 0,
    extensionVersion: chrome.runtime.getManifest().version,
  };
}
