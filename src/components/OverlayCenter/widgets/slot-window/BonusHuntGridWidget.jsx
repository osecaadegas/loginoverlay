import React from 'react';
import SlotWindowWidget from './SlotWindowWidget';
import { sanitizeSlotWindowConfig } from './slotWindowModel';
import { getWidgetColourTheme } from '../shared/colourThemePalettes';

export const GRID_POSITIONS = ['Top left', 'Top right', 'Bottom left', 'Bottom right'];
export const GRID_FRAME_CORNERS = [
  ['frameTopLeft', 'Top-left corner'], ['frameTopRight', 'Top-right corner'],
  ['frameBottomRight', 'Bottom-right corner'], ['frameBottomLeft', 'Bottom-left corner'],
];
const clamp = (value, max, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(max, Number(value))) : fallback;
export function sanitizeBonusHuntGrid(config = {}) {
  return { ...config, displayStyle: 'four_slots', gap: clamp(config.gap, 60), frameWidth: clamp(config.frameWidth, 24, 2), ...Object.fromEntries(GRID_FRAME_CORNERS.map(([key]) => [key, clamp(config[key], 240)])), slots: GRID_POSITIONS.map((_, index) => sanitizeSlotWindowConfig(config.slots?.[index] || {})) };
}
export default function BonusHuntGridWidget({ config = {}, runtime }) {
  const c = sanitizeBonusHuntGrid(config);
  const theme = getWidgetColourTheme(c.colourTheme);
  const radius = GRID_FRAME_CORNERS.map(([key]) => `${c[key]}px`).join(' ');
  return <section aria-label="2x2 Bonus Hunt" data-element-id="root" style={{width:'100%',height:'100%',display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gridTemplateRows:'repeat(2,minmax(0,1fr))',gap:c.gap,padding:c.gap,boxSizing:'border-box',overflow:'hidden',borderRadius:radius,clipPath:`inset(0 round ${radius})`,background:theme?.surface || 'transparent',border:`${c.frameWidth}px solid ${theme?.border || 'transparent'}`}}>
    {c.slots.map((slot,index) => <div key={index} aria-label={GRID_POSITIONS[index]} style={{minWidth:0,minHeight:0,overflow:'hidden'}}><SlotWindowWidget config={slot} runtime={runtime}/></div>)}
  </section>;
}
