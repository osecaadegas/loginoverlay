/**
 * OverlayRenderer.jsx — The OBS Browser Source page.
 *
 * Route: /overlay/:token
 * - Transparent background
 * - Loads user widgets + theme via token
 * - Subscribes to realtime updates
 * - GPU-accelerated animations
 * - 60fps optimized, no polling
 */
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import {
  getInstanceByToken,
  getWidgets,
  getTheme,
  subscribeToOverlay,
  unsubscribeOverlay,
} from '../../services/overlayService';
import { getWidgetDef } from './widgets/widgetRegistry';
import './OverlayRenderer.css';

// Register built-in widgets
import './widgets/builtinWidgets';

// ─── Single widget wrapper with animation ───
const WidgetSlot = memo(function WidgetSlot({ widget, theme, animSpeed }) {
  const def = getWidgetDef(widget.widget_type);
  const Component = def?.component;
  if (!Component) return null;

  const animClass = widget.is_visible ? `or-anim-in--${widget.animation || 'fade'}` : `or-anim-out--${widget.animation || 'fade'}`;

  const style = {
    position: 'absolute',
    left: widget.position_x,
    top: widget.position_y,
    width: widget.width,
    height: widget.height,
    zIndex: widget.z_index || 1,
    animationDuration: `${(animSpeed || 1) * 0.35}s`,
    willChange: 'transform, opacity',
  };

  return (
    <div className={`or-widget-slot ${animClass}`} style={style}>
      <Component config={widget.config} theme={theme} />
    </div>
  );
});

// ─── CSS variable builder from theme ───
function buildThemeVars(theme) {
  if (!theme) return {};
  return {
    '--oc-primary': theme.primary_color || '#9346ff',
    '--oc-secondary': theme.secondary_color || '#1a1b2e',
    '--oc-accent': theme.accent_color || '#00e1ff',
    '--oc-text': theme.text_color || '#ffffff',
    '--oc-opacity': theme.opacity ?? 0.9,
    '--oc-blur': `${theme.blur_intensity ?? 12}px`,
    '--oc-shadow': theme.shadow_strength ?? 0.5,
    '--oc-glow': theme.glow_intensity ?? 0.4,
    '--oc-radius': `${theme.border_radius ?? 12}px`,
    '--oc-font': theme.font_family || 'Inter',
    '--oc-font-weight': theme.font_weight || 500,
    '--oc-anim-speed': theme.animation_speed ?? 1,
  };
}

export default function OverlayRenderer() {
  const { token } = useParams();
  const [userId, setUserId] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [theme, setTheme] = useState(null);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  // ── Resolve token → userId → load all data ──
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const inst = await getInstanceByToken(token);
        if (!inst) { setError('Invalid overlay token'); return; }
        if (cancelled) return;

        setUserId(inst.user_id);

        const [wdgs, th] = await Promise.all([
          getWidgets(inst.user_id),
          getTheme(inst.user_id),
        ]);

        if (cancelled) return;
        setWidgets(wdgs);
        setTheme(th);

        // Subscribe to realtime
        channelRef.current = subscribeToOverlay(inst.user_id, {
          onWidgets: () => getWidgets(inst.user_id).then(w => !cancelled && setWidgets(w)),
          onTheme: (t) => !cancelled && setTheme(t),
          onState: () => {}, // used by admin, not needed in renderer
        });
      } catch (err) {
        console.error('[OverlayRenderer]', err);
        setError('Failed to load overlay');
      }
    }

    init();
    return () => { cancelled = true; unsubscribeOverlay(channelRef.current); };
  }, [token]);

  // ── Theme CSS variables ──
  const themeVars = useMemo(() => buildThemeVars(theme), [theme]);

  // ── Custom CSS injection ──
  const customCSS = theme?.custom_css || '';

  // ── Only render visible widgets ──
  const visibleWidgets = useMemo(() => widgets.filter(w => w.is_visible), [widgets]);

  if (error) return null; // blank for OBS
  if (!userId) return null; // still loading

  return (
    <div className="or-canvas" style={themeVars}>
      {customCSS && <style>{customCSS}</style>}

      {/* Texture overlay */}
      {theme?.bg_texture && theme.bg_texture !== 'none' && (
        <div className={`or-texture or-texture--${theme.bg_texture}`} />
      )}

      {visibleWidgets.map(w => (
        <WidgetSlot
          key={w.id}
          widget={w}
          theme={theme}
          animSpeed={theme?.animation_speed}
        />
      ))}
    </div>
  );
}
