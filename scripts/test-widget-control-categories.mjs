import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
        markup.includes('data-level="primary"') &&
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
      navbarMarkup.includes('aria-label="Content control subcategories"') &&
      navbarMarkup.includes('data-level="secondary" data-category="content"') &&
      navbarMarkup.includes(">Sections</span>") &&
      navbarMarkup.includes(">Visible sections<") &&
      !navbarMarkup.includes(">Arrange</span>"),
    "Navbar uses standard categories and retains its active content controls",
  );

  const betsMarkup = renderToStaticMarkup(
    createElement(BetterWidgetControls, {
      type: "bets",
      config: {},
      onChange: () => {},
    }),
  );
  assert.ok(
    betsMarkup.includes('aria-label="Appearance control subcategories"') &&
      ["Theme", "Colors", "Typography"].every((label) =>
        betsMarkup.includes(`>${label}</span>`),
      ) &&
      !betsMarkup.includes(">Text</span>") &&
      !betsMarkup.includes(">FX</span>"),
    "Generic subcategories use consistent names inside Appearance",
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

  const controlsCss = readFileSync(
    new URL(
      "../src/components/OverlayCenter/editor/BetterWidgetPackages.css",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    controlsCss.includes("grid-template-columns: repeat(4, minmax(0, 1fr))") &&
      controlsCss.includes(
        "grid-template-columns: repeat(auto-fit, minmax(88px, 1fr))",
      ) &&
      ["layout", "appearance", "content", "behavior"].every((category) =>
        controlsCss.includes(`data-category="${category}"`),
      ),
    "Primary categories use stable columns and colored wrapping subcategories",
  );

  console.log("Widget control category checks passed.");
} finally {
  await server.close();
}
