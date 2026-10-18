import {getWidgetColourTheme} from '../shared/colourThemePalettes';
import {candyWidgetPalette} from '../../../../effects/ThemeEffects/candy/candyTheme';
export function premiumChatPalette(config={}) {
 if(!['solverde','volcanic','candy','orbital','arctic','old_rome','street_art','starter_studio','galactic_command'].includes(config.colourTheme))return null;
 const theme=candyWidgetPalette('chat',getWidgetColourTheme(config.colourTheme));
 return {...theme,surface:config.panel||theme.surface,raised:config.bubble||theme.raised,text:config.text||theme.text,accent:config.glow||theme.accent,border:config.borderColor||theme.border};
}
export function premiumMessageSurface(palette,spacing=2,highlight=false) {
 if(!palette)return {};
 if(['street_art','starter_studio','galactic_command'].includes(palette.key)&&!highlight)return {background:'transparent',color:palette.text,border:0,borderRadius:0,padding:'3px 1px',margin:`${spacing}px 0`,minHeight:0,flex:'0 0 auto',boxShadow:'none',opacity:1};
 return {background:`linear-gradient(120deg,${palette.raised},${palette.surface})`,color:palette.text,
  border:`1px solid color-mix(in srgb,${highlight?palette.accent:palette.border} ${highlight?65:28}%,transparent)`,
  flex:'0 0 auto',opacity:1,borderRadius:8,padding:'6px 9px',margin:`${spacing}px 0`,minHeight:0,
  boxShadow:highlight?`inset 3px 0 0 ${palette.accent}`:'inset 0 1px 0 #ffffff08'};
}
