import React from 'react';

export default function GiveawayWidget({ config }) {
  const c = config || {};
  const bgColor = c.bgColor || '#13151e';
  const cardBg = c.cardBg || 'rgba(255,255,255,0.04)';
  const borderColor = c.borderColor || 'rgba(255,255,255,0.08)';
  const accentColor = c.accentColor || '#9346ff';
  const textColor = c.textColor || '#ffffff';
  const mutedColor = c.mutedColor || '#94a3b8';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const borderRadius = c.borderRadius ?? 12;
  const participants = c.participants || [];
  const count = participants.length;
  const winner = c.winner || '';
  const isActive = !!c.isActive;
  const keyword = c.keyword || '';
  const title = c.title || 'Giveaway';
  const prize = c.prize || '';

  return (
    <div style={{
      width: '100%', height: '100%', fontFamily,
      background: bgColor, color: textColor,
      borderRadius: `${borderRadius}px`,
      border: `1px solid ${borderColor}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', boxSizing: 'border-box',
    }}>
      <style>{`
        @keyframes ga-pulse { 0%,100%{opacity:.85} 50%{opacity:1} }
        @keyframes ga-confetti {
          0%{transform:translateY(0) rotate(0deg);opacity:1}
          100%{transform:translateY(-30px) rotate(360deg);opacity:0}
        }
        @keyframes ga-glow { 0%,100%{box-shadow:0 0 8px ${accentColor}44} 50%{box-shadow:0 0 20px ${accentColor}88} }
        @keyframes ga-count { 0%{transform:scale(1)} 50%{transform:scale(1.15)} 100%{transform:scale(1)} }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: `1px solid ${borderColor}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 18 }}>🎁</span>
        <span style={{ fontWeight: 700, fontSize: 14, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </span>
        {isActive && (
          <span style={{
            background: '#22c55e33', color: '#22c55e', fontSize: 9, fontWeight: 700,
            padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em',
            animation: 'ga-pulse 2s ease-in-out infinite',
          }}>LIVE</span>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 10, minHeight: 0 }}>

        {/* Winner Display */}
        {winner ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>🎉</div>
            <div style={{ fontSize: 10, color: mutedColor, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>Winner</div>
            <div style={{
              fontSize: 'clamp(18px, 5vw, 28px)', fontWeight: 800, color: accentColor,
              textShadow: `0 0 20px ${accentColor}66`,
            }}>{winner}</div>
            {prize && <div style={{ fontSize: 12, color: mutedColor, marginTop: 6 }}>Prize: <span style={{ color: '#fbbf24', fontWeight: 600 }}>{prize}</span></div>}
          </div>
        ) : isActive && keyword ? (
          <>
            {/* Prize */}
            {prize && (
              <div style={{
                background: cardBg, border: `1px solid ${borderColor}`,
                borderRadius: 8, padding: '8px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 9, color: mutedColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Prize</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fbbf24', marginTop: 2 }}>{prize}</div>
              </div>
            )}

            {/* Keyword instruction */}
            <div style={{
              background: `${accentColor}18`, border: `1px solid ${accentColor}44`,
              borderRadius: 10, padding: '10px 18px', textAlign: 'center',
              animation: 'ga-glow 3s ease-in-out infinite',
            }}>
              <div style={{ fontSize: 11, color: mutedColor, marginBottom: 4 }}>Type in chat to enter</div>
              <div style={{ fontSize: 'clamp(16px, 4vw, 24px)', fontWeight: 800, color: accentColor, letterSpacing: '0.02em' }}>
                !{keyword}
              </div>
            </div>

            {/* Participant count */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
            }}>
              <span style={{ fontSize: 14 }}>👥</span>
              <span style={{ fontSize: 'clamp(18px, 5vw, 30px)', fontWeight: 800, color: textColor, animation: count > 0 ? 'ga-count 0.4s ease' : 'none' }}>
                {count}
              </span>
              <span style={{ fontSize: 11, color: mutedColor }}>participant{count !== 1 ? 's' : ''}</span>
            </div>

            {/* Recent entries ticker */}
            {count > 0 && (
              <div style={{
                width: '100%', maxHeight: 60, overflow: 'hidden',
                display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center',
              }}>
                {participants.slice(-8).map((name, i) => (
                  <span key={i} style={{
                    background: `${accentColor}22`, color: accentColor,
                    fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                  }}>{name}</span>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Inactive state */
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.5 }}>🎁</div>
            <div style={{ fontSize: 12, color: mutedColor }}>No active giveaway</div>
          </div>
        )}
      </div>
    </div>
  );
}
