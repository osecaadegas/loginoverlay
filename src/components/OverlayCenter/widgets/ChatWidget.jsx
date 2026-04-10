import React, { useEffect, useRef, useState, useCallback } from 'react';
import useTwitchChat from '../../../hooks/useTwitchChat';
import useKickChat from '../../../hooks/useKickChat';

/* ─── Platform helpers ─── */
const PLATFORM_META = {
  twitch:  { label: 'Twitch',  icon: 'T', color: '#a855f7' },
  youtube: { label: 'YouTube', icon: 'Y', color: '#ef4444' },
  kick:    { label: 'Kick',    icon: 'K', color: '#22c55e' },
};

/* ─── Twitch badge pills (Cards style) ─── */
const BADGE_DEFS = [
  { key: 'isBroadcaster', label: 'HOST',  bg: '#dc2626', icon: '🏠' },
  { key: 'isMod',         label: 'MOD',   bg: '#16a34a', icon: '⚔' },
  { key: 'isVip',         label: 'VIP',   bg: '#7c3aed', icon: '💎' },
  { key: 'isSub',         label: 'SUB',   bg: '#ca8a04', icon: '⭐' },
  { key: 'isFirstMsg',    label: 'NEW',   bg: '#0ea5e9', icon: '✨' },
];

function TwitchBadges({ msg }) {
  return BADGE_DEFS
    .filter(b => msg[b.key])
    .map(b => (
      <span key={b.key} className="ov-cards-badge" style={{ background: b.bg }}>
        <span className="ov-cards-badge-icon">{b.icon}</span> {b.label}
      </span>
    ));
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



/* ─── Main Widget ─── */
function ChatWidget({ config, theme }) {
  const c = config || {};
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);
  const maxMessages = c.maxMessages || 50;
  const chatStyle = c.chatStyle || 'classic';
  const isMetal = chatStyle === 'metal';
  const isBH = chatStyle === 'bh_stats';

  /* Style config */
  const textColor = isMetal ? '#d4d8e0' : isBH ? '#f1f5f9' : (c.textColor || '#e2e8f0');
  const headerBg = isMetal ? 'linear-gradient(160deg, rgba(180,185,195,0.12) 0%, rgba(120,125,135,0.06) 100%)' : isBH ? 'rgba(255,255,255,0.04)' : (c.headerBg || 'rgba(30,41,59,0.5)');
  const headerText = isMetal ? '#a8b0c0' : isBH ? '#64748b' : (c.headerText || '#94a3b8');
  const fontFamily = isBH ? "'Poppins', sans-serif" : (c.fontFamily || "'Inter', sans-serif");
  const fontSize = c.fontSize || 15;
  const msgSpacing = c.msgSpacing ?? 2;
  const borderRadius = c.borderRadius ?? (isMetal ? 10 : isBH ? 14 : 12);
  const borderWidth = c.borderWidth ?? 1;
  const borderColor = isMetal ? 'rgba(200,210,225,0.18)' : isBH ? 'rgba(255,255,255,0.06)' : (c.borderColor || 'rgba(51,65,85,0.5)');
  const width = c.width || 350;
  const height = c.height || 500;
  const nameBold = c.nameBold ?? true;
  const msgLineHeight = c.msgLineHeight ?? 1.45;
  const msgPadH = c.msgPadH ?? 10;

  /* Style-specific bg defaults */
  const bgDefaults = {
    classic: 'rgba(15,23,42,0.95)',
    floating: 'transparent',
    bubble: 'rgba(15,18,30,0.9)',
    stack: 'transparent',
    typewriter: 'rgba(0,8,0,0.92)',
    sidebar: 'rgba(10,12,20,0.9)',
    cards: 'rgba(18,10,35,0.95)',
    metal: 'linear-gradient(145deg, #2a2d33 0%, #1a1c20 40%, #2e3238 100%)',
    bh_stats: 'rgba(15, 23, 42, 0.9)',
  };
  const bgColor = isMetal
    ? 'linear-gradient(145deg, #2a2d33 0%, #1a1c20 40%, #2e3238 100%)'
    : (c.bgColor || bgDefaults[chatStyle] || bgDefaults.classic);

  /* Which features each style shows */
  const showHeader = (chatStyle === 'classic' || chatStyle === 'cards' || chatStyle === 'metal' || chatStyle === 'bh_stats') ? (c.showHeader !== false) : false;
  const showLegend = (chatStyle === 'classic') ? (c.showLegend !== false) : false;
  const showBadges = (chatStyle === 'classic' || chatStyle === 'metal' || chatStyle === 'bh_stats') ? (c.showBadges !== false) : false;

  /* Bots to hide from overlay chat */
  const HIDDEN_BOTS = ['streamelements', 'nightbot', 'moobot'];

  const handleMessage = useCallback((msg) => {
    // Filter out known bot messages
    if (msg.username && HIDDEN_BOTS.includes(msg.username.toLowerCase())) return;
    setMessages(prev => {
      const next = [...prev, msg];
      return next.length > maxMessages ? next.slice(-maxMessages) : next;
    });
  }, [maxMessages]);

  /* Connect to enabled platforms */
  useTwitchChat(c.twitchEnabled ? c.twitchChannel : '', handleMessage, { parseRaids: true });
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

  /* ── Base wrapper style ── */
  const isTransparent = chatStyle === 'floating' || chatStyle === 'stack';
  const style = {
    width: '100%',
    height: '100%',
    background: bgColor,
    border: isMetal
      ? '1px solid rgba(200,210,225,0.18)'
      : isBH ? '1px solid rgba(255,255,255,0.06)'
      : (borderWidth && !isTransparent) ? `${borderWidth}px solid ${borderColor}` : 'none',
    borderRadius: isTransparent ? 0 : `${borderRadius}px`,
    fontFamily,
    fontSize: `${fontSize}px`,
    color: isBH ? '#f1f5f9' : isMetal ? '#d4d8e0' : textColor,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    filter: filterStyle,
    ...(isBH && {
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    }),
    ...(isMetal && {
      boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
    }),
    /* Cards CSS vars — synced from config */
    '--chat-card-bg': c.cardBg || 'rgba(20,15,40,0.85)',
    '--chat-card-border': c.cardBorder || borderColor || 'rgba(100,70,180,0.2)',
    '--chat-card-hover-bg': c.cardHoverBg || 'rgba(30,22,55,0.95)',
    '--chat-card-hover-border': c.cardHoverBorder || 'rgba(120,80,200,0.3)',
    '--chat-card-text': c.cardTextColor || textColor || '#e2e8f0',
    '--chat-header-bg': c.headerBg || 'rgba(20,15,40,0.95)',
    '--chat-header-border': c.headerBorder || borderColor || 'rgba(100,70,180,0.15)',
    '--chat-header-label': c.headerText || '#fff',
    '--chat-header-channel': c.headerChannelColor || '#d1d5db',
  };

  const modeClass = ` ov-chat-widget--${chatStyle}`;

  return (
    <div className={`ov-chat-widget${modeClass}`} style={style}>
      <style>{`
        @keyframes ov-float-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ov-pop-in{from{opacity:0;transform:scale(0.8) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes ov-slide-left{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes ov-cursor-blink{0%,50%{opacity:1}51%,100%{opacity:0}}
        @keyframes ov-live-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.2)}}
      `}</style>

      {showHeader && chatStyle === 'cards' && (
        <div className="ov-cards-header">
          <div className="ov-cards-header-left">
            <span className="ov-cards-live-dot" />
            <span className="ov-cards-header-label">CHAT</span>
          </div>
          <span className="ov-cards-header-channel">
            {c.twitchChannel ? c.twitchChannel.toUpperCase() : 'CHANNEL'}
          </span>
        </div>
      )}

      {showHeader && chatStyle === 'metal' && (
        <div style={{
          padding: '8px 14px',
          background: 'linear-gradient(160deg, rgba(180,185,195,0.12) 0%, rgba(120,125,135,0.06) 100%)',
          borderBottom: '1px solid rgba(200,210,225,0.12)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            fontSize: '0.85em', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #c8ccd4, #e8ecf4, #a0a8b8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>LIVE CHAT</span>
          <span style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.78em', fontWeight: 700, color: '#4ade80',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px rgba(34,197,94,0.6)',
              display: 'inline-block',
              animation: 'ov-live-pulse 2s ease-in-out infinite',
            }} />
            Live
          </span>
        </div>
      )}

      {showHeader && chatStyle === 'bh_stats' && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: '1.1em' }}>💬</span>
          <span style={{
            fontSize: '0.88em', fontWeight: 800, letterSpacing: '0.03em',
            color: '#f1f5f9',
          }}>Live Chat</span>
          <span style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.7em', fontWeight: 700,
            background: '#818cf8', color: '#fff',
            borderRadius: 99, padding: '2px 10px',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#fff',
              display: 'inline-block',
              animation: 'ov-live-pulse 2s ease-in-out infinite',
            }} />
            LIVE
          </span>
        </div>
      )}

      {showHeader && chatStyle !== 'cards' && chatStyle !== 'metal' && chatStyle !== 'bh_stats' && (
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
        {messages.map((msg, msgIdx) => {
          const plt = PLATFORM_META[msg.platform] || PLATFORM_META.twitch;
          const nameColor = c.useNativeColors && msg.color ? msg.color : plt.color;

          /* ── Raid message ── */
          if (msg.isRaid) {
            return <RaidMessage key={msg.id} msg={msg} chatStyle={chatStyle} msgSpacing={msgSpacing} msgPadH={msgPadH} c={c} />;
          }

          /* ── Style: Floating — transparent bg, floating pill bubbles ── */
          if (chatStyle === 'floating') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--floating" style={{
                padding: `${msgSpacing + 1}px 4px`, animation: 'ov-float-in 0.35s ease-out',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'flex-start', gap: 8,
                  background: 'rgba(0,0,0,0.75)', borderRadius: 18, padding: '6px 14px',
                  maxWidth: '92%',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: nameColor + '33', color: nameColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.82em', fontWeight: 800, flexShrink: 0, marginTop: 1,
                  }}>{msg.username.charAt(0).toUpperCase()}</span>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: nameColor, fontWeight: 700, fontSize: '0.92em', lineHeight: 1.2, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{msg.username}</span>
                    <div style={{ color: textColor, lineHeight: 1.35, wordBreak: 'break-word', opacity: 0.92, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{msg.message}</div>
                  </div>
                </div>
              </div>
            );
          }

          /* ── Style: Bubble — social media speech bubbles with tail ── */
          if (chatStyle === 'bubble') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--bubble" style={{
                padding: `${msgSpacing + 1}px ${msgPadH}px`,
                animation: 'ov-pop-in 0.3s ease-out',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  background: `linear-gradient(135deg, ${nameColor}44, ${nameColor}22)`,
                  border: `1.5px solid ${nameColor}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: nameColor, fontSize: '0.85em', fontWeight: 800,
                }}>{msg.username.charAt(0).toUpperCase()}</div>
                <div style={{ minWidth: 0, maxWidth: '85%' }}>
                  <span style={{ color: nameColor, fontWeight: 700, fontSize: '0.88em', display: 'block', marginBottom: 2, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    {msg.username}
                  </span>
                  <div style={{
                    background: 'rgba(255,255,255,0.06)', borderRadius: '14px 14px 14px 4px',
                    padding: '7px 12px', position: 'relative',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <span style={{ wordBreak: 'break-word', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{msg.message}</span>
                  </div>
                </div>
              </div>
            );
          }

          /* ── Style: Stack — msgs from bottom, newest = full opacity, old fades ── */
          if (chatStyle === 'stack') {
            const totalVisible = Math.min(messages.length, 20);
            const age = messages.length - 1 - msgIdx;
            const opacity = age < totalVisible ? 1 - (age / totalVisible) * 0.75 : 0.15;
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--stack" style={{
                padding: `${msgSpacing + 1}px ${msgPadH}px`,
                opacity, transition: 'opacity 0.5s ease',
                animation: age === 0 ? 'ov-float-in 0.3s ease-out' : 'none',
              }}>
                <span style={{
                  color: nameColor, fontWeight: 700, fontSize: '0.95em', flexShrink: 0,
                }}>{msg.username}</span>
                <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 5px', flexShrink: 0 }}>›</span>
                <span style={{ wordBreak: 'break-word', opacity: 0.9, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{msg.message}</span>
              </div>
            );
          }

          /* ── Style: Typewriter — terminal / monospace green-on-dark ── */
          if (chatStyle === 'typewriter') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--typewriter" style={{
                padding: `${msgSpacing}px ${msgPadH}px`,
                fontFamily: "'Fira Code', 'JetBrains Mono', 'Courier New', monospace",
                animation: 'ov-slide-left 0.25s ease-out',
              }}>
                <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.92em', opacity: 0.7 }}>{'>'}</span>
                <span style={{ color: nameColor, fontWeight: 700, fontSize: '0.95em', marginLeft: 4, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{msg.username}</span>
                <span style={{ color: 'rgba(74,222,128,0.3)', margin: '0 6px' }}>$</span>
                <span style={{ color: '#d1fae5', wordBreak: 'break-word', opacity: 0.85, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{msg.message}</span>
              </div>
            );
          }

          /* ── Style: Sidebar — vertical strip with platform color border ── */
          if (chatStyle === 'sidebar') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--sidebar" style={{
                padding: `${msgSpacing + 2}px ${msgPadH}px`,
                borderLeft: `3px solid ${plt.color}`,
                animation: 'ov-slide-left 0.3s ease-out',
                display: 'flex', flexDirection: 'column', gap: 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: '0.78em', fontWeight: 800, color: plt.color,
                    textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7, textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  }}>{plt.label}</span>
                  <span style={{ color: nameColor, fontWeight: 700, fontSize: '0.92em', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{msg.username}</span>
                </div>
                <span style={{ color: textColor, wordBreak: 'break-word', opacity: 0.88, paddingLeft: 1, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{msg.message}</span>
              </div>
            );
          }

          /* ── Style: Cards — dark card per message with Twitch badge pills ── */
          if (chatStyle === 'cards') {
            const nameClr = c.useNativeColors && msg.color ? msg.color : plt.color;
            const isRaider = !!msg.isRaidParticipant;
            return (
              <div key={msg.id} className="ov-cards-msg" style={{
                animation: 'ov-cards-slide-in 0.3s ease-out',
              }}>
                <div className="ov-cards-msg-header">
                  <span className="ov-cards-username" style={{ color: nameClr }}>@{msg.username}</span>
                  <div className="ov-cards-badges">
                    <TwitchBadges msg={msg} />
                    {isRaider && (
                      <span className="ov-cards-badge" style={{ background: '#7c3aed' }}>
                        <span className="ov-cards-badge-icon">⚔️</span> RAID
                      </span>
                    )}
                  </div>
                </div>
                <div className="ov-cards-msg-text">{msg.message}</div>
              </div>
            );
          }

          /* ── Style: Metal — brushed steel look ── */
          if (chatStyle === 'metal') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--metal" style={{
                padding: `${msgSpacing + 1}px ${msgPadH}px`,
                animation: 'ov-float-in 0.25s ease-out',
                borderBottom: '1px solid rgba(200,210,225,0.06)',
              }}>
                {showBadges && (
                  <span style={{
                    background: 'linear-gradient(135deg, #555a65, #3a3e48)',
                    color: '#a8b0c0', fontSize: '0.82em', fontWeight: 800,
                    padding: '2px 6px', borderRadius: 3, marginRight: 6,
                    border: '1px solid rgba(200,210,225,0.15)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}>{plt.icon}</span>
                )}
                <div className="ov-chat-msg-body">
                  <span style={{
                    fontWeight: 700, fontSize: '0.95em',
                    background: 'linear-gradient(90deg, #c8ccd4, #e8ecf4, #a0a8b8)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    marginRight: 6,
                  }}>{msg.username}</span>
                  <span style={{ color: '#d4d8e0', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{msg.message}</span>
                </div>
              </div>
            );
          }

          /* ── Style: BH Stats — matches Bonus Hunt stats widget ── */
          if (chatStyle === 'bh_stats') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--bh-stats" style={{
                padding: `${msgSpacing + 2}px ${msgPadH}px`,
                animation: 'ov-float-in 0.3s ease-out',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                {/* Avatar circle */}
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#818cf8', fontSize: '0.78em', fontWeight: 800,
                }}>{msg.username.charAt(0).toUpperCase()}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{
                    color: '#818cf8', fontWeight: 700, fontSize: '0.88em',
                    marginRight: 6,
                  }}>{msg.username}</span>
                  {showBadges && (
                    <span style={{
                      background: 'rgba(129,140,248,0.15)', color: '#818cf8',
                      fontSize: '0.68em', fontWeight: 700, padding: '1px 5px',
                      borderRadius: 4, marginRight: 4, verticalAlign: 'middle',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>{plt.icon}</span>
                  )}
                  <div style={{
                    color: '#f1f5f9', wordBreak: 'break-word', lineHeight: 1.4,
                    marginTop: 2, opacity: 0.92,
                  }}>{msg.message}</div>
                </div>
              </div>
            );
          }

          /* ── Default: Classic ── */
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

/* ─── Raid message (shared across styles) ─── */
function RaidMessage({ msg, chatStyle, msgSpacing, msgPadH, c }) {
  const raidBg = c.raidBgColor || '#7c3aed';
  const raidBorder = c.raidBorderColor || '#a855f7';
  const raidText = c.raidTextColor || '#ffffff';
  const showAvatar = c.showRaidAvatar !== false;

  /* ── Cards style raid ── */
  if (chatStyle === 'cards') {
    return (
      <div className="ov-cards-msg ov-cards-msg--raid" style={{
        animation: 'ov-cards-slide-in 0.35s ease-out',
      }}>
        <div className="ov-cards-msg-header">
          <span className="ov-cards-username" style={{ color: '#d8b4fe' }}>@{msg.username}</span>
          <div className="ov-cards-badges">
            <span className="ov-cards-badge" style={{ background: '#7c3aed' }}>
              <span className="ov-cards-badge-icon">⚔️</span> RAID
            </span>
            {msg.raidViewers > 0 && (
              <span className="ov-cards-badge" style={{ background: 'rgba(124,58,237,0.5)' }}>
                👥 {msg.raidViewers}
              </span>
            )}
          </div>
        </div>
        <div className="ov-cards-msg-text" style={{ color: '#f5f3ff' }}>{msg.message}</div>
      </div>
    );
  }

  if (chatStyle === 'floating' || chatStyle === 'stack') {
    return (
      <div className="ov-chat-msg ov-chat-raid" style={{
        padding: `${msgSpacing + 2}px 4px`, animation: 'ov-float-in 0.4s ease-out',
      }}>
        <div style={{
          display: 'inline-flex', flexDirection: 'column',
          background: 'rgba(124,58,237,0.55)', borderRadius: 16,
          padding: '8px 14px', maxWidth: '90%', backdropFilter: 'blur(4px)',
          border: '1px solid rgba(168,85,247,0.5)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: '0.75em', fontWeight: 700, color: '#d8b4fe' }}>⚔️ RAID</span>
            <span style={{ fontWeight: 700, color: '#e9d5ff' }}>{msg.username}</span>
            {msg.raidViewers > 0 && <span style={{ fontSize: '0.8em', color: '#c4b5fd' }}>👥 {msg.raidViewers}</span>}
          </div>
          <span style={{ color: '#f5f3ff' }}>{msg.message}</span>
        </div>
      </div>
    );
  }

  if (chatStyle === 'typewriter') {
    return (
      <div className="ov-chat-msg ov-chat-raid" style={{
        padding: `${msgSpacing + 2}px ${msgPadH}px`,
        fontFamily: "'Fira Code', monospace",
        background: 'rgba(124,58,237,0.15)', borderLeft: '3px solid #a855f7',
        animation: 'ov-slide-left 0.25s ease-out',
      }}>
        <span style={{ color: '#d8b4fe' }}>⚔️ [RAID]</span>
        <span style={{ color: '#e9d5ff', fontWeight: 700, marginLeft: 6 }}>{msg.username}</span>
        <span style={{ color: '#c4b5fd', marginLeft: 6 }}>{msg.message}</span>
        {msg.raidViewers > 0 && <span style={{ color: '#a78bfa', marginLeft: 6 }}>({msg.raidViewers})</span>}
      </div>
    );
  }

  if (chatStyle === 'sidebar') {
    return (
      <div className="ov-chat-msg ov-chat-raid" style={{
        padding: `${msgSpacing + 3}px ${msgPadH}px`,
        borderLeft: '3px solid #a855f7', background: 'rgba(124,58,237,0.12)',
        animation: 'ov-slide-left 0.3s ease-out',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.7em', fontWeight: 800, color: '#d8b4fe' }}>⚔️ RAID</span>
          <span style={{ fontWeight: 700, color: '#e9d5ff' }}>{msg.username}</span>
          {msg.raidViewers > 0 && <span style={{ fontSize: '0.8em', color: '#c4b5fd' }}>👥 {msg.raidViewers}</span>}
        </div>
        <span style={{ color: '#f5f3ff', paddingLeft: 1 }}>{msg.message}</span>
      </div>
    );
  }

  /* Default raid (classic, bubble) */
  return (
    <div className="ov-chat-msg ov-chat-raid" style={{
      padding: `${msgSpacing + 4}px 10px`,
      background: raidBg, border: `2px solid ${raidBorder}`,
      borderRadius: '8px', margin: `${msgSpacing}px 6px`,
      display: 'flex', alignItems: 'center', gap: '10px',
      animation: 'ov-raid-glow 2s ease-in-out 3',
    }}>
      {showAvatar && msg.raidAvatar && (
        <img src={msg.raidAvatar} alt={msg.username} className="ov-chat-raid-avatar" style={{
          width: '42px', height: '42px', borderRadius: '50%',
          border: `2px solid ${raidBorder}`, flexShrink: 0,
        }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            background: '#a855f733', color: '#d8b4fe', padding: '1px 6px',
            borderRadius: '4px', fontSize: '0.75em', fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>⚔️ RAID</span>
          <span className="ov-chat-username" style={{ color: raidText, fontWeight: 700, fontSize: '1.05em' }}>
            {msg.username}
          </span>
        </div>
        <span className="ov-chat-text" style={{ color: raidText, opacity: 0.92 }}>{msg.message}</span>
      </div>
      {msg.raidViewers > 0 && (
        <span style={{
          background: '#a855f744', color: '#e9d5ff', padding: '2px 8px',
          borderRadius: '12px', fontSize: '0.8em', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
        }}>👥 {msg.raidViewers}</span>
      )}
    </div>
  );
}

export default React.memo(ChatWidget);
