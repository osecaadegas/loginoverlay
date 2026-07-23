import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  logLevel: "silent",
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const routing = await server.ssrLoadModule(
    "/src/components/OverlayCenter/appearance/v2/appearanceRouting.js",
  );
  const scopedMutations = await server.ssrLoadModule(
    "/src/components/OverlayCenter/appearance/appearanceScopedMutations.js",
  );

  const bonusBackgroundRoute = {
    widgetType: "bonus_hunt",
    widgetVariant: "v12_classic_sr",
    elementId: "container",
    propertyId: "backgroundColor",
  };
  const bonusSlotCardRoute = {
    widgetType: "bonus_hunt",
    widgetVariant: "v12_classic_sr",
    elementId: "slotRow",
    propertyId: "backgroundColor",
  };
  const bonusStatsRoute = {
    widgetType: "bonus_hunt",
    widgetVariant: "v12_classic_sr",
    elementId: "statCell",
    propertyId: "backgroundColor",
  };
  const rtpTrackRoute = {
    widgetType: "rtp_stats",
    widgetVariant: "StyleSecaRTP",
    elementId: "track",
    propertyId: "trackColor",
  };
  const rtpFillRoute = {
    widgetType: "rtp_stats",
    widgetVariant: "StyleSecaRTP",
    elementId: "fill",
    propertyId: "fillColor",
  };
  const betsRoute = {
    widgetType: "bets",
    widgetVariant: "StyleSecaBets",
    elementId: "widgetBackground",
    propertyId: "backgroundColor",
  };

  assert.equal(
    routing.createAppearanceRoute(bonusBackgroundRoute).appearanceId,
    "bonusHunt.v12ClassicSr.widgetBackground",
  );
  assert.equal(
    routing.createAppearanceRoute(bonusSlotCardRoute).appearanceId,
    "bonusHunt.v12ClassicSr.slotCard",
  );
  assert.equal(
    routing.createAppearanceRoute(bonusStatsRoute).appearanceId,
    "bonusHunt.v12ClassicSr.statsCard",
  );

  let state = routing.setScopedAppearanceValue(
    {},
    bonusBackgroundRoute,
    "#111111",
  );
  state = routing.setScopedAppearanceValue(
    state,
    bonusSlotCardRoute,
    "#222222",
  );
  state = routing.setScopedAppearanceValue(state, bonusStatsRoute, "#333333");
  state = routing.setScopedAppearanceValue(state, rtpTrackRoute, "#444444");
  state = routing.setScopedAppearanceValue(state, rtpFillRoute, "#555555");
  state = routing.setScopedAppearanceValue(state, betsRoute, "#666666");

  assert.equal(
    routing.getScopedAppearanceValue(state, bonusBackgroundRoute),
    "#111111",
  );
  assert.equal(
    routing.getScopedAppearanceValue(state, bonusSlotCardRoute),
    "#222222",
  );
  assert.equal(
    routing.getScopedAppearanceValue(state, bonusStatsRoute),
    "#333333",
  );
  assert.equal(
    routing.getScopedAppearanceValue(state, rtpTrackRoute),
    "#444444",
  );
  assert.equal(
    routing.getScopedAppearanceValue(state, rtpFillRoute),
    "#555555",
  );
  assert.equal(routing.getScopedAppearanceValue(state, betsRoute), "#666666");

  let scopedConfig = routing.setScopedAppearanceConfigValue(
    { displayStyle: "v12_classic_sr" },
    bonusSlotCardRoute,
    "#225577",
  );
  scopedConfig = routing.setScopedAppearanceConfigValue(
    scopedConfig,
    {
      ...bonusSlotCardRoute,
      stateId: "opened",
    },
    "#113355",
  );
  assert.equal(
    routing.getScopedAppearanceConfigValue(scopedConfig, bonusSlotCardRoute),
    "#225577",
  );
  assert.equal(
    routing.getScopedAppearanceConfigValue(scopedConfig, {
      ...bonusSlotCardRoute,
      stateId: "opened",
    }),
    "#113355",
  );
  assert.equal(
    scopedConfig.__appearanceExplicitSubElements.slotRow.backgroundColor,
    "#225577",
    "Scoped config writes renderer-compatible explicit element values",
  );
  assert.equal(
    scopedConfig.__appearanceExplicitSubElements.slotRow.states.opened
      .backgroundColor,
    "#113355",
    "Scoped config writes renderer-compatible explicit state values",
  );

  scopedConfig = routing.setScopedAppearanceConfigValue(
    scopedConfig,
    {
      widgetType: "bonus_hunt",
      widgetVariant: "v12_classic_sr",
      elementId: "slotRow",
      propertyId: "visible",
    },
    false,
  );
  assert.equal(
    routing.getScopedAppearanceConfigValue(scopedConfig, {
      widgetType: "bonus_hunt",
      widgetVariant: "v12_classic_sr",
      elementId: "slotRow",
      propertyId: "visible",
    }),
    false,
    "Route-level visibility writes are scoped to the selected element",
  );

  scopedConfig = routing.removeScopedAppearanceConfigValue(
    scopedConfig,
    bonusSlotCardRoute,
  );
  assert.equal(
    routing.getScopedAppearanceConfigValue(scopedConfig, bonusSlotCardRoute),
    undefined,
    "Scoped config resets remove canonical default-state values",
  );
  assert.equal(
    scopedConfig.__appearanceExplicitSubElements.slotRow.backgroundColor,
    undefined,
    "Scoped config resets remove renderer default-state values",
  );

  const migratedConfig = routing.normalizeScopedAppearanceConfig(
    {
      displayStyle: "v12_classic_sr",
      subElements: {
        slotRow: {
          backgroundColor: "#101010",
          imageSize: 500,
          states: {
            opened: {
              backgroundColor: "#202020",
              imageSize: 300,
            },
          },
        },
      },
    },
    { widgetType: "bonus_hunt", widgetVariant: "v12_classic_sr" },
  );
  assert.equal(
    routing.getScopedAppearanceConfigValue(migratedConfig, bonusSlotCardRoute),
    "#101010",
    "Legacy subElements migrate into canonical scoped state",
  );
  assert.equal(
    routing.getScopedAppearanceConfigValue(migratedConfig, {
      ...bonusSlotCardRoute,
      stateId: "opened",
    }),
    "#202020",
    "Legacy state subElements migrate into canonical scoped state",
  );
  assert.equal(
    migratedConfig.__appearanceExplicitSubElements.slotRow.imageSize,
    undefined,
    "Unsupported legacy element properties do not enter renderer-compatible explicit state",
  );
  assert.equal(
    migratedConfig.__appearanceExplicitSubElements.slotRow.states.opened
      .imageSize,
    undefined,
    "Unsupported legacy state properties do not enter renderer-compatible explicit state",
  );

  const scopedRoot = "widgets.widget-1.styles.v12_classic_sr";
  const selectedTarget = { styleId: "v12_classic_sr" };
  const scopedRootRoute = scopedMutations.buildScopedAppearanceRoute({
    controlId: "backgroundColor",
    elementId: "slotRow",
    selectedTarget,
    selectedWidgetType: "bonus_hunt",
  });
  let rootedAppearance = scopedMutations.setScopedConfigAtRoot(
    {},
    scopedRoot,
    scopedRootRoute,
    "#abcdef",
  );
  assert.equal(
    scopedMutations.getScopedConfigValueAtRoot(
      rootedAppearance,
      scopedRoot,
      scopedRootRoute,
    ),
    "#abcdef",
    "Appearance page scoped helper writes canonical values at the selected root",
  );
  assert.equal(
    rootedAppearance.widgets["widget-1"].styles.v12_classic_sr
      .__appearanceExplicitSubElements.slotRow.backgroundColor,
    "#abcdef",
    "Appearance page scoped helper keeps renderer-compatible values at the selected root",
  );
  rootedAppearance = scopedMutations.removeScopedConfigValueAtRoot(
    rootedAppearance,
    scopedRoot,
    scopedRootRoute,
  );
  assert.equal(
    scopedMutations.getScopedConfigValueAtRoot(
      rootedAppearance,
      scopedRoot,
      scopedRootRoute,
    ),
    undefined,
    "Appearance page scoped helper resets selected-root values",
  );
  assert.equal(
    scopedMutations.setScopedConfigAtRoot(
      rootedAppearance,
      "",
      scopedRootRoute,
      "#ffffff",
    ),
    rootedAppearance,
    "Appearance page scoped helper ignores missing roots",
  );

  assert.notEqual(
    routing.getScopedAppearanceValue(state, bonusBackgroundRoute),
    routing.getScopedAppearanceValue(state, bonusSlotCardRoute),
    "Bonus Hunt widget background and slot card are isolated",
  );
  assert.notEqual(
    routing.getScopedAppearanceValue(state, bonusSlotCardRoute),
    routing.getScopedAppearanceValue(state, bonusStatsRoute),
    "Bonus Hunt slot card and stats card are isolated",
  );
  assert.notEqual(
    routing.getScopedAppearanceValue(state, rtpTrackRoute),
    routing.getScopedAppearanceValue(state, rtpFillRoute),
    "RTP track and fill values are isolated",
  );
  assert.equal(
    state.widgets.bonusHunt.variants.v12ClassicSr.elements.widgetBackground
      .backgroundColor,
    "#111111",
  );
  assert.equal(
    state.widgets.bets.variants.styleSecaBets.elements.widgetBackground
      .backgroundColor,
    "#666666",
  );
  assert.equal(
    state.application?.layout?.pageBackground?.backgroundColor,
    undefined,
    "Widget updates do not touch application background namespace",
  );

  assert.throws(
    () =>
      routing.setScopedAppearanceValue(
        state,
        {
          widgetType: "bonus_hunt",
          widgetVariant: "v12_classic_sr",
          elementId: "notARealElement",
          propertyId: "backgroundColor",
        },
        "#ffffff",
      ),
    /Invalid appearance route/,
    "Invalid element routes do not fallback-update another element",
  );

  assert.throws(
    () =>
      routing.setScopedAppearanceConfigValue(
        {},
        {
          widgetType: "bonus_hunt",
          widgetVariant: "v12_classic_sr",
          elementId: "statCell",
          propertyId: "imageSize",
        },
        250,
      ),
    /Invalid appearance route/,
    "Unsupported controls do not write scoped config",
  );

  const domAttrs = routing.getAppearanceDomAttributes({
    widgetId: "widget-1",
    widgetType: "bonus_hunt",
    widgetVariant: "v12_classic_sr",
    elementId: "statCell",
  });
  assert.equal(domAttrs["data-widget-type"], "bonus-hunt");
  assert.equal(domAttrs["data-widget-variant"], "v12-classic-sr");
  assert.equal(domAttrs["data-widget-element"], "statCell");
  assert.equal(domAttrs["data-appearance-element"], "stats-card");
  assert.equal(
    domAttrs["data-appearance-id"],
    "bonusHunt.v12ClassicSr.statsCard",
  );

  console.log("Appearance routing tests passed");
} finally {
  await server.close();
}
