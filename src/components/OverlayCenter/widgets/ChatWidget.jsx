import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ─── Platform helpers ─── */
const PLATFORM_META = {
  twitch:  { label: 'Twitch',  icon: 'T', color: '#a855f7' },
  youtube: { label: 'YouTube', icon: 'Y', color: '#ef4444' },
  kick:    { label: 'Kick',    icon: 'K', color: '#22c55e' },
};

/* ─── Twitch IRC (anonymous/read-only) ─── */
function useTwitchChat(channel, onMessage) {
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

        /* ── Raid USERNOTICE ── */
        if (line.includes('USERNOTICE') && line.includes('msg-id=raid')) {
          const tagStr = line.match(/@([^ ]+)/)?.[1] || '';
          const tags = Object.fromEntries(tagStr.split(';').map(t => { const [k, ...v] = t.split('='); return [k, v.join('=')]; }));
          const raider = tags['msg-param-displayName'] || tags['display-name'] || tags['login'] || 'Someone';
          const viewerCount = parseInt(tags['msg-param-viewerCount'] || '0', 10);
          // Twitch sends profile image URL in raid USERNOTICEs (may be URL-encoded)
          let avatar = (tags['msg-param-profileImageURL'] || '').replace(/%s/g, '');
          // Fallback: if no profile image tag, leave empty
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
  }, [channel, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);
}

/* ─── YouTube live chat polling ─── */
function useYoutubeChat(videoId, apiKey, onMessage) {
  const chatIdRef = useRef(null);
  const pageTokenRef = useRef('');
  const timerRef = useRef(null);

  useEffect(() => {
    if (!videoId || !apiKey) return;

    async function fetchChatId() {
      try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`);
        const data = await res.json();
        chatIdRef.current = data?.items?.[0]?.liveStreamingDetails?.activeLiveChatId || null;
        if (chatIdRef.current) poll();
      } catch { /* silent */ }
    }

    async function poll() {
      if (!chatIdRef.current) return;
      try {
        const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${chatIdRef.current}&part=snippet,authorDetails&key=${apiKey}` +
          (pageTokenRef.current ? `&pageToken=${pageTokenRef.current}` : '');
        const res = await fetch(url);
        const data = await res.json();
        pageTokenRef.current = data.nextPageToken || '';
        (data.items || []).forEach(item => {
          onMessage({
            id: item.id,
            platform: 'youtube',
            username: item.authorDetails?.displayName || 'Unknown',
            message: item.snippet?.displayMessage || '',
            color: '',
            timestamp: Date.now(),
          });
        });
        timerRef.current = setTimeout(poll, Math.max(data.pollingIntervalMillis || 5000, 4000));
      } catch {
        timerRef.current = setTimeout(poll, 8000);
      }
    }

    fetchChatId();
    return () => clearTimeout(timerRef.current);
  }, [videoId, apiKey, onMessage]);
}

/* ─── Kick chat via Pusher WebSocket (direct, no StreamElements) ─── */
const KICK_PUSHER_KEY = '32cbd69e4b950bf97679';
const KICK_PUSHER_CLUSTER = 'us2';

