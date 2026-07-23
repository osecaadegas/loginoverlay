const DEFAULT_BONUS_HUNT_SYNC_COLORS = Object.freeze({
  primaryColor: "#2dd4bf",
  secondaryColor: "#26282e",
});

function firstColor(...values) {
  for (const value of values) {
    const color = String(value || "").trim();
    if (color) return color;
  }
  return "";
}

export function normalizeBonusHuntColorSync(settings = {}) {
  return {
    enabled: !!(settings.enabled || settings.syncWithBonusHuntColors),
  };
}

export function getBonusHuntSyncColorsFromConfig(config = {}) {
  return {
    primaryColor: firstColor(
      config.headerAccent,
      config.currentBonusAccent,
      config.listCardAccent,
      config.accentColor,
      config.totalPayColor,
      DEFAULT_BONUS_HUNT_SYNC_COLORS.primaryColor,
    ),
    secondaryColor: firstColor(
      config.headerColor,
      config.countCardColor,
      config.listCardColor,
      config.summaryColor,
      config.bgColor,
      DEFAULT_BONUS_HUNT_SYNC_COLORS.secondaryColor,
    ),
  };
}

export function getBonusHuntSyncColorsFromWidgets(widgets = []) {
  const bonusHunt = widgets.find(
    (widget) => widget?.widget_type === "bonus_hunt" && widget.config,
  );
  return bonusHunt?.config
    ? getBonusHuntSyncColorsFromConfig(bonusHunt.config)
    : null;
}

export function resolveBonusHuntSyncedColors(config = {}, widgets = []) {
  const sync = normalizeBonusHuntColorSync(config.bonusHuntColorSync || {});
  if (!sync.enabled) return null;
  return getBonusHuntSyncColorsFromWidgets(widgets);
}
