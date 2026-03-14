/**
 * content.js — Slot Value Scraper
 * Injected into casino pages to detect bet size and win/payout values
 * by scanning visible text & DOM elements.
 */

(() => {
  'use strict';

  // Currency symbols we require near numbers to avoid false positives
  const CURRENCY_SYMBOLS = /[$\u20AC\u00A3\u00A5kr]/i;  // $ € £ ¥ kr
  // Matches a currency amount like €2.00, $1,234.56, 0.20 kr, etc.
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

  // ── Patterns that indicate BALANCE (we skip these) ──
  const BALANCE_PATTERNS = [
    /\bbalance\b/i, /\bsaldo\b/i, /\bguthaben\b/i,
  ];

  let lastBet = null;
  let lastWin = null;
  let scanTimer = null;

  /**
   * Parse a string like "€0.20", "0,40 kr", "1.234,56" into a float
   */
  function parseAmount(str) {
    if (!str) return null;
    // Extract the numeric part
    const cleaned = str.replace(/[^0-9.,]/g, '').trim();
    if (!cleaned) return null;

    // Determine if comma or dot is the decimal separator
    // "1.234,56" → EU style, "1,234.56" → US style
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    let normalized;
    if (lastComma > lastDot) {
      // EU: comma is decimal → remove dots, replace comma with dot
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US or no ambiguity: remove commas
      normalized = cleaned.replace(/,/g, '');
    }

    const val = parseFloat(normalized);
    return isNaN(val) ? null : val;
  }

  /**
   * Check if an element is visible
   */
  function isVisible(el) {
    if (!el || !el.offsetParent && el.style?.display !== 'contents') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  /**
   * Scan a single element's text and nearby text for bet/win values
   */
  function checkElement(el) {
    const text = (el.textContent || '').trim();
    if (!text || text.length > 200) return; // skip huge blocks

    // Skip balance-related elements
    if (BALANCE_PATTERNS.some(p => p.test(text))) return;

    // Check if it's a bet label
    const isBet = BET_PATTERNS.some(p => p.test(text));
    // Check if it's a win label
    const isWin = WIN_PATTERNS.some(p => p.test(text));

    if (!isBet && !isWin) return;

    // Extract currency amount — MUST have a currency symbol to avoid false matches
    let amount = null;

    // First try: find a currency-prefixed or currency-suffixed number in this element
    const currMatch = text.match(CURRENCY_AMOUNT_RE);
    if (currMatch) {
      amount = parseAmount(currMatch[1] || currMatch[2]);
    }

    // If no currency amount here, check the next sibling
    if (amount === null) {
      const sibling = el.nextElementSibling;
      if (sibling) {
        const sibText = (sibling.textContent || '').trim();
        const sibMatch = sibText.match(CURRENCY_AMOUNT_RE);
        if (sibMatch) amount = parseAmount(sibMatch[1] || sibMatch[2]);
      }
    }

    // Also check parent's next sibling
    if (amount === null && el.parentElement) {
      const parentSib = el.parentElement.nextElementSibling;
      if (parentSib) {
        const pText = (parentSib.textContent || '').trim();
        const pMatch = pText.match(CURRENCY_AMOUNT_RE);
        if (pMatch) amount = parseAmount(pMatch[1] || pMatch[2]);
      }
    }

    if (amount !== null && amount >= 0) {
      if (isBet && amount > 0 && amount < 100000) {
        lastBet = amount;
      }
      if (isWin && amount < 10000000) {
        lastWin = amount;
      }
    }
  }

  /**
   * Full DOM scan — walks all visible elements looking for bet/win indicators
   */
  function scanDOM() {
    // Also try aria-labels and data attributes
    const candidates = document.querySelectorAll(
      '[class*="bet" i], [class*="stake" i], [class*="win" i], [class*="payout" i], ' +
      '[data-testid*="bet" i], [data-testid*="win" i], [data-testid*="stake" i], ' +
      '[id*="bet" i], [id*="win" i], [id*="stake" i], [id*="payout" i], ' +
      'span, div, p, label, td'
    );

    for (const el of candidates) {
      if (!isVisible(el)) continue;
      // Only check leaf-ish elements (few children == more specific text)
      if (el.children.length > 5) continue;
      checkElement(el);
    }

    // Send to background if we found anything new
    sendValues();
  }

  /**
   * Send detected values to background script
   */
  function sendValues() {
    if (lastBet !== null || lastWin !== null) {
      chrome.runtime.sendMessage({
        type: 'SLOT_VALUES',
        betSize: lastBet,
        lastWin: lastWin,
      });
    }
  }

  // ── Scan periodically (casino UIs update dynamically) ──
  function startScanning() {
    // Initial scan after page loads
    scanDOM();

    // Re-scan every 3 seconds to pick up value changes
    scanTimer = setInterval(scanDOM, 3000);

    // Also observe DOM mutations for quicker detection
    const observer = new MutationObserver(() => {
      // Debounce: scan 500ms after last mutation
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => {
        scanDOM();
        // Resume interval
        scanTimer = setInterval(scanDOM, 3000);
      }, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  // Wait for page to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(startScanning, 1000));
  } else {
    setTimeout(startScanning, 1000);
  }

  console.log('[SlotTracker] Content script injected — scanning for bet/win values.');
})();
