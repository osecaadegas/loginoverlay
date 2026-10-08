// The editor box can contain a centered/scaled widget. FX must follow the
// painted surface, not that box (notably Bonus Hunt's fitted panel).
const SURFACES = {
  bonus_hunt: ".better-hunt-panel",
  slot_bingo: ".slot-bingo-widget",
  slideshow_frame: ".better-slideshow-frame",
  rtp_stats: '.rtp-stats-bar',
  navbar: '[data-widget-element="container"], [data-appearance-part="container"]',
  chat: '.ov-chat-widget',
};

export function findEffectSurface(host, target) {
  const wrapper = host.querySelector(`[data-effect-target-id="${CSS.escape(target.id)}"]`);
  if (!wrapper) return null;
  if (target.theme.family === 'orbital') {
    const selectors = target.widgetType === 'background' ? '[data-orbital-environment]'
      : target.widgetType === 'giveaway' ? '.better-giveaway-widget, .better-gw-result-stage'
      : target.widgetType === 'connect_four' ? '.connect-four-board'
      : target.widgetType === 'bets' ? '.better-bets-fit, [data-widget-element="widgetBackground"]'
        : SURFACES[target.widgetType] || '[data-widget-element="container"], [data-appearance-part="container"]';
    return wrapper.querySelector(selectors);
  }
  if (!['ice', 'orbital'].includes(target.theme.family)) return wrapper;
  return wrapper.querySelector(SURFACES[target.widgetType] || '[data-widget-element="container"], [data-appearance-part="container"]') || wrapper;
}

export function measureEffectTargets(host, canvas, targets, width, height) {
  const viewport = canvas.getBoundingClientRect();
  if (!viewport.width || !viewport.height) return targets;
  const scaleX = width / viewport.width;
  const scaleY = height / viewport.height;
  return targets.map((target) => {
    // Keep other themes unchanged while Ice is being refined.
    if (!['ice', 'orbital'].includes(target.theme.family)) return target;
    const surface = findEffectSurface(host, target);
    if (!surface) return target.theme.family === 'orbital' ? { ...target, opacity: 0 } : target;
    const rect = surface.getBoundingClientRect();
    const style = getComputedStyle(surface);
    if (!rect.width || !rect.height) return { ...target, opacity: 0 };
    const localScale = surface.offsetWidth ? rect.width / surface.offsetWidth : 1;
    return {
      ...target,
      x: (rect.left - viewport.left) * scaleX,
      y: (rect.top - viewport.top) * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
      radius: (parseFloat(style.borderTopLeftRadius) || 0) * localScale * scaleX,
    };
  });
}
