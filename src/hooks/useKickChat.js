/**
 * useKickChat.js — Shared Kick chat hook via Pusher WebSocket.
 *
 * Connects to a Kick chatroom using the public Pusher channel.
 * Parses ChatMessageEvent payloads, auto-reconnects, and pings to keep alive.
 *
 * @param {string|number} chatroomId  – Kick chatroom ID (empty/falsy = no connection)
 * @param {function}      onMessage   – Called with message objects
 */
import { useEffect, useRef, useCallback } from 'react';

const KICK_PUSHER_KEY = '32cbd69e4b950bf97679';
const KICK_PUSHER_CLUSTER = 'us2';

/* Generate a deterministic hue-based color for Kick users (no native colors) */
function generateKickColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export { generateKickColor };

export default function useKickChat(chatroomId, onMessage) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const pingInterval = useRef(null);

  const connect = useCallback(() => {
    if (!chatroomId) return;

    // Clean up any previous connection
    if (wsRef.current) { try { wsRef.current.close(); } catch {} }
    if (pingInterval.current) clearInterval(pingInterval.current);

    const wsUrl = `wss://ws-${KICK_PUSHER_CLUSTER}.pusher.com/app/${KICK_PUSHER_KEY}?protocol=7&client=js&version=8.4.0-rc2&flash=false`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Keep-alive ping every 2 minutes
      pingInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
        }
      }, 120000);
    };

    ws.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data);

        // Wait for Pusher handshake, then subscribe
        if (parsed.event === 'pusher:connection_established') {
          ws.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: { auth: '', channel: `chatrooms.${chatroomId}.v2` }
          }));
          ws.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: { auth: '', channel: `chatroom_${chatroomId}` }
          }));
          return;
        }

        // Handle chat messages
        if (parsed.event === 'App\\Events\\ChatMessageEvent') {
          const msg = JSON.parse(parsed.data);
          const sender = msg.sender || {};
          const color = generateKickColor(sender.username || '');
          onMessage({
            id: `kick-${msg.id || Date.now()}`,
            platform: 'kick',
            username: sender.username || 'Unknown',
            message: msg.content || '',
            color,
            timestamp: Date.now(),
          });
        }
      } catch { /* not all frames are relevant JSON */ }
    };

    ws.onerror = () => { /* will trigger onclose */ };

    ws.onclose = () => {
      wsRef.current = null;
      if (pingInterval.current) { clearInterval(pingInterval.current); pingInterval.current = null; }
      reconnectTimer.current = setTimeout(connect, 5000);
    };
  }, [chatroomId, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (pingInterval.current) clearInterval(pingInterval.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);
}
