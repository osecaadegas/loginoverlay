import React from 'react';

function SessionStatsWidget({ config }) {
  const c = config || {};
  const bg = c.bgColor || '#13151e';
  const cardBg = c.cardBg || 'rgba(255,255,255,0.04)';
  const border = c.borderColor || 'rgba(255,255,255,0.08)';
  const accent = c.accentColor || '#f59e0b';
  const text = c.textColor || '#ffffff';
  const muted = c.mutedColor || '#94a3b8';
  const font = c.fontFamily || "'Inter', sans-serif";
  const radius = c.borderRadius ?? 10;
  const profit = (c.profit || 0);
  const profitColor = profit >= 0 ? '#22c55e' : '#ef4444';

  const stats = [
    { icon: '💰', label: 'Wagered', value: `${c.currency || '€'}${(c.wagered || 0).toLocaleString()}`, color: text },
    { icon: '🏆', label: 'Won', value: `${c.currency || '€'}${(c.won || 0).toLocaleString()}`, color: accent },
    { icon: '📊', label: 'Profit', value: `${profit >= 0 ? '+' : ''}${c.currency || '€'}${profit.toLocaleString()}`, color: profitColor },
    { icon: '⭐', label: 'Best Win', value: `${c.currency || '€'}${(c.bestWin || 0).toLocaleString()}`, color: accent },
    { icon: '🔥', label: 'Best Multi', value: `${(c.bestMulti || 0).toFixed(2)}x`, color: '#facc15' },
    { icon: '🎰', label: 'Slots Played', value: c.slotsPlayed || 0, color: text },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: bg, borderRadius: radius, fontFamily: font,
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 4, padding: 6,
    }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: cardBg, borderRadius: Math.max(radius - 2, 4),
          border: `1px solid ${border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '8px 4px', gap: 2, minWidth: 0,
        }}>
          <span style={{ fontSize: 16 }}>{s.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{s.label}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: font, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

export default React.memo(SessionStatsWidget);
