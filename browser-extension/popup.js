const state = document.querySelector('#state');
const last = document.querySelector('#last');
const openOptions = document.querySelector('#openOptions');

async function load() {
  const data = await chrome.storage.local.get(['device', 'lastSubmit']);
  state.textContent = data.device ? `Paired: ${data.device.device_name}` : 'Not paired';
  if (data.lastSubmit) {
    last.innerHTML = `
      <strong>${data.lastSubmit.ok ? 'Last submit OK' : 'Last submit failed'}</strong>
      <span>${data.lastSubmit.at || ''}</span>
      <small>${data.lastSubmit.match?.slot?.name || data.lastSubmit.error || 'No match yet'}</small>
    `;
  } else {
    last.textContent = 'No events submitted yet.';
  }
}

openOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());
load();
