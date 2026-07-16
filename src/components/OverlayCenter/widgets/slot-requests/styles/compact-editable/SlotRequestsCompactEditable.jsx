import React from 'react';
import { hex2rgb } from '../../../shared/colorUtils';
import { subElementStyle, subValue } from '../../../shared/appearanceStyles';
import { useSlotRequestCarousel } from '../../shared/useSlotRequestCarousel';
import { compactEditableDefaults } from './compactEditable.defaults';
import styles from './SlotRequestsCompactEditable.module.css';

const FALLBACK_IMG = 'https://i.imgur.com/8E3ucNx.png';

function px(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return typeof value === 'number' ? `${value}px` : value;
}

function boolValue(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  return value !== false && value !== 'hidden';
}

function shadowVar(config, elementId, fallback = 'none') {
  const shadow = subValue(config, elementId, 'shadow', fallback);
  return typeof shadow === 'number'
    ? `0 ${Math.round(shadow * 0.35)}px ${Math.round(shadow * 0.7)}px rgba(0,0,0,0.35)`
    : shadow;
}

export default function SlotRequestsCompactEditable({ config, requests = [] }) {
  const c = { ...compactEditableDefaults, ...(config || {}) };

  const accent = subValue(c, 'position', 'accentColor', c.accentColor || compactEditableDefaults.accentColor);
  const textColor = subValue(c, 'container', 'textColor', c.textColor || compactEditableDefaults.textColor);
  const mutedColor = subValue(c, 'viewerName', 'mutedColor', c.mutedColor || compactEditableDefaults.mutedColor);
  const bgColor = subValue(c, 'container', 'background', c.bgColor || compactEditableDefaults.bgColor);
  const cardBg = subValue(c, 'requestCard', 'background', c.cardBg || compactEditableDefaults.cardBg);
  const titleColor = subValue(c, 'slotTitle', 'textColor', textColor);
  const cardRadius = subValue(c, 'requestCard', 'radius', c.cardRadius || compactEditableDefaults.cardRadius);
  const imageRadius = subValue(c, 'slotImage', 'radius', c.imageRadius || compactEditableDefaults.imageRadius);
  const imageSize = subValue(c, 'slotImage', 'imageSize', c.imageSize || compactEditableDefaults.imageSize);
  const imageFit = subValue(c, 'slotImage', 'imageFit', c.imageFit || compactEditableDefaults.imageFit);
  const imageVisible = boolValue(subValue(c, 'slotImage', 'visible', c.imageVisibility !== 'hidden'));
  const showRequester = c.showRequester !== false;
  const fontFamily = c.fontFamily || compactEditableDefaults.fontFamily;
  const fontSize = c.fontSize ? `${c.fontSize}px` : `${compactEditableDefaults.fontSize}px`;
  const fontWeight = c.fontWeight || compactEditableDefaults.fontWeight;
  const autoSpeed = Number(c.autoSpeed) || compactEditableDefaults.autoSpeed;
  const carouselAutoplay = c.carouselAutoplay !== false;
  const commandTrigger = c.commandTrigger || compactEditableDefaults.commandTrigger;
  const total = requests.length;
  const { activeIdx, selectIndex } = useSlotRequestCarousel({
    total,
    autoSpeed,
    autoplay: carouselAutoplay,
  });

  const rootStyle = subElementStyle(c, 'container', {
    fontFamily,
    fontSize,
    color: textColor,
  });
  const cardStyle = subElementStyle(c, 'requestCard');
  const slotImageStyle = subElementStyle(c, 'slotImage');
  const rootVars = {
    '--srce-accent': accent,
    '--srce-accent-rgb': hex2rgb(accent),
    '--srce-text': textColor,
    '--srce-muted': mutedColor,
    '--srce-bg': bgColor,
    '--srce-card-bg': cardBg,
    '--srce-title': titleColor,
    '--srce-root-radius': px(subValue(c, 'container', 'radius', 0), '0'),
    '--srce-card-radius': px(cardRadius, '16px'),
    '--srce-img-radius': px(imageRadius, '10px'),
    '--srce-img-size': px(imageSize, '38px'),
    '--srce-img-fit': imageFit,
    '--srce-padding': px(subValue(c, 'container', 'padding', undefined), '8px 14px'),
    '--srce-gap': px(subValue(c, 'container', 'gap', undefined), '10px'),
    '--srce-card-padding': px(subValue(c, 'requestCard', 'padding', undefined), '0'),
    '--srce-card-gap': px(subValue(c, 'requestCard', 'gap', undefined), '10px'),
    '--srce-border-width': px(subValue(c, 'container', 'borderWidth', 1), '1px'),
    '--srce-card-border-width': px(subValue(c, 'requestCard', 'borderWidth', 0), '0'),
    '--srce-card-border': subValue(c, 'requestCard', 'borderColor', 'transparent'),
    '--srce-img-border-width': px(subValue(c, 'slotImage', 'borderWidth', 1), '1px'),
    '--srce-img-border': subValue(c, 'slotImage', 'borderColor', 'rgba(255,255,255,0.08)'),
    '--srce-badge-radius': px(subValue(c, 'position', 'radius', 20), '20px'),
    '--srce-shadow': shadowVar(c, 'container'),
    '--srce-card-shadow': shadowVar(c, 'requestCard'),
    '--srce-blur': px(subValue(c, 'container', 'backdropBlur', 12), '12px'),
    '--srce-scale': c.widgetScale || 1,
  };

  if (total === 0) {
    return (
      <div
        className={styles.srceRoot}
        data-widget-id="slot_requests"
        data-style-id="v3_compact_editable"
        data-widget-element="container"
        style={{ ...rootStyle, fontWeight: Number(fontWeight), ...rootVars }}
      >
        <div className={styles.srceEmpty} data-widget-element="emptyState" style={subElementStyle(c, 'emptyState')}>
          No requests - type {commandTrigger} &lt;slot&gt;
        </div>
      </div>
    );
  }

  const current = requests[activeIdx] || requests[0];

  return (
    <div
      className={styles.srceRoot}
      data-widget-id="slot_requests"
      data-style-id="v3_compact_editable"
      data-widget-element="container"
      style={{ ...rootStyle, ...rootVars }}
    >
      <div className={styles.srceBadge} data-widget-element="position" style={subElementStyle(c, 'position')}>{total}</div>

      <div className={styles.srceCard} key={current?.id} data-widget-element="requestCard" style={cardStyle}>
        <img
          src={current?.slot_image || FALLBACK_IMG}
          alt=""
          className={`${styles.srceImage}${imageVisible ? '' : ` ${styles.srceImageHidden}`}`}
          data-widget-element="slotImage"
          style={slotImageStyle}
          onError={event => { event.currentTarget.src = FALLBACK_IMG; }}
        />
        <div className={styles.srceInfo}>
          <span className={styles.srceName} data-widget-element="slotTitle" style={subElementStyle(c, 'slotTitle', { fontWeight: Number(fontWeight) })}>
            {current?.slot_name || '-'}
          </span>
          {showRequester && current?.requested_by && current.requested_by !== 'anonymous' && (
            <span className={styles.srceBy} data-widget-element="viewerName" style={subElementStyle(c, 'viewerName')}>by {current.requested_by}</span>
          )}
        </div>
        <span className={styles.srceIndex} data-widget-element="position" style={subElementStyle(c, 'position')}>{c.showNumbers !== false ? `#${activeIdx + 1}` : null}</span>
      </div>

      {total > 1 && total <= 12 && (
        <div className={styles.srceDots} data-widget-element="footer" style={subElementStyle(c, 'footer')}>
          {requests.map((_, i) => (
            <span
              key={i}
              className={`${styles.srceDot}${i === activeIdx ? ` ${styles.srceDotActive}` : ''}`}
              onClick={() => { selectIndex(i); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
