import React from 'react';

export default function CoinFlipWidget({ config }) {
  const c = config || {};
  const bg = c.bgColor || '#13151e';
  const accent = c.accentColor || '#f59e0b';
  const text = c.textColor || '#ffffff';
  const font = c.fontFamily || "'Inter', sans-serif";
  const isHeads = c.result !== 'tails';
  const flipping = c.flipping;

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: bg, fontFamily: font,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <style>{`
        @keyframes cf-flip { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(1800deg); } }
      `}</style>
      <div style={{
        width: 'min(70%, 120px)', aspectRatio: '1', borderRadius: '50%',
        background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
        border: `3px solid rgba(255,255,255,0.2)`,
        boxShadow: `0 4px 20px ${accent}33, inset 0 2px 4px rgba(255,255,255,0.2)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: flipping ? 'cf-flip 1.5s ease-out' : 'none',
        transition: 'transform 0.3s',
      }}>
        <span style={{ fontSize: 'clamp(24px, 8vw, 48px)', fontWeight: 900, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
          {isHeads ? 'H' : 'T'}
        </span>
      </div>
      {c.label && (
        <div style={{ fontSize: 13, fontWeight: 600, color: text, textAlign: 'center', padding: '0 8px' }}>
          {c.label}
        </div>
      )}
    </div>
  );
}
