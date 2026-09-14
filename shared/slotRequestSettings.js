export function resolveSlotRequestSettings(widgets = []) {
  const byRecent = (a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || String(a.id).localeCompare(String(b.id));
  const hunts = widgets.filter(w => w.widget_type === 'bonus_hunt').sort(byRecent);
  const legacy = widgets.filter(w => w.widget_type === 'slot_requests').sort(byRecent)[0];
  const source = hunts[0] || legacy;
  return source ? { widgetId: source.id, config: { ...legacy?.config, ...source.config } } : null;
}

export function slotRequestCost(config = {}) {
  if (!config.srSeEnabled || config.pointBalanceBehavior === 'do_not_charge') return 0;
  const cost = Number(config.srSeCost ?? 0);
  if (!Number.isSafeInteger(cost) || cost < 0 || cost > 1000000000) throw new Error('Invalid slot request point cost. Check Hunt settings.');
  return cost;
}
