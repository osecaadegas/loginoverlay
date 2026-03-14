/**
 * content.js — Slot Value Scraper
 * Injected into casino pages to detect bet size and win/payout values
 * by scanning visible text & DOM elements.
 *
 * Note: Most slot providers (Pragmatic, Hacksaw, etc.) render on <canvas>,
 * so bet/win values are only detectable on HTML-based game UIs.
 */

(() => {
  'use strict';

  // Don't run if chrome.runtime isn't available (cross-origin iframes)
  if (!chrome?.runtime?.sendMessage) return;

  // Don't run in the top frame of the casino page — only in game iframes
  // (the top page has promo prices that cause false matches)
  // Exception: if the top page itself IS the game (some casinos)
  const isTopFrame = (window === window.top);

  // Currency amount regex — MUST have a currency symbol to avoid false positives
  // Matches: €2.00, $1,234.56, 0.20 kr, £50, ¥1000
  const CURRENCY_AMOUNT_RE = /(?:[$\u20AC\u00A3\u00A5]\s*([\d]+(?:[.,]\d{1,3})*))|(?:([\d]+(?:[.,]\d{1,3})*)\s*(?:kr|\u20AC|\$|\u00A3))/i;

  // ── Patterns that indicate a BET value ──
  const BET_PATTERNS = [
    /\bbet\b/i, /\bstake\b/i, /\btotal\s*bet\b/i, /\binsats\b/i,
    /\baposta\b/i, /\beinsatz\b/i, /\bmise\b/i, /\bpuesta\b/i,
  ];

  // ── Patterns that indicate a WIN / PAYOUT value ──
  const WIN_PATTERNS = [
    /\bwin\b/i, /\bpayout\b/i, /\bgewinn\b/i, /\bganho\b/i,
    /\bvinst\b/i, /\bgain\b/i, /\bvinto\b/i, /\bganancia\b/i,
    /\blast\s*win\b/i, /\btotal\s*win\b/i,
  ];

  // ── Patterns to SKIP (these are not real bet/win values) ──
  const SKIP_PATTERNS = [
    /\bbalance\b/i, /\bsaldo\b/i, /\bguthaben\b/i,
    /\bbuy\b/i, /\bprice\b/i, /\bdeposit\b/i, /\bbonus\b/i,
    /\bfree\s*spin/i, /\bpromo/i, /\bjackpot\b/i, /\bmax\s*win\b/i,
    /\bwin\s*up\s*to\b/i,
  ];

  let lastBet = null;
  let lastWin = null;
  let lastSentBet = null;
  let lastSentWin = null;
  let scanTimer = null;

  /**
   * Parse a numeric string into a float, handling EU/US formats
   */
  function parseAmount(str) {
    if (!str) return null;
    const cleaned = str.replace(/[^0-9.,]/g, '').trim();
    if (!cleaned) return null;

    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    let normalized;
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }

    const val = parseFloat(normalized);
    return isNaN(val) ? null : val;
  }

  /**
   * Check if element is visible on screen
   */
  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * Extract a currency amount from text. Returns null if not found.
   */
  function extractCurrencyAmount(text) {
    const m = text.match(CURRENCY_AMOUNT_RE);
    if (!m) return null;
    return parseAmount(m[1] || m[2]);
  }

  /**
   * Scan a single element for bet/win values
   */
  function checkElement(el) {
    const text = (el.textContent || '').trim();
    if (!text || text.length > 100) return; // keep it tight — skip big text

    // Skip promo/bonus/deposit/balance text
    if (SKIP_PATTERNS.some(p => p.test(text))) return;

    const isBet = BET_PATTERNS.some(p => p.test(text));
    const isWin = WIN_PATTERNS.some(p => p.test(text));
    if (!isBet && !isWin) return;

    // Extract currency amount from the same element
    let amount = extractCurrencyAmount(text);

    // If not found, check next sibling
    if (amount === null && el.nextElementSibling) {
      amount = extractCurrencyAmount((el.nextElementSibling.textContent || '').trim());
    }

    if (amount !== null && amount >= 0) {
      if (isBet && amount > 0 && amount <= 5000) {
        lastBet = amount;
      }
      if (isWin && amount <= 5000000) {
        lastWin = amount;
      }
    }
  }

  /**
   * Scan the DOM for bet/win labels with currency values
   */
  function scanDOM() {
    if (!document.body) return;

    // Target specific elements likely to contain bet/win info
    const candidates = document.querySelectorAll(
      '[class*="bet" i], [class*="stake" i], [class*="win" i], [class*="payout" i], ' +
      '[data-testid*="bet" i], [data-testid*="win" i], ' +
      '[id*="bet" i], [id*="win" i], [id*="stake" i]'
    );

    for (const el of candidates) {
      if (!isVisible(el)) continue;
      if (el.children.length > 3) continue;
      checkElement(el);
    }

    // In iframes, also scan small leaf spans/divs (game UI)
    if (!isTopFrame) {
      const leaves = document.querySelectorAll('span, div');
      for (const el of leaves) {
        if (el.children.length > 1) continue;
        if (!isVisible(el)) continue;
        const text = (el.textContent || '').trim();
        if (text.length < 3 || text.length > 50) continue;
        checkElement(el);
      }
    }

    sendValues();
  }

  /**
   * Send detected values to background (only if changed)
   */
  function sendValues() {
    if (lastBet === lastSentBet && lastWin === lastSentWin) return;
    if (lastBet === null && lastWin === null) return;

    try {
      chrome.runtime.sendMessage({
        type: 'SLOT_VALUES',
        betSize: lastBet,
        lastWin: lastWin,
      });
      lastSentBet = lastBet;
      lastSentWin = lastWin;
    } catch {
      // Extension context invalidated — stop scanning
      if (scanTimer) clearInterval(scanTimer);
    }
  }

  // ── Scan periodically ──
  function startScanning() {
    if (!document.body) return;

    scanDOM();
    scanTimer = setInterval(scanDOM, 3000);

    const observer = new MutationObserver(() => {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => {
        scanDOM();
        scanTimer = setInterval(scanDOM, 3000);
      }, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(startScanning, 1500));
  } else {
    setTimeout(startScanning, 1500);
  }

  console.log('[SlotTracker] Content script loaded' + (isTopFrame ? ' (top frame)' : ' (iframe)'));
})();
