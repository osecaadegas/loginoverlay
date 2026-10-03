import { useMemo } from 'react';
import { createBetterInstance, renderBetterWidgetInstance } from '../OverlayCenter/editor/betterWidgetRegistry';
import { applyWidgetColourTheme } from '../OverlayCenter/editor/widgetColourThemes';

// Loaded only when a real widget preview enters the viewport.
export default function LandingWidgetRuntime({ widgetType, width, height, config, colourTheme }) {
  const preview = useMemo(() => {
    const instance = createBetterInstance(widgetType, { instanceId: `landing-${widgetType}`, width, height, config });
    if (instance && colourTheme) instance.config = applyWidgetColourTheme(widgetType, instance.config, colourTheme);
    return { instance, layout: { canvas: { width, height }, instances: instance ? [instance] : [] } };
  }, [widgetType, width, height, config, colourTheme]);
  return preview.instance ? renderBetterWidgetInstance({ ...preview, mode: ['bets', 'chat', 'connect_four', 'tournament'].includes(widgetType) ? 'live' : 'mock', runtime: 'editor' }) : null;
}
