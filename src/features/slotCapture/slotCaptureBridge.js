const RESPONSE_SOURCE = 'streamerscenter-extension';
const REQUEST_SOURCE = 'streamerscenter-dashboard';

export function sendCaptureCommand(command, payload, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('Extensão StreamersCenter não detetada. Abra o Chrome/Edge com a extensão instalada.'));
    }, timeoutMs);
    function onMessage(event) {
      if (event.source !== window || event.origin !== location.origin || event.data?.source !== RESPONSE_SOURCE || event.data.requestId !== requestId) return;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      if (event.data.response?.ok === false) reject(new Error(event.data.response.error || 'Comando de captura falhou.'));
      else resolve(event.data.response);
    }
    window.addEventListener('message', onMessage);
    window.postMessage({ source: REQUEST_SOURCE, requestId, command, payload }, location.origin);
  });
}
