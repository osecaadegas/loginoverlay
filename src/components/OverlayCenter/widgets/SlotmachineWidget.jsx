import React from 'react';

export default function SlotmachineWidget({ config }) {
  const c = config || {};
  const bg = c.bgColor || '#13151e';
  const cardBg = c.cardBg || 'rgba(255,255,255,0.06)';
  const border = c.borderColor || 'rgba(255,255,255,0.12)';
  const accent = c.accentColor || '#f59e0b';
  const text = c.textColor || '#ffffff';
  const font = c.fontFamily || "'Inter', sans-serif";
  const radius = c.borderRadius ?? 10;
  const reels = c.reels || ['🍒', '🍒', '🍒'];

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: bg, borderRadius: radius, fontFamily: font,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <style>{`
        @keyframes sm-spin { 0% { transform: translateY(-20px); opacity: 0.5; } 50% { transform: translateY(10px); } 100% { transform: translateY(0); opacity: 1; } }
      `}</style>
      <div style={{
        display: 'flex', gap: 6, padding: 8,
        background: 'rgba(0,0,0,0.3)', borderRadius: radius,
        border: `1px solid ${border}`,
      }}>
        {reels.map((sym, i) => (
          <div key={i} style={{
            width: 'clamp(40px, 25%, 80px)', aspectRatio: '1',
            background: cardBg, borderRadius: Math.max(radius - 4, 4),
            border: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'clamp(20px, 6vw, 40px)',
            animation: c.spinning ? `sm-spin 0.3s ease-out ${i * 0.15}s both` : 'none',
          }}>
            {sym}
          </div>
        ))}
      </div>
      {c.label && (
        <div style={{ fontSize: 12, fontWeight: 600, color: text, textAlign: 'center' }}>
          {c.label}
        </div>
      )}
    </div>
  );
}
