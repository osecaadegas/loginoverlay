import React from 'react';
import { normalizeVolcanicSettings, VOLCANIC_SCENERY, VOLCANIC_VIEWPORT } from './volcanicTheme.js';
import './VolcanicTheme.css';

export function VolcanicEnvironment({ config, canvasAttrs, canvasStyle }) {
  const settings = normalizeVolcanicSettings(config);
  const viewport = VOLCANIC_VIEWPORT;
  const count = settings.quality === 'low' ? 2 : settings.quality === 'ultra' ? 8 : 4;
  return <div {...canvasAttrs} className="oc-bg-widget volcanic-environment" style={canvasStyle}
    data-reference-frame={settings.referenceFrame ? 'on' : 'off'} data-volcanic-motion={settings.motion ? 'on' : 'off'}>
    {settings.scenery && <img className="volcanic-scenery" src={VOLCANIC_SCENERY} alt="" draggable={false} />}
    {settings.referenceFrame && <div className="volcanic-viewport-rim" data-idle={settings.idleBackground ? 'on' : 'off'}
      style={{ left: `${viewport.x / 19.2}%`, top: `${viewport.y / 10.8}%`, width: `${viewport.width / 19.2}%`, height: `${viewport.height / 10.8}%` }}>
      {settings.scenery && <img src={VOLCANIC_SCENERY} alt="" draggable={false} />}
    </div>}
    {settings.scenery && settings.motion && <div className="volcanic-embers" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <i key={i} style={{ '--ember-index': i }} />)}
    </div>}
  </div>;
}
