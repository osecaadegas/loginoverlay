import React from 'react';

/**
 * SingleSlotWidget — OBS overlay widget
 * v1: Horizontal layout (image left, stats right, bottom bar)
 * v2_card: Vertical card (image top, name overlay, stats grid below)
 */

const hex2rgb = (h) => {
  const m = h?.replace('#', '').match(/.{2}/g);
  return m ? m.map(x => parseInt(x, 16)).join(',') : '255,255,255';
};

export default function SingleSlotWidget({ config }) {
  const c = config || {};
  const st = c.displayStyle || 'v1';
  const accent = c.accentColor || '#7c3aed';
  const bg = c.bgColor || 'transparent';
  const text = c.textColor || '#ffffff';
  const muted = c.mutedColor || '#94a3b8';
  const font = c.fontFamily || "'Inter', sans-serif";
  const currency = c.currency || '€';

  const name = c.slotName || 'No Slot Selected';
  const provider = c.provider || '';
  const img = c.imageUrl || '';
  const rtp = c.rtp || '';

  const averageMulti = c.averageMulti || 0;
  const bestMulti = c.bestMulti || 0;
  const totalBonuses = c.totalBonuses || 0;
  const bestWin = c.bestWin || 0;

  const lastWinIndex = c.lastWinIndex || 0;
  const lastBet = c.lastBet || 0;
  const lastPay = c.lastPay || 0;
  const lastMulti = c.lastMulti || 0;

  const accentRgb = hex2rgb(accent);

  if (!c.slotName) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font, color: muted, fontSize: 'clamp(10px,3cqi,16px)', containerType: 'inline-size' }}>
      No slot selected
    </div>
  );

  /* ─── v2_card: Vertical card style ─── */
  if (st === 'v2_card') return (
    <div style={{
      width: '100%', height: '100%',
      fontFamily: font,
      display: 'flex', flexDirection: 'column',
      background: bg,
      borderRadius: 'clamp(8px,3cqi,18px)',
      overflow: 'hidden',
      border: `1px solid rgba(${accentRgb}, 0.25)`,
      containerType: 'size',
      boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(${accentRgb}, 0.1)`,
    }}>
      {/* ─── Image section with name overlay ─── */}
      <div style={{
        position: 'relative',
        flex: '0 0 55%',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {img ? (
          <img src={img} alt={name} style={{
            width: '100%', height: '100%',
            objectFit: 'cover', display: 'block',
          }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, rgba(${accentRgb}, 0.2), rgba(${accentRgb}, 0.05))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'clamp(24px,12cqmin,60px)',
          }}>🎰</div>
        )}
        {/* Gradient overlay for text readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.35) 100%)',
          pointerEvents: 'none',
        }} />
        {/* RTP badge top-right */}
        {rtp && (
          <div style={{
            position: 'absolute', top: 'clamp(4px,2cqmin,10px)', right: 'clamp(4px,2cqmin,10px)',
            background: `rgba(${accentRgb}, 0.85)`,
            color: '#fff', fontWeight: 800,
            fontSize: 'clamp(7px,2.5cqmin,12px)',
            padding: 'clamp(2px,0.6cqmin,4px) clamp(5px,1.5cqmin,10px)',
            borderRadius: 'clamp(3px,1cqmin,8px)',
            backdropFilter: 'blur(8px)',
            letterSpacing: '0.03em',
          }}>
            {rtp}% RTP
          </div>
        )}
        {/* Name + Provider bottom of image */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: 'clamp(6px,2.5cqmin,14px)',
          zIndex: 1,
        }}>
          <div style={{
            fontSize: 'clamp(10px,4.5cqmin,24px)',
            fontWeight: 900,
            color: text,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            lineHeight: 1.1,
            textShadow: '0 2px 12px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{name}</div>
          {provider && (
            <div style={{
              fontSize: 'clamp(6px,2.2cqmin,11px)',
              fontWeight: 600,
              color: accent,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginTop: 'clamp(1px,0.4cqmin,3px)',
              textShadow: '0 1px 8px rgba(0,0,0,0.6)',
            }}>{provider}</div>
          )}
        </div>
      </div>

      {/* ─── Stats grid ─── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'clamp(2px,0.8cqmin,6px)',
        padding: 'clamp(4px,1.5cqmin,10px)',
        minHeight: 0,
        background: `rgba(${accentRgb}, 0.03)`,
      }}>
        <CardStat label="AVERAGE" value={averageMulti ? `${averageMulti}X` : '—'} accent={accent} accentRgb={accentRgb} text={text} muted={muted} />
        <CardStat label="BEST X" value={bestMulti ? `${bestMulti}X` : '—'} accent={accent} accentRgb={accentRgb} text={text} muted={muted} highlight />
        <CardStat label="BONUSES" value={totalBonuses || '—'} accent={accent} accentRgb={accentRgb} text={text} muted={muted} />
        <CardStat label="BEST WIN" value={bestWin ? `${bestWin}${currency}` : '—'} accent={accent} accentRgb={accentRgb} text={text} muted={muted} highlight />
      </div>

      {/* ─── Bottom last-win bar ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(3px,1.2cqmin,8px)',
        padding: 'clamp(3px,1.2cqmin,7px) clamp(4px,1.5cqmin,10px)',
        background: `rgba(${accentRgb}, 0.1)`,
        borderTop: `1px solid rgba(${accentRgb}, 0.2)`,
        fontSize: 'clamp(6px,2cqmin,11px)',
        fontWeight: 600,
        flexShrink: 0,
      }}>
        <span style={{ color: accent, fontWeight: 800, letterSpacing: '0.03em' }}>LAST</span>
        {lastBet > 0 ? (
          <>
            <span style={{ color: muted }}>BET</span>
            <span style={{ color: text, fontWeight: 700 }}>{lastBet}{currency}</span>
            <span style={{ color: muted }}>PAY</span>
            <span style={{ color: accent, fontWeight: 800 }}>{lastPay}{currency}</span>
            <span style={{ color: muted }}>{lastMulti}X</span>
          </>
        ) : (
          <span style={{ color: muted, fontStyle: 'italic' }}>No wins yet</span>
        )}
      </div>
    </div>
  );

  return (
    <div style={{
      width: '100%', height: '100%',
      fontFamily: font,
      display: 'flex', flexDirection: 'column',
      background: bg,
      borderRadius: 'clamp(6px,2cqi,14px)',
      overflow: 'hidden',
      border: `1px solid rgba(${accentRgb}, 0.3)`,
      containerType: 'inline-size',
    }}>
      {/* ─── Top section: Image + Name + Stats ─── */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 'clamp(6px,2.5cqi,14px)',
        padding: 'clamp(6px,2.5cqi,14px)',
        minHeight: 0,
      }}>
        {/* Slot image */}
        <div style={{
          width: 'clamp(40px,18cqi,100px)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(3px,1cqi,6px)',
        }}>
          {img ? (
            <img src={img} alt={name} style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: 'clamp(4px,1.5cqi,10px)',
              objectFit: 'cover',
              border: `2px solid ${accent}`,
            }} />
          ) : (
            <div style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: 'clamp(4px,1.5cqi,10px)',
              background: `rgba(${accentRgb}, 0.15)`,
              border: `2px solid ${accent}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 'clamp(14px,5cqi,28px)',
            }}>🎰</div>
          )}
          {/* RTP badge / N/A */}
          <div style={{
            textAlign: 'center',
            fontSize: 'clamp(7px,2.2cqi,12px)',
            fontWeight: 700,
            color: rtp ? accent : muted,
            background: `rgba(${accentRgb}, 0.1)`,
            borderRadius: 'clamp(2px,0.8cqi,6px)',
            padding: 'clamp(1px,0.5cqi,3px) 0',
          }}>
            {rtp ? `${rtp}%` : 'N/A'}
          </div>
        </div>

        {/* Name + Provider + Stats grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Slot name */}
          <div style={{
            fontSize: 'clamp(10px,4cqi,22px)',
            fontWeight: 800,
            color: text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}>{name}</div>
          {/* Provider */}
          {provider && (
            <div style={{
              fontSize: 'clamp(7px,2.5cqi,12px)',
              fontWeight: 600,
              color: accent,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginTop: 'clamp(1px,0.3cqi,3px)',
            }}>{provider}</div>
          )}

          {/* Stats grid — 2x2 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'clamp(4px,1.5cqi,10px)',
            marginTop: 'auto',
          }}>
            <StatBox label="AVERAGE" value={averageMulti ? `${averageMulti}X` : '—'} accent={accent} muted={muted} text={text} />
            <StatBox label="BEST X" value={bestMulti ? `${bestMulti}X` : '—'} accent={accent} muted={muted} text={text} highlight />
            <StatBox label="TOTAL BONUS" value={totalBonuses || '—'} accent={accent} muted={muted} text={text} />
            <StatBox label="BEST WIN" value={bestWin ? `${bestWin}${currency}` : '—'} accent={accent} muted={muted} text={text} highlight />
          </div>
        </div>
      </div>

      {/* ─── Bottom bar: Last win details ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(4px,1.5cqi,10px)',
        padding: 'clamp(4px,1.5cqi,8px) clamp(6px,2.5cqi,14px)',
        background: `rgba(${accentRgb}, 0.08)`,
        borderTop: `1px solid rgba(${accentRgb}, 0.2)`,
        fontSize: 'clamp(7px,2.2cqi,12px)',
        fontWeight: 600,
        flexShrink: 0,
      }}>
        <span style={{
          background: accent,
          color: '#fff',
          padding: 'clamp(1px,0.4cqi,3px) clamp(4px,1.5cqi,8px)',
          borderRadius: 'clamp(3px,1cqi,6px)',
          fontWeight: 800,
          fontSize: 'clamp(6px,2cqi,11px)',
          letterSpacing: '0.03em',
          whiteSpace: 'nowrap',
        }}>🏆 LAST WINS</span>

        {lastWinIndex > 0 && (
          <span style={{ color: muted }}>#{lastWinIndex}</span>
        )}

        {lastBet > 0 && (
          <>
            <span style={{ color: muted }}>BET</span>
            <span style={{ color: text, fontWeight: 700 }}>{lastBet}{currency}</span>
          </>
        )}

        {lastPay > 0 && (
          <>
            <span style={{ color: muted }}>PAY</span>
            <span style={{ color: accent, fontWeight: 800 }}>{lastPay}{currency}</span>
          </>
        )}

        {lastMulti > 0 && (
          <>
            <span style={{ color: muted }}>MULTI</span>
            <span style={{ color: text, fontWeight: 700 }}>{lastMulti}X</span>
          </>
        )}

        {lastBet === 0 && lastPay === 0 && (
          <span style={{ color: muted, fontStyle: 'italic' }}>No wins recorded yet</span>
        )}
      </div>
    </div>
  );
}

/* ── Small stat box component (v1) ── */
function StatBox({ label, value, accent, muted, text, highlight }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: 'clamp(2px,0.8cqi,6px) clamp(4px,1cqi,8px)',
      background: highlight ? `rgba(${hex2rgb(accent)}, 0.08)` : 'rgba(255,255,255,0.03)',
      borderRadius: 'clamp(3px,1cqi,8px)',
      border: `1px solid ${highlight ? `rgba(${hex2rgb(accent)}, 0.2)` : 'rgba(255,255,255,0.06)'}`,
    }}>
      <span style={{
        fontSize: 'clamp(5px,1.8cqi,9px)',
        fontWeight: 600,
        color: muted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>{label}</span>
      <span style={{
        fontSize: 'clamp(8px,3cqi,16px)',
        fontWeight: 800,
        color: highlight ? accent : text,
        marginTop: 'clamp(1px,0.3cqi,2px)',
      }}>{value}</span>
    </div>
  );
}

/* ── Card stat box (v2_card) ── */
function CardStat({ label, value, accent, accentRgb, text, muted, highlight }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(2px,0.6cqmin,5px) clamp(3px,0.8cqmin,6px)',
      background: highlight ? `rgba(${accentRgb}, 0.1)` : 'rgba(255,255,255,0.03)',
      borderRadius: 'clamp(3px,1cqmin,8px)',
      border: `1px solid rgba(${accentRgb}, ${highlight ? '0.25' : '0.08'})`,
      minHeight: 0,
    }}>
      <span style={{
        fontSize: 'clamp(5px,1.6cqmin,9px)',
        fontWeight: 600,
        color: muted,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        lineHeight: 1,
      }}>{label}</span>
      <span style={{
        fontSize: 'clamp(8px,3.5cqmin,18px)',
        fontWeight: 800,
        color: highlight ? accent : text,
        marginTop: 'clamp(1px,0.3cqmin,3px)',
        lineHeight: 1.1,
      }}>{value}</span>
    </div>
  );
}
