const BETTER_WIDGET_NUDGES = Object.freeze({
  ArrowLeft: Object.freeze({ x: -1, y: 0 }),
  ArrowRight: Object.freeze({ x: 1, y: 0 }),
  ArrowUp: Object.freeze({ x: 0, y: -1 }),
  ArrowDown: Object.freeze({ x: 0, y: 1 }),
});

export function normalizeBetterCoordinate(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getBetterWidgetNudge(key) {
  return BETTER_WIDGET_NUDGES[key] || null;
}

function foregroundByLayer(instances) {
  return instances
    .filter((instance) => instance.widgetType !== "background")
    .slice()
    .sort((a, b) => Number(b.zIndex) - Number(a.zIndex));
}

export function reorderBetterWidgetLayers(instances, sourceId, targetId) {
  const source = instances.find(
    (instance) => instance.instanceId === sourceId,
  );
  const target = instances.find(
    (instance) => instance.instanceId === targetId,
  );
  if (
    !source ||
    !target ||
    source.instanceId === target.instanceId ||
    source.widgetType === "background"
  ) {
    return instances;
  }

  const ordered = foregroundByLayer(instances);
  const sourceIndex = ordered.findIndex(
    (instance) => instance.instanceId === sourceId,
  );
  const targetIndex =
    target.widgetType === "background"
      ? ordered.length - 1
      : ordered.findIndex((instance) => instance.instanceId === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return instances;
  }

  const [moved] = ordered.splice(sourceIndex, 1);
  ordered.splice(targetIndex, 0, moved);
  const zIndexById = new Map(
    ordered.map((instance, index) => [
      instance.instanceId,
      ordered.length - index,
    ]),
  );
  return instances.map((instance) =>
    instance.widgetType === "background"
      ? { ...instance, zIndex: 0 }
      : { ...instance, zIndex: zIndexById.get(instance.instanceId) },
  );
}

export function moveBetterWidgetLayer(instances, instanceId, direction) {
  const ordered = foregroundByLayer(instances);
  const sourceIndex = ordered.findIndex(
    (instance) => instance.instanceId === instanceId,
  );
  const target = ordered[sourceIndex + direction];
  return target
    ? reorderBetterWidgetLayers(instances, instanceId, target.instanceId)
    : instances;
}
