/**
 * SlotRequestsWidgetList.jsx — Classic list overlay for slot requests.
 * Simple scrollable queue with slot images, names and requesters.
 */
import React, { useRef, useEffect, useState } from 'react';

const DEFAULT_IMG = 'https://i.imgur.com/8E3ucNx.png';

export default function SlotRequestsWidgetList({ config, requests }) {
  const c = config || {};
  const containerRef = useRef(null);
  const [fontSize, setFontSize] = useState(14);
  const isMetal = (c.displayStyle || 'v1') === 'metal';

  const accent = isMetal ? '#a8b0c0' : (c.accentColor || '#f59e0b');
  const textColor = isMetal ? '#d4d8e0' : (c.textColor || '#ffffff');
  const mutedColor = isMetal ? '#7a8090' : (c.mutedColor || '#94a3b8');
  const bgColor = isMetal ? 'linear-gradient(145deg, #2a2d33 0%, #1a1c20 40%, #2e3238 100%)' : (c.bgColor || 'transparent');
  const cardBg = isMetal ? 'linear-gradient(160deg, rgba(180,185,195,0.12) 0%, rgba(120,125,135,0.06) 100%)' : (c.cardBg || 'rgba(255,255,255,0.04)');
  const borderColor = isMetal ? 'rgba(200,210,225,0.12)' : (c.borderColor || 'rgba(255,255,255,0.08)');
  const showRequester = c.showRequester !== false;
  const showNumbers = c.showNumbers !== false;
  const fontFamily = c.fontFamily || "'Poppins', sans-serif";
  const configFontSize = c.fontSize ? Number(c.fontSize) : null;
  const fontWeight = c.fontWeight || '700';

  /* ── Responsive font sizing (fallback when no manual size set) ── */
  useEffect(() => {
    if (configFontSize || !containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        const min = Math.min(w, h);
        const fs = Math.max(13, Math.min(18, min * 0.035 + 5));
        setFontSize(fs);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [configFontSize]);

  const fs = configFontSize || fontSize;
  const imgSize = Math.max(24, fs * 2.2);

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
        ...(isMetal && {
          border: '1px solid rgba(200,210,225,0.18)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        }),
      }}
    >
      {/* Header */}
      <div style={{
        padding: `${fs * 0.5}px ${fs * 0.7}px`,
        display: 'flex',
        alignItems: 'center',
        gap: fs * 0.4,
        borderBottom: `1px solid ${borderColor}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: fs * 1.2 }}>🎰</span>
        <span style={{
          fontSize: fs * 0.95, fontWeight: Number(fontWeight), letterSpacing: isMetal ? '0.14em' : '0.02em',
          ...(isMetal && {
            background: 'linear-gradient(90deg, #c8ccd4, #e8ecf4, #a0a8b8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            textTransform: 'uppercase',
          }),
        }}>
          Slot Requests
        </span>
        {requests.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            fontSize: fs * 0.78,
            background: isMetal ? 'linear-gradient(135deg, #555a65, #3a3e48)' : accent,
            color: isMetal ? '#d4d8e0' : '#000',
            borderRadius: 99,
            padding: `${fs * 0.1}px ${fs * 0.4}px`,
            fontWeight: 700,
            lineHeight: 1.4,
            ...(isMetal && {
              border: '1px solid rgba(200,210,225,0.2)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }),
          }}>
            {requests.length}
          </span>
        )}
      </div>

      {/* List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: `${fs * 0.3}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: fs * 0.25,
      }}>
        {requests.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: mutedColor,
            fontSize: fs * 0.85,
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
              gap: fs * 0.5,
              padding: `${fs * 0.35}px ${fs * 0.5}px`,
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: fs * 0.4,
              transition: 'opacity 0.3s',
              ...(isMetal && {
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 8px rgba(0,0,0,0.35)',
              }),
            }}
          >
            {showNumbers && (
              <span style={{
                fontSize: fs * 0.78,
                fontWeight: 800,
                color: accent,
                minWidth: fs * 1.2,
                textAlign: 'center',
                flexShrink: 0,
              }}>
                #{i + 1}
              </span>
            )}
            <img
              src={r.slot_image || DEFAULT_IMG}
              alt=""
              style={{
                width: imgSize,
                height: imgSize,
                borderRadius: fs * 0.3,
                objectFit: 'cover',
                flexShrink: 0,
                background: 'rgba(0,0,0,0.3)',
              }}
              onError={e => { e.target.src = DEFAULT_IMG; }}
            />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{
                fontSize: fs,
                fontWeight: Number(fontWeight),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.3,
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                ...(isMetal && {
                  background: 'linear-gradient(90deg, #c8ccd4, #e8ecf4, #a0a8b8)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  textShadow: 'none',
                }),
              }}>
                {r.slot_name}
              </span>
              {showRequester && r.requested_by && r.requested_by !== 'anonymous' && (
                <span style={{
                  fontSize: fs * 0.78,
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
