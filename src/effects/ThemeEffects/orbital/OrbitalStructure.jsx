import React, { useId, useMemo } from 'react';
import { orbitalStructure } from './orbitalStructureGeometry.js';

// Static vector housing reuses the shared effect layer's measured surfaces.
// No renderer, timer, motion loop or layout mutations are introduced.
export default function OrbitalStructure({ targets, width, height, singleInstanceId }) {
  const id = useId().replace(/:/g, '');
  const frames = useMemo(() => singleInstanceId ? [] : orbitalStructure(targets, width, height), [targets, width, height, singleInstanceId]);
  if (!frames.length) return null;
  return <svg className="orbital-structure" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-metal`} x2="0" y2="1">
        <stop stopColor="#263e52"/><stop offset=".14" stopColor="#0d2031"/>
        <stop offset=".5" stopColor="#07121f"/><stop offset=".9" stopColor="#193044"/><stop offset="1" stopColor="#020811"/>
      </linearGradient>
    </defs>
    {frames.map(frame => {
      const { x, y, width: w, height: h, depth: d } = frame;
      const cut = Math.min(frame.id === 'gameplay-window' ? 42 : 22, w / 8, h / 8);
      const path = inset => `M ${x + cut} ${y + inset} H ${x + w - cut} L ${x + w - inset} ${y + cut} V ${y + h - cut} L ${x + w - cut} ${y + h - inset} H ${x + cut} L ${x + inset} ${y + h - cut} V ${y + cut} Z`;
      return <g key={frame.id} data-orbital-structure={frame.id}>
        {/* Filled ring keeps all housing inside its measured bounds. Wide
            centred strokes used to protrude at chamfered corner joins. */}
        <path d={`${path(0)} ${path(d)}`} fill={`url(#${id}-metal)`} fillRule="evenodd"/>
        <path d={path(1)} fill="none" stroke="#526c7e" strokeWidth="1" strokeLinejoin="bevel"/>
        <path d={path(3)} fill="none" stroke="#020812" strokeWidth="2" strokeLinejoin="bevel"/>
        <path d={path(d - 2)} fill="none" stroke="#030a12" strokeWidth="4" strokeLinejoin="bevel"/>
        <path d={path(d - 4)} fill="none" stroke="#4b8197" strokeWidth="1" strokeLinejoin="bevel"/>
        {frame.id === 'gameplay-window' && <>
          <path d={`M ${x + cut + 24} ${y + 7} H ${x + w - cut - 24} M ${x + cut + 24} ${y + h - 7} H ${x + w - cut - 24}`} stroke="#29465d" strokeWidth="4"/>
          <path d={`M ${x + 7} ${y + cut + 28} V ${y + h - cut - 28} M ${x + w - 7} ${y + cut + 28} V ${y + h - cut - 28}`} stroke="#29465d" strokeWidth="3"/>
        </>}
        {(frame.dividers || []).map((divider, i) => <g key={`divider-${i}`} data-orbital-structure-divider="comms">
          <path d={`M ${x + 3} ${divider.y} H ${x + w - 3}`} stroke="#030a12" strokeWidth={divider.depth}/>
          <path d={`M ${x + 3} ${divider.y - divider.depth / 2 + 1} H ${x + w - 3}`} stroke="#39586e"/>
          <path d={`M ${x + 10} ${divider.y} h 20 M ${x + w - 30} ${divider.y} h 20`} stroke="#518ca3"/>
        </g>)}
        {[0, 1].flatMap(row => [0, 1].map(col => <g key={`${row}-${col}`} transform={`translate(${col ? x + w : x},${row ? y + h : y}) scale(${col ? -1 : 1},${row ? -1 : 1})`}>
          {frame.id === 'gameplay-window' && <>
            <path d={`M 2 ${cut + 28} V ${cut} L ${cut} 2 H ${cut + 48} L ${cut + 36} 12 H ${cut + 5} L 12 ${cut + 5} V ${cut + 36} Z`} fill={`url(#${id}-metal)`} stroke="#4b687e" strokeWidth="1"/>
            <path d={`M 16 ${cut + 12} V ${cut + 2} L ${cut + 2} 16 H ${cut + 22}`} fill="none" stroke="#75b9d0" strokeWidth="2"/>
          </>}
          <path d={`M ${cut + 32} 5 H ${cut} L 5 ${cut} V ${cut + 30}`} fill="none" stroke="#020711" strokeWidth="5" strokeLinejoin="bevel"/>
          <path d={`M ${cut + 32} 5 H ${cut} L 5 ${cut} V ${cut + 30}`} fill="none" stroke="#4c91ac" strokeWidth="1.5" strokeLinejoin="bevel"/>
          <path d={`M ${cut + 16} 5 H ${cut}`} stroke="#9ad8e9" strokeWidth="1.5"/>
          <circle cx={cut + 44} cy="5" r="2" fill="#01060c" stroke="#47657b"/>
          {frame.id === 'gameplay-window' && <g data-orbital-hull-detail="vent" opacity=".75">
            <path d={`M ${cut + 43} 5 h 2 M ${cut + 54} 3 v 9`} stroke="#07111b" strokeWidth="1"/>
            {[0, 1, 2, 3].map(i => <path key={i} d={`M ${cut + 64 + i * 6} 7 l -2 4`} stroke="#020812" strokeWidth="2"/>)}
            <path d={`M ${cut + 92} 9 h 8`} stroke="#679eb3" strokeWidth="2"/>
          </g>}
        </g>))}
      </g>;
    })}
  </svg>;
}
