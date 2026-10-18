import {useId} from 'react';

// Token-based miniature of the real overlay composition, without sample text/data.
export default function PalettePreview({theme}) {
 const id=useId().replaceAll(':',''),warm=['sunset','gold','luxe','gladiator'].includes(theme.key),metal=theme.key==='metallic',angular=['cyberpunk','crimson','volcanic','gladiator'].includes(theme.key);
 return <svg className="bp-palette-preview" data-palette-preview={theme.key} viewBox="0 0 240 135" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id={`${id}-bg`} x2="1" y2="1"><stop stopColor={theme.background}/><stop offset=".7" stopColor={theme.surface}/><stop offset="1" stopColor={theme.secondary}/></linearGradient><radialGradient id={`${id}-light`}><stop stopColor={theme.accent} stopOpacity=".3"/><stop offset="1" stopColor={theme.accent} stopOpacity="0"/></radialGradient></defs>
  <rect width="240" height="135" fill={`url(#${id}-bg)`}/><ellipse cx={warm?170:105} cy="50" rx="100" ry="70" fill={`url(#${id}-light)`}/>
  {metal?<g stroke={theme.text} opacity=".09">{[0,1,2,3,4].map(i=><path key={i} d={`M0 ${i*30} 240 ${i*30-80}`}/>)}</g>:angular?<path d="M0 0 58 0 22 38M240 135 180 135 220 92" fill="none" stroke={theme.accent} strokeWidth="3" opacity=".45"/>:<g fill="none" stroke={theme.secondary} opacity=".25"><circle cx="170" cy="42" r="35"/><circle cx="170" cy="42" r="48"/></g>}
  <g fill={theme.surface} stroke={theme.border} strokeWidth="1.2"><rect x="8" y="8" width="224" height="14" rx="4"/><rect x="8" y="28" width="44" height="96" rx="5"/><rect x="188" y="28" width="44" height="29" rx="5"/><rect x="188" y="63" width="44" height="61" rx="5"/><rect x="59" y="104" width="122" height="20" rx="5"/></g>
  <rect x="59" y="28" width="122" height="69" rx={angular?2:6} fill={theme.background} fillOpacity=".7" stroke={theme.accent} strokeOpacity=".65"/>
  <g fill={theme.accent}><rect x="13" y="12" width="33" height="6" rx="3"/><rect x="110" y="12" width="23" height="6" rx="3"/><rect x="194" y="12" width="29" height="6" rx="3"/><rect x="14" y="35" width="27" height="3" rx="1.5"/></g>
  {[0,1,2].map(i=><g key={i}><rect x="13" y={44+i*24} width="13" height="18" rx="2" fill={theme.raised}/><path d={`M30 ${48+i*24}h15m-15 6h11`} stroke={theme.text} strokeWidth="2" opacity=".75"/></g>)}
  <g stroke={theme.muted} strokeWidth="2" opacity=".65"><path d="M195 72h25m-25 8h18m-18 8h23m-23 8h15M67 111h26m9 0h25m9 0h34"/></g>
 </svg>;
}
