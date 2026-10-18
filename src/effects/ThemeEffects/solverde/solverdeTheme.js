export const SOLVERDE_TOKENS = Object.freeze({
  background: '#031612', surface: '#06231C', raised: '#0B3026',
  border: '#C7B78E', accent: '#00DB80', secondary: '#EEE7D6',
  text: '#F6F4EC', muted: '#B9C7BD', ivory: '#EEE7D6',
});
export const SOLVERDE_LOGO = '/theme-effects/solverde/logo.svg';
export const SOLVERDE_SLIDE = '/theme-effects/solverde/brand-slide.svg';
export const SOLVERDE_GAMEPLAY = Object.freeze({ x: 20, y: 96, width: 1358, height: 700 });
const textElement = label => ({ label, kind:'text', capabilities:['typography'] });
const surfaceElement = label => ({ label, kind:'container', capabilities:['surface','border','spacing'] });
const variant = (id,label,elements) => Object.freeze({id,label,description:label,hiddenInQuickEditor:true,strictElementIds:true,elementIds:Object.keys(elements),elements,capabilities:{colours:true,fonts:true,fontSizes:true,borders:true}});
export const SOLVERDE_VARIANTS = Object.freeze({
  current_slot: variant('solverde_footer','Solverde integrated footer',{
    container:surfaceElement('Footer surface'),slotImage:{label:'Slot thumbnail',kind:'image',capabilities:['image','border']},slotTitle:textElement('Slot title'),provider:textElement('Provider'),
    ...Object.fromEntries(['rtp','potential','bestWin'].flatMap(id=>[[id,surfaceElement(id)],[id+'Label',textElement(id+' label')],[id+'Value',textElement(id+' value')]])),
  }),
  bonus_hunt: variant('solverde_dock','Solverde horizontal hunt dock',{
    container:surfaceElement('Hunt dock'),headerTitle:textElement('Dock heading'),progressCount:textElement('Opened count'),statCell:surfaceElement('Session figure'),statLabel:textElement('Session label'),statValue:textElement('Session value'),slotRow:surfaceElement('Slot card'),slotTitle:textElement('Slot title'),providerText:textElement('Provider'),betValue:textElement('Bet'),multiplierValue:textElement('Multiplier'),
  }),
  bets: variant('solverde_predictions','Solverde prediction rows',{
    widgetBackground:surfaceElement('Predictions surface'),title:textElement('Question'),statusBadge:{label:'Status pill',kind:'badge',capabilities:['surface','border','typography']},individualBetCard:surfaceElement('Prediction row'),cardRangeText:textElement('Range'),cardPercentageText:textElement('Percentage'),progressBar:{label:'Vote fill',kind:'progress',capabilities:['progress'],controls:['fillColor','radius']},
  }),
});
export function getSolverdeVariant(type, config = {}) {
  if(type==='current_slot'&&config.displayStyle==='portrait_compact') return null;
  if (config.colourTheme !== 'solverde') return null;
  return ((type==='bonus_hunt'&&config.orientation==='horizontal'&&config.solverde?.huntDock)||(type==='current_slot'&&config.solverde?.footer)||(type==='bets'&&config.solverde?.predictions)) ? SOLVERDE_VARIANTS[type] : null;
}
export function normalizeSolverdeSettings(config = {}) {
  const raw = config.solverde || {};
  return { decorations: raw.decorations !== false, gameplayFrame: raw.gameplayFrame === true, idleBackground: raw.idleBackground === true,
    defaultBrandSlide: raw.defaultBrandSlide !== false,
    huntDock: raw.huntDock === true, footer: raw.footer === true, predictions: raw.predictions === true,
    dockCards: Math.max(2, Math.min(4, Math.round(Number(raw.dockCards) || 3))) };
}
export function solverdeStyleVariables(palette, config) {
  return Object.fromEntries(Object.entries({
    '--slv-bg': palette.background, '--slv-panel': palette.surface, '--slv-raised': palette.raised,
    '--slv-line': palette.border, '--slv-accent': palette.accent, '--slv-text': palette.text,
    '--slv-muted': palette.muted, '--slv-ivory': SOLVERDE_TOKENS.ivory,
    '--slv-font': config.fontFamily || "'Inter',Arial,sans-serif",
    '--slv-display': config.solverde?.displayFont || "Georgia,'Times New Roman',serif",
  }));
}
