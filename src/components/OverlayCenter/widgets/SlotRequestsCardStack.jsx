/**
 * SlotRequestsCardStack.jsx — Style 2: 3D Card Stack
 *
 * Stacked slot request cards with perspective depth, auto-cycling
 * carousel, parallax transforms, and animated reorder/removal.
 * Top marquee strip + 3D stage + stats bar.
 */
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';

const FALLBACK_IMG = 'https://i.imgur.com/8E3ucNx.png';

export default function SlotRequestsCardStack({ config, requests }) {
  const c = config || {};
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef(null);

  /* ── Config ── */
  const accent       = c.accentColor   || '#a78bfa';
  const textColor    = c.textColor     || '#ffffff';
  const mutedColor   = c.mutedColor    || '#94a3b8';
  const containerBg  = c.bgColor       || 'rgba(15,17,28,0.82)';
  const cardBg       = c.cardBg        || 'rgba(15,17,28,0.6)';
  const showRequester = c.showRequester !== false;
  const fontFamily   = c.fontFamily    || "'Inter', sans-serif";
  const fontSize     = c.fontSize      ? `${c.fontSize}px` : '15px';
  const fontWeight   = c.fontWeight    || '700';
  const autoSpeed    = Number(c.autoSpeed) || 4000;
  const commandTrigger = c.commandTrigger || '!sr';

  const hex2rgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '167,139,250';
  };
  const accentRgb = hex2rgb(accent);
  const total = requests.length;

  /* ── Auto-cycle carousel ── */
  const advance = useCallback(() => {
    if (total <= 0) return;
    setActiveIdx(p => (p + 1) % total);
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

  /* ── 3D card transforms ── */
  const cardTransform = (offset) => {
    const abs = Math.abs(offset);
    const sign = offset < 0 ? -1 : 1;
    if (abs >= 3) {
      return {
        position: 'absolute',
        transform: `translateX(${sign * 280}px) rotateY(${sign * -25}deg) translateZ(-220px) scale(0.25)`,
        opacity: 0, zIndex: 0,
        transition: 'transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.9s cubic-bezier(0.22,1,0.36,1), filter 0.9s ease',
        pointerEvents: 'none', willChange: 'transform, opacity',
      };
    }
    const tx = [0, 130, 225];
    const tz = [55, -15, -55];
    const ry = [0, -16, -26];
    const sc = [1.06, 0.87, 0.7];
    const op = [1, 0.88, 0.6];
    return {
      position: 'absolute',
      transform: `translateX(${tx[abs] * sign}px) rotateY(${ry[abs] * sign}deg) translateZ(${tz[abs]}px) scale(${sc[abs]})`,
      opacity: op[abs], zIndex: 10 - abs * 3,
      transition: 'transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.9s cubic-bezier(0.22,1,0.36,1), filter 0.9s ease',
      filter: abs === 2 ? 'blur(1.5px)' : 'none',
      willChange: 'transform, opacity',
    };
  };

  const rootVars = {
    '--sr-cs-accent': accent,
    '--sr-cs-accent-rgb': accentRgb,
    '--sr-cs-text': textColor,
    '--sr-cs-muted': mutedColor,
    '--sr-cs-bg': containerBg,
    '--sr-cs-card-bg': cardBg,
  };

  /* ── Empty state ── */
  if (total === 0) {
    return (
      <div className="sr-cs-root" style={{ fontFamily, fontSize, fontWeight: Number(fontWeight), color: textColor, ...rootVars }}>
        <div className="sr-cs-container">
          <div className="sr-cs-empty">
            <span className="sr-cs-empty-icon">🎰</span>
            <span>No requests yet</span>
            <span className="sr-cs-empty-hint">Viewers type {commandTrigger} &lt;slot&gt;</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sr-cs-root" style={{ fontFamily, fontSize, color: textColor, ...rootVars }}>
      <div className="sr-cs-container">

        {/* ── Top: Scrolling pill strip ── */}
        <div className="sr-cs-strip">
          <div className="sr-cs-strip-scroll" style={{ '--sr-cs-pill-count': total }}>
            {[...requests, ...requests].map((r, i) => {
              const idx = i % total;
              const isActive = idx === activeIdx;
              return (
                <button
                  key={`${r.id}-${i >= total ? 'c' : 'o'}`}
                  className={`sr-cs-pill${isActive ? ' sr-cs-pill--active' : ''}`}
                  onClick={() => setActiveIdx(idx)}
                >
                  <img
                    src={r.slot_image || FALLBACK_IMG}
                    alt="" className="sr-cs-pill-thumb"
                    onError={e => { e.target.src = FALLBACK_IMG; }}
                  />
                  <span className="sr-cs-pill-name">{r.slot_name}</span>
                  {showRequester && r.requested_by !== 'anonymous' && (
                    <span className="sr-cs-pill-by">{r.requested_by}</span>
                  )}
                </button>
              );
            })}
          </div>
          <span className="sr-cs-strip-count">{total}</span>
        </div>

        {/* ── Middle: 3D card carousel ── */}
        <div className="sr-cs-stage">
          <div className="sr-cs-perspective">
            {visibleCards.map(({ req, idx, offset }) => {
              const isCenter = offset === 0;
              return (
                <div key={req.id} className="sr-cs-card-wrap" style={cardTransform(offset)}>
                  <div className={`sr-cs-card${isCenter ? ' sr-cs-card--active' : ''}`}>
                    <div className="sr-cs-card-img-wrap">
                      <img
                        src={req.slot_image || FALLBACK_IMG}
                        alt={req.slot_name}
                        className="sr-cs-card-img"
                        onError={e => { e.target.src = FALLBACK_IMG; }}
                      />
                    </div>
                    <div className="sr-cs-card-gradient" />
                    <div className="sr-cs-card-badge">#{idx + 1}</div>
                    <div className="sr-cs-card-info">
                      <div className="sr-cs-card-name" style={{ fontWeight: Number(fontWeight) }}>
                        {req.slot_name}
                      </div>
                      {showRequester && req.requested_by !== 'anonymous' && (
                        <div className="sr-cs-card-by">by {req.requested_by}</div>
                      )}
                    </div>
                    {isCenter && <div className="sr-cs-card-ring" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Bottom: Stats bar ── */}
        <div className="sr-cs-bottom">
          <div className="sr-cs-stats">
            <span className="sr-cs-stat">🎰 {total} request{total !== 1 ? 's' : ''}</span>
            <span className="sr-cs-stat-divider" />
            <span className="sr-cs-stat">👑 {requests[activeIdx]?.slot_name || '—'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
