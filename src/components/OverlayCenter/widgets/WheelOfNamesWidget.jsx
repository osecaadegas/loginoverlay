import React from 'react';

export default function WheelOfNamesWidget({ config }) {
  const c = config || {};
  const bg = c.bgColor || '#13151e';
  const accent = c.accentColor || '#f59e0b';
  const text = c.textColor || '#ffffff';
  const muted = c.mutedColor || '#94a3b8';
  const font = c.fontFamily || "'Inter', sans-serif";
  const radius = c.borderRadius ?? 10;
  const entries = c.entries || [];
  const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: bg, borderRadius: radius, fontFamily: font,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: 8,
    }}>
      <style>{`
        @keyframes whl-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(1800deg); } }
      `}</style>

      {/* Wheel */}
      <div style={{
        position: 'relative',
        width: 'min(90%, min(90vh, 240px))', aspectRatio: '1',
        borderRadius: '50%', flexShrink: 0,
        background: entries.length > 0
          ? `conic-gradient(${entries.map((_, i) => `${COLORS[i % COLORS.length]} ${(i / entries.length) * 100}% ${((i + 1) / entries.length) * 100}%`).join(', ')})`
          : 'rgba(255,255,255,0.06)',
        border: `3px solid rgba(255,255,255,0.15)`,
        boxShadow: `0 0 20px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.2)`,
        animation: c.spinning ? 'whl-spin 3s cubic-bezier(0.17, 0.67, 0.16, 1) forwards' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Center dot */}
        <div style={{
          width: '20%', aspectRatio: '1', borderRadius: '50%',
          background: bg, border: `2px solid rgba(255,255,255,0.2)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'clamp(10px, 3vw, 16px)', fontWeight: 700, color: text,
          zIndex: 2,
        }}>
          {entries.length > 0 ? entries.length : '🎡'}
        </div>

        {/* Pointer triangle */}
        <div style={{
          position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
          borderTop: `12px solid ${accent}`,
          filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5))`, zIndex: 3,
        }} />
      </div>

      {/* Winner */}
      {c.winner && (
        <div style={{
          fontSize: 16, fontWeight: 800, color: accent,
          textAlign: 'center', padding: '4px 12px',
          background: `${accent}15`, borderRadius: 6,
          border: `1px solid ${accent}30`,
        }}>
          🎉 {c.winner}
        </div>
      )}

      {entries.length === 0 && !c.winner && (
        <div style={{ fontSize: 11, color: muted }}>Add entries to spin</div>
      )}
    </div>
  );
}
