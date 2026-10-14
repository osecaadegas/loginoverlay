const DEFAULT_API_BASE = 'https://streamerscenter.com';

const apiBase = document.querySelector('#apiBase');
const pairingCode = document.querySelector('#pairingCode');
const pair = document.querySelector('#pair');
const forget = document.querySelector('#forget');
const status = document.querySelector('#status');

function setStatus(text, tone = '') {
  status.textContent = text;
  status.className = tone;
}

async function load() {
  const settings = await chrome.storage.local.get(['apiBase', 'device']);
  apiBase.value = settings.apiBase || DEFAULT_API_BASE;
  setStatus(settings.device ? `Emparelhada como ${settings.device.device_name}` : 'Não emparelhada');
}

pair.addEventListener('click', async () => {
  const base = (apiBase.value || DEFAULT_API_BASE).replace(/\/$/, '');
  const code = pairingCode.value.trim();
  if (!code) {
    setStatus('Introduza o código de emparelhamento do StreamersCenter.', 'error');
    return;
  }
  pair.disabled = true;
  try {
    const response = await fetch(`${base}/api/slot-detector?action=exchange-pairing-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        deviceName: navigator.userAgent.includes('Edg') ? 'Edge extension' : 'Chrome extension',
        browserName: navigator.userAgent.includes('Edg') ? 'Edge' : 'Chrome',
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Pairing failed (${response.status})`);
    await chrome.storage.local.set({ apiBase: base, detectorToken: data.token, device: data.device });
    pairingCode.value = '';
    setStatus(`Emparelhada como ${data.device.device_name}`, 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    pair.disabled = false;
  }
});

forget.addEventListener('click', async () => {
  await chrome.storage.local.remove(['detectorToken', 'device', 'lastSubmit']);
  setStatus('Ligação removida deste browser.', 'success');
});

load();
