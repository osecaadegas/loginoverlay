import {newHorizontalPalette} from './shared/newHorizontalHunt';

export default function NewHorizontalControls({config:c,onChange,onOrientation}) {
  const palette=newHorizontalPalette(c),set=patch=>onChange({...c,...patch});
  return <div className="bp-controls nh-controls">
    <label className="bp-text">Layout<select aria-label="Bonus Hunt layout" value={c.orientation} onChange={e=>onOrientation(e.target.value)}>{[['vertical','Vertical'],['horizontal','Horizontal'],['mainstream','Mainstream'],['new_horizontal','New Horizontal']].map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
    <label className="bp-text">Font<select value={c.fontFamily||"'Rajdhani', sans-serif"} onChange={e=>set({fontFamily:e.target.value})}>{!['Rajdhani','Inter','Barlow Condensed','Orbitron'].some(font=>c.fontFamily===`'${font}', sans-serif`)&&c.fontFamily&&<option value={c.fontFamily}>Theme / custom font</option>}{['Rajdhani','Inter','Barlow Condensed','Orbitron'].map(font=><option key={font} value={`'${font}', sans-serif`}>{font}</option>)}</select></label>
    {Object.entries(palette).map(([key,value])=><label className="bp-text" key={key}>{key}<input aria-label={`New Horizontal ${key}`} type="color" value={value} onChange={e=>set({newHorizontal:{...c.newHorizontal,[key]:e.target.value}})}/></label>)}
    {[['opacity','Opacity (%)',0,100,100],['borderWidth','Border thickness',0,6,1.5],['edgeRadius','Corner radius',0,30,12]].map(([id,label,min,max,fallback])=><label className="bp-text" key={id}>{label}<input aria-label={label} type="number" min={min} max={max} step={id==='borderWidth'?.5:1} value={c[id]??fallback} onChange={e=>set({[id]:Math.max(min,Math.min(max,e.target.valueAsNumber||0))})}/></label>)}
    <label className="bp-text"><input type="checkbox" checked={c.animations!==false} onChange={e=>set({animations:e.target.checked})}/>Smooth card advancement</label>
    <p className="bp-hint">Resize the frame to scale the complete 730 × 150 layout. Hunt values and card ordering follow your live Bonus Hunt.</p>
  </div>;
}
