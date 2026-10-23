import React from 'react';
import SlotWindowWidget from './SlotWindowWidget';
import { sanitizeSlotWindowConfig } from './slotWindowModel';
import { getWidgetColourTheme } from '../shared/colourThemePalettes';

export const GRID_POSITIONS = ['Top left', 'Top right', 'Bottom left', 'Bottom right'];
export function sanitizeBonusHuntGrid(config = {}) {
  return { ...config, displayStyle: 'four_slots', gap: Math.max(0, Math.min(60, Number(config.gap) || 0)), slots: GRID_POSITIONS.map((_, index) => sanitizeSlotWindowConfig(config.slots?.[index] || {})) };
}
export default function BonusHuntGridWidget({ config = {}, runtime }) {
  const c = sanitizeBonusHuntGrid(config);
  const theme = getWidgetColourTheme(c.colourTheme);
  return <section aria-label="2x2 Bonus Hunt" style={{width:'100%',height:'100%',display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gridTemplateRows:'repeat(2,minmax(0,1fr))',gap:c.gap,padding:c.gap,boxSizing:'border-box',background:theme?.surface || 'transparent',border:`1px solid ${theme?.border || 'transparent'}`}}>
    {c.slots.map((slot,index) => <div key={index} aria-label={GRID_POSITIONS[index]} style={{minWidth:0,minHeight:0,overflow:'hidden'}}><SlotWindowWidget config={slot} runtime={runtime}/></div>)}
  </section>;
}
