import React from 'react';

/**
 * BonusBuysWidget — OBS overlay for tracking bonus buy sessions.
 * Shows slot image, planned bonuses, individual results, average multiplier, and profit/loss.
 *
 * Styles:
 *   v1         – Dark blue (default, matches reference image)
 *   v2_neon    – Neon green/purple glow
 *   v3_minimal – Clean light with subtle borders
 */

const hex2rgb = (h) => {
  const m = h?.replace('#', '').match(/.{2}/g);
  return m ? m.map(x => parseInt(x, 16)).join(',') : '255,255,255';
};

const fmt = (v, currency) => {
  const n = Number(v) || 0;
  return `${currency}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtMulti = (v) => {
  const n = Number(v) || 0;
  return `${n.toFixed(2)}x`;
};

function BonusBuysWidget({ config }) {
  const c = config || {};
  const st = c.displayStyle || 'v1';
  const accent = c.accentColor || '#3b82f6';
  const bg = c.bgColor || '#0a0e1a';
  const text = c.textColor || '#ffffff';
  const muted = c.mutedColor || '#64748b';
  const font = c.fontFamily || "'Inter', sans-serif";
  const currency = c.currency || '$';

  const name = c.slotName || 'No Slot Selected';
  const provider = c.provider || '';
  const img = c.imageUrl || '';
  const betCost = Number(c.betCost) || 0;
  const plannedBonuses = Number(c.plannedBonuses) || 5;
  const bonuses = c.bonuses || [];
  const startMoney = Number(c.startMoney) || 0;
  const sessionNumber = Number(c.sessionNumber) || 1;

  const accentRgb = hex2rgb(accent);
  const bgRgb = hex2rgb(bg);

  // Computed values
  const filledBonuses = bonuses.filter(b => b && b.win !== undefined && b.win !== null && b.win !== '');
  const totalCost = filledBonuses.length * betCost;
  const totalWin = filledBonuses.reduce((sum, b) => sum + (Number(b.win) || 0), 0);
  const profitLoss = totalWin - totalCost;
  const avgMulti = filledBonuses.length > 0
    ? filledBonuses.reduce((sum, b) => sum + (betCost > 0 ? (Number(b.win) || 0) / betCost : 0), 0) / filledBonuses.length
    : 0;
  const overallMulti = totalCost > 0 ? totalWin / totalCost : 0;

  // Build rows (filled + empty placeholders)
  const rows = [];
  for (let i = 0; i < plannedBonuses; i++) {
    const b = bonuses[i];
    const isFilled = b && b.win !== undefined && b.win !== null && b.win !== '';
    const win = isFilled ? Number(b.win) || 0 : null;
    const multi = isFilled && betCost > 0 ? win / betCost : null;
    rows.push({ index: i + 1, cost: betCost, win, multi, filled: isFilled });
  }

  if (!c.slotName) return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: font, color: muted,
      fontSize: 'clamp(10px,3cqi,16px)',
      containerType: 'inline-size',
    }}>
      No slot selected — configure Bonus Buys
    </div>
  );

  /* ────────── STYLE PRESETS ────────── */
  const isNeon = st === 'v2_neon';
  const isMinimal = st === 'v3_minimal';

  const cardBg = isMinimal ? '#ffffff' : bg;
  const cardText = isMinimal ? '#1e293b' : text;
  const cardMuted = isMinimal ? '#94a3b8' : muted;
  const cardBorder = isMinimal
    ? '1px solid #e2e8f0'
    : isNeon
      ? `1px solid rgba(${accentRgb}, 0.6)`
      : `1px solid rgba(${accentRgb}, 0.2)`;
  const cardShadow = isNeon
    ? `0 0 20px rgba(${accentRgb}, 0.3), 0 8px 32px rgba(0,0,0,0.5)`
    : isMinimal
      ? '0 2px 8px rgba(0,0,0,0.08)'
      : `0 8px 32px rgba(0,0,0,0.4)`;
  const headerBg = isMinimal
    ? '#f8fafc'
    : isNeon
      ? `rgba(${accentRgb}, 0.15)`
      : `rgba(${accentRgb}, 0.08)`;
  const rowBg = isMinimal
    ? '#f1f5f9'
    : `rgba(${accentRgb}, 0.06)`;
  const rowHoverBg = isMinimal
    ? '#e2e8f0'
    : `rgba(${accentRgb}, 0.12)`;
  const profitColor = profitLoss >= 0 ? '#22c55e' : '#ef4444';
  const winColor = '#22c55e';
  const lossColor = '#ef4444';

  return (
    <div style={{
      width: '100%', height: '100%',
      fontFamily: font,
      display: 'flex', flexDirection: 'column',
      background: cardBg,
      borderRadius: 'clamp(8px,2cqi,16px)',
      overflow: 'hidden',
      border: cardBorder,
      boxShadow: cardShadow,
      containerType: 'size',
      color: cardText,
    }}>

      {/* ─── HEADER ─── */}
      <div style={{
        padding: 'clamp(4px,1.2cqmin,10px) clamp(6px,2cqmin,14px)',
        background: headerBg,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: cardBorder,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px,1cqmin,8px)', minWidth: 0 }}>
          <span style={{ fontWeight: 900, fontSize: 'clamp(8px,2.5cqmin,16px)', letterSpacing: '0.06em', textTransform: 'uppercase', color: accent }}>
            BONUS BUYS
          </span>
          <span style={{
            fontSize: 'clamp(6px,1.8cqmin,11px)', color: cardMuted,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </span>
        </div>
        <span style={{
          fontWeight: 700, fontSize: 'clamp(7px,2cqmin,13px)',
          color: accent, opacity: 0.8,
        }}>
          #{sessionNumber}
        </span>
      </div>

      {/* ─── START / BONUSES COUNT BAR ─── */}
      <div style={{
        padding: 'clamp(3px,0.8cqmin,6px) clamp(6px,2cqmin,14px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 'clamp(6px,1.6cqmin,10px)',
        fontWeight: 600, color: cardMuted,
        background: `rgba(${accentRgb}, 0.03)`,
        borderBottom: cardBorder,
        flexShrink: 0,
      }}>
        <span>START <span style={{ color: cardText }}>{fmt(startMoney, currency)}</span></span>
        <span>BONUSES <span style={{ color: cardText }}>{filledBonuses.length}/{plannedBonuses}</span></span>
      </div>

      {/* ─── SLOT IMAGE ─── */}
      <div style={{
        position: 'relative',
        flex: '0 0 clamp(60px,30cqmin,200px)',
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
            fontSize: 'clamp(20px,10cqmin,50px)',
          }}>🛒</div>
        )}
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.25) 100%)',
          pointerEvents: 'none',
        }} />
        {/* Name + provider overlay */}
        <div style={{
          position: 'absolute', bottom: 'clamp(4px,1.5cqmin,12px)', left: 'clamp(6px,2cqmin,14px)',
          right: 'clamp(6px,2cqmin,14px)',
        }}>
          <div style={{
            fontWeight: 800, fontSize: 'clamp(9px,3cqmin,20px)',
            color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.7)',
            lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</div>
          {provider && (
            <div style={{
              fontSize: 'clamp(6px,1.6cqmin,11px)', color: 'rgba(255,255,255,0.6)',
              marginTop: 'clamp(1px,0.3cqmin,3px)',
            }}>{provider}</div>
          )}
        </div>
      </div>

      {/* ─── SUMMARY ROW ─── */}
      <div style={{
        padding: 'clamp(3px,1cqmin,8px) clamp(6px,2cqmin,14px)',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        alignItems: 'center', gap: 'clamp(4px,1cqmin,8px)',
        fontSize: 'clamp(6px,1.6cqmin,10px)',
        fontWeight: 700,
        background: `rgba(${accentRgb}, 0.06)`,
        borderTop: cardBorder,
        borderBottom: cardBorder,
        flexShrink: 0,
      }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 'clamp(5px,1.2cqmin,7px)', color: cardMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Cost</div>
          <div style={{ color: lossColor }}>{fmt(totalCost, currency)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'clamp(5px,1.2cqmin,7px)', color: cardMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Win</div>
          <div style={{ color: totalWin > 0 ? winColor : cardMuted }}>{fmt(totalWin, currency)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'clamp(5px,1.2cqmin,7px)', color: cardMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Multi</div>
          <div style={{ color: accent }}>{fmtMulti(overallMulti)}</div>
        </div>
      </div>

      {/* ─── BONUS ROWS ─── */}
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
      }}>
        {rows.map((row, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr 1fr auto',
            alignItems: 'center',
            gap: 'clamp(3px,0.8cqmin,6px)',
            padding: 'clamp(2px,0.7cqmin,5px) clamp(6px,2cqmin,14px)',
            fontSize: 'clamp(6px,1.5cqmin,10px)',
            borderBottom: `1px solid ${isMinimal ? '#e2e8f0' : `rgba(${accentRgb}, 0.08)`}`,
            background: i % 2 === 0 ? 'transparent' : rowBg,
            opacity: row.filled ? 1 : 0.4,
            transition: 'opacity 0.2s',
          }}>
            {/* Row number */}
            <span style={{
              fontWeight: 800, color: accent, fontSize: 'clamp(6px,1.5cqmin,10px)',
              minWidth: 'clamp(14px,3cqmin,24px)', textAlign: 'center',
            }}>
              #{row.index}
            </span>

            {/* Cost */}
            <span style={{ fontWeight: 600, color: cardMuted }}>
              {fmt(row.cost, currency)}
            </span>

            {/* Win */}
            <span style={{
              fontWeight: 700,
              color: row.filled
                ? (row.win >= row.cost ? winColor : lossColor)
                : cardMuted,
              textAlign: 'right',
            }}>
              {row.filled ? fmt(row.win, currency) : '—'}
            </span>

            {/* Multiplier */}
            <span style={{
              fontWeight: 700,
              color: row.filled ? accent : cardMuted,
              fontSize: 'clamp(6px,1.5cqmin,10px)',
              minWidth: 'clamp(28px,6cqmin,50px)', textAlign: 'right',
            }}>
              {row.filled ? fmtMulti(row.multi) : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* ─── FOOTER: Average + Profit/Loss ─── */}
      <div style={{
        padding: 'clamp(4px,1.2cqmin,10px) clamp(6px,2cqmin,14px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: cardBorder,
        background: headerBg,
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 'clamp(5px,1.2cqmin,7px)', color: cardMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average</div>
          <div style={{ fontWeight: 800, fontSize: 'clamp(8px,2.4cqmin,16px)', color: accent }}>
            {fmtMulti(avgMulti)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'clamp(5px,1.2cqmin,7px)', color: cardMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profit / Loss</div>
          <div style={{ fontWeight: 800, fontSize: 'clamp(8px,2.4cqmin,16px)', color: profitColor }}>
            {profitLoss >= 0 ? '+' : ''}{fmt(profitLoss, currency)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(BonusBuysWidget);
