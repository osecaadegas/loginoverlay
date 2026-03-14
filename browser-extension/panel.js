/**
 * panel.js — Floating results panel
 * Injects a draggable floating icon on casino pages.
 * Click to expand a mini form: shows detected slot, bet & payout inputs.
 * Submits results to Supabase via the background script.
 */

(() => {
  'use strict';

  // Don't run in iframes or if chrome.runtime is unavailable
  if (window !== window.top) return;
  if (!chrome?.runtime?.id) return;

  // Helper: check if extension context is still valid
  function alive() {
    try { return !!chrome.runtime?.id; } catch { return false; }
  }

  // ── State ──
  let isOpen = false;
  let slotName = '';
  let provider = '';

  // ── Create shadow host (isolates our CSS from the casino page) ──
  const host = document.createElement('div');
  host.id = 'slot-tracker-panel-host';
  host.style.cssText = 'position:fixed;z-index:2147483647;bottom:0;right:0;width:auto;height:auto;overflow:visible;pointer-events:none;';
  (document.body || document.documentElement).appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  // ── Styles ──
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .st-fab {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      border: 2px solid rgba(255,255,255,0.15);
      color: #fff;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      pointer-events: auto;
      box-shadow: 0 4px 20px rgba(124,58,237,0.5), 0 2px 8px rgba(0,0,0,0.3);
      transition: transform 0.2s, box-shadow 0.2s;
      user-select: none;
    }
    .st-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(124,58,237,0.6), 0 3px 12px rgba(0,0,0,0.4);
    }
    .st-fab.has-slot {
      background: linear-gradient(135deg, #059669, #047857);
      box-shadow: 0 4px 20px rgba(5,150,105,0.5), 0 2px 8px rgba(0,0,0,0.3);
    }

    .st-panel {
      position: fixed;
      bottom: 78px;
      right: 20px;
      width: 280px;
      background: #0f1118;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      padding: 16px;
      pointer-events: auto;
      box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.2);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #e2e8f0;
      display: none;
      animation: st-slide-up 0.2s ease-out;
    }
    .st-panel.open { display: block; }

    @keyframes st-slide-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .st-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .st-title {
      font-size: 13px;
      font-weight: 700;
      color: #a78bfa;
      letter-spacing: 0.5px;
    }
    .st-close {
      background: none;
      border: none;
      color: #64748b;
      font-size: 18px;
      cursor: pointer;
      padding: 0 4px;
      pointer-events: auto;
    }
    .st-close:hover { color: #f87171; }

    .st-slot-info {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 12px;
    }
    .st-slot-name {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .st-slot-provider {
      font-size: 11px;
      color: #7c3aed;
      margin-top: 2px;
    }
    .st-no-slot {
      font-size: 12px;
      color: #64748b;
      font-style: italic;
    }

    .st-label {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .st-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }

    .st-field {
      display: flex;
      flex-direction: column;
    }

    .st-input {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 8px 10px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
      width: 100%;
    }
    .st-input:focus {
      border-color: #7c3aed;
    }
    .st-input::placeholder { color: #475569; }

    .st-multi {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 10px;
      text-align: center;
    }
    .st-multi strong {
      color: #a78bfa;
    }

    .st-btn {
      width: 100%;
      padding: 10px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.1s;
      pointer-events: auto;
    }
    .st-btn:active { transform: scale(0.97); }

    .st-btn-submit {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: #fff;
    }
    .st-btn-submit:hover { opacity: 0.9; }
    .st-btn-submit:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .st-msg {
      font-size: 12px;
      text-align: center;
      margin-top: 8px;
      font-weight: 600;
    }
    .st-msg.success { color: #4ade80; }
    .st-msg.error { color: #f87171; }
  `;
  shadow.appendChild(style);

  // ── HTML ──
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="st-fab" id="stFab">🎰</div>
    <div class="st-panel" id="stPanel">
      <div class="st-header">
        <span class="st-title">SLOT TRACKER</span>
        <button class="st-close" id="stClose">✕</button>
      </div>
      <div class="st-slot-info" id="stSlotInfo">
        <div class="st-no-slot">No slot detected</div>
      </div>
      <div class="st-row">
        <div class="st-field">
          <div class="st-label">Bet (€)</div>
          <input class="st-input" id="stBet" type="number" step="0.01" min="0" placeholder="0.00" />
        </div>
        <div class="st-field">
          <div class="st-label">Payout (€)</div>
          <input class="st-input" id="stPayout" type="number" step="0.01" min="0" placeholder="0.00" />
        </div>
      </div>
      <div class="st-multi" id="stMulti"></div>
      <button class="st-btn st-btn-submit" id="stSubmit" disabled>Send Result</button>
      <div class="st-msg" id="stMsg"></div>
    </div>
  `;
  shadow.appendChild(container);

  // ── Elements ──
  const fab = shadow.getElementById('stFab');
  const panel = shadow.getElementById('stPanel');
  const closeBtn = shadow.getElementById('stClose');
  const slotInfo = shadow.getElementById('stSlotInfo');
  const betInput = shadow.getElementById('stBet');
  const payoutInput = shadow.getElementById('stPayout');
  const multiDisplay = shadow.getElementById('stMulti');
  const submitBtn = shadow.getElementById('stSubmit');
  const msgEl = shadow.getElementById('stMsg');

  // ── Toggle panel ──
  fab.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen) loadSlotInfo();
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    panel.classList.remove('open');
  });

  // ── Update multiplier display ──
  function updateMulti() {
    const bet = parseFloat(betInput.value);
    const pay = parseFloat(payoutInput.value);
    submitBtn.disabled = !(bet > 0);

    if (bet > 0 && pay >= 0) {
      const multi = Math.round((pay / bet) * 100) / 100;
      multiDisplay.innerHTML = `Multiplier: <strong>${multi}x</strong>`;
    } else {
      multiDisplay.innerHTML = '';
    }
  }

  betInput.addEventListener('input', updateMulti);
  payoutInput.addEventListener('input', updateMulti);

  // Enter key submits
  betInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') payoutInput.focus(); });
  payoutInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });

  // ── Load slot info from background ──
  function loadSlotInfo() {
    if (!alive()) return;
    chrome.storage.local.get(['lastSlotName', 'lastProvider'], (data) => {
      if (!alive()) return;
      slotName = data.lastSlotName || '';
      provider = data.lastProvider || '';

      if (slotName) {
        fab.classList.add('has-slot');
        slotInfo.innerHTML = `
          <div class="st-slot-name">${escapeHtml(slotName)}</div>
          ${provider ? `<div class="st-slot-provider">${escapeHtml(provider)}</div>` : ''}
        `;
      } else {
        fab.classList.remove('has-slot');
        slotInfo.innerHTML = '<div class="st-no-slot">No slot detected — browse a game</div>';
      }
    });
  }

  // ── Submit result ──
  async function handleSubmit() {
    const bet = parseFloat(betInput.value);
    const pay = parseFloat(payoutInput.value) || 0;
    if (!(bet > 0)) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    msgEl.className = 'st-msg';
    msgEl.textContent = '';

    try {
      if (!alive()) { msgEl.className = 'st-msg error'; msgEl.textContent = 'Extension reloaded — refresh page'; return; }
      const response = await chrome.runtime.sendMessage({
        type: 'SUBMIT_RESULT',
        slotName,
        provider,
        betSize: bet,
        payout: pay,
      });

      if (response?.ok) {
        msgEl.className = 'st-msg success';
        msgEl.textContent = '✓ Result sent!';
        // Clear payout for next spin, keep bet
        payoutInput.value = '';
        multiDisplay.innerHTML = '';
        setTimeout(() => { msgEl.textContent = ''; }, 3000);
      } else {
        msgEl.className = 'st-msg error';
        msgEl.textContent = response?.error || 'Failed to send';
      }
    } catch (err) {
      msgEl.className = 'st-msg error';
      msgEl.textContent = 'Extension error';
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Result';
  }

  submitBtn.addEventListener('click', handleSubmit);

  // ── Helpers ──
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Initial load ──
  loadSlotInfo();

  // Refresh slot info when storage changes (new slot detected)
  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (!alive()) return;
      if (changes.lastSlotName || changes.lastProvider) {
        loadSlotInfo();
      }
    });
  } catch { /* extension context may already be invalidated */ }

  console.log('[SlotTracker] Floating panel loaded.');
})();
