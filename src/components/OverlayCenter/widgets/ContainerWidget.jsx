import React, { useMemo } from 'react';
import { getWidgetDef } from './widgetRegistry';

/**
 * ContainerWidget — groups multiple child widgets inside a single slot.
 *
 * Config shape:
 *   children: [widgetId, ...]       — ordered list of child widget IDs
 *   layout: 'vertical' | 'horizontal' | 'free'
 *   gap: number (px)
 *   padding: number (px)
 *   bgColor: string
 *   bgOpacity: number (0-100)
 *   scrollable: boolean
 *   alignItems: 'stretch' | 'start' | 'center' | 'end'
 *
 * In 'free' layout children use their own position_x / position_y relative
 * to the container's top-left corner. In vertical/horizontal they stack.
 */
function ContainerWidget({ config, theme, allWidgets, widgetId, userId }) {
  const c = config || {};
  const childIds = c.children || [];
  const layout = c.layout || 'vertical';
  const gap = c.gap ?? 8;
  const padding = c.padding ?? 8;
  const scrollable = c.scrollable ?? false;
  const alignItems = c.alignItems || 'stretch';
  const bgColor = c.bgColor || 'transparent';
  const bgOpacity = c.bgOpacity ?? 0;

  // Resolve child widgets from allWidgets array
  const childWidgets = useMemo(() => {
    if (!allWidgets) return [];
    return childIds.map(id => allWidgets.find(w => w.id === id)).filter(Boolean);
  }, [childIds, allWidgets]);

  const wrapStyle = {
    width: '100%',
    height: '100%',
    position: 'relative',
    background: bgOpacity > 0
      ? bgColor.startsWith('#')
        ? `rgba(${parseInt(bgColor.slice(1,3),16)},${parseInt(bgColor.slice(3,5),16)},${parseInt(bgColor.slice(5,7),16)},${bgOpacity/100})`
        : bgColor
      : 'transparent',
    overflow: scrollable ? 'auto' : 'hidden',
    display: layout === 'free' ? 'block' : 'flex',
    flexDirection: layout === 'horizontal' ? 'row' : 'column',
    gap: layout !== 'free' ? gap : undefined,
    padding,
    alignItems: layout !== 'free' ? alignItems : undefined,
    boxSizing: 'border-box',
  };

  if (childWidgets.length === 0) {
    return (
      <div style={{ ...wrapStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 14, gap: 6 }}>
        <span style={{ fontSize: 28 }}>📦</span>
        <span>Container — add widgets via config</span>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      {childWidgets.map(child => {
        const def = getWidgetDef(child.widget_type);
        const Comp = def?.component;
        if (!Comp) return null;

        const childStyle = layout === 'free'
          ? {
              position: 'absolute',
              left: child.config?._containerX ?? 0,
              top: child.config?._containerY ?? 0,
              width: child.config?._containerW ?? child.width,
              height: child.config?._containerH ?? child.height,
            }
          : {
              flex: layout === 'vertical' ? '0 0 auto' : '0 0 auto',
              width: layout === 'horizontal' ? (child.config?._containerW ?? child.width) : '100%',
              height: layout === 'vertical' ? (child.config?._containerH ?? child.height) : '100%',
              minHeight: 0,
              minWidth: 0,
            };

        const childRadius = child.config?.cardRadius;

        return (
          <div
            key={child.id}
            style={{
              ...childStyle,
              overflow: 'hidden',
              clipPath: childRadius ? `inset(0 round ${childRadius}px)` : undefined,
            }}
          >
            <Comp config={child.config} theme={theme} allWidgets={allWidgets} widgetId={child.id} userId={userId} />
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(ContainerWidget);
