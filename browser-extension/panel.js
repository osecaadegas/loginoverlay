/**
 * panel.js — Slim top-bar for entering slot results
 * Fixed centered bar at the top of the page, always visible, single row.
 * Includes destination selector: Bonus Hunt / Single Slot / Current Slot.
 */

(() => {
  'use strict';

  if (window !== window.top) return;
  if (!chrome?.runtime?.id) return;

  function alive() {
    try { return !!chrome.runtime?.id; } catch { return false; }
  }

  let slotName = '';
  let provider = '';
  let target = 'single_slot'; // default destination

  // ── Shadow host ──
  const host = document.createElement('div');
  host.id = 'slot-tracker-panel-host';
  host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;width:100%;height:0;overflow:visible;pointer-events:none;';
  (document.body || document.documentElement).appendChild(host);
  const shadow = host.attachShadow({ mode: 'closed' });

  // ── Styles ──
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .st-bar {
      position: fixed;
      top: 6px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(15, 17, 24, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(124, 58, 237, 0.3);
      border-radius: 10px;
      padding: 5px 10px;
      pointer-events: auto;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #e2e8f0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.15);
      white-space: nowrap;
      max-width: 98vw;
    }

    .st-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .st-slot {
      font-size: 11px;
      font-weight: 700;
      color: #a78bfa;
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 1;
    }
    .st-slot.empty {
      color: #64748b;
      font-weight: 400;
      font-style: italic;
    }

    .st-sep {
      width: 1px;
      height: 18px;
      background: rgba(255,255,255,0.1);
      flex-shrink: 0;
    }

    .st-input {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 5px;
      padding: 3px 6px;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      outline: none;
      width: 62px;
      text-align: center;
      transition: border-color 0.2s;
    }
    .st-input:focus { border-color: #7c3aed; }
    .st-input::placeholder { color: #475569; font-weight: 400; }

    .st-label {
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      font-weight: 600;
    }

    .st-field {
      display: flex;
      align-items: center;
      gap: 3px;
      flex-shrink: 0;
    }

    .st-multi {
      font-size: 11px;
      font-weight: 700;
      color: #a78bfa;
      min-width: 36px;
      text-align: center;
      flex-shrink: 0;
    }

    /* Destination toggle buttons */
    .st-targets {
      display: flex;
      gap: 2px;
      flex-shrink: 0;
    }
    .st-target {
      padding: 3px 7px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      background: transparent;
      color: #64748b;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .st-target:hover { color: #a78bfa; border-color: rgba(124,58,237,0.3); }
    .st-target.active {
      background: rgba(124, 58, 237, 0.25);
      color: #c4b5fd;
      border-color: #7c3aed;
    }

    /* BH-only bonus type buttons */
    .st-bonus-types {
      display: none;
      gap: 3px;
      flex-shrink: 0;
    }
    .st-bar.bh-mode .st-bonus-types { display: flex; }
    .st-bar.bh-mode .st-win-field { display: none; }
    .st-bar.bh-mode .st-multi { display: none; }

    .st-btype {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 800;
      font-family: inherit;
      cursor: pointer;
      border: 1px solid rgba(255,255,255,0.12);
      background: transparent;
      transition: all 0.15s;
    }
    .st-btype-s {
      color: #64748b;
    }
    .st-btype-s:hover { color: #facc15; border-color: rgba(250,204,21,0.4); }
    .st-btype-s.active {
      color: #facc15;
      background: rgba(250, 204, 21, 0.15);
      border-color: #facc15;
    }
    .st-btype-e {
      color: #64748b;
    }
    .st-btype-e:hover { color: #ef4444; border-color: rgba(239,68,68,0.4); }
    .st-btype-e.active {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
      border-color: #ef4444;
    }

    .st-btn {
      padding: 4px 10px;
      border: none;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.1s;
      flex-shrink: 0;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: #fff;
    }
    .st-btn:hover { opacity: 0.85; }
    .st-btn:active { transform: scale(0.95); }
    .st-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    .st-msg {
      font-size: 10px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .st-msg.success { color: #4ade80; }
    .st-msg.error { color: #f87171; }
    .st-msg.warn { color: #facc15; }

    .st-minimize {
      background: none;
      border: none;
      color: #64748b;
      font-size: 14px;
      cursor: pointer;
      padding: 0 2px;
      line-height: 1;
      flex-shrink: 0;
    }
    .st-minimize:hover { color: #f87171; }

    .st-bar.minimized .st-content { display: none; }
    .st-bar.minimized { padding: 4px 8px; gap: 4px; }

    .st-content {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `;
  shadow.appendChild(style);

  // ── HTML ──
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="st-bar" id="stBar">
      <span class="st-icon">🎰</span>
      <div class="st-content" id="stContent">
        <span class="st-slot empty" id="stSlot">No slot</span>
        <div class="st-sep"></div>
        <div class="st-targets">
          <button class="st-target" data-target="bonus_hunt" title="Bonus Hunt">BH</button>
          <button class="st-target active" data-target="single_slot" title="Single Slot">SS</button>
          <button class="st-target" data-target="current_slot" title="Current Slot">CS</button>
        </div>
        <div class="st-sep"></div>
        <div class="st-field">
          <span class="st-label">BET</span>
          <input class="st-input" id="stBet" type="number" step="0.01" min="0" placeholder="0.00" />
        </div>
        <div class="st-bonus-types">
          <button class="st-btype st-btype-s" id="stSuper" title="Super Bonus">S</button>
          <button class="st-btype st-btype-e" id="stExtreme" title="Extreme Bonus">E</button>
        </div>
        <div class="st-field st-win-field">
          <span class="st-label">WIN</span>
          <input class="st-input" id="stPayout" type="number" step="0.01" min="0" placeholder="0.00" />
        </div>
        <span class="st-multi" id="stMulti"></span>
        <button class="st-btn" id="stSubmit" disabled>Send</button>
        <span class="st-msg" id="stMsg"></span>
      </div>
      <button class="st-minimize" id="stMin" title="Minimize">─</button>
    </div>
  `;
  shadow.appendChild(container);

  // ── Elements ──
  const bar = shadow.getElementById('stBar');
  const slotEl = shadow.getElementById('stSlot');
  const betInput = shadow.getElementById('stBet');
  const payoutInput = shadow.getElementById('stPayout');
  const multiEl = shadow.getElementById('stMulti');
  const submitBtn = shadow.getElementById('stSubmit');
  const msgEl = shadow.getElementById('stMsg');
  const minBtn = shadow.getElementById('stMin');
  const targetBtns = shadow.querySelectorAll('.st-target');
  const superBtn = shadow.getElementById('stSuper');
  const extremeBtn = shadow.getElementById('stExtreme');

  let isSuperBonus = false;
  let isExtremeBonus = false;

  // ── Super / Extreme toggles ──
  superBtn.addEventListener('click', () => {
    isSuperBonus = !isSuperBonus;
    if (isSuperBonus) isExtremeBonus = false;
    superBtn.classList.toggle('active', isSuperBonus);
    extremeBtn.classList.toggle('active', isExtremeBonus);
  });
  extremeBtn.addEventListener('click', () => {
    isExtremeBonus = !isExtremeBonus;
    if (isExtremeBonus) isSuperBonus = false;
    extremeBtn.classList.toggle('active', isExtremeBonus);
    superBtn.classList.toggle('active', isSuperBonus);
  });

  // ── Update BH mode class on bar ──
  function updateBHMode() {
    bar.classList.toggle('bh-mode', target === 'bonus_hunt');
  }

  // ── Destination toggle ──
  // Load saved target
  chrome.storage.local.get(['panelTarget'], (data) => {
    if (data.panelTarget) {
      target = data.panelTarget;
      targetBtns.forEach(b => b.classList.toggle('active', b.dataset.target === target));
      updateBHMode();
    }
  });

  targetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      target = btn.dataset.target;
      targetBtns.forEach(b => b.classList.toggle('active', b.dataset.target === target));
      updateBHMode();
      if (alive()) chrome.storage.local.set({ panelTarget: target });
    });
  });

  // ── Minimize toggle ──
  minBtn.addEventListener('click', () => {
    bar.classList.toggle('minimized');
    minBtn.textContent = bar.classList.contains('minimized') ? '+' : '─';
    minBtn.title = bar.classList.contains('minimized') ? 'Expand' : 'Minimize';
  });

  // ── Multiplier ──
  function updateMulti() {
    const bet = parseFloat(betInput.value);
    const pay = parseFloat(payoutInput.value);
    submitBtn.disabled = !(bet > 0);
    if (bet > 0 && pay >= 0) {
      multiEl.textContent = (Math.round((pay / bet) * 100) / 100) + 'x';
    } else {
      multiEl.textContent = '';
    }
  }
  betInput.addEventListener('input', updateMulti);
  payoutInput.addEventListener('input', updateMulti);
  betInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { target === 'bonus_hunt' ? handleSubmit() : payoutInput.focus(); } });
  payoutInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });

  // ── Load slot ──
  function loadSlotInfo() {
    if (!alive()) return;
    chrome.storage.local.get(['lastSlotName', 'lastProvider', 'slotInDb'], (data) => {
      if (!alive()) return;
      slotName = data.lastSlotName || '';
      provider = data.lastProvider || '';
      if (slotName) {
        slotEl.textContent = slotName;
        slotEl.classList.remove('empty');
        slotEl.title = provider ? `${slotName} (${provider})` : slotName;
        // Show "Not in DB" warning if slot not found
        if (data.slotInDb === false) {
          msgEl.className = 'st-msg warn';
          msgEl.textContent = '⚠ Not in DB';
        } else {
          // Clear previous warning only if it was the DB warning
          if (msgEl.textContent === '⚠ Not in DB') {
            msgEl.className = 'st-msg';
            msgEl.textContent = '';
          }
        }
      } else {
        slotEl.textContent = 'No slot';
        slotEl.classList.add('empty');
        slotEl.title = '';
      }
    });
  }

  // ── Submit ──
  async function handleSubmit() {
    const bet = parseFloat(betInput.value);
    const pay = target === 'bonus_hunt' ? 0 : (parseFloat(payoutInput.value) || 0);
    if (!(bet > 0)) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '...';
    msgEl.className = 'st-msg';
    msgEl.textContent = '';

    try {
      if (!alive()) { msgEl.className = 'st-msg error'; msgEl.textContent = 'Reload page'; return; }
      const response = await chrome.runtime.sendMessage({
        type: 'SUBMIT_RESULT',
        slotName, provider, target,
        betSize: bet,
        payout: pay,
        isSuperBonus: target === 'bonus_hunt' ? isSuperBonus : false,
        isExtremeBonus: target === 'bonus_hunt' ? isExtremeBonus : false,
      });
      if (response?.ok) {
        msgEl.className = 'st-msg success';
        msgEl.textContent = '✓';
        if (target !== 'bonus_hunt') {
          payoutInput.value = '';
        }
        multiEl.textContent = '';
        // Reset S/E after BH send
        if (target === 'bonus_hunt') {
          isSuperBonus = false;
          isExtremeBonus = false;
          superBtn.classList.remove('active');
          extremeBtn.classList.remove('active');
        }
        setTimeout(() => { msgEl.textContent = ''; }, 2000);
      } else {
        msgEl.className = 'st-msg error';
        msgEl.textContent = response?.error || 'Error';
      }
    } catch {
      msgEl.className = 'st-msg error';
      msgEl.textContent = 'Error';
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send';
  }
  submitBtn.addEventListener('click', handleSubmit);

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Start hidden; only show on slot pages ──
  host.style.display = 'none';

  function showBar() { host.style.display = ''; loadSlotInfo(); }
  function hideBar() { host.style.display = 'none'; }

  // Ask background if this page is a slot/game page
  if (alive()) {
    try {
      chrome.runtime.sendMessage({ type: 'CHECK_SLOT_PAGE' }, (res) => {
        if (res?.isSlotPage) showBar();
      });
    } catch {}
  }

  // Also show if a slot gets detected later (URL change within SPA)
  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (!alive()) return;
      if (changes.lastSlotName || changes.lastProvider || changes.slotInDb) {
        // Re-check if current page is a slot page
        try {
          chrome.runtime.sendMessage({ type: 'CHECK_SLOT_PAGE' }, (res) => {
            if (res?.isSlotPage) {
              showBar();
              loadSlotInfo();
            }
          });
        } catch {}
      }
    });
  } catch {}

  console.log('[SlotTracker] Top bar loaded.');
})();
