/**
 * SlotRequestsWidget.jsx — Overlay widget showing chat slot requests.
 * Viewers use !sr <slot> in chat; requests appear here in order.
 * Subscribes to Supabase realtime for live updates.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';

const DEFAULT_IMG = 'https://i.imgur.com/8E3ucNx.png';

export default function SlotRequestsWidget({ config, userId }) {
  const c = config || {};
  const [requests, setRequests] = useState([]);
  const containerRef = useRef(null);
  const [fontSize, setFontSize] = useState(14);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const maxDisplay = c.maxDisplay || 10;
  const accent = c.accentColor || '#f59e0b';
  const textColor = c.textColor || '#ffffff';
  const mutedColor = c.mutedColor || '#94a3b8';
  const bgColor = c.bgColor || 'transparent';
  const cardBg = c.cardBg || 'rgba(255,255,255,0.04)';
  const borderColor = c.borderColor || 'rgba(255,255,255,0.08)';
  const showRequester = c.showRequester !== false;
  const showNumbers = c.showNumbers !== false;
  const fontFamily = c.fontFamily || "'Inter', sans-serif";

  /* ── Fetch initial requests ── */
  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from('slot_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(maxDisplay);
    if (data) setRequests(data);
  }, [maxDisplay]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  /* ── Realtime subscription ── */
  useEffect(() => {
    const channel = supabase
      .channel('slot-requests-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slot_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests]);

  /* ── Twitch IRC listener (anonymous, read-only) ── */
  useEffect(() => {
    const raw = c.twitchChannel;
    if (!raw || !userId) return;
    const ch = raw.trim().toLowerCase().replace(/^#/, '');
    if (!ch) return;

    let alive = true;
    let ws;

    const connect = () => {
      if (!alive) return;
      ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      wsRef.current = ws;
      ws.onopen = () => {
        ws.send('PASS SCHMOOPIIE');
        ws.send('NICK justinfan' + Math.floor(Math.random() * 100000));
        ws.send('JOIN #' + ch);
      };
      ws.onmessage = async (event) => {
        for (const line of event.data.split('\r\n')) {
          if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
          const m = line.match(/:(\w+)!\w+@[\w.]+\.tmi\.twitch\.tv PRIVMSG #\w+ :!sr (.+)/i);
          if (m) {
            const slotName = m[2].trim();
            if (slotName) {
              try {
                await fetch(`${window.location.origin}/api/chat-commands?cmd=sr&user_id=${encodeURIComponent(userId)}&requester=${encodeURIComponent(m[1])}&slot=${encodeURIComponent(slotName)}`);
              } catch {}
            }
          }
        }
      };
      ws.onclose = () => { if (alive) reconnectTimer.current = setTimeout(connect, 5000); };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      alive = false;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, [c.twitchChannel, userId]);

  /* ── Responsive font sizing ── */
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        const min = Math.min(w, h);
        // Scale font: 10px at 150px, up to 18px at 600px+
        const fs = Math.max(10, Math.min(18, min * 0.035 + 5));
        setFontSize(fs);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const imgSize = Math.max(24, fontSize * 2.2);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: bgColor,
        fontFamily,
        color: textColor,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 8,
      }}
    >
      {/* Header */}
      <div style={{
        padding: `${fontSize * 0.5}px ${fontSize * 0.7}px`,
        display: 'flex',
        alignItems: 'center',
        gap: fontSize * 0.4,
        borderBottom: `1px solid ${borderColor}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: fontSize * 1.2 }}>🎰</span>
        <span style={{ fontSize: fontSize * 0.95, fontWeight: 700, letterSpacing: '0.02em' }}>
          Slot Requests
        </span>
        {requests.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            fontSize: fontSize * 0.7,
            background: accent,
            color: '#000',
            borderRadius: 99,
            padding: `${fontSize * 0.1}px ${fontSize * 0.4}px`,
            fontWeight: 700,
            lineHeight: 1.4,
          }}>
            {requests.length}
          </span>
        )}
      </div>

      {/* List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: `${fontSize * 0.3}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: fontSize * 0.25,
      }}>
        {requests.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: mutedColor,
            fontSize: fontSize * 0.85,
            opacity: 0.6,
          }}>
            No requests yet — viewers type !sr &lt;slot&gt;
          </div>
        )}

        {requests.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: fontSize * 0.5,
              padding: `${fontSize * 0.35}px ${fontSize * 0.5}px`,
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: fontSize * 0.4,
              transition: 'opacity 0.3s',
            }}
          >
            {/* Number */}
            {showNumbers && (
              <span style={{
                fontSize: fontSize * 0.75,
                fontWeight: 800,
                color: accent,
                minWidth: fontSize * 1.2,
                textAlign: 'center',
                flexShrink: 0,
              }}>
                #{i + 1}
              </span>
            )}

            {/* Slot image */}
            <img
              src={r.slot_image || DEFAULT_IMG}
              alt=""
              style={{
                width: imgSize,
                height: imgSize,
                borderRadius: fontSize * 0.3,
                objectFit: 'cover',
                flexShrink: 0,
                background: 'rgba(0,0,0,0.3)',
              }}
              onError={e => { e.target.src = DEFAULT_IMG; }}
            />

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{
                fontSize,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.3,
              }}>
                {r.slot_name}
              </span>
              {showRequester && r.requested_by && r.requested_by !== 'anonymous' && (
                <span style={{
                  fontSize: fontSize * 0.7,
                  color: mutedColor,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.2,
                }}>
                  by {r.requested_by}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
