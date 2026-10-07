/** Route finite DOM events to the overlay's existing pooled Pixi effects. */
export function emitIceEvent(element, kind, source = element) {
  if (!element?.closest('.better-widget-colour-scope:is([data-colour-theme="arctic"], [data-colour-theme="orbital"])')) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  element.dispatchEvent(new CustomEvent("theme-effects:burst", {
    bubbles: true,
    detail: { kind, source },
  }));
}
