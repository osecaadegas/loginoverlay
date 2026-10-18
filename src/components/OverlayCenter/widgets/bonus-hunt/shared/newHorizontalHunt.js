import {getWidgetColourTheme} from '../../shared/colourThemePalettes';
export const NEW_HORIZONTAL_SIZE=Object.freeze({width:730,height:150});
export function newHorizontalPalette(config={}) {
  const custom=config.newHorizontal||{},theme=config.colourTheme?getWidgetColourTheme(config.colourTheme):null;
  return {background:custom.background||(theme?config.bgColor:null)||'#102449',accent:custom.accent||(theme?config.accentColor:null)||'#f27786',text:custom.text||theme?.text||'#f5f7ff',muted:custom.muted||theme?.muted||'#a8b5d1',line:custom.line||theme?.border||'#405c88',tile:custom.tile||theme?.raised||'#152f59'};
}
// Keep five stable positions without duplicating a bonus at either hunt boundary.
export function newHorizontalSequence(cards,state) {
  const opened=cards.filter(card=>card.opened).slice(-2);
  const upcoming=state==='ended'?[]:cards.filter(card=>!card.opened).slice(0,3);
  return {left:[...Array(2-opened.length).fill(null),...opened],right:[...upcoming,...Array(3-upcoming.length).fill(null)]};
}
const text=label=>({label,kind:'text',capabilities:['typography']});
const surface=label=>({label,kind:'container',capabilities:['surface','border','spacing']});
const elements={container:surface('New Horizontal frame'),headerTitle:text('Hunt status'),huntNumber:text('Hunt number'),totalPayout:text('Total payout'),progressCount:text('Opened count'),progressBar:{label:'Progress track',kind:'progress',capabilities:['surface']},progressBarFill:{label:'Progress fill',kind:'progress',capabilities:['progress'],controls:['fillColor','radius']},tierCounter:surface('Category counter'),tierValue:text('Category count'),statCell:surface('Statistic tile'),statLabel:text('Statistic label'),statValue:text('Statistic value'),slotRow:surface('Bonus card'),slotImage:{label:'Slot artwork',kind:'image',capabilities:['image']},slotTitle:text('Missing artwork title'),betValue:text('Bet'),winValue:text('Payout'),multiplierValue:text('Multiplier'),cardNumber:text('Bonus number')};
export const NEW_HORIZONTAL_APPEARANCE=Object.freeze({id:'new_horizontal',label:'New Horizontal',hiddenInQuickEditor:true,strictElementIds:true,elementIds:Object.keys(elements),elements,capabilities:{colours:true,fonts:true,fontSizes:true,borders:true,opacity:true}});
