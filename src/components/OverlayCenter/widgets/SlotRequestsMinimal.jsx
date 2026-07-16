/**
 * SlotRequestsMinimal.jsx — Style 1: Modern Minimal List
 *
 * Clean vertical request queue with glassmorphism aesthetic,
 * smooth add/remove animations via CSS transitions, responsive
 * font sizing, and auto-scroll for long queues.
 */
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { subElementStyle, subValue } from './shared/appearanceStyles';

const FALLBACK_IMG = 'https://i.imgur.com/8E3ucNx.png';

export default function SlotRequestsMinimal({ config, requests }) {
  const c = config || {};
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const [autoFontSize, setAutoFontSize] = useState(14);
  const prevCountRef = useRef(requests.length);

  /* ── Config ── */
  const accent       = subValue(c, 'position', 'accentColor', c.accentColor || '#94a3b8');
  const textColor    = subValue(c, 'container', 'textColor', c.textColor || '#ffffff');
  const mutedColor   = subValue(c, 'viewerName', 'mutedColor', c.mutedColor || '#94a3b8');
  const bgColor      = subValue(c, 'container', 'background', c.bgColor || 'rgba(15,17,28,0.75)');
  const cardBg       = subValue(c, 'requestCard', 'background', c.cardBg || 'rgba(255,255,255,0.04)');
  const borderColor  = subValue(c, 'requestCard', 'borderColor', c.borderColor || 'rgba(255,255,255,0.07)');
  const titleColor   = subValue(c, 'slotTitle', 'textColor', textColor);
  const imageRadius  = subValue(c, 'slotImage', 'radius', 8);
  const cardRadius   = subValue(c, 'requestCard', 'radius', 12);
  const showRequester = c.showRequester !== false;
  const showNumbers   = c.showNumbers  !== false;
  const fontFamily   = c.fontFamily    || "'Inter', sans-serif";
  const manualSize   = c.fontSize      ? Number(c.fontSize) : null;
  const fontWeight   = c.fontWeight    || '600';
  const commandTrigger = c.commandTrigger || '!sr';

  /* ── Responsive font sizing ── */
  useEffect(() => {
    if (manualSize || !containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const min = Math.min(e.contentRect.width, e.contentRect.height);
        setAutoFontSize(Math.max(12, Math.min(18, min * 0.033 + 5)));
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [manualSize]);

  /* ── Auto-scroll: infinite seamless loop via CSS animation ── */
  const needsScroll = requests.length > 3;
  // scrollSecsPerItem: seconds added per item in the list; higher = slower scroll
  const scrollSecsPerItem = 20;

  /* ── Track new items for entrance animation ── */
  const newIds = useMemo(() => {
    const s = new Set();
    if (requests.length > prevCountRef.current) {
      // Newly added are at the end (ordered by created_at ASC)
      for (let i = prevCountRef.current; i < requests.length; i++) {
        s.add(requests[i].id);
      }
    }
    prevCountRef.current = requests.length;
    return s;
  }, [requests]);

  const fs = manualSize || autoFontSize;
  const imgH = Math.max(28, fs * 2.4);
  const rootStyle = subElementStyle(c, 'container', {
    fontFamily,
    fontSize: `${fs}px`,
    color: textColor,
  });
  const rowStyle = subElementStyle(c, 'requestCard');

  return (
    <div ref={containerRef} className="sr-min-root" data-widget-element="container" style={{
      ...rootStyle,
      '--sr-min-accent': accent,
      '--sr-min-muted': mutedColor,
      '--sr-min-bg': bgColor,
      '--sr-min-card-bg': cardBg,
      '--sr-min-border': borderColor,
      '--sr-min-title': titleColor,
      '--sr-min-img-radius': `${imageRadius}px`,
      '--sr-min-card-radius': `${cardRadius}px`,
    }}>
      {/* ── Header ── */}
      <div className="sr-min-header" data-widget-element="header" style={subElementStyle(c, 'header')}>
        <span className="sr-min-header-icon">🎰</span>
        <span className="sr-min-header-title" data-widget-element="slotTitle" style={subElementStyle(c, 'slotTitle', { fontWeight: Number(fontWeight) })}>Slot Requests</span>
        {requests.length > 0 && (
          <span className="sr-min-header-count" data-widget-element="position" style={subElementStyle(c, 'position')}>{requests.length}</span>
        )}
      </div>

      {/* ── List ── */}
      <div ref={listRef} className="sr-min-list" data-widget-element="queueContainer" style={subElementStyle(c, 'queueContainer')}>
        {requests.length === 0 && (
          <div className="sr-min-empty" data-widget-element="emptyState" style={subElementStyle(c, 'emptyState')}>
            <span className="sr-min-empty-icon">🎰</span>
            <span>No requests yet</span>
            <span className="sr-min-empty-hint">Viewers type {commandTrigger} &lt;slot&gt;</span>
          </div>
        )}

        {requests.length > 0 && (
          <div className={`sr-min-scroll-track${needsScroll ? ' sr-min-scroll-track--animate' : ''}`}
            style={needsScroll ? { '--sr-scroll-duration': `${Math.max(8, requests.length * scrollSecsPerItem / 3)}s` } : undefined}>
            {[...(needsScroll ? [0, 1] : [0])].map(setIdx =>
              requests.map((r, i) => (
                <div
                  key={`${setIdx}-${r.id}`}
                  className={`sr-min-row${setIdx === 0 && newIds.has(r.id) ? ' sr-min-row--enter' : ''}`}
                  data-widget-element="requestCard"
                  style={rowStyle}
                >
                  <div
                    className="sr-min-row-bg"
                    style={{ backgroundImage: `url(${r.slot_image || FALLBACK_IMG})` }}
                  />
                  <div className="sr-min-row-overlay" />
                  <div className="sr-min-row-content">
                    {showNumbers && (
                      <span className="sr-min-row-idx" data-widget-element="position" style={subElementStyle(c, 'position')}>{i + 1}</span>
                    )}
                    <img
                      src={r.slot_image || FALLBACK_IMG}
                      alt=""
                      className="sr-min-row-img"
                      data-widget-element="slotImage"
                      style={{ width: imgH, height: imgH }}
                      onError={e => { e.target.src = FALLBACK_IMG; }}
                    />
                    <div className="sr-min-row-info">
                      <span className="sr-min-row-name" data-widget-element="slotTitle" style={subElementStyle(c, 'slotTitle', { fontWeight: Number(fontWeight) })}>
                        {r.slot_name}
                      </span>
                      {showRequester && r.requested_by && r.requested_by !== 'anonymous' && (
                        <span className="sr-min-row-by" data-widget-element="viewerName" style={subElementStyle(c, 'viewerName')}>by {r.requested_by}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
