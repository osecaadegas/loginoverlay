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

  const accent = c.accentColor || '#f59e0b';
  const textColor = c.textColor || '#ffffff';
  const mutedColor = c.mutedColor || '#94a3b8';
  const bgColor = c.bgColor || 'transparent';
  const cardBg = c.cardBg || 'rgba(255,255,255,0.04)';
  const borderColor = c.borderColor || 'rgba(255,255,255,0.08)';
  const showRequester = c.showRequester !== false;
  const showNumbers = c.showNumbers !== false;
  const fontFamily = c.fontFamily || "'Poppins', sans-serif";
  const configFontSize = c.fontSize ? Number(c.fontSize) : null;
  const fontWeight = c.fontWeight || '600';

  /* ── Responsive font sizing (fallback when no manual size set) ── */
  useEffect(() => {
    if (configFontSize || !containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        const min = Math.min(w, h);
        const fs = Math.max(10, Math.min(18, min * 0.035 + 5));
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
        <span style={{ fontSize: fs * 0.95, fontWeight: Number(fontWeight), letterSpacing: '0.02em' }}>
          Slot Requests
        </span>
        {requests.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            fontSize: fs * 0.7,
            background: accent,
            color: '#000',
            borderRadius: 99,
            padding: `${fs * 0.1}px ${fs * 0.4}px`,
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
            }}
          >
            {showNumbers && (
              <span style={{
                fontSize: fs * 0.75,
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
              }}>
                {r.slot_name}
              </span>
              {showRequester && r.requested_by && r.requested_by !== 'anonymous' && (
                <span style={{
                  fontSize: fs * 0.7,
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
