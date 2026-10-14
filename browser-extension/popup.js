const state = document.querySelector('#state');
const agent = document.querySelector('#agent');
const last = document.querySelector('#last');
const selectSlot = document.querySelector('#selectSlot');
const openManager = document.querySelector('#openManager');
const openOptions = document.querySelector('#openOptions');

function setCard(container, title, detail, meta = '') {
  const strong = document.createElement('strong');
  const span = document.createElement('span');
  const small = document.createElement('small');
  strong.textContent = title;
  span.textContent = detail;
  small.textContent = meta;
  container.replaceChildren(strong, span, small);
}

async function load() {
  const response = await chrome.runtime.sendMessage({ type: 'slot-capture:popup-state' }).catch((error) => ({ ok: false, error: error.message }));
  if (!response.ok) {
    state.textContent = response.error || 'Não foi possível ler o estado.';
    return;
  }
  state.textContent = response.paired ? `Ligado: ${response.device.device_name}` : 'Extensão ainda não emparelhada';
  const connected = Boolean(response.agent?.connected);
  agent.className = `status-card ${connected ? 'connected' : 'disconnected'}`;
  setCard(agent, connected ? 'Agente local ligado' : 'Agente local desligado', connected ? `Versão ${response.agent.version || '-'}` : response.agent?.error || 'Instale e inicie o agente de captura.');
  if (response.selection) {
    setCard(last, 'Última seleção', response.selection.label || response.selection.type, `${response.selection.bounds.width}×${response.selection.bounds.height} · ${response.selection.pageDomain || ''}`);
  } else {
    last.textContent = `${response.candidateCount || 0} regiões candidatas no separador atual.`;
  }
}

selectSlot.addEventListener('click', async () => {
  selectSlot.disabled = true;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('https://')) {
    last.textContent = 'Abra uma página HTTPS do casino antes de selecionar.';
    selectSlot.disabled = false;
    return;
  }
  const originPattern = `${new URL(tab.url).origin}/*`;
  const hasPermission = await chrome.permissions.contains({ origins: [originPattern] });
  if (!hasPermission) {
    const granted = await chrome.permissions.request({ origins: [originPattern] });
    if (!granted) {
      last.textContent = 'A permissão para este casino não foi concedida.';
      selectSlot.disabled = false;
      return;
    }
  }
  const response = await chrome.runtime.sendMessage({ type: 'slot-capture:popup-select' }).catch((error) => ({ ok: false, error: error.message }));
  if (!response?.ok) {
    last.textContent = response?.error || 'Não foi possível iniciar o seletor nesta página.';
    selectSlot.disabled = false;
    return;
  }
  window.close();
});
openManager.addEventListener('click', () => chrome.tabs.create({ url: 'https://streamerscenter.com/slot-capture' }));
openOptions.addEventListener('click', () => chrome.runtime.openOptionsPage());
load();
