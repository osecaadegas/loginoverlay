import React from 'react';
import { normalizeOrbitalSettings, orbitalStyleVariables } from './orbitalTheme.js';
import './OrbitalTheme.css';

/** Static DOM in the background widget's own stacking context. The shared
 * Pixi engine drives these layers; no extra renderer, timer or React loop. */
export default function OrbitalEnvironment({ config, canvasStyle, canvasAttrs }) {
  const c = normalizeOrbitalSettings(config.themeEffects?.orbital);
  const enabled = c.environment !== 'off' && c.intensity > 0;
  return <div {...canvasAttrs} className="oc-bg-widget oc-bg-widget--orbital"
    data-orbital-environment={enabled ? c.environment : 'off'}
    style={{ ...canvasStyle, ...orbitalStyleVariables(c), background: 'transparent' }}>
    {enabled && <div className="orbital-environment" aria-hidden="true" style={{ '--orbital-environment-intensity': c.intensity }}>
      <div className="orbital-environment__void" />
      <div className="orbital-environment__nebula" data-orbital-drift="nebula" />
      {c.environment !== 'deep_space' && <div className="orbital-environment__planet" style={{ opacity: c.earthVisibility * c.intensity }}>
        <img className="orbital-environment__earth" data-orbital-drift="earth" src="/theme-effects/orbital/earth-orbit.webp" alt="" draggable="false" />
        <div className="orbital-environment__clouds" data-orbital-drift="clouds" />
        <div className="orbital-environment__atmosphere" style={{ opacity: c.atmosphereGlow }}><div data-orbital-surge /></div>
        {c.environment === 'earth_sunrise' && <div className="orbital-environment__sunrise" />}
      </div>}
      {c.stars && <svg className="orbital-environment__stars" data-orbital-stars viewBox="0 0 1920 1080" preserveAspectRatio="none" style={{ opacity: c.starsIntensity * c.intensity }} />}
      <div className="orbital-environment__shade" data-orbital-shade />
      {c.spacecraftInterior && <img className="orbital-environment__interior" src="/theme-effects/orbital/spacecraft-interior.webp" alt="" draggable="false" />}
    </div>}
  </div>;
}
