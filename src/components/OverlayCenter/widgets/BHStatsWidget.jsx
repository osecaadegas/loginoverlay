/**
 * BHStatsWidget.jsx — Standalone Bonus Hunt stats overlay.
 * Reads the bonus_hunt widget config from allWidgets to compute live stats.
 *
 * Shows: Current BE x, AVG x, Start, Stop, Hunt #, Progress bar, Best/Worst payout.
 * Fully customisable via config panel (font, colors, layout).
 */
import React, { useMemo, useRef, useEffect, useState } from 'react';

export default function BHStatsWidget({ config, allWidgets }) {
  const c = config || {};
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  /* ─── Find the bonus_hunt widget config ─── */
  const bhConfig = useMemo(() => {
    const bh = (allWidgets || []).find(w => w.widget_type === 'bonus_hunt');
    return bh?.config || {};
  }, [allWidgets]);

  const bonuses = bhConfig.bonuses || [];
  const currency = bhConfig.currency || c.currency || '€';
  const startMoney = Number(bhConfig.startMoney) || 0;
  const stopLoss = Number(bhConfig.stopLoss) || 0;
  const huntNumber = bhConfig.huntNumber || bhConfig.sessionNumber || c.huntNumber || '—';

  /* ─── Compute stats ─── */
  const stats = useMemo(() => {
    const total = bonuses.length;
    const opened = bonuses.filter(b => b.opened);
    const unopened = total - opened.length;

    const totalBetAll = bonuses.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const totalBetOpened = opened.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const totalWin = opened.reduce((s, b) => s + (Number(b.payout) || 0), 0);
    const totalBetRemaining = Math.max(totalBetAll - totalBetOpened, 0);

    const target = Math.max(startMoney - stopLoss, 0);
    const breakEven = totalBetAll > 0 ? target / totalBetAll : 0;
    const remaining = Math.max(target - totalWin, 0);
    const liveBE = totalBetRemaining > 0 ? remaining / totalBetRemaining : 0;
    const avgMulti = totalBetOpened > 0 ? totalWin / totalBetOpened : 0;

    const progressPct = total > 0 ? (opened.length / total) * 100 : 0;

    let best = null;
    let worst = null;
    for (const b of opened) {
      const multi = (Number(b.payout) || 0) / (Number(b.betSize) || 1);
      if (!best || multi > best.multi) best = { name: b.slotName || b.slot?.name || '—', multi, payout: b.payout };
      if (!worst || multi < worst.multi) worst = { name: b.slotName || b.slot?.name || '—', multi, payout: b.payout };
    }

    return {
      total, openedCount: opened.length, unopened,
      totalBetAll, totalWin, breakEven, liveBE, avgMulti,
      progressPct, best, worst,
    };
  }, [bonuses, startMoney, stopLoss]);

  /* ─── Style config ─── */
  const fontFamily = c.fontFamily || "'Poppins', sans-serif";
  const fontSize = c.fontSize ?? 14;
  const fontWeight = c.fontWeight || '600';
  const bgColor = c.bgColor || 'rgba(15, 23, 42, 0.9)';
  const cardBg = c.cardBg || 'rgba(255,255,255,0.04)';
  const textColor = c.textColor || '#f1f5f9';
  const mutedColor = c.mutedColor || '#64748b';
  const accentColor = c.accentColor || '#818cf8';
  const progressColor = c.progressColor || '#22c55e';
  const progressBg = c.progressBgColor || 'rgba(255,255,255,0.08)';
  const bestColor = c.bestColor || '#22c55e';
  const worstColor = c.worstColor || '#f87171';
  const borderColor = c.borderColor || 'rgba(255,255,255,0.06)';
  const borderRadius = c.borderRadius ?? 14;
  const showTitle = c.showTitle !== false;
  const layout = c.layout || 'vertical';

  /* ─── Responsive scaling ─── */
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const sc = Math.min(1, w / 380);
        setScale(sc);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const fmt = n => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = n => Math.round(Number(n || 0)).toLocaleString();
  const fmtX = n => Math.round(Number(n || 0)) + 'x';

  const fs = fontSize * scale;
  const gap = Math.max(4, 6 * scale);

  const rootStyle = {
    width: '100%',
    height: '100%',
    fontFamily,
    fontSize: `${fs}px`,
    fontWeight: Number(fontWeight),
    color: textColor,
    background: bgColor,
    borderRadius,
    overflow: 'hidden auto',
    display: 'flex',
    flexDirection: 'column',
    padding: `${Math.max(8, 12 * scale)}px`,
    gap: gap + 2,
    boxSizing: 'border-box',
  };

  const statBoxStyle = {
    background: cardBg,
    border: `1px solid ${borderColor}`,
    borderRadius: Math.max(6, 10 * scale),
    padding: `${Math.max(6, 8 * scale)}px ${Math.max(8, 10 * scale)}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
    minWidth: 0,
  };

  const labelStyle = {
    fontSize: `${fs * 0.7}px`,
    fontWeight: 700,
    color: mutedColor,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    lineHeight: 1.2,
    marginBottom: 2,
  };

  const valStyle = {
    fontSize: `${fs * 1.35}px`,
    fontWeight: 800,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div ref={containerRef} style={rootStyle}>
      {/* Title */}
      {showTitle && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          paddingBottom: gap,
          borderBottom: `1px solid ${borderColor}`,
        }}>
          <span style={{ fontSize: fs * 1.3 }}>📊</span>
          <span style={{ fontSize: fs * 1.05, fontWeight: 800, letterSpacing: '0.03em' }}>
            Hunt Stats
          </span>
          {huntNumber !== '—' && (
            <span style={{
              marginLeft: 'auto',
              fontSize: fs * 0.7,
              background: accentColor,
              color: '#fff',
              borderRadius: 99,
              padding: `${fs * 0.08}px ${fs * 0.4}px`,
              fontWeight: 700,
            }}>
              #{huntNumber}
            </span>
          )}
        </div>
      )}

      {/* Row 1: BE x / AVG x / Live BE */}
      <div style={{ display: 'flex', gap }}>
        <div style={statBoxStyle}>
          <span style={labelStyle}>Current BE</span>
          <span style={{ ...valStyle, color: accentColor }}>{fmtX(stats.breakEven)}</span>
        </div>
        <div style={statBoxStyle}>
          <span style={labelStyle}>AVG x</span>
          <span style={{ ...valStyle, color: stats.avgMulti > stats.breakEven ? bestColor : textColor }}>{fmtX(stats.avgMulti)}</span>
        </div>
        <div style={statBoxStyle}>
          <span style={labelStyle}>Live BE</span>
          <span style={{ ...valStyle, color: '#f59e0b' }}>{fmtX(stats.liveBE)}</span>
        </div>
      </div>

      {/* Row 2: Start / Stop / Total Win */}
      <div style={{ display: 'flex', gap }}>
        <div style={statBoxStyle}>
          <span style={labelStyle}>Start</span>
          <span style={valStyle}>{currency}{fmtInt(startMoney)}</span>
        </div>
        <div style={statBoxStyle}>
          <span style={labelStyle}>Stop</span>
          <span style={valStyle}>{currency}{fmtInt(stopLoss)}</span>
        </div>
        <div style={statBoxStyle}>
          <span style={labelStyle}>Total Win</span>
          <span style={{ ...valStyle, color: bestColor }}>{currency}{fmtInt(stats.totalWin)}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ ...statBoxStyle, flex: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={labelStyle}>Progress</span>
          <span style={{ fontSize: `${fs * 0.72}px`, fontWeight: 700, color: textColor }}>
            {stats.openedCount} / {stats.total} opened
          </span>
        </div>
        <div style={{
          width: '100%',
          height: Math.max(8, 12 * scale),
          background: progressBg,
          borderRadius: 99,
          overflow: 'hidden',
          marginTop: 2,
        }}>
          <div style={{
            width: `${stats.progressPct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${progressColor}, ${accentColor})`,
            borderRadius: 99,
            transition: 'width 0.6s cubic-bezier(0.33,1,0.68,1)',
            minWidth: stats.progressPct > 0 ? 4 : 0,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: `${fs * 0.65}px`, color: mutedColor }}>{stats.unopened} remaining</span>
          <span style={{ fontSize: `${fs * 0.65}px`, color: mutedColor }}>{Math.round(stats.progressPct)}%</span>
        </div>
      </div>

      {/* Row 3: Best / Worst payout */}
      <div style={{ display: 'flex', gap }}>
        <div style={statBoxStyle}>
          <span style={labelStyle}>🏆 Best Payout</span>
          {stats.best ? (
            <>
              <span style={{ ...valStyle, color: bestColor, fontSize: `${fs * 1.0}px` }}>
                {currency}{fmt(stats.best.payout)}
                <span style={{ marginLeft: 6, fontSize: `${fs * 0.75}px`, color: '#facc15', fontWeight: 800 }}>
                  {stats.best.multi.toFixed(1)}x
                </span>
              </span>
              <span style={{ fontSize: `${fs * 0.65}px`, color: mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {stats.best.name}
              </span>
            </>
          ) : (
            <span style={{ ...valStyle, color: mutedColor, fontSize: `${fs * 0.85}px` }}>—</span>
          )}
        </div>
        <div style={statBoxStyle}>
          <span style={labelStyle}>💀 Worst Payout</span>
          {stats.worst ? (
            <>
              <span style={{ ...valStyle, color: worstColor, fontSize: `${fs * 1.0}px` }}>
                {currency}{fmt(stats.worst.payout)}
                <span style={{ marginLeft: 6, fontSize: `${fs * 0.75}px`, color: mutedColor, fontWeight: 800 }}>
                  {stats.worst.multi.toFixed(1)}x
                </span>
              </span>
              <span style={{ fontSize: `${fs * 0.65}px`, color: mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {stats.worst.name}
              </span>
            </>
          ) : (
            <span style={{ ...valStyle, color: mutedColor, fontSize: `${fs * 0.85}px` }}>—</span>
          )}
        </div>
      </div>
    </div>
  );
}
