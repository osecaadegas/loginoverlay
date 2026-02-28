import React from 'react';

export default function RecentWinsWidget({ config }) {
  const c = config || {};
  const wins = c.wins || [];
  const bg = c.bgColor || '#13151e';
  const cardBg = c.cardBg || 'rgba(255,255,255,0.04)';
  const border = c.borderColor || 'rgba(255,255,255,0.08)';
  const accent = c.accentColor || '#f59e0b';
  const text = c.textColor || '#ffffff';
  const muted = c.mutedColor || '#94a3b8';
  const font = c.fontFamily || "'Inter', sans-serif";
  const radius = c.borderRadius ?? 10;

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'auto',
      background: bg, borderRadius: radius, fontFamily: font,
      display: 'flex', flexDirection: 'column', padding: 8, gap: 4,
    }}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: accent, textTransform: 'uppercase',
        letterSpacing: '1px', padding: '0 4px 4px', borderBottom: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
        <span>🏅</span> Recent Wins
      </div>
      {wins.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, fontSize: 12 }}>
          No wins yet
        </div>
      )}
      {wins.slice(0, c.maxDisplay || 5).map((w, i) => (
        <div key={i} style={{
          background: cardBg, borderRadius: Math.max(radius - 4, 4),
          border: `1px solid ${border}`, padding: '6px 8px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: text, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {w.slot || 'Unknown'}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: accent, flexShrink: 0 }}>
            {c.currency || '€'}{(w.amount || 0).toLocaleString()}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#facc15', flexShrink: 0 }}>
            {(w.multi || 0).toFixed(2)}x
          </span>
        </div>
      ))}
    </div>
  );
}
