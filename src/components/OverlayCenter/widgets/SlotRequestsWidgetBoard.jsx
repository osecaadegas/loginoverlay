/**
 * SlotRequestsWidgetBoard.jsx — Hunt Board–style overlay for slot requests.
 * Top marquee strip · 3D card carousel · Bottom stats bar.
 */
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';

const DEFAULT_IMG = 'https://i.imgur.com/8E3ucNx.png';

export default function SlotRequestsWidgetBoard({ config, requests }) {
  const c = config || {};
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef(null);

  const accent = c.accentColor || '#f59e0b';
  const textColor = c.textColor || '#ffffff';
  const mutedColor = c.mutedColor || '#94a3b8';
  const containerBg = c.bgColor || 'rgba(15,23,42,0.82)';
  const cardBg = c.cardBg || 'rgba(15,23,42,0.6)';
  const showRequester = c.showRequester !== false;
  const fontFamily = c.fontFamily || "'Poppins', sans-serif";
  const configFontSize = c.fontSize ? `${c.fontSize}px` : '15px';
  const fontWeight = c.fontWeight || '700';
  const autoSpeed = Number(c.autoSpeed) || 4000;

  const hex2rgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '245,158,11';
  };
  const accentRgb = hex2rgb(accent);

  /* ── Auto-cycle carousel ── */
  const total = requests.length;
  const advance = useCallback(() => {
    if (total <= 0) return;
    setActiveIdx(prev => (prev + 1) % total);
  }, [total]);

  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(advance, autoSpeed);
    return () => clearInterval(timerRef.current);
  }, [total, autoSpeed, advance]);

  useEffect(() => {
    if (activeIdx >= total && total > 0) setActiveIdx(0);
  }, [total, activeIdx]);

  /* ── Circular offset ── */
  const getOffset = useCallback((idx) => {
    if (total <= 1) return idx - activeIdx;
    let off = idx - activeIdx;
    const half = total / 2;
    while (off > half) off -= total;
    while (off < -half) off += total;
    return off;
  }, [activeIdx, total]);

  const visibleCards = useMemo(() => {
    if (total === 0) return [];
    return requests
      .map((req, idx) => ({ req, idx, offset: getOffset(idx) }))
      .filter(({ offset }) => Math.abs(offset) <= 3);
  }, [requests, getOffset, total]);

  /* 3D card transforms */
  const cardStyle = (offset) => {
    const absOff = Math.abs(offset);
    const sign = offset < 0 ? -1 : 1;
    if (absOff >= 3) {
      return {
        position: 'absolute',
        transform: `translateX(${sign * 260}px) rotateY(${sign * -22}deg) translateZ(-200px) scale(0.3)`,
        opacity: 0, zIndex: 0,
        transition: 'transform 0.85s cubic-bezier(0.33,1,0.68,1), opacity 0.85s cubic-bezier(0.33,1,0.68,1), filter 0.85s ease',
        pointerEvents: 'none', willChange: 'transform, opacity',
      };
    }
    const txMap = [0, 120, 215], tzMap = [50, -10, -50], ryMap = [0, -14, -24];
    const scMap = [1.05, 0.88, 0.72], opMap = [1, 0.9, 0.65];
    return {
      position: 'absolute',
      transform: `translateX(${txMap[absOff] * sign}px) rotateY(${ryMap[absOff] * sign}deg) translateZ(${tzMap[absOff]}px) scale(${scMap[absOff]})`,
      opacity: opMap[absOff], zIndex: 10 - absOff * 3,
      transition: 'transform 0.85s cubic-bezier(0.33,1,0.68,1), opacity 0.85s cubic-bezier(0.33,1,0.68,1), filter 0.85s ease',
      filter: absOff === 2 ? 'blur(1px)' : 'none',
      willChange: 'transform, opacity',
    };
  };

  const rootVars = {
    '--sr-accent': accent,
    '--sr-accent-rgb': accentRgb,
    '--sr-text': textColor,
    '--sr-muted': mutedColor,
    '--sr-container-bg': containerBg,
    '--sr-card-bg': cardBg,
  };

  /* ── Empty state ── */
  if (total === 0) {
    return (
      <div className="sr-board-root" style={{ fontFamily, fontSize: configFontSize, fontWeight: Number(fontWeight), color: textColor, ...rootVars }}>
        <div className="sr-board-container">
          <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '1.1em', padding: 40 }}>
            <div style={{ fontSize: '2.5em', marginBottom: 8 }}>🎰</div>
            No requests yet — viewers type !sr
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sr-board-root" style={{ fontFamily, color: textColor, ...rootVars }}>
      <div className="sr-board-container">

        {/* ─── Top: marquee strip ─── */}
        <div className="sr-board-strip">
          <div className="sr-board-strip-scroll" style={{ '--sr-pill-count': total }}>
            {[...requests, ...requests].map((r, i) => {
              const idx = i % total;
              const isActive = idx === activeIdx;
              return (
                <button key={`${r.id}-${i >= total ? 'c' : 'o'}`}
                  className={`sr-board-pill${isActive ? ' sr-board-pill--active' : ''}`}
                  onClick={() => setActiveIdx(idx)}>
                  <img src={r.slot_image || DEFAULT_IMG} alt="" className="sr-board-pill-thumb"
                    onError={e => { e.target.src = DEFAULT_IMG; }} />
                  <span className="sr-board-pill-name">{r.slot_name}</span>
                  {showRequester && r.requested_by !== 'anonymous' && (
                    <span className="sr-board-pill-by">{r.requested_by}</span>
                  )}
                </button>
              );
            })}
          </div>
          <span className="sr-board-strip-counter">{total}</span>
        </div>

        {/* ─── Middle: 3D carousel ─── */}
        <div className="sr-board-stage">
          <div className="sr-board-perspective">
            {visibleCards.map(({ req, idx, offset }) => {
              const isCenter = offset === 0;
              return (
                <div key={req.id} className="sr-board-card-wrap" style={cardStyle(offset)}>
                  <div className={`sr-board-card${isCenter ? ' sr-board-card--center' : ''}`}>
                    <div className="sr-board-card-img-bg">
                      <img src={req.slot_image || DEFAULT_IMG} alt={req.slot_name}
                        className="sr-board-card-img"
                        onError={e => { e.target.src = DEFAULT_IMG; }} />
                    </div>
                    <div className="sr-board-card-overlay" />
                    <div className="sr-board-card-badges">
                      <span className="sr-board-badge sr-board-badge--idx">#{idx + 1}</span>
                    </div>
                    <div className="sr-board-card-info">
                      <div className="sr-board-card-name">{req.slot_name}</div>
                      {showRequester && req.requested_by !== 'anonymous' && (
                        <div className="sr-board-card-by">by {req.requested_by}</div>
                      )}
                    </div>
                    {isCenter && <div className="sr-board-card-ring" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Bottom: stats bar ─── */}
        <div className="sr-board-bottom">
          <div className="sr-board-stats-row">
            <div className="sr-board-stat">
              <span className="sr-board-stat-icon">🎰</span>
              <span className="sr-board-stat-val">{total} requests</span>
            </div>
            <div className="sr-board-stat-divider" />
            <div className="sr-board-stat">
              <span className="sr-board-stat-icon">👑</span>
              <span className="sr-board-stat-val">{requests[activeIdx]?.slot_name || '—'}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
