/**
 * SlotRequestsCompactOverlay.jsx — Style 3: Compact Overlay Mode
 *
 * Minimal-footprint horizontal strip with a single-line ticker
 * showing the current request plus a small request count badge.
 * Designed for small overlay real-estate — auto-cycles through
 * requests with a smooth slide transition.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';

const FALLBACK_IMG = 'https://i.imgur.com/8E3ucNx.png';

export default function SlotRequestsCompactOverlay({ config, requests }) {
  const c = config || {};
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef(null);

  /* ── Config ── */
  const accent       = c.accentColor   || '#a78bfa';
  const textColor    = c.textColor     || '#ffffff';
  const mutedColor   = c.mutedColor    || '#94a3b8';
  const bgColor      = c.bgColor       || 'rgba(15,17,28,0.8)';
  const showRequester = c.showRequester !== false;
  const fontFamily   = c.fontFamily    || "'Inter', sans-serif";
  const fontSize     = c.fontSize      ? `${c.fontSize}px` : '14px';
  const fontWeight   = c.fontWeight    || '600';
  const autoSpeed    = Number(c.autoSpeed) || 3000;
  const commandTrigger = c.commandTrigger || '!sr';

  const hex2rgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '167,139,250';
  };
  const accentRgb = hex2rgb(accent);
  const total = requests.length;

  /* ── Auto-cycle ── */
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

  const rootVars = {
    '--sr-co-accent': accent,
    '--sr-co-accent-rgb': accentRgb,
    '--sr-co-text': textColor,
    '--sr-co-muted': mutedColor,
    '--sr-co-bg': bgColor,
  };

  /* ── Empty state ── */
  if (total === 0) {
    return (
      <div className="sr-co-root" style={{ fontFamily, fontSize, fontWeight: Number(fontWeight), color: textColor, ...rootVars }}>
        <div className="sr-co-empty">
          🎰 No requests — type {commandTrigger} &lt;slot&gt;
        </div>
      </div>
    );
  }

  const current = requests[activeIdx] || requests[0];

  return (
    <div className="sr-co-root" style={{ fontFamily, fontSize, color: textColor, ...rootVars }}>
      {/* ── Count badge ── */}
      <div className="sr-co-badge">{total}</div>

      {/* ── Active request card ── */}
      <div className="sr-co-card" key={current?.id}>
        <img
          src={current?.slot_image || FALLBACK_IMG}
          alt=""
          className="sr-co-card-img"
          onError={e => { e.target.src = FALLBACK_IMG; }}
        />
        <div className="sr-co-card-info">
          <span className="sr-co-card-name" style={{ fontWeight: Number(fontWeight) }}>
            {current?.slot_name || '—'}
          </span>
          {showRequester && current?.requested_by && current.requested_by !== 'anonymous' && (
            <span className="sr-co-card-by">by {current.requested_by}</span>
          )}
        </div>
        <span className="sr-co-card-idx">#{activeIdx + 1}</span>
      </div>

      {/* ── Progress dots ── */}
      {total > 1 && total <= 12 && (
        <div className="sr-co-dots">
          {requests.map((_, i) => (
            <span
              key={i}
              className={`sr-co-dot${i === activeIdx ? ' sr-co-dot--active' : ''}`}
              onClick={() => setActiveIdx(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
