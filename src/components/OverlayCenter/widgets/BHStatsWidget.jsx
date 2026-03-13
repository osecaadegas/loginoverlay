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
  const isMetal = (c.displayStyle || 'default') === 'metal';

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
      if (!best || multi > best.multi) best = { name: b.slotName || b.slot?.name || '—', multi, payout: b.payout, image: b.slot?.image || null };
      if (!worst || multi < worst.multi) worst = { name: b.slotName || b.slot?.name || '—', multi, payout: b.payout, image: b.slot?.image || null };
    }

    const avgBet = total > 0 ? totalBetAll / total : 0;

    return {
      total, openedCount: opened.length, unopened,
      totalBetAll, totalWin, breakEven, liveBE, avgMulti,
      progressPct, best, worst, avgBet,
    };
  }, [bonuses, startMoney, stopLoss]);

  /* ─── Style config ─── */
  const fontFamily = c.fontFamily || (isMetal ? "'Inter', 'Poppins', sans-serif" : "'Poppins', sans-serif");
  const fontSize = c.fontSize ?? 14;
  const fontWeight = c.fontWeight || '600';

  /* Metal palette — polished brushed-steel grey tones */
  const bgColor = isMetal
    ? 'linear-gradient(145deg, #2a2d33 0%, #1a1c20 40%, #2e3238 100%)'
    : (c.bgColor || 'rgba(15, 23, 42, 0.9)');
  const cardBg = isMetal
    ? 'linear-gradient(160deg, rgba(180,185,195,0.12) 0%, rgba(120,125,135,0.06) 100%)'
    : (c.cardBg || 'rgba(255,255,255,0.04)');
  const textColor = isMetal ? '#d4d8e0' : (c.textColor || '#f1f5f9');
  const mutedColor = isMetal ? '#7a8090' : (c.mutedColor || '#64748b');
  const accentColor = isMetal ? '#a8b0c0' : (c.accentColor || '#818cf8');
  const progressColor = isMetal ? '#8a9aaa' : (c.progressColor || '#22c55e');
  const progressBg = isMetal ? 'rgba(255,255,255,0.06)' : (c.progressBgColor || 'rgba(255,255,255,0.08)');
  const bestColor = isMetal ? '#7ecfa0' : (c.bestColor || '#22c55e');
  const worstColor = isMetal ? '#e07070' : (c.worstColor || '#f87171');
  const borderColor = isMetal ? 'rgba(200,210,225,0.12)' : (c.borderColor || 'rgba(255,255,255,0.06)');
  const borderRadius = c.borderRadius ?? (isMetal ? 10 : 14);
  const showTitle = c.showTitle !== false;
  const layout = c.layout || 'vertical';

  /* Metal-specific extras */
  const metalBorder = isMetal ? '1px solid rgba(200,210,225,0.18)' : `1px solid ${borderColor}`;
  const metalBoxShadow = isMetal
    ? 'inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 8px rgba(0,0,0,0.35)'
    : 'none';
  const metalRootShadow = isMetal
    ? '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
    : 'none';

  /* ─── 30-second stats flip ─── */
  const [statsFlipped, setStatsFlipped] = useState(false);
  useEffect(() => {
    if (stats.openedCount === 0) { setStatsFlipped(false); return; }
    const id = setInterval(() => setStatsFlipped(f => !f), 30000);
    return () => clearInterval(id);
  }, [stats.openedCount]);

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
  const gap = Math.max(6, 8 * scale);

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
    padding: `${Math.max(10, 14 * scale)}px`,
    gap: gap + 4,
    boxSizing: 'border-box',
    ...(isMetal && {
      border: '1px solid rgba(200,210,225,0.15)',
      boxShadow: metalRootShadow,
    }),
  };

  const statBoxStyle = {
    background: cardBg,
    border: metalBorder,
    borderRadius: Math.max(isMetal ? 6 : 8, (isMetal ? 8 : 12) * scale),
    padding: `${Math.max(8, 10 * scale)}px ${Math.max(10, 12 * scale)}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    flex: 1,
    minWidth: 0,
    ...(isMetal && {
      boxShadow: metalBoxShadow,
    }),
  };

  const labelStyle = {
    fontSize: `${fs * 0.75}px`,
    fontWeight: 700,
    color: mutedColor,
    textTransform: 'uppercase',
    letterSpacing: isMetal ? '0.14em' : '0.1em',
    lineHeight: 1.2,
    marginBottom: 2,
    ...(isMetal && {
      background: 'linear-gradient(90deg, #8a90a0, #b0b8c8)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    }),
  };

  const valStyle = {
    fontSize: `${fs * 1.45}px`,
    fontWeight: 800,
    lineHeight: 1.25,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    ...(isMetal && {
      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    }),
  };

  return (
    <div ref={containerRef} style={rootStyle}>
      {/* Title */}
      {showTitle && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          paddingBottom: gap,
          borderBottom: isMetal ? '1px solid rgba(200,210,225,0.12)' : `1px solid ${borderColor}`,
        }}>
          <span style={{ fontSize: fs * 1.3 }}>{isMetal ? '⚙️' : '📊'}</span>
          <span style={{
            fontSize: fs * 1.05, fontWeight: 800, letterSpacing: isMetal ? '0.08em' : '0.03em',
            ...(isMetal && {
              background: 'linear-gradient(90deg, #c8ccd4, #e8ecf4, #a0a8b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
            }),
          }}>
            Hunt Stats
          </span>
          {huntNumber !== '—' && (
            <span style={{
              marginLeft: 'auto',
              fontSize: fs * 0.7,
              background: isMetal
                ? 'linear-gradient(135deg, #555a65, #3a3e48)'
                : accentColor,
              color: isMetal ? '#c0c8d4' : '#fff',
              borderRadius: 99,
              padding: `${fs * 0.08}px ${fs * 0.4}px`,
              fontWeight: 700,
              ...(isMetal && {
                border: '1px solid rgba(200,210,225,0.2)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              }),
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
          <span style={{ ...valStyle, color: isMetal ? '#c0cce0' : accentColor }}>{fmtX(stats.breakEven)}</span>
        </div>
        <div style={statBoxStyle}>
          <span style={labelStyle}>AVG x</span>
          <span style={{ ...valStyle, color: stats.avgMulti > stats.breakEven ? bestColor : textColor }}>{fmtX(stats.avgMulti)}</span>
        </div>
        <div style={statBoxStyle}>
          <span style={labelStyle}>Live BE</span>
          <span style={{ ...valStyle, color: isMetal ? '#c8a060' : '#f59e0b' }}>{fmtX(stats.liveBE)}</span>
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

      {/* ═══ Flip: Progress bar ↔ Best/Worst with images ═══ */}
      <div style={{ perspective: 800, position: 'relative' }}>
        <div style={{
          position: 'relative',
          transition: 'transform 0.8s cubic-bezier(0.4,0,0.2,1)',
          transformStyle: 'preserve-3d',
          transform: statsFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
        }}>
          {/* FRONT: Progress bar */}
          <div style={{ backfaceVisibility: 'hidden' }}>
            <div style={{ ...statBoxStyle, flex: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={labelStyle}>Progress</span>
                <span style={{ fontSize: `${fs * 0.78}px`, fontWeight: 700, color: textColor }}>
                  {stats.openedCount} / {stats.total} opened
                </span>
              </div>
              <div style={{
                width: '100%',
                height: Math.max(10, 14 * scale),
                background: progressBg,
                borderRadius: 99,
                overflow: 'hidden',
                marginTop: 2,
              }}>
                <div style={{
                  width: `${stats.progressPct}%`,
                  height: '100%',
                  background: isMetal
                    ? 'linear-gradient(90deg, #606878, #8a95a8, #a0aabb)'
                    : `linear-gradient(90deg, ${progressColor}, ${accentColor})`,
                  borderRadius: 99,
                  transition: 'width 0.6s cubic-bezier(0.33,1,0.68,1)',
                  minWidth: stats.progressPct > 0 ? 4 : 0,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: `${fs * 0.7}px`, color: mutedColor }}>{stats.unopened} remaining</span>
                <span style={{ fontSize: `${fs * 0.7}px`, color: mutedColor }}>{Math.round(stats.progressPct)}%</span>
              </div>
            </div>
          </div>

          {/* BACK: Best / Worst with images */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)',
            display: 'flex', gap, overflow: 'hidden',
          }}>
            {/* Best slot */}
            <div style={{
              ...statBoxStyle, border: `1.5px solid ${bestColor}`,
              flexDirection: 'row', alignItems: 'center', gap: Math.max(8, 10 * scale),
              padding: `${Math.max(8, 10 * scale)}px`,
            }}>
              {stats.best ? (
                <>
                  {stats.best.image ? (
                    <img src={stats.best.image} alt="" style={{
                      width: Math.max(48, 60 * scale), height: Math.max(48, 60 * scale),
                      borderRadius: Math.max(6, 8 * scale), objectFit: 'cover', flexShrink: 0,
                    }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: Math.max(48, 60 * scale), height: Math.max(48, 60 * scale), borderRadius: Math.max(6, 8 * scale), background: cardBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs * 1.5, flexShrink: 0 }}>🎰</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: `${fs * 0.7}px`, fontWeight: 700, color: bestColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best</span>
                    <span style={{ ...valStyle, color: bestColor, fontSize: `${fs * 1.2}px` }}>
                      {currency}{fmt(stats.best.payout)}
                    </span>
                    <span style={{ fontSize: `${fs * 0.9}px`, fontWeight: 800, color: '#facc15' }}>
                      {stats.best.multi.toFixed(1)}x
                    </span>
                  </div>
                </>
              ) : (
                <span style={{ ...valStyle, color: mutedColor }}>—</span>
              )}
            </div>
            {/* Worst slot */}
            <div style={{
              ...statBoxStyle, border: `1.5px solid ${worstColor}`,
              flexDirection: 'row', alignItems: 'center', gap: Math.max(8, 10 * scale),
              padding: `${Math.max(8, 10 * scale)}px`,
            }}>
              {stats.worst ? (
                <>
                  {stats.worst.image ? (
                    <img src={stats.worst.image} alt="" style={{
                      width: Math.max(48, 60 * scale), height: Math.max(48, 60 * scale),
                      borderRadius: Math.max(6, 8 * scale), objectFit: 'cover', flexShrink: 0,
                    }} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: Math.max(48, 60 * scale), height: Math.max(48, 60 * scale), borderRadius: Math.max(6, 8 * scale), background: cardBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs * 1.5, flexShrink: 0 }}>🎰</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: `${fs * 0.7}px`, fontWeight: 700, color: worstColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Worst</span>
                    <span style={{ ...valStyle, color: worstColor, fontSize: `${fs * 1.2}px` }}>
                      {currency}{fmt(stats.worst.payout)}
                    </span>
                    <span style={{ fontSize: `${fs * 0.9}px`, fontWeight: 800, color: mutedColor }}>
                      {stats.worst.multi.toFixed(1)}x
                    </span>
                  </div>
                </>
              ) : (
                <span style={{ ...valStyle, color: mutedColor }}>—</span>
              )}
            </div>
          </div>{/* end BACK */}

        </div>{/* end flipper */}
      </div>{/* end perspective */}

      {/* ═══ Auto-scroll ticker: slot info from bonus hunt cards ═══ */}
      {(() => {
        if (bonuses.length === 0) return null;

        const items = bonuses.map((b, i) => {
          const name = b.slotName || b.slot?.name || `#${i + 1}`;
          const provider = b.slot?.provider || '—';
          const rtp = b.slot?.rtp ? `${b.slot.rtp}%` : '—';
          const maxWin = b.slot?.maxWin ? `${Number(b.slot.maxWin).toLocaleString()}x` : '—';
          const vol = b.slot?.volatility
            ? b.slot.volatility.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            : '—';
          const bet = `${currency}${fmt(b.betSize)}`;
          const opened = b.opened;
          const payout = opened ? `${currency}${fmt(b.payout)}` : null;
          const multi = opened && b.betSize ? `${((Number(b.payout) || 0) / (Number(b.betSize) || 1)).toFixed(1)}x` : null;
          return { name, provider, rtp, maxWin, vol, bet, opened, payout, multi, image: b.slot?.image };
        });

        const doubled = [...items, ...items];
        const dur = Math.max(20, items.length * 4);

        const tickerBg = isMetal
          ? 'linear-gradient(90deg, rgba(42,45,51,0.95), rgba(46,50,56,0.95))'
          : cardBg;
        const tickerBorder = isMetal
          ? '1px solid rgba(200,210,225,0.1)'
          : `1px solid ${borderColor}`;
        const pillBg = isMetal
          ? 'rgba(180,185,195,0.08)'
          : 'rgba(255,255,255,0.06)';
        const pillBorder = isMetal
          ? '1px solid rgba(200,210,225,0.12)'
          : '1px solid rgba(255,255,255,0.08)';
        const sep = { width: 1, height: fs * 1, background: isMetal ? 'rgba(200,210,225,0.15)' : 'rgba(255,255,255,0.1)', flexShrink: 0, borderRadius: 1 };

        return (
          <div style={{
            background: tickerBg,
            border: tickerBorder,
            borderRadius: Math.max(6, 8 * scale),
            overflow: 'hidden',
            position: 'relative',
            ...(isMetal && { boxShadow: metalBoxShadow }),
          }}>
            <div
              className="bhstats-ticker-scroll"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: Math.max(8, 10 * scale),
                padding: `${Math.max(5, 6 * scale)}px ${Math.max(8, 10 * scale)}px`,
                whiteSpace: 'nowrap',
                animation: `bhstats-ticker ${dur}s linear infinite`,
              }}
            >
              {doubled.map((it, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <div style={sep} />}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: Math.max(5, 6 * scale),
                    background: pillBg,
                    border: pillBorder,
                    borderRadius: Math.max(4, 6 * scale),
                    padding: `${Math.max(3, 4 * scale)}px ${Math.max(8, 10 * scale)}px`,
                    flexShrink: 0,
                    opacity: it.opened ? 0.55 : 1,
                    ...(isMetal && { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }),
                  }}>
                    {it.image && (
                      <img src={it.image} alt="" style={{
                        width: Math.max(18, 22 * scale), height: Math.max(14, 16 * scale),
                        borderRadius: 3, objectFit: 'cover', flexShrink: 0,
                      }} onError={e => { e.target.style.display = 'none'; }} />
                    )}
                    <span style={{
                      fontSize: `${fs * 0.78}px`, fontWeight: 800, color: textColor,
                      maxWidth: Math.max(80, 100 * scale), overflow: 'hidden', textOverflow: 'ellipsis',
                      ...(isMetal && { textShadow: '0 1px 2px rgba(0,0,0,0.4)' }),
                    }}>{it.name}</span>
                    <span style={{
                      fontSize: `${fs * 0.65}px`, fontWeight: 600, color: mutedColor,
                      ...(isMetal && {
                        background: 'linear-gradient(90deg, #8a90a0, #b0b8c8)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      }),
                    }}>{it.provider}</span>
                    <span style={{ fontSize: `${fs * 0.68}px`, fontWeight: 700, color: isMetal ? '#a0b0c0' : accentColor }}>{it.bet}</span>
                    {it.rtp !== '—' && (
                      <span style={{ fontSize: `${fs * 0.65}px`, fontWeight: 600, color: mutedColor }}>RTP {it.rtp}</span>
                    )}
                    {it.maxWin !== '—' && (
                      <span style={{ fontSize: `${fs * 0.65}px`, fontWeight: 600, color: isMetal ? '#c8a060' : '#facc15' }}>🏆{it.maxWin}</span>
                    )}
                    {it.payout && (
                      <span style={{ fontSize: `${fs * 0.68}px`, fontWeight: 800, color: bestColor }}>→ {it.payout} ({it.multi})</span>
                    )}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
