/**
 * SlotRequestsWidgetFloat.jsx — Floating card list, no background.
 * Each request is a standalone card with a large image.
 */
import React, { useRef, useEffect, useState } from 'react';

const DEFAULT_IMG = 'https://i.imgur.com/8E3ucNx.png';

export default function SlotRequestsWidgetFloat({ config, requests }) {
  const c = config || {};
  const containerRef = useRef(null);
  const [fontSize, setFontSize] = useState(14);

  const accent = c.accentColor || '#f59e0b';
  const textColor = c.textColor || '#ffffff';
  const mutedColor = c.mutedColor || '#94a3b8';
  const showRequester = c.showRequester !== false;
  const showNumbers = c.showNumbers !== false;
  const fontFamily = c.fontFamily || "'Poppins', sans-serif";
  const configFontSize = c.fontSize ? Number(c.fontSize) : null;
  const fontWeight = c.fontWeight || '700';

  useEffect(() => {
    if (configFontSize || !containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const min = Math.min(entry.contentRect.width, entry.contentRect.height);
        setFontSize(Math.max(13, Math.min(18, min * 0.035 + 5)));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [configFontSize]);

  const fs = configFontSize || fontSize;
  const imgSize = Math.max(40, fs * 3.6);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
        fontFamily,
        color: textColor,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: `${fs * 0.4}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: fs * 0.5,
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
            No requests yet — viewers type !sr
          </div>
        )}

        {requests.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: fs * 0.6,
              padding: `${fs * 0.45}px ${fs * 0.6}px`,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: fs * 0.6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            {showNumbers && (
              <span style={{
                fontSize: fs * 0.8,
                fontWeight: 800,
                color: accent,
                minWidth: fs * 1.4,
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
                borderRadius: fs * 0.4,
                objectFit: 'cover',
                flexShrink: 0,
                border: `2px solid rgba(255,255,255,0.1)`,
              }}
              onError={e => { e.target.src = DEFAULT_IMG; }}
            />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{
                fontSize: fs * 1.05,
                fontWeight: Number(fontWeight),
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.3,
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
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