function useKickChat(chatroomId, onMessage) {
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
      // Start keepalive ping every 2 minutes
      pingInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
        }
      }, 120000);
    };

    ws.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data);

        // Step 1: Wait for Pusher handshake, THEN subscribe
        if (parsed.event === 'pusher:connection_established') {
          // Subscribe to v2 chatroom channel
          ws.send(JSON.stringify({
            event: 'pusher:subscribe',
            data: { auth: '', channel: `chatrooms.${chatroomId}.v2` }
          }));
          // Also subscribe to legacy channel
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
          // Generate color from username hash (Kick has no user colors like Twitch)
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

/* Generate a deterministic hue-based color for Kick users */
function generateKickColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

/* ─── Main Widget ─── */
export default function ChatWidget({ config, theme }) {
  const c = config || {};
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);
  const maxMessages = c.maxMessages || 50;
  const isClean = c.chatStyle === 'clean';

  /* Style config */
  const bgColor = c.bgColor || (isClean ? 'rgba(20,25,46,0.92)' : 'rgba(15,23,42,0.95)');
  const textColor = c.textColor || '#e2e8f0';
  const headerBg = c.headerBg || 'rgba(30,41,59,0.5)';
  const headerText = c.headerText || '#94a3b8';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const fontSize = c.fontSize || (isClean ? 14 : 13);
  const msgSpacing = c.msgSpacing || (isClean ? 4 : 2);
  const borderRadius = c.borderRadius ?? (isClean ? 14 : 12);
  const borderWidth = c.borderWidth ?? (isClean ? 2 : 1);
  const borderColor = c.borderColor || (isClean ? 'rgba(80,90,140,0.35)' : 'rgba(51,65,85,0.5)');
  const showHeader = isClean ? false : c.showHeader !== false;
  const showLegend = isClean ? false : c.showLegend !== false;
  const showBadges = isClean ? false : c.showBadges !== false;
  const width = c.width || 350;
  const height = c.height || 500;
  const nameBold = c.nameBold ?? true;
  const msgLineHeight = c.msgLineHeight ?? (isClean ? 1.55 : 1.45);
  const msgPadH = c.msgPadH ?? (isClean ? 14 : 10);

  const handleMessage = useCallback((msg) => {
    setMessages(prev => {
      const next = [...prev, msg];
      return next.length > maxMessages ? next.slice(-maxMessages) : next;
    });
  }, [maxMessages]);

  /* Connect to enabled platforms */
  useTwitchChat(c.twitchEnabled ? c.twitchChannel : '', handleMessage);
  useYoutubeChat(
    c.youtubeEnabled ? c.youtubeVideoId : '',
    c.youtubeEnabled ? c.youtubeApiKey : '',
    handleMessage
  );
  useKickChat(c.kickEnabled ? c.kickChannelId : '', handleMessage);

  /* Auto-scroll */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /* All platforms for display (always show all 3 badges) */
  const allPlatforms = ['twitch', 'youtube', 'kick'];
  const enabledPlatforms = [];
  if (c.twitchEnabled) enabledPlatforms.push('twitch');
  if (c.youtubeEnabled) enabledPlatforms.push('youtube');
  if (c.kickEnabled) enabledPlatforms.push('kick');

  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;
  const filterStyle = (brightness !== 100 || contrast !== 100 || saturation !== 100)
    ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    : undefined;

  const style = {
    width: `${width}px`,
    height: `${height}px`,
    background: bgColor,
    border: `${borderWidth}px solid ${borderColor}`,
    borderRadius: `${borderRadius}px`,
    fontFamily,
    fontSize: `${fontSize}px`,
    color: textColor,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    filter: filterStyle,
  };

  return (
    <div className={`ov-chat-widget${isClean ? ' ov-chat-widget--clean' : ''}`} style={style}>
      {showHeader && (
        <div className="ov-chat-header" style={{ background: headerBg, color: headerText }}>
          <span className="ov-chat-header-title">Live Chat</span>
          <div className="ov-chat-header-badges">
            {allPlatforms.map(p => (
              <span key={p} className="ov-chat-platform-badge" style={{
                background: PLATFORM_META[p].color + (enabledPlatforms.includes(p) ? '33' : '15'),
                color: PLATFORM_META[p].color,
                opacity: enabledPlatforms.includes(p) ? 1 : 0.35,
              }}>
                {PLATFORM_META[p].icon}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="ov-chat-messages" ref={scrollRef} style={{ lineHeight: msgLineHeight }}>
        {messages.length === 0 && (
          <div className="ov-chat-empty-hint">
            💬 Waiting for messages...
          </div>
        )}
        {messages.map(msg => {
          const plt = PLATFORM_META[msg.platform] || PLATFORM_META.twitch;
          const nameColor = c.useNativeColors && msg.color ? msg.color : plt.color;

          /* ── Raid message highlight ── */
          if (msg.isRaid) {
            const raidBg = c.raidBgColor || '#7c3aed';
            const raidBorder = c.raidBorderColor || '#a855f7';
            const raidText = c.raidTextColor || '#ffffff';
            const showAvatar = c.showRaidAvatar !== false;
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-raid" style={{
                padding: `${msgSpacing + 4}px 10px`,
                background: raidBg,
                border: `2px solid ${raidBorder}`,
                borderRadius: '8px',
                margin: `${msgSpacing}px 6px`,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                animation: 'ov-raid-glow 2s ease-in-out 3',
              }}>
                {showAvatar && msg.raidAvatar && (
                  <img
                    src={msg.raidAvatar}
                    alt={msg.username}
                    className="ov-chat-raid-avatar"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      border: `2px solid ${raidBorder}`,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: '#a855f733',
                      color: '#d8b4fe',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '0.75em',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}>⚔️ RAID</span>
                    <span className="ov-chat-username" style={{ color: raidText, fontWeight: 700, fontSize: '1.05em' }}>
                      {msg.username}
                    </span>
                  </div>
                  <span className="ov-chat-text" style={{ color: raidText, opacity: 0.92 }}>
                    {msg.message}
                  </span>
                </div>
                {msg.raidViewers > 0 && (
                  <span style={{
                    background: '#a855f744',
                    color: '#e9d5ff',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.8em',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>👥 {msg.raidViewers}</span>
                )}
              </div>
            );
          }

          /* ── Normal message ── */
          return (
            <div key={msg.id} className="ov-chat-msg" style={{ padding: `${msgSpacing}px ${msgPadH}px` }}>
              {showBadges && (
                <span className="ov-chat-badge" style={{
                  background: plt.color + '33',
                  color: plt.color,
                }}>{plt.icon}</span>
              )}
              <div className="ov-chat-msg-body">
                <span className="ov-chat-username" style={{ color: nameColor, fontWeight: nameBold ? 700 : 500 }}>
                  {msg.username}
                </span>
                <span className="ov-chat-text">{msg.message}</span>
              </div>
            </div>
          );
        })}
      </div>

      {showLegend && (
        <div className="ov-chat-legend" style={{ background: headerBg }}>
          {allPlatforms.map(p => (
            <div key={p} className="ov-chat-legend-item" style={{ opacity: enabledPlatforms.includes(p) ? 1 : 0.35 }}>
              <span className="ov-chat-legend-dot" style={{ background: PLATFORM_META[p].color }} />
              <span>{PLATFORM_META[p].label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

