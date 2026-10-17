import React from 'react';
import { normalizeVolcanicSettings, VOLCANIC_SCENERY } from './volcanicTheme.js';
import './VolcanicTheme.css';

// Shared editor/OBS decoration without another renderer or frame loop.
export function VolcanicWidgetLife({ config }) {
  const settings = normalizeVolcanicSettings(config);
  if (!settings.widgetLife) return null;
  const count = settings.quality === 'low' ? 2 : settings.quality === 'ultra' ? 6 : 4;
  return <div className="volcanic-widget-life" aria-hidden="true">
    <span className="volcanic-widget-seam" />
    {Array.from({ length: count }, (_, i) => <i key={i} style={{ '--spark-index': i }} />)}
  </div>;
}

export function VolcanicEnvironment({ config, canvasAttrs, canvasStyle }) {
  const settings = normalizeVolcanicSettings(config);
  const count = settings.quality === 'low' ? 2 : settings.quality === 'ultra' ? 8 : 4;
  return <div {...canvasAttrs} className="oc-bg-widget volcanic-environment" style={canvasStyle}
    data-gameplay-cutout={settings.transparentGameplay ? 'on' : 'off'} data-volcanic-motion={settings.motion ? 'on' : 'off'}>
    {settings.scenery && <img className="volcanic-scenery" src={VOLCANIC_SCENERY} alt="" draggable={false} />}
    {settings.scenery && settings.motion && <div className="volcanic-embers" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <i key={i} style={{ '--ember-index': i }} />)}
    </div>}
  </div>;
}
