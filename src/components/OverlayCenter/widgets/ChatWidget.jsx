import React, { useEffect, useRef, useState, useCallback } from 'react';
import useTwitchChat from '../../../hooks/useTwitchChat';
import useKickChat from '../../../hooks/useKickChat';
import useTwitchChannel from '../../../hooks/useTwitchChannel';
import { subElementStyle, subValue } from './shared/appearanceStyles';
import { brushedMetalBackground, metalBorderColor, metalSurfaceShadow } from './shared/metalTexture';

/* ─── Platform helpers ─── */
const PLATFORM_META = {
  twitch:  { label: 'Twitch',  icon: 'T', color: '#64748b' },
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

function partAttrs(partId) {
  return {
    'data-widget-element': partId,
    'data-appearance-part': partId,
  };
}

function TwitchBadges({ msg, config }) {
  return BADGE_DEFS
    .filter(b => msg[b.key])
    .map(b => (
      <span key={b.key} className="ov-cards-badge" {...partAttrs('badge')} style={subElementStyle(config, 'badge', { background: b.bg })}>
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
  const isGlowPanel = chatStyle === 'glow_panel';
  const isBH = chatStyle === 'bh_stats';

  /* Style config */
  const textColor = subValue(c, 'messageText', 'textColor', subValue(c, 'message', 'textColor', c.textColor || (isMetal ? '#d4d8e0' : isGlowPanel ? '#dbeafe' : isBH ? '#f1f5f9' : '#e2e8f0')));
  const headerBg = subValue(c, 'header', 'background', c.headerBg || (isMetal ? 'linear-gradient(160deg, rgba(180,185,195,0.12) 0%, rgba(120,125,135,0.06) 100%)' : isGlowPanel ? 'rgba(2,12,25,0.82)' : isBH ? 'rgba(255,255,255,0.04)' : 'rgba(30,41,59,0.5)'));
  const headerText = subValue(c, 'header', 'textColor', c.headerText || (isMetal ? '#a8b0c0' : isGlowPanel ? '#22d3ee' : isBH ? '#64748b' : '#94a3b8'));
  const fontFamily = subValue(c, 'container', 'fontFamily', subValue(c, 'messageText', 'fontFamily', subValue(c, 'message', 'fontFamily', isBH ? "'Poppins', sans-serif" : (c.fontFamily || "'Inter', sans-serif"))));
  const fontSize = subValue(c, 'container', 'fontSize', subValue(c, 'messageText', 'fontSize', subValue(c, 'message', 'fontSize', c.fontSize || 15)));
  const msgSpacing = subValue(c, 'messageList', 'gap', subValue(c, 'message', 'gap', c.msgSpacing ?? 2));
  const borderRadius = subValue(c, 'message', 'radius', c.borderRadius ?? (isMetal ? 10 : isGlowPanel ? 8 : isBH ? 14 : 12));
  const borderWidth = subValue(c, 'message', 'borderWidth', c.borderWidth ?? 1);
  const borderColor = subValue(c, 'message', 'borderColor', c.borderColor || (isMetal ? 'rgba(200,210,225,0.18)' : isGlowPanel ? 'rgba(34,211,238,0.22)' : isBH ? 'rgba(255,255,255,0.06)' : 'rgba(51,65,85,0.5)'));
  const containerRadius = subValue(c, 'container', 'radius', c.borderRadius ?? (isMetal ? 10 : isGlowPanel ? 8 : isBH ? 14 : 12));
  const containerBorderWidth = subValue(c, 'container', 'borderWidth', c.borderWidth ?? 1);
  const containerBorderColor = subValue(c, 'container', 'borderColor', c.borderColor || (isMetal ? 'rgba(200,210,225,0.18)' : isGlowPanel ? 'rgba(34,211,238,0.26)' : isBH ? 'rgba(255,255,255,0.06)' : 'rgba(51,65,85,0.5)'));
  const nameBold = c.nameBold ?? true;
  const msgLineHeight = subValue(c, 'messageText', 'lineHeight', subValue(c, 'message', 'lineHeight', c.msgLineHeight ?? 1.45));
  const msgPadH = subValue(c, 'message', 'padding', c.msgPadH ?? 10);
  const messageBg = subValue(c, 'message', 'background', c.cardBg || 'transparent');
  const usernameColor = subValue(c, 'username', 'textColor', headerText);
  const avatarBg = subValue(c, 'avatar', 'background', 'rgba(255,255,255,0.04)');
  const avatarText = subValue(c, 'avatar', 'textColor', usernameColor);
  const avatarBorder = subValue(c, 'avatar', 'borderColor', borderColor);
  const badgeBg = subValue(c, 'badge', 'background', 'rgba(129,140,248,0.15)');
  const badgeText = subValue(c, 'badge', 'textColor', usernameColor);

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
    glow_panel: 'rgba(2,8,18,0.94)',
    bh_stats: 'rgba(15, 23, 42, 0.9)',
  };
  const bgColor = subValue(c, 'container', 'background', c.bgColor || bgDefaults[chatStyle] || bgDefaults.classic);

  /* Which features each style shows */
  const showHeader = (chatStyle === 'classic' || chatStyle === 'cards' || chatStyle === 'metal' || chatStyle === 'glow_panel' || chatStyle === 'bh_stats') ? (c.showHeader !== false) : false;
  const showLegend = (chatStyle === 'classic') ? (c.showLegend !== false) : false;
  const showBadges = (chatStyle === 'classic' || chatStyle === 'metal' || chatStyle === 'glow_panel' || chatStyle === 'bh_stats') ? (c.showBadges !== false) : false;

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
  const autoChannel = useTwitchChannel();
  const resolvedTwitchChannel = c.twitchChannel || autoChannel || '';
  useTwitchChat(c.twitchEnabled ? resolvedTwitchChannel : '', handleMessage, { parseRaids: true });
  useYoutubeChat(
    c.youtubeEnabled ? c.youtubeVideoId : '',
    c.youtubeEnabled ? c.youtubeApiKey : '',
    handleMessage
  );
  useKickChat(c.kickEnabled ? c.kickChannelId : '', handleMessage);

  /* Auto-scroll */
  const previewMessages = Array.isArray(c.__appearancePreviewMessages) ? c.__appearancePreviewMessages : [];
  const renderMessages = messages.length > 0 ? messages : previewMessages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [renderMessages]);

  const allPlatforms = ['twitch', 'youtube', 'kick'];
  const enabledPlatforms = [];
  if (c.twitchEnabled) enabledPlatforms.push('twitch');
  if (c.youtubeEnabled) enabledPlatforms.push('youtube');
  if (c.kickEnabled) enabledPlatforms.push('kick');

  const brightness = subValue(c, 'container', 'brightness', c.brightness ?? 100);
  const contrast = subValue(c, 'container', 'contrast', c.contrast ?? 100);
  const saturation = subValue(c, 'container', 'saturation', c.saturation ?? 100);
  const filterStyle = (brightness !== 100 || contrast !== 100 || saturation !== 100)
    ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    : undefined;

  const headerPartStyle = (fallback = {}) => subElementStyle(c, 'header', fallback);
  const messageListStyle = (fallback = {}) => subElementStyle(c, 'messageList', fallback);
  const messagePartStyle = (fallback = {}) => subElementStyle(c, 'message', fallback);
  const messageTextStyle = (fallback = {}) => subElementStyle(c, 'messageText', fallback);
  const usernameStyle = (fallback = {}) => subElementStyle(c, 'username', fallback);
  const avatarStyle = (fallback = {}) => subElementStyle(c, 'avatar', fallback);
  const badgeStyle = (fallback = {}) => subElementStyle(c, 'badge', fallback);
  const legendStyle = (fallback = {}) => subElementStyle(c, 'platformLegend', fallback);

  /* ── Base wrapper style ── */
  const isTransparent = chatStyle === 'floating' || chatStyle === 'stack';
  const style = subElementStyle(c, 'container', {
    width: '100%',
    height: '100%',
    background: bgColor,
    border: isMetal
      ? `${containerBorderWidth}px solid ${containerBorderColor}`
      : isBH ? '1px solid rgba(255,255,255,0.06)'
      : (containerBorderWidth && !isTransparent) ? `${containerBorderWidth}px solid ${containerBorderColor}` : 'none',
    borderRadius: isTransparent ? 0 : `${containerRadius}px`,
    fontFamily,
    fontSize: `${fontSize}px`,
    color: textColor,
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
    '--chat-card-bg': messageBg || c.cardBg || 'rgba(20,15,40,0.85)',
    '--chat-card-border': borderColor || c.cardBorder || 'rgba(100,70,180,0.2)',
    '--chat-card-hover-bg': c.cardHoverBg || 'rgba(30,22,55,0.95)',
    '--chat-card-hover-border': c.cardHoverBorder || 'rgba(120,80,200,0.3)',
    '--chat-card-text': textColor || c.cardTextColor || '#e2e8f0',
    '--chat-header-bg': headerBg,
    '--chat-header-border': c.headerBorder || borderColor || 'rgba(100,70,180,0.15)',
    '--chat-header-label': headerText,
    '--chat-header-channel': c.headerChannelColor || '#d1d5db',
    '--chat-message-bg': messageBg,
    '--chat-message-text': textColor,
    '--chat-message-radius': `${borderRadius}px`,
    '--chat-username': usernameColor,
    '--chat-badge-bg': badgeBg,
    '--chat-badge-text': badgeText,
  });
  const rootStyle = isMetal ? {
    ...style,
    background: brushedMetalBackground(style.background || bgColor, headerText, { highlightOpacity: 0.06, grainOpacity: 0.03 }),
    borderColor: style.borderColor || metalBorderColor(headerText, 0.24),
    boxShadow: style.boxShadow || metalSurfaceShadow(headerText, 0.9),
  } : isGlowPanel ? {
    ...style,
    background: style.background || bgColor,
    border: `${containerBorderWidth}px solid ${containerBorderColor}`,
    boxShadow: style.boxShadow || `0 0 18px rgba(34,211,238,0.14), inset 0 1px 0 rgba(255,255,255,0.05)`,
  } : style;

  const modeClass = ` ov-chat-widget--${chatStyle}`;

  return (
    <div className={`ov-chat-widget${modeClass}`} {...partAttrs('container')} style={rootStyle}>
      <style>{`
        @keyframes ov-float-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ov-pop-in{from{opacity:0;transform:scale(0.8) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes ov-slide-left{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes ov-cursor-blink{0%,50%{opacity:1}51%,100%{opacity:0}}
        @keyframes ov-live-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.2)}}
      `}</style>

      {showHeader && chatStyle === 'cards' && (
        <div className="ov-cards-header" {...partAttrs('header')} style={headerPartStyle()}>
          <div className="ov-cards-header-left">
            <span className="ov-cards-live-dot" {...partAttrs('badge')} />
            <span className="ov-cards-header-label" {...partAttrs('header')}>CHAT</span>
          </div>
          <span className="ov-cards-header-channel" {...partAttrs('header')}>
            {(c.twitchChannel || autoChannel) ? (c.twitchChannel || autoChannel).toUpperCase() : 'CHANNEL'}
          </span>
        </div>
      )}

      {showHeader && chatStyle === 'metal' && (
        <div {...partAttrs('header')} style={headerPartStyle({
          padding: '8px 14px',
          background: brushedMetalBackground(headerBg, headerText, { highlightOpacity: 0.05, grainOpacity: 0.025 }),
          borderBottom: `1px solid ${metalBorderColor(headerText, 0.26)}`,
          display: 'flex', alignItems: 'center', gap: 8,
        })}>
          <span {...partAttrs('header')} style={{
            fontSize: '0.85em', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: headerText,
          }}>LIVE CHAT</span>
          <span {...partAttrs('badge')} style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.78em', fontWeight: 700, color: badgeText,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: badgeText,
              boxShadow: `0 0 6px ${badgeText}`,
              display: 'inline-block',
              animation: 'ov-live-pulse 2s ease-in-out infinite',
            }} />
            Live
          </span>
        </div>
      )}

      {showHeader && chatStyle === 'glow_panel' && (
        <div {...partAttrs('header')} style={headerPartStyle({
          padding: '9px 14px',
          background: headerBg,
          borderBottom: `${containerBorderWidth}px solid ${containerBorderColor}`,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 8px 18px rgba(2,8,18,0.28)',
        })}>
          <span {...partAttrs('badge')} style={badgeStyle({
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: headerText,
            boxShadow: `0 0 10px ${headerText}`,
            display: 'inline-block',
          })} />
          <span {...partAttrs('header')} style={{
            fontSize: '0.78em',
            fontWeight: 900,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: headerText,
            textShadow: `0 0 8px ${headerText}66`,
          }}>CHAT</span>
        </div>
      )}

      {showHeader && chatStyle === 'bh_stats' && (
        <div {...partAttrs('header')} style={headerPartStyle({
          padding: '10px 14px',
          background: headerBg,
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex', alignItems: 'center', gap: 6,
        })}>
          <span style={{ fontSize: '1.1em' }}>💬</span>
          <span style={{
            fontSize: '0.88em', fontWeight: 800, letterSpacing: '0.03em',
            color: headerText,
          }}>Live Chat</span>
          <span style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.7em', fontWeight: 700,
            background: badgeBg, color: badgeText,
            borderRadius: 99, padding: '2px 10px',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: badgeText,
              display: 'inline-block',
              animation: 'ov-live-pulse 2s ease-in-out infinite',
            }} />
            LIVE
          </span>
        </div>
      )}

      {showHeader && chatStyle !== 'cards' && chatStyle !== 'metal' && chatStyle !== 'glow_panel' && chatStyle !== 'bh_stats' && (
        <div className="ov-chat-header" {...partAttrs('header')} style={headerPartStyle({ background: headerBg, color: headerText })}>
          <span className="ov-chat-header-title" {...partAttrs('header')}>Live Chat</span>
          <div className="ov-chat-header-badges" {...partAttrs('badge')}>
            {allPlatforms.map(p => (
              <span key={p} className="ov-chat-platform-badge" {...partAttrs('badge')} style={badgeStyle({
                background: PLATFORM_META[p].color + (enabledPlatforms.includes(p) ? '33' : '15'),
                color: PLATFORM_META[p].color,
                opacity: enabledPlatforms.includes(p) ? 1 : 0.35,
              })}>
                {PLATFORM_META[p].icon}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="ov-chat-messages" {...partAttrs('messageList')} ref={scrollRef} style={messageListStyle({ lineHeight: msgLineHeight })}>
        {renderMessages.map((msg, msgIdx) => {
          const plt = PLATFORM_META[msg.platform] || PLATFORM_META.twitch;
          const nameColor = c.useNativeColors && msg.color ? msg.color : usernameColor;

          /* ── Raid message ── */
          if (msg.isRaid) {
            return <RaidMessage key={msg.id} msg={msg} chatStyle={chatStyle} msgSpacing={msgSpacing} msgPadH={msgPadH} c={c} />;
          }

          /* ── Style: Floating — transparent bg, floating pill bubbles ── */
          if (chatStyle === 'floating') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--floating" {...partAttrs('message')} style={messagePartStyle({
                padding: `${msgSpacing + 1}px 4px`, animation: 'ov-float-in 0.35s ease-out',
              })}>
                <div style={{
                  display: 'inline-flex', alignItems: 'flex-start', gap: 8,
                  background: messageBg || 'rgba(0,0,0,0.75)', borderRadius: borderRadius, padding: '6px 14px',
                  maxWidth: '92%',
                  border: `1px solid ${borderColor}`,
                }}>
                  <span {...partAttrs('avatar')} style={avatarStyle({
                    width: 22, height: 22, borderRadius: '50%',
                    background: avatarBg, color: avatarText,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.82em', fontWeight: 800, flexShrink: 0, marginTop: 1,
                  })}>{msg.username.charAt(0).toUpperCase()}</span>
                  <div style={{ minWidth: 0 }}>
                    <span {...partAttrs('username')} style={usernameStyle({ color: nameColor, fontWeight: 700, fontSize: '0.92em', lineHeight: 1.2, textShadow: '0 1px 3px rgba(0,0,0,0.5)' })}>{msg.username}</span>
                    <div {...partAttrs('messageText')} style={messageTextStyle({ color: textColor, lineHeight: 1.35, wordBreak: 'break-word', opacity: 0.92, textShadow: '0 1px 3px rgba(0,0,0,0.5)' })}>{msg.message}</div>
                  </div>
                </div>
              </div>
            );
          }

          /* ── Style: Bubble — social media speech bubbles with tail ── */
          if (chatStyle === 'bubble') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--bubble" {...partAttrs('message')} style={messagePartStyle({
                padding: `${msgSpacing + 1}px ${msgPadH}px`,
                animation: 'ov-pop-in 0.3s ease-out',
              })}>
                <div {...partAttrs('avatar')} style={avatarStyle({
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    background: avatarBg,
                    border: `1.5px solid ${avatarBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: avatarText, fontSize: '0.85em', fontWeight: 800,
                })}>{msg.username.charAt(0).toUpperCase()}</div>
                <div style={{ minWidth: 0, maxWidth: '85%' }}>
                  <span {...partAttrs('username')} style={usernameStyle({ color: nameColor, fontWeight: 700, fontSize: '0.88em', display: 'block', marginBottom: 2, textShadow: '0 1px 3px rgba(0,0,0,0.5)' })}>
                    {msg.username}
                  </span>
                  <div {...partAttrs('messageText')} style={messageTextStyle({
                    background: messageBg || 'rgba(255,255,255,0.06)', borderRadius: `${borderRadius}px ${borderRadius}px ${borderRadius}px 4px`,
                    padding: '7px 12px', position: 'relative',
                    border: `1px solid ${borderColor}`,
                  })}>
                    <span style={{ wordBreak: 'break-word', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{msg.message}</span>
                  </div>
                </div>
              </div>
            );
          }

          /* ── Style: Stack — msgs from bottom, newest = full opacity, old fades ── */
          if (chatStyle === 'stack') {
            const totalVisible = Math.min(renderMessages.length, 20);
            const age = renderMessages.length - 1 - msgIdx;
            const opacity = age < totalVisible ? 1 - (age / totalVisible) * 0.75 : 0.15;
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--stack" {...partAttrs('message')} style={messagePartStyle({
                padding: `${msgSpacing + 1}px ${msgPadH}px`,
                opacity, transition: 'opacity 0.5s ease',
                animation: age === 0 ? 'ov-float-in 0.3s ease-out' : 'none',
              })}>
                <span {...partAttrs('username')} style={usernameStyle({
                  color: nameColor, fontWeight: 700, fontSize: '0.95em', flexShrink: 0,
                })}>{msg.username}</span>
                <span style={{ color: borderColor, margin: '0 5px', flexShrink: 0 }}>›</span>
                <span {...partAttrs('messageText')} style={messageTextStyle({ wordBreak: 'break-word', opacity: 0.9, textShadow: '0 1px 3px rgba(0,0,0,0.5)' })}>{msg.message}</span>
              </div>
            );
          }

          /* ── Style: Typewriter — terminal / monospace green-on-dark ── */
          if (chatStyle === 'typewriter') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--typewriter" {...partAttrs('message')} style={messagePartStyle({
                padding: `${msgSpacing}px ${msgPadH}px`,
                fontFamily: "'Fira Code', 'JetBrains Mono', 'Courier New', monospace",
                animation: 'ov-slide-left 0.25s ease-out',
              })}>
                <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.92em', opacity: 0.7 }}>{'>'}</span>
                <span {...partAttrs('username')} style={usernameStyle({ color: nameColor, fontWeight: 700, fontSize: '0.95em', marginLeft: 4, textShadow: '0 1px 3px rgba(0,0,0,0.5)' })}>{msg.username}</span>
                <span style={{ color: 'rgba(74,222,128,0.3)', margin: '0 6px' }}>$</span>
                <span {...partAttrs('messageText')} style={messageTextStyle({ color: '#d1fae5', wordBreak: 'break-word', opacity: 0.85, textShadow: '0 1px 3px rgba(0,0,0,0.5)' })}>{msg.message}</span>
              </div>
            );
          }

          /* ── Style: Sidebar — vertical strip with platform color border ── */
          if (chatStyle === 'sidebar') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--sidebar" {...partAttrs('message')} style={messagePartStyle({
                padding: `${msgSpacing + 2}px ${msgPadH}px`,
                borderLeft: `3px solid ${plt.color}`,
                animation: 'ov-slide-left 0.3s ease-out',
                display: 'flex', flexDirection: 'column', gap: 1,
              })}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span {...partAttrs('badge')} style={badgeStyle({
                    fontSize: '0.78em', fontWeight: 800, color: plt.color,
                    textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7, textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  })}>{plt.label}</span>
                  <span {...partAttrs('username')} style={usernameStyle({ color: nameColor, fontWeight: 700, fontSize: '0.92em', textShadow: '0 1px 3px rgba(0,0,0,0.5)' })}>{msg.username}</span>
                </div>
                <span {...partAttrs('messageText')} style={messageTextStyle({ color: textColor, wordBreak: 'break-word', opacity: 0.88, paddingLeft: 1, textShadow: '0 1px 3px rgba(0,0,0,0.5)' })}>{msg.message}</span>
              </div>
            );
          }

          /* ── Style: Cards — dark card per message with Twitch badge pills ── */
          if (chatStyle === 'cards') {
            const nameClr = c.useNativeColors && msg.color ? msg.color : usernameColor;
            const isRaider = !!msg.isRaidParticipant;
            return (
              <div key={msg.id} className="ov-cards-msg" {...partAttrs('message')} style={messagePartStyle({
                animation: 'ov-cards-slide-in 0.3s ease-out',
              })}>
                <div className="ov-cards-msg-header">
                  <span className="ov-cards-username" {...partAttrs('username')} style={usernameStyle({ color: nameClr })}>@{msg.username}</span>
                  <div className="ov-cards-badges" {...partAttrs('badge')}>
                    <TwitchBadges msg={msg} config={c} />
                    {isRaider && (
                      <span className="ov-cards-badge" {...partAttrs('badge')} style={{ background: '#7c3aed' }}>
                        <span className="ov-cards-badge-icon">⚔️</span> RAID
                      </span>
                    )}
                  </div>
                </div>
                <div className="ov-cards-msg-text" {...partAttrs('messageText')} style={messageTextStyle()}>{msg.message}</div>
              </div>
            );
          }

          /* ── Style: Metal — brushed steel look ── */
          if (chatStyle === 'metal') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--metal" {...partAttrs('message')} style={messagePartStyle({
                padding: `${msgSpacing + 1}px ${msgPadH}px`,
                animation: 'ov-float-in 0.25s ease-out',
                borderBottom: `${Number(borderWidth) || 1}px solid ${borderColor}`,
                background: brushedMetalBackground(messageBg || 'rgba(34,36,42,0.34)', headerText, { highlightOpacity: 0.035, grainOpacity: 0.02 }),
              })}>
                {showBadges && (
                  <span {...partAttrs('badge')} style={badgeStyle({
                    background: badgeBg,
                    color: badgeText, fontSize: '0.82em', fontWeight: 800,
                    padding: '2px 6px', borderRadius: 3, marginRight: 6,
                    border: `1px solid ${borderColor}`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                  })}>{plt.icon}</span>
                )}
                <div className="ov-chat-msg-body" {...partAttrs('message')}>
                  <span {...partAttrs('username')} style={usernameStyle({
                    fontWeight: 700, fontSize: '0.95em',
                    color: nameColor,
                    marginRight: 6,
                  })}>{msg.username}</span>
                  <span {...partAttrs('messageText')} style={messageTextStyle({ color: textColor, textShadow: '0 1px 2px rgba(0,0,0,0.5)' })}>{msg.message}</span>
                </div>
              </div>
            );
          }

          /* ── Style: Glow Panel — compact dark chat like stream panels ── */
          if (chatStyle === 'glow_panel') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--glow-panel" {...partAttrs('message')} style={messagePartStyle({
                padding: `${Math.max(2, msgSpacing + 1)}px ${msgPadH}px`,
                animation: 'ov-slide-left 0.22s ease-out',
                background: messageBg || 'transparent',
                borderBottom: borderWidth ? `${Math.max(1, Number(borderWidth) || 1)}px solid rgba(34,211,238,0.045)` : 'none',
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
              })}>
                {showBadges && msg.badges?.length > 0 && (
                  <span {...partAttrs('badge')} style={badgeStyle({
                    color: badgeText,
                    background: badgeBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 3,
                    padding: '1px 5px',
                    fontSize: '0.72em',
                    fontWeight: 800,
                    flexShrink: 0,
                  })}>{plt.icon}</span>
                )}
                <span {...partAttrs('username')} style={usernameStyle({
                  color: nameColor,
                  fontWeight: nameBold ? 900 : 700,
                  textShadow: `0 0 8px ${nameColor}55`,
                  flexShrink: 0,
                })}>{msg.username}:</span>
                <span {...partAttrs('messageText')} style={messageTextStyle({
                  color: textColor,
                  wordBreak: 'break-word',
                  lineHeight: msgLineHeight,
                  textShadow: '0 1px 2px rgba(0,0,0,0.55)',
                  minWidth: 0,
                })}>{msg.message}</span>
              </div>
            );
          }

          /* ── Style: BH Stats — matches Bonus Hunt stats widget ── */
          if (chatStyle === 'bh_stats') {
            return (
              <div key={msg.id} className="ov-chat-msg ov-chat-msg--bh-stats" {...partAttrs('message')} style={messagePartStyle({
                padding: `${msgSpacing + 2}px ${msgPadH}px`,
                animation: 'ov-float-in 0.3s ease-out',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              })}>
                {/* Avatar circle */}
                <span {...partAttrs('avatar')} style={avatarStyle({
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  background: avatarBg,
                  border: `1px solid ${avatarBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: avatarText, fontSize: '0.78em', fontWeight: 800,
                })}>{msg.username.charAt(0).toUpperCase()}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span {...partAttrs('username')} style={usernameStyle({
                    color: nameColor, fontWeight: 700, fontSize: '0.88em',
                    marginRight: 6,
                  })}>{msg.username}</span>
                  {showBadges && (
                    <span {...partAttrs('badge')} style={badgeStyle({
                      background: badgeBg, color: badgeText,
                      fontSize: '0.68em', fontWeight: 700, padding: '1px 5px',
                      borderRadius: 4, marginRight: 4, verticalAlign: 'middle',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    })}>{plt.icon}</span>
                  )}
                  <div {...partAttrs('messageText')} style={messageTextStyle({
                    color: textColor, wordBreak: 'break-word', lineHeight: 1.4,
                    marginTop: 2, opacity: 0.92,
                  })}>{msg.message}</div>
                </div>
              </div>
            );
          }

          /* ── Default: Classic ── */
          return (
            <div key={msg.id} className="ov-chat-msg" {...partAttrs('message')} style={messagePartStyle({ padding: `${msgSpacing}px ${msgPadH}px` })}>
              {showBadges && (
                <span className="ov-chat-badge" {...partAttrs('badge')} style={badgeStyle({
                  background: plt.color + '33',
                  color: plt.color,
                })}>{plt.icon}</span>
              )}
              <div className="ov-chat-msg-body" {...partAttrs('message')}>
                <span className="ov-chat-username" {...partAttrs('username')} style={usernameStyle({ color: nameColor, fontWeight: nameBold ? 700 : 500 })}>
                  {msg.username}
                </span>
                <span className="ov-chat-text" {...partAttrs('messageText')} style={messageTextStyle()}>{msg.message}</span>
              </div>
            </div>
          );
        })}
      </div>

      {showLegend && (
        <div className="ov-chat-legend" {...partAttrs('platformLegend')} style={legendStyle({ background: headerBg })}>
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
  const raidBg = subValue(c, 'highlightedMessage', 'background', c.raidBgColor || '#7c3aed');
  const raidBorder = subValue(c, 'highlightedMessage', 'borderColor', c.raidBorderColor || '#64748b');
  const raidText = subValue(c, 'highlightedMessage', 'textColor', c.raidTextColor || '#ffffff');
  const showAvatar = c.showRaidAvatar !== false;
  const highlightedStyle = (fallback = {}) => subElementStyle(c, 'highlightedMessage', fallback);
  const raidUsernameStyle = (fallback = {}) => subElementStyle(c, 'username', fallback);
  const raidAvatarStyle = (fallback = {}) => subElementStyle(c, 'avatar', fallback);
  const raidBadgeStyle = (fallback = {}) => subElementStyle(c, 'badge', fallback);

  /* ── Cards style raid ── */
  if (chatStyle === 'cards') {
    return (
      <div className="ov-cards-msg ov-cards-msg--raid" {...partAttrs('highlightedMessage')} style={highlightedStyle({
        animation: 'ov-cards-slide-in 0.35s ease-out',
      })}>
        <div className="ov-cards-msg-header">
          <span className="ov-cards-username" {...partAttrs('username')} style={raidUsernameStyle({ color: '#cbd5e1' })}>@{msg.username}</span>
          <div className="ov-cards-badges" {...partAttrs('badge')}>
            <span className="ov-cards-badge" {...partAttrs('badge')} style={raidBadgeStyle({ background: '#7c3aed' })}>
              <span className="ov-cards-badge-icon">⚔️</span> RAID
            </span>
            {msg.raidViewers > 0 && (
              <span className="ov-cards-badge" {...partAttrs('badge')} style={raidBadgeStyle({ background: 'rgba(100,116,139,0.5)' })}>
                👥 {msg.raidViewers}
              </span>
            )}
          </div>
        </div>
        <div className="ov-cards-msg-text" {...partAttrs('highlightedMessage')} style={highlightedStyle({ color: '#f5f3ff' })}>{msg.message}</div>
      </div>
    );
  }

  if (chatStyle === 'floating' || chatStyle === 'stack') {
    return (
      <div className="ov-chat-msg ov-chat-raid" {...partAttrs('highlightedMessage')} style={highlightedStyle({
        padding: `${msgSpacing + 2}px 4px`, animation: 'ov-float-in 0.4s ease-out',
      })}>
        <div {...partAttrs('highlightedMessage')} style={highlightedStyle({
          display: 'inline-flex', flexDirection: 'column',
          background: raidBg, borderRadius: 16,
          padding: '8px 14px', maxWidth: '90%', backdropFilter: 'blur(4px)',
          border: `1px solid ${raidBorder}`,
        })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: '0.75em', fontWeight: 700, color: raidText }}>⚔️ RAID</span>
            <span style={{ fontWeight: 700, color: raidText }}>{msg.username}</span>
            {msg.raidViewers > 0 && <span style={{ fontSize: '0.8em', color: '#c4b5fd' }}>👥 {msg.raidViewers}</span>}
          </div>
          <span style={{ color: raidText }}>{msg.message}</span>
        </div>
      </div>
    );
  }

  if (chatStyle === 'typewriter') {
    return (
      <div className="ov-chat-msg ov-chat-raid" {...partAttrs('highlightedMessage')} style={highlightedStyle({
        padding: `${msgSpacing + 2}px ${msgPadH}px`,
        fontFamily: "'Fira Code', monospace",
        background: raidBg, borderLeft: `3px solid ${raidBorder}`,
        animation: 'ov-slide-left 0.25s ease-out',
      })}>
        <span style={{ color: raidText }}>⚔️ [RAID]</span>
        <span style={{ color: raidText, fontWeight: 700, marginLeft: 6 }}>{msg.username}</span>
        <span style={{ color: raidText, marginLeft: 6 }}>{msg.message}</span>
        {msg.raidViewers > 0 && <span style={{ color: '#94a3b8', marginLeft: 6 }}>({msg.raidViewers})</span>}
      </div>
    );
  }

  if (chatStyle === 'sidebar') {
    return (
      <div className="ov-chat-msg ov-chat-raid" {...partAttrs('highlightedMessage')} style={highlightedStyle({
        padding: `${msgSpacing + 3}px ${msgPadH}px`,
        borderLeft: '3px solid #64748b', background: 'rgba(148,163,184,0.14)',
        animation: 'ov-slide-left 0.3s ease-out',
      })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.7em', fontWeight: 800, color: '#cbd5e1' }}>⚔️ RAID</span>
          <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{msg.username}</span>
          {msg.raidViewers > 0 && <span style={{ fontSize: '0.8em', color: '#c4b5fd' }}>👥 {msg.raidViewers}</span>}
        </div>
        <span style={{ color: '#f5f3ff', paddingLeft: 1 }}>{msg.message}</span>
      </div>
    );
  }

  /* Default raid (classic, bubble) */
  return (
    <div className="ov-chat-msg ov-chat-raid" {...partAttrs('highlightedMessage')} style={highlightedStyle({
      padding: `${msgSpacing + 4}px 10px`,
      background: raidBg, border: `2px solid ${raidBorder}`,
      borderRadius: '8px', margin: `${msgSpacing}px 6px`,
      display: 'flex', alignItems: 'center', gap: '10px',
      animation: 'ov-raid-glow 2s ease-in-out 3',
    })}>
      {showAvatar && msg.raidAvatar && (
        <img {...partAttrs('avatar')} src={msg.raidAvatar} alt={msg.username} className="ov-chat-raid-avatar" style={raidAvatarStyle({
          width: '42px', height: '42px', borderRadius: '50%',
          border: `2px solid ${raidBorder}`, flexShrink: 0,
        })} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span {...partAttrs('badge')} style={raidBadgeStyle({
            background: '#64748b33', color: '#cbd5e1', padding: '1px 6px',
            borderRadius: '4px', fontSize: '0.75em', fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase',
          })}>⚔️ RAID</span>
          <span className="ov-chat-username" {...partAttrs('username')} style={raidUsernameStyle({ color: raidText, fontWeight: 700, fontSize: '1.05em' })}>
            {msg.username}
          </span>
        </div>
        <span className="ov-chat-text" {...partAttrs('highlightedMessage')} style={{ color: raidText, opacity: 0.92 }}>{msg.message}</span>
      </div>
      {msg.raidViewers > 0 && (
        <span style={{
          background: '#64748b44', color: '#e2e8f0', padding: '2px 8px',
          borderRadius: '12px', fontSize: '0.8em', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
        }}>👥 {msg.raidViewers}</span>
      )}
    </div>
  );
}

export default React.memo(ChatWidget);
