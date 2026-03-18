/**
 * SlotRequestsWidgetCompact.jsx — Compact 3D carousel, no background,
 * no marquee. Requester name on a solid black bar at the card bottom.
 */
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';

const DEFAULT_IMG = 'https://i.imgur.com/8E3ucNx.png';

export default function SlotRequestsWidgetCompact({ config, requests }) {
  const c = config || {};
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef(null);

  const accent = c.accentColor || '#f59e0b';
  const textColor = c.textColor || '#ffffff';
  const fontFamily = c.fontFamily || "'Poppins', sans-serif";
  const configFontSize = c.fontSize ? `${c.fontSize}px` : '15px';
  const fontWeight = c.fontWeight || '700';
  const autoSpeed = Number(c.autoSpeed) || 4000;

  const hex2rgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '245,158,11';
  };
  const accentRgb = hex2rgb(accent);

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

  const cardStyle = (offset) => {
    const absOff = Math.abs(offset);
    const sign = offset < 0 ? -1 : 1;
    if (absOff >= 3) {
      return {
        position: 'absolute',
        transform: `translateX(${sign * 200}px) rotateY(${sign * -22}deg) translateZ(-160px) scale(0.3)`,
        opacity: 0, zIndex: 0,
        transition: 'transform 0.85s cubic-bezier(0.33,1,0.68,1), opacity 0.85s cubic-bezier(0.33,1,0.68,1), filter 0.85s ease',
        pointerEvents: 'none', willChange: 'transform, opacity',
      };
    }
    const txMap = [0, 100, 175], tzMap = [40, -10, -40], ryMap = [0, -14, -24];
    const scMap = [1.05, 0.88, 0.72], opMap = [1, 0.9, 0.6];
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
  };

  if (total === 0) {
    return (
      <div className="sr-compact-root" style={{ fontFamily, fontSize: configFontSize, fontWeight: Number(fontWeight), color: textColor, ...rootVars }}>
        <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '1em', padding: 30 }}>
          <div style={{ fontSize: '2em', marginBottom: 6 }}>🎰</div>
          No requests yet
        </div>
      </div>
    );
  }

  return (
    <div className="sr-compact-root" style={{ fontFamily, fontSize: configFontSize, fontWeight: Number(fontWeight), color: textColor, ...rootVars }}>
      <div className="sr-compact-stage">
        <div className="sr-compact-perspective">
          {visibleCards.map(({ req, idx, offset }) => {
            const isCenter = offset === 0;
            return (
              <div key={req.id} className="sr-compact-card-wrap" style={cardStyle(offset)}>
                <div className={`sr-compact-card${isCenter ? ' sr-compact-card--center' : ''}`}>
                  {/* Image */}
                  <div className="sr-compact-card-img-bg">
                    <img src={req.slot_image || DEFAULT_IMG} alt={req.slot_name}
                      className="sr-compact-card-img"
                      onError={e => { e.target.src = DEFAULT_IMG; }} />
                  </div>

                  {/* Queue position badge */}
                  <div className="sr-compact-card-badge">#{idx + 1}</div>

                  {/* Slot name overlay */}
                  <div className="sr-compact-card-name">{req.slot_name}</div>

                  {/* Requester blackout bar */}
                  <div className="sr-compact-card-requester">
                    {req.requested_by && req.requested_by !== 'anonymous' ? req.requested_by : '—'}
                  </div>

                  {/* Glow ring on active */}
                  {isCenter && <div className="sr-compact-card-ring" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
