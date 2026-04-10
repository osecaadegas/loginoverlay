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
  const isGlass = (c.displayStyle || 'default') === 'glass';

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
  const fontSize = c.fontSize ?? 16;
  const fontWeight = c.fontWeight || '600';

  /* Metal palette — gold-accent metallic matching BH V10 Metallic */
  /* Glass palette — frosted translucent panels */
  const bgColor = isMetal
    ? 'linear-gradient(145deg, #1e1e22 0%, #1a1a1e 40%, #222226 100%)'
    : isGlass ? 'rgba(255, 255, 255, 0.04)'
    : (c.bgColor || 'rgba(15, 23, 42, 0.9)');
  const cardBg = isMetal
    ? 'linear-gradient(160deg, rgba(232,160,32,0.08) 0%, rgba(200,180,120,0.04) 100%)'
    : isGlass ? 'rgba(255, 255, 255, 0.06)'
    : (c.cardBg || 'rgba(255,255,255,0.04)');
  const textColor = isMetal ? '#d4d4d8' : (c.textColor || '#f1f5f9');
  const mutedColor = isMetal ? '#666666' : isGlass ? '#a1a8b8' : (c.mutedColor || '#64748b');
  const accentColor = isMetal ? '#e8a020' : isGlass ? '#a78bfa' : (c.accentColor || '#818cf8');
  const progressColor = isMetal ? '#e8a020' : isGlass ? '#a78bfa' : (c.progressColor || '#22c55e');
  const progressBg = isMetal ? 'rgba(255,255,255,0.06)' : isGlass ? 'rgba(255,255,255,0.1)' : (c.progressBgColor || 'rgba(255,255,255,0.08)');
  const bestColor = isMetal ? '#66bb6a' : (c.bestColor || '#22c55e');
  const worstColor = isMetal ? '#ef5350' : (c.worstColor || '#f87171');
  const borderColor = isMetal ? 'rgba(200,210,225,0.18)' : isGlass ? 'rgba(255,255,255,0.12)' : (c.borderColor || 'rgba(255,255,255,0.06)');
  const borderRadius = c.borderRadius ?? (isMetal ? 10 : isGlass ? 16 : 14);
  const showTitle = c.showTitle !== false;
  const layout = c.layout || 'vertical';

  /* Metal-specific extras */
  const metalBorder = isMetal ? '1px solid rgba(200,210,225,0.18)' : isGlass ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${borderColor}`;
  const metalBoxShadow = isMetal
    ? 'inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 8px rgba(0,0,0,0.35)'
    : isGlass ? '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
    : 'none';
  const metalRootShadow = isMetal
    ? '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
    : isGlass ? '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)'
    : 'none';

  /* ─── Responsive scaling ─── */
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const sc = Math.min(1, w / 320);
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
    /* Sharper text rendering */
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'geometricPrecision',
    imageRendering: 'auto',
    ...(isMetal && {
      border: '1px solid rgba(200,210,225,0.15)',
      boxShadow: metalRootShadow,
    }),
    ...(isGlass && {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.12)',
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
    ...(isGlass && {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
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
      background: 'linear-gradient(90deg, #c8a060, #e8c080)',
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
    transform: 'translateZ(0)',
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
          borderBottom: isMetal ? '1px solid rgba(200,210,225,0.18)' : `1px solid ${borderColor}`,
        }}>
          <span style={{ fontSize: fs * 1.3 }}>{isMetal ? '⚙️' : isGlass ? '🧊' : '📊'}</span>
          <span style={{
            fontSize: fs * 1.05, fontWeight: 800, letterSpacing: isMetal ? '0.08em' : '0.03em',
            ...(isMetal && {
              background: 'linear-gradient(90deg, #c8a060, #e8c080, #a08040)',
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
                ? 'linear-gradient(135deg, #3a3520, #2a2818)'
                : accentColor,
              color: isMetal ? '#e8a020' : '#fff',
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
          <span style={{ ...valStyle, color: isMetal ? '#e8a020' : accentColor }}>{fmtX(stats.breakEven)}</span>
        </div>
        <div style={statBoxStyle}>
          <span style={labelStyle}>AVG x</span>
          <span style={{ ...valStyle, color: stats.avgMulti > stats.breakEven ? bestColor : textColor }}>{fmtX(stats.avgMulti)}</span>
        </div>
        <div style={statBoxStyle}>
          <span style={labelStyle}>Live BE</span>
          <span style={{ ...valStyle, color: isMetal ? '#e8a020' : '#f59e0b' }}>{fmtX(stats.liveBE)}</span>
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

      {/* ═══ Progress bar ═══ */}
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
              ? 'linear-gradient(90deg, #b08020, #e8a020, #c89830)'
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

      {/* ═══ Best Slot row ═══ */}
      <div style={{ display: 'flex', gap, alignItems: 'stretch' }}>
        {/* Thumbnail */}
        <div style={{
          ...statBoxStyle, flex: 'none', width: Math.max(52, 64 * scale), padding: 0,
          overflow: 'hidden', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: stats.best ? `inset 0 0 0 2px ${bestColor}` : metalBoxShadow,
        }}>
          {stats.best?.image ? (
            <img src={stats.best.image} alt="" style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            }} onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <span style={{ fontSize: fs * 1.3, opacity: 0.3 }}>🎰</span>
          )}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            textAlign: 'center', fontSize: `${Math.max(7, fs * 0.5)}px`, fontWeight: 800,
            letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 0',
            background: `linear-gradient(90deg, ${bestColor}dd, ${bestColor})`,
            color: '#052e16',
          }}>BEST</div>
        </div>
        {/* Name */}
        <div style={{ ...statBoxStyle, flex: 2, justifyContent: 'center' }}>
          <span style={labelStyle}>Slot</span>
          <span style={{
            ...valStyle, fontSize: `${fs * 1.1}px`,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{stats.best?.name || '—'}</span>
        </div>
        {/* Payout */}
        <div style={{ ...statBoxStyle, justifyContent: 'center' }}>
          <span style={labelStyle}>Payout</span>
          <span style={{ ...valStyle, fontSize: `${fs * 1.1}px`, color: bestColor }}>
            {stats.best ? `${currency}${fmt(stats.best.payout)}` : '—'}
          </span>
        </div>
        {/* Multi */}
        <div style={{ ...statBoxStyle, justifyContent: 'center' }}>
          <span style={labelStyle}>Multi</span>
          <span style={{ ...valStyle, fontSize: `${fs * 1.1}px`, color: isMetal ? '#fbbf24' : '#fbbf24' }}>
            {stats.best ? `${stats.best.multi.toFixed(1)}x` : '—'}
          </span>
        </div>
      </div>

      {/* ═══ Worst Slot row ═══ */}
      <div style={{ display: 'flex', gap, alignItems: 'stretch' }}>
        {/* Thumbnail */}
        <div style={{
          ...statBoxStyle, flex: 'none', width: Math.max(52, 64 * scale), padding: 0,
          overflow: 'hidden', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: stats.worst ? `inset 0 0 0 2px ${worstColor}` : metalBoxShadow,
        }}>
          {stats.worst?.image ? (
            <img src={stats.worst.image} alt="" style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            }} onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <span style={{ fontSize: fs * 1.3, opacity: 0.3 }}>🎰</span>
          )}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            textAlign: 'center', fontSize: `${Math.max(7, fs * 0.5)}px`, fontWeight: 800,
            letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 0',
            background: `linear-gradient(90deg, ${worstColor}dd, ${worstColor})`,
            color: '#450a0a',
          }}>WORST</div>
        </div>
        {/* Name */}
        <div style={{ ...statBoxStyle, flex: 2, justifyContent: 'center' }}>
          <span style={labelStyle}>Slot</span>
          <span style={{
            ...valStyle, fontSize: `${fs * 1.1}px`,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{stats.worst?.name || '—'}</span>
        </div>
        {/* Payout */}
        <div style={{ ...statBoxStyle, justifyContent: 'center' }}>
          <span style={labelStyle}>Payout</span>
          <span style={{ ...valStyle, fontSize: `${fs * 1.1}px`, color: worstColor }}>
            {stats.worst ? `${currency}${fmt(stats.worst.payout)}` : '—'}
          </span>
        </div>
        {/* Multi */}
        <div style={{ ...statBoxStyle, justifyContent: 'center' }}>
          <span style={labelStyle}>Multi</span>
          <span style={{ ...valStyle, fontSize: `${fs * 1.1}px`, color: mutedColor }}>
            {stats.worst ? `${stats.worst.multi.toFixed(1)}x` : '—'}
          </span>
        </div>
      </div>

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
