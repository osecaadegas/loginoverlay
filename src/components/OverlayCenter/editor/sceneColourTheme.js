import { applyWidgetColourTheme, getSelectedWidgetColourTheme } from './widgetColourThemes.js';

export function getSceneColourTheme(layout) {
  const instances = layout?.instances || [];
  if (!instances.length) return null;
  const first = getSelectedWidgetColourTheme(instances[0].widgetType, instances[0].config);
  return first && instances.every(instance =>
    getSelectedWidgetColourTheme(instance.widgetType, instance.config) === first
  ) ? first : null;
}

export function applySceneColourTheme(layout, key) {
  return {
    ...layout,
    instances: layout.instances.map(instance => ({
      ...instance,
      config: applyWidgetColourTheme(instance.widgetType, instance.config, key),
    })),
  };
}
