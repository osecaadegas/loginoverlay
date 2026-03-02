/**
 * useTwitchChat.js — Shared Twitch IRC hook (anonymous / read-only).
 *
 * Connects to Twitch IRC via WebSocket as an anonymous viewer.
 * Parses PRIVMSG and (optionally) raid USERNOTICE events.
 *
 * @param {string}   channel    – Twitch channel name (empty/falsy = no connection)
 * @param {function} onMessage  – Called with message objects
 * @param {object}   [options]
 * @param {boolean}  [options.parseRaids=false] – Also emit raid USERNOTICE events
 */
import { useEffect, useRef, useCallback } from 'react';

export default function useTwitchChat(channel, onMessage, options = {}) {
  const { parseRaids = false } = options;
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!channel) return;
    const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send('NICK justinfan' + Math.floor(Math.random() * 99999));
      ws.send('JOIN #' + channel.toLowerCase().trim());
    };

    ws.onmessage = (evt) => {
      const lines = evt.data.split('\r\n');
      for (const line of lines) {
        if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }

        /* ── Raid USERNOTICE (opt-in) ── */
        if (parseRaids && line.includes('USERNOTICE') && line.includes('msg-id=raid')) {
          const tagStr = line.match(/@([^ ]+)/)?.[1] || '';
          const tags = Object.fromEntries(
            tagStr.split(';').map(t => { const [k, ...v] = t.split('='); return [k, v.join('=')]; })
          );
          const raider = tags['msg-param-displayName'] || tags['display-name'] || tags['login'] || 'Someone';
          const viewerCount = parseInt(tags['msg-param-viewerCount'] || '0', 10);
          let avatar = (tags['msg-param-profileImageURL'] || '').replace(/%s/g, '');
          if (avatar && !avatar.startsWith('http')) avatar = '';

          onMessage({
            id: tags['id'] || 'raid-' + Date.now(),
            platform: 'twitch',
            username: raider,
            message: `is raiding with ${viewerCount} viewer${viewerCount !== 1 ? 's' : ''}!`,
            color: tags['color'] || '#a855f7',
            timestamp: Date.now(),
            isRaid: true,
            raidViewers: viewerCount,
            raidAvatar: avatar || '',
          });
          continue;
        }

        /* ── Normal PRIVMSG ── */
        const m = line.match(/@([^ ]+) :([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.+)/);
        if (!m) continue;
        const tags = Object.fromEntries(m[1].split(';').map(t => t.split('=')));
        onMessage({
          id: tags['id'] || Date.now().toString() + Math.random(),
          platform: 'twitch',
          username: tags['display-name'] || m[2],
          message: m[3],
          color: tags['color'] || '',
          timestamp: Date.now(),
        });
      }
    };

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 3000);
    };
  }, [channel, onMessage, parseRaids]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);
}
