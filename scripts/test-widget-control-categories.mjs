import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

globalThis.window = { location: { origin: "http://localhost" } };

const server = await createServer({
  logLevel: "silent",
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { BETTER_WIDGETS, BetterWidgetControls } = await server.ssrLoadModule(
    "/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx",
  );

  for (const widgetDefinition of BETTER_WIDGETS) {
    const markup = renderToStaticMarkup(
      createElement(BetterWidgetControls, {
        type: widgetDefinition.type,
        config: widgetDefinition.defaultConfig,
        onChange: () => {},
        onWidgetChange: () => {},
        widget: {
          id: `test-${widgetDefinition.type}`,
          instanceId: `test-${widgetDefinition.type}`,
          widget_type: widgetDefinition.type,
          width: widgetDefinition.defaultSize?.width,
          height: widgetDefinition.defaultSize?.height,
          config: widgetDefinition.defaultConfig,
        },
      }),
    );

    assert.ok(
      markup.includes('role="tablist"') &&
        markup.includes('aria-label="Widget control categories"') &&
        ["Layout", "Appearance", "Content", "Behavior"].every((label) =>
          markup.includes(`>${label}</span>`),
        ),
      `${widgetDefinition.type} exposes the standard control categories`,
    );
  }

  const navbarMarkup = renderToStaticMarkup(
    createElement(BetterWidgetControls, {
      type: "navbar",
      config: {},
      onChange: () => {},
      onWidgetChange: () => {},
      widget: { width: 1200, height: 72 },
    }),
  );
  assert.ok(
    ["Layout", "Appearance", "Content", "Behavior"].every((label) =>
      navbarMarkup.includes(`>${label}</span>`),
    ) &&
      navbarMarkup.includes(">Sections</span>") &&
      navbarMarkup.includes(">Visible sections<") &&
      !navbarMarkup.includes(">Arrange</span>"),
    "Navbar uses standard categories and retains its active content controls",
  );

  const chatMarkup = renderToStaticMarkup(
    createElement(BetterWidgetControls, {
      type: "chat",
      config: {},
      onChange: () => {},
      onWidgetChange: () => {},
      widget: { width: 335, height: 468 },
    }),
  );
  assert.ok(
    ["Layout", "Appearance", "Content", "Behavior"].every((label) =>
      chatMarkup.includes(`>${label}</span>`),
    ) &&
      chatMarkup.includes(">Chat Box Size<") &&
      !chatMarkup.includes(">Typography<"),
    "Chat opens on Layout and keeps other control categories out of the active panel",
  );

  const bonusMarkup = renderToStaticMarkup(
    createElement(BetterWidgetControls, {
      type: "bonus_hunt",
      config: {},
      onChange: () => {},
      onWidgetChange: () => {},
      widget: { width: 402, height: 884, config: {} },
    }),
  );
  assert.ok(
    ["Layout", "Appearance", "Content", "Behavior"].every((label) =>
      bonusMarkup.includes(`>${label}</span>`),
    ) &&
      bonusMarkup.includes(">Orientation<") &&
      bonusMarkup.includes(">Sizes &amp; Layout<") &&
      !bonusMarkup.includes(">Win FX<"),
    "Bonus Hunt opens on Layout and categorizes behavior controls separately",
  );

  console.log("Widget control category checks passed.");
} finally {
  await server.close();
}
