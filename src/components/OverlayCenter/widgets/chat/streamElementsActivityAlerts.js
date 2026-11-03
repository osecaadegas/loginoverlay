// StreamElements Astro accepts an Overlay Token (apikey) in browser-source clients.
// Never pass the account JWT used for loyalty and bot operations to this client.
const ASTRO_URL = 'wss://astro.streamelements.com/';

export function isOverlayActivityToken(value) {
  const token = String(value || '').trim();
  return token.length >= 16 && token.length <= 512 && !token.includes('.') && !/\s/.test(token);
}

export function parseStreamElementsActivity(message) {
  if (message?.type !== 'message' || message.topic !== 'channel.activities') return null;
  const activity = message.data || {};
  const kind = String(activity.type || '').toLowerCase();
  if (!['follow', 'follower', 'tip'].includes(kind)) return null;
  const detail = activity.data || {};
  if (kind === 'tip' && (
    ['pending', 'rejected'].includes(String(activity.approved || detail.approved || '').toLowerCase()) ||
    ['pending', 'failed', 'refunded'].includes(String(activity.status || detail.status || '').toLowerCase())
  )) return null;
  const username = String(detail.displayName || detail.username || detail.name || 'Anonymous').trim().slice(0, 80);
  const rawAmount = detail.amount ?? detail.donation?.amount;
  const amount = rawAmount == null || rawAmount === '' ? null : Number(rawAmount);
  const currency = String(detail.currency || detail.donation?.currency || '').toUpperCase();
  const id = String(activity.activityId || activity._id || message.id || '').trim();
  return {
    id,
    kind: kind === 'tip' ? 'tip' : 'follow',
    username,
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : '',
  };
}

export function connectStreamElementsActivityAlerts({ token, onAlert, onStatus, WebSocketClass = WebSocket }) {
  if (!isOverlayActivityToken(token)) return () => {};
  let socket;
  let timer;
  let closed = false;
  let attempts = 0;
  const seen = new Set();
  const connect = () => {
    if (closed) return;
    socket = new WebSocketClass(ASTRO_URL);
    socket.onopen = () => onStatus?.('connected');
    socket.onmessage = (event) => {
      let payload;
      try { payload = JSON.parse(event.data); } catch { return; }
      if (payload.type === 'welcome') {
        socket.send(JSON.stringify({
          type: 'subscribe',
          nonce: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
          data: { topic: 'channel.activities', token: token.trim(), token_type: 'apikey' },
        }));
        return;
      }
      if (payload.type === 'response' && payload.error) {
        if (payload.error !== 'rate_limit_exceeded') closed = true;
        onStatus?.(closed ? 'error' : 'reconnecting');
        socket.close();
        return;
      }
      if (payload.type === 'response' && payload.data?.topic === 'channel.activities') attempts = 0;
      const alert = parseStreamElementsActivity(payload);
      if (!alert || !alert.id || seen.has(alert.id)) return;
      seen.add(alert.id);
      if (seen.size > 250) seen.delete(seen.values().next().value);
      onAlert?.(alert);
    };
    socket.onerror = () => onStatus?.('error');
    socket.onclose = () => {
      if (closed) return;
      onStatus?.('reconnecting');
      const delay = Math.min(1000 * 2 ** Math.min(attempts++, 5), 30000);
      timer = setTimeout(connect, delay);
    };
  };
  connect();
  return () => {
    closed = true;
    clearTimeout(timer);
    if (socket) {
      socket.onclose = null;
      socket.onmessage = null;
      socket.close();
    }
  };
}
