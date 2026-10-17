import React from 'react';
import { CANDY_ASSETS, normalizeCandySettings } from './candyTheme.js';
import './CandyTheme.css';

export function CandyDecoration({ kind = 'jar', className = '' }) {
  return <span aria-hidden="true" className={`candy-decoration candy-decoration--${kind} ${className}`} />;
}

export function CandyModule({ type, config, children }) {
  const settings = normalizeCandySettings(config.candy);
  if (['background', 'slot_window', 'camera'].includes(type)) return children;
  const composite = type === 'bonus_hunt' && config.orientation === 'vertical';
  return <div className={`candy-module${composite ? ' candy-module--composite' : ''}`}
    data-candy-motion={settings.motion ? 'on' : 'off'} data-candy-decorations={settings.decorations ? 'on' : 'off'}>
    <div className="candy-module-content">{children}</div>
    {settings.decorations && <>
      {type === 'chat' && <CandyDecoration kind="jar" />}
      {composite && <CandyDecoration kind="bear" />}
      {type === 'slideshow_frame' && <><span className="candy-lollipop" aria-hidden="true" /><span className="candy-capsules" aria-hidden="true" /></>}
      {type === 'navbar' && <span className="candy-capsules" aria-hidden="true" />}
    </>}
  </div>;
}

export function CandyEnvironment({ config, canvasAttrs, canvasStyle }) {
  const settings = normalizeCandySettings(config.candy);
  return <div {...canvasAttrs} className="oc-bg-widget candy-environment" style={canvasStyle}
    data-candy-motion={settings.motion ? 'on' : 'off'}>
    {settings.background && <img className="candy-environment-image" src={CANDY_ASSETS.background} alt="" draggable={false} />}
    {settings.decorations && <div className="candy-environment-sweets" aria-hidden="true"><i /><i /><i /></div>}
  </div>;
}
