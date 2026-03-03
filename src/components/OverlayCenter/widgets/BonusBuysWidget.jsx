import React, { useRef, useEffect } from 'react';

/**
 * BonusBuysWidget — OBS overlay for tracking bonus buy sessions.
 *
 * Styles:
 *   v1         – Dark blue (default)
 *   v2_neon    – Neon green/purple glow
 *   v3_minimal – Clean light with subtle borders
 *
 * Uses `cqi` (container inline / width) for all sizing so text stays
 * readable even in tall-narrow OBS panels.  Minimum font sizes are
 * generous enough for 1080p stream at ~280 px widget width.
 */

const hex2rgb = (h) => {
  const m = h?.replace('#', '').match(/.{2}/g);
  return m ? m.map(x => parseInt(x, 16)).join(',') : '255,255,255';
};

const fmt = (v, cur) => {
  const n = Number(v) || 0;
  return `${cur}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtShort = (v, cur) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000) return `${cur}${(n / 1000).toFixed(1)}k`;
  return fmt(v, cur);
};
const fmtMulti = (v) => `${(Number(v) || 0).toFixed(1)}x`;

function BonusBuysWidget({ config }) {
  const c = config || {};
  const st = c.displayStyle || 'v1';
  const accent = c.accentColor || '#3b82f6';
  const bg = c.bgColor || '#0a0e1a';
  const text = c.textColor || '#ffffff';
  const muted = c.mutedColor || '#64748b';
  const font = c.fontFamily || "'Inter', sans-serif";
  const currency = c.currency || '€';

  const name = c.slotName || 'No Slot Selected';
  const provider = c.provider || '';
  const img = c.imageUrl || '';
  const betCost = Number(c.bonusCost) || Number(c.betCost) || 0;
  const betValue = Number(c.betValue) || 0;
  const plannedBonuses = Number(c.plannedBonuses) || 5;
  const bonuses = c.bonuses || [];
  const startMoney = Number(c.startMoney) || 0;
  const sessionNumber = Number(c.sessionNumber) || 1;

  const accentRgb = hex2rgb(accent);

  /* ── Computed ── */
  const filled = bonuses.filter(b => b && b.win !== undefined && b.win !== null && b.win !== '');
  const totalCost = filled.length * betCost;
  const totalWin = filled.reduce((s, b) => s + (Number(b.win) || 0), 0);
  const profitLoss = totalWin - totalCost;
  const avgMulti = filled.length > 0
    ? filled.reduce((s, b) => s + (betValue > 0 ? (Number(b.win) || 0) / betValue : 0), 0) / filled.length
    : 0;
  const overallMulti = betValue > 0 && filled.length > 0 ? totalWin / (filled.length * betValue) : 0;

  /* Build rows */
  const rows = [];
  for (let i = 0; i < plannedBonuses; i++) {
    const b = bonuses[i];
    const ok = b && b.win !== undefined && b.win !== null && b.win !== '';
    const win = ok ? Number(b.win) || 0 : null;
    const multi = ok && betValue > 0 ? win / betValue : null;
    rows.push({ idx: i + 1, cost: betCost, win, multi, ok });
  }

  /* Auto-scroll when more than 10 rows:
     Slowly scroll up, when last row reaches top snap back to top, repeat */
  const scrollRef = useRef(null);
  const scrollPos = useRef(0);
  const paused = useRef(false);
  useEffect(() => {
    if (rows.length <= 10) return;
    const el = scrollRef.current;
    if (!el) return;
    let raf;
    const SLOW_SPEED = 0.15;          // px per frame (~9 px/s at 60 fps)
    const PAUSE_AT_TOP = 2000;        // ms to hold at top before scrolling
    const PAUSE_AT_BOTTOM = 1500;     // ms to hold at bottom before snapping

    scrollPos.current = 0;
    el.scrollTop = 0;
    paused.current = false;

    const step = () => {
      if (paused.current) { raf = requestAnimationFrame(step); return; }
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) { raf = requestAnimationFrame(step); return; }

      scrollPos.current += SLOW_SPEED;
      if (scrollPos.current >= maxScroll) {
        scrollPos.current = maxScroll;
        el.scrollTop = scrollPos.current;
        // Pause at bottom, then snap to top
        paused.current = true;
        setTimeout(() => {
          scrollPos.current = 0;
          el.scrollTop = 0;
          // Pause at top before scrolling again
          setTimeout(() => { paused.current = false; }, PAUSE_AT_TOP);
        }, PAUSE_AT_BOTTOM);
      } else {
        el.scrollTop = scrollPos.current;
      }
      raf = requestAnimationFrame(step);
    };

    // Initial pause at top
    paused.current = true;
    setTimeout(() => { paused.current = false; }, PAUSE_AT_TOP);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [rows.length]);

  /* Empty state */
  if (!c.slotName) return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: font, color: muted,
      fontSize: 'clamp(11px, 5cqi, 18px)', containerType: 'inline-size',
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
    ? '2px solid #e2e8f0'
    : isNeon ? `2px solid rgba(${accentRgb}, 0.6)` : `2px solid rgba(${accentRgb}, 0.3)`;
  const cardShadow = isNeon
    ? `0 0 24px rgba(${accentRgb}, 0.35), 0 8px 32px rgba(0,0,0,0.5)`
    : isMinimal ? '0 2px 8px rgba(0,0,0,0.08)' : `0 8px 32px rgba(0,0,0,0.5)`;
  const headerBg = isMinimal
    ? '#f8fafc' : isNeon ? `rgba(${accentRgb}, 0.18)` : `rgba(${accentRgb}, 0.1)`;
  const rowStripe = isMinimal ? '#f1f5f9' : `rgba(${accentRgb}, 0.07)`;
  const profitColor = profitLoss >= 0 ? '#22c55e' : '#ef4444';
  const winColor = '#22c55e';
  const lossColor = '#ef4444';

  /* ── Spacing / font helpers (all cqi-based) ── */
  const pad = 'clamp(8px, 4cqi, 22px)';
  const padY = 'clamp(6px, 3cqi, 16px)';

  return (
    <div style={{
      width: '100%', height: '100%', fontFamily: font,
      display: 'flex', flexDirection: 'column',
      background: cardBg, borderRadius: 'clamp(6px, 2.5cqi, 16px)',
      overflow: 'hidden', border: cardBorder,
      boxShadow: cardShadow, containerType: 'inline-size', color: cardText,
    }}>

      {/* ─── HEADER ─── */}
      <div style={{
        padding: `${padY} ${pad}`,
        background: headerBg,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: cardBorder, flexShrink: 0,
        gap: 'clamp(4px, 2cqi, 10px)',
      }}>
        <span style={{
          fontWeight: 900, fontSize: 'clamp(15px, 7cqi, 30px)',
          letterSpacing: '0.08em', textTransform: 'uppercase', color: accent,
          whiteSpace: 'nowrap',
        }}>
          BONUS BUYS
        </span>
        <span style={{
          fontWeight: 700, fontSize: 'clamp(14px, 6cqi, 26px)',
          color: accent, opacity: 0.8, flexShrink: 0,
        }}>
          #{sessionNumber}
        </span>
      </div>

      {/* ─── START / BONUSES COUNT ─── */}
      <div style={{
        padding: `clamp(5px, 2.5cqi, 12px) ${pad}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 'clamp(12px, 5cqi, 18px)',
        fontWeight: 700, color: cardMuted,
        background: `rgba(${accentRgb}, 0.04)`,
        borderBottom: cardBorder, flexShrink: 0,
      }}>
        <span>💰 <span style={{ color: cardText }}>{fmt(startMoney, currency)}</span></span>
        <span>🎰 <span style={{ color: cardText }}>{filled.length}/{plannedBonuses}</span></span>
      </div>

      {/* ─── SLOT IMAGE ─── */}
      <div style={{
        position: 'relative',
        flex: '0 0 clamp(180px, 110cqi, 600px)',
        minHeight: 0, overflow: 'hidden',
      }}>
        {img ? (
          <img src={img} alt={name} style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, rgba(${accentRgb}, 0.25), rgba(${accentRgb}, 0.05))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'clamp(24px, 14cqi, 60px)',
          }}>🛒</div>
        )}
        {/* Gradient */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.2) 100%)',
        }} />
        {/* Name + provider hidden for cleaner OBS look */}
      </div>

      {/* ─── SUMMARY STATS ─── */}
      <div style={{
        padding: `${padY} ${pad}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 'clamp(4px, 2cqi, 12px)',
        background: `rgba(${accentRgb}, 0.07)`,
        borderTop: cardBorder, borderBottom: cardBorder, flexShrink: 0,
      }}>
        {[
          { icon: '💰', label: fmtShort(totalCost, currency), color: lossColor },
          { icon: '📊', label: fmtMulti(overallMulti), color: accent },
          { icon: '🏆', label: fmtShort(totalWin, currency), color: totalWin > 0 ? winColor : cardMuted },
        ].map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 'clamp(3px, 1.5cqi, 8px)',
            fontSize: 'clamp(13px, 5.5cqi, 22px)', fontWeight: 800,
          }}>
            <span style={{ fontSize: 'clamp(11px, 4cqi, 18px)' }}>{s.icon}</span>
            <span style={{ color: s.color }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ─── BONUS ROWS ─── */}
      <style>{`.bb-rows-scroll::-webkit-scrollbar{display:none}`}</style>
      <div ref={scrollRef} style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }} className="bb-rows-scroll">
        {rows.map((row, i) => {
          const rowColor = row.ok
            ? (row.win >= row.cost ? winColor : lossColor)
            : cardMuted;
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr 1fr auto',
              alignItems: 'center',
              gap: 'clamp(6px, 3cqi, 14px)',
              padding: `clamp(6px, 3cqi, 14px) ${pad}`,
              fontSize: 'clamp(13px, 5.5cqi, 22px)',
              borderBottom: `2px solid ${isMinimal ? '#e2e8f0' : `rgba(${accentRgb}, 0.15)`}`,
              background: i % 2 === 0 ? 'transparent' : rowStripe,
              opacity: row.ok ? 1 : 0.35,
            }}>
              {/* # */}
              <span style={{
                fontWeight: 900, color: accent,
                minWidth: 'clamp(22px, 8cqi, 40px)', textAlign: 'center',
              }}>
                #{row.idx}
              </span>
              {/* Cost */}
              <span style={{ fontWeight: 600, color: cardMuted }}>
                {fmt(row.cost, currency)}
              </span>
              {/* Win */}
              <span style={{ fontWeight: 700, color: rowColor, textAlign: 'right' }}>
                {row.ok ? fmt(row.win, currency) : '—'}
              </span>
              {/* Multi */}
              <span style={{
                fontWeight: 800, color: row.ok ? accent : cardMuted,
                minWidth: 'clamp(40px, 14cqi, 70px)', textAlign: 'right',
              }}>
                {row.ok ? fmtMulti(row.multi) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* ─── FOOTER ─── */}
      <div style={{
        padding: `${padY} ${pad}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: cardBorder, background: headerBg, flexShrink: 0,
      }}>
        <div>
          <div style={{
            fontSize: 'clamp(14px, 4cqi, 15px)', color: cardMuted,
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>Average</div>
          <div style={{
            fontWeight: 900, fontSize: 'clamp(18px, 8cqi, 32px)', color: accent,
          }}>
            {fmtMulti(avgMulti)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 'clamp(14px, 4cqi, 15px)', color: cardMuted,
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>Profit / Loss</div>
          <div style={{
            fontWeight: 900, fontSize: 'clamp(18px, 8cqi, 32px)', color: profitColor,
          }}>
            {profitLoss >= 0 ? '+' : ''}{fmt(profitLoss, currency)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(BonusBuysWidget);
