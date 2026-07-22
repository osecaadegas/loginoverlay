import { getWidgetPreviewFrame } from '../previewWidgetSamples';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getWidgetSlotSize(widget) {
  const frame = getWidgetPreviewFrame(widget);
  const containerAppearance = widget.config?.__appearanceExplicitSubElements?.container
    || widget.config?.subElements?.container
    || {};
  const configuredWidth = Number(widget.config?.widgetWidth ?? containerAppearance.width);
  const configuredHeight = Number(widget.config?.widgetHeight ?? containerAppearance.height);
  const scale = clamp(Number(widget.config?.widgetScale) || 1, 0.75, 1.5);
  const baseWidth = configuredWidth || frame?.width || widget.width;
  const baseHeight = configuredHeight || frame?.height || widget.height;
  return {
    width: configuredWidth ? baseWidth : Math.round(baseWidth * scale),
    height: configuredHeight ? baseHeight : Math.round(baseHeight * scale),
  };
}

export function getWidgetSlotBehavior(widget) {
  const style = widget?.config?.displayStyle || '';
  const isBonusHunt = widget?.widget_type === 'bonus_hunt';
  const needs3D = style === 'v3' || style === 'v8_card_stack'
    || (isBonusHunt && !['v2', 'v5_compact'].includes(style));
  const needsNpcOverflow = !!widget?.config?.npcEnabled;
  const isNavbar = widget?.widget_type === 'navbar';
  const needsVisibleOverflow = needs3D || needsNpcOverflow || isNavbar;
  const widgetRadius = widget?.config?.cardRadius;
  return {
    needs3D,
    needsNpcOverflow,
    isNavbar,
    needsVisibleOverflow,
    needsClip: !isNavbar && widgetRadius && !needsVisibleOverflow,
    widgetRadius,
  };
}
