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
        <stop stopColor="#607689"/><stop offset=".08" stopColor="#1a3249"/>
        <stop offset=".5" stopColor="#07121f"/><stop offset=".94" stopColor="#20374b"/><stop offset="1" stopColor="#020811"/>
      </linearGradient>
    </defs>
    {frames.map(frame => {
      const { x, y, width: w, height: h, depth: d } = frame;
      const cut = Math.min(frame.id === 'gameplay-window' ? 42 : 22, w / 8, h / 8);
      const path = inset => `M ${x + cut} ${y + inset} H ${x + w - cut} L ${x + w - inset} ${y + cut} V ${y + h - cut} L ${x + w - cut} ${y + h - inset} H ${x + cut} L ${x + inset} ${y + h - cut} V ${y + cut} Z`;
      return <g key={frame.id} data-orbital-structure={frame.id}>
        <path d={path(d / 2)} fill="none" stroke="#01060d" strokeWidth={d}/>
        <path d={path(d / 2)} fill="none" stroke={`url(#${id}-metal)`} strokeWidth={d - 2}/>
        <path d={path(d - 1)} fill="none" stroke="#40647e" strokeWidth="1"/>
        <path d={path(d - 4)} fill="none" stroke="#020812" strokeWidth="3"/>
        <path d={path(d - 5)} fill="none" stroke="#468da9" strokeWidth="1"/>
        <path d={path(1)} fill="none" stroke="#7591a5" strokeOpacity=".4" strokeWidth="1"/>
        {[0, 1].flatMap(row => [0, 1].map(col => <g key={`${row}-${col}`} transform={`translate(${col ? x + w : x},${row ? y + h : y}) scale(${col ? -1 : 1},${row ? -1 : 1})`}>
          {frame.id === 'gameplay-window' && <>
            <path d={`M 2 ${cut + 28} V ${cut} L ${cut} 2 H ${cut + 48} L ${cut + 36} 12 H ${cut + 5} L 12 ${cut + 5} V ${cut + 36} Z`} fill={`url(#${id}-metal)`} stroke="#4b687e" strokeWidth="1"/>
            <path d={`M 16 ${cut + 12} V ${cut + 2} L ${cut + 2} 16 H ${cut + 22}`} fill="none" stroke="#75b9d0" strokeWidth="2"/>
          </>}
          <path d={`M ${cut + 32} 3 H ${cut} L 3 ${cut} V ${cut + 30}`} fill="none" stroke="#020711" strokeWidth="7"/>
          <path d={`M ${cut + 32} 3 H ${cut} L 3 ${cut} V ${cut + 30}`} fill="none" stroke="#299ecc" strokeWidth="2"/>
          <path d={`M ${cut + 16} 3 H ${cut}`} stroke="#b5efff" strokeWidth="2"/>
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
