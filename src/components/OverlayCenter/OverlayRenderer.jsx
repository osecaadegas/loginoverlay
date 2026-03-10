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
import { useParams, useSearchParams } from 'react-router-dom';
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
import './OverlayCenter.css';

// Register built-in widgets
import './widgets/builtinWidgets';

// ─── Single widget wrapper with animation + scale-to-fit ───
const WidgetSlot = memo(function WidgetSlot({ widget, theme, animSpeed, allWidgets, canvasWidth, canvasHeight, exiting, userId }) {
  const def = getWidgetDef(widget.widget_type);
  const Component = def?.component;

  if (!Component) return null;

  const slotId = `ow-${widget.id}`;
  /* Backwards-compat: old 'slide' → 'slide-up' */
  const normalise = (v) => v === 'slide' ? 'slide-up' : (v || 'fade');
  const enterAnim = normalise(widget.animation);
  const exitAnim  = normalise(widget.exit_animation);
  const animClass = exiting
    ? `or-anim-out--${exitAnim}`
    : `or-anim-in--${enterAnim}`;
  const customCSS = widget.config?.custom_css || '';

  /* ─── Background widgets always fill the entire canvas ─── */
  const isBg = widget.widget_type === 'background';

  /* ─── Configurable shadow via drop-shadow (follows visual outline) ─── */
  const cfg = widget.config || {};
  const ss = cfg.shadowSize ?? 0;
  const si = cfg.shadowIntensity ?? 0;
  const hasShadow = ss > 0 && si > 0;
  const shadowFilter = hasShadow
    ? `drop-shadow(0 ${Math.round(ss * 0.35)}px ${Math.round(ss * 0.7)}px rgba(0,0,0,${(si / 100).toFixed(2)}))`
    : undefined;

  const style = {
    position: 'absolute',
    left: isBg ? 0 : widget.position_x,
    top: isBg ? 0 : widget.position_y,
    width: isBg ? canvasWidth : widget.width,
    height: isBg ? canvasHeight : widget.height,
    zIndex: widget.z_index || 1,
    animationDuration: `${(animSpeed || 1) * 0.35}s`,
    willChange: 'transform, opacity',
    overflow: 'hidden',
    filter: shadowFilter,
  };

  return (
    <div id={slotId} className={`or-widget-slot ${animClass}`} style={style}>
      {customCSS && <style>{`#${slotId} { ${customCSS} }`}</style>}
      <Component config={widget.config} theme={theme} allWidgets={allWidgets} widgetId={widget.id} userId={userId} />
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
  const [searchParams] = useSearchParams();
  const singleWidgetId = searchParams.get('widget');
  const [userId, setUserId] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [theme, setTheme] = useState(null);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  // ── Force full-viewport transparent OBS mode ──
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    // Strip all App.css interference
    html.style.cssText = 'margin:0;padding:0;overflow:hidden;background:transparent;width:100%;height:100%;';
    body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:transparent;width:100%;height:100%;min-height:0;';
    // Also hide app-layout flex styling
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
      appLayout.style.cssText = 'display:block;min-height:0;background:transparent;width:100%;height:100%;';
    }
    return () => {
      html.style.cssText = '';
      body.style.cssText = '';
      if (appLayout) appLayout.style.cssText = '';
    };
  }, []);

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

  // ── Only render visible widgets (optionally filtered to a single widget) ──
  // Keep recently-hidden widgets in DOM so their exit animation can play.
  const exitingRef = useRef(new Map()); // widgetId → { widget, timer }
  const prevVisibleIds = useRef(new Set());
  const [exitTick, setExitTick] = useState(0);

  const visibleWidgets = useMemo(() => {
    // Standalone URL (?widget=id): always render the requested widget even if hidden
    if (singleWidgetId) return widgets.filter(w => w.id === singleWidgetId);
    return widgets.filter(w => w.is_visible);
  }, [widgets, singleWidgetId]);

  // Detect newly-hidden widgets and keep them for exit animation
  useEffect(() => {
    const currentIds = new Set(visibleWidgets.map(w => w.id));
    const animDuration = ((theme?.animation_speed || 1) * 0.35 + 0.15) * 1000;

    for (const id of prevVisibleIds.current) {
      if (!currentIds.has(id)) {
        const w = widgets.find(x => x.id === id);
        if (w && (w.exit_animation || w.animation) !== 'none') {
          if (exitingRef.current.has(id)) clearTimeout(exitingRef.current.get(id).timer);
          const timer = setTimeout(() => {
            exitingRef.current.delete(id);
            setExitTick(t => t + 1);
          }, animDuration);
          exitingRef.current.set(id, { widget: w, timer });
          setExitTick(t => t + 1);
        }
      }
    }

    for (const id of currentIds) {
      if (exitingRef.current.has(id)) {
        clearTimeout(exitingRef.current.get(id).timer);
        exitingRef.current.delete(id);
      }
    }

    prevVisibleIds.current = currentIds;
  }, [visibleWidgets, widgets, theme?.animation_speed]);

  const exitingWidgets = useMemo(() => {
    void exitTick;
    return Array.from(exitingRef.current.values()).map(e => e.widget);
  }, [exitTick]);

  // ── Viewport-fit scaling ──
  // The canvas is always authored at a fixed resolution (e.g. 1920×1080).
  // We scale it to fill the OBS browser source viewport exactly.
  const canvasWidth = theme?.canvas_width || 1920;
  const canvasHeight = theme?.canvas_height || 1080;

  const [scale, setScale] = useState(1);

  useEffect(() => {
    function calcScale() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / canvasWidth, vh / canvasHeight);
      setScale(s);
    }
    calcScale();
    window.addEventListener('resize', calcScale);
    return () => window.removeEventListener('resize', calcScale);
  }, [canvasWidth, canvasHeight]);

  if (error) return null; // blank for OBS
  if (!userId) return null; // still loading

  return (
    <div className="or-canvas" style={{
      ...themeVars,
      width: canvasWidth,
      height: canvasHeight,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }}>
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
          allWidgets={widgets}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          exiting={false}
          userId={userId}
        />
      ))}

      {/* Widgets playing exit animation — removed from visibleWidgets but kept briefly */}
      {exitingWidgets.map(w => (
        <WidgetSlot
          key={`exit-${w.id}`}
          widget={w}
          theme={theme}
          animSpeed={theme?.animation_speed}
          allWidgets={widgets}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          exiting={true}
          userId={userId}
        />
      ))}
    </div>
  );
}
