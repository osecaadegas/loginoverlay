import React from 'react';

export default function RandomSlotPickerWidget({ config }) {
  const c = config || {};
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
      width: '100%', height: '100%', overflow: 'hidden',
      background: bg, borderRadius: radius, fontFamily: font,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <style>{`
        @keyframes rsp-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      `}</style>
      {c.selectedSlot ? (
        <>
          <div style={{
            width: 'min(80%, 160px)', aspectRatio: '16 / 10', borderRadius: radius,
            overflow: 'hidden', border: `2px solid ${accent}`,
            boxShadow: `0 4px 20px ${accent}33`,
            animation: c.picking ? 'rsp-pulse 0.4s ease-in-out infinite' : 'none',
          }}>
            {c.selectedSlot.image ? (
              <img src={c.selectedSlot.image} alt={c.selectedSlot.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: cardBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🎰</div>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: text, textAlign: 'center', padding: '0 8px' }}>
            {c.selectedSlot.name}
          </div>
        </>
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          color: muted, animation: c.picking ? 'rsp-pulse 0.3s ease-in-out infinite' : 'none',
        }}>
          <span style={{ fontSize: 32 }}>🎲</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Random Slot Picker</span>
        </div>
      )}
    </div>
  );
}
