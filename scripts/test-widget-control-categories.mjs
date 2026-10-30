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
  const { EditorControlContext } = await server.ssrLoadModule(
    "/src/components/OverlayCenter/editor/EditorControlScope.jsx",
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

    if (widgetDefinition.type === "bonus_hunt_2x2") {
      assert.ok(
        ["Whole frame", "Grid spacing", "Frame border width", "Top left", "Top right", "Bottom left", "Bottom right", "Source URL"].every((label) => markup.includes(label)),
        "2x2 Bonus Hunt exposes its frame and per-slot controls",
      );
      continue;
    }

    if (widgetDefinition.type === "background") {
      assert.ok(markup.includes('role="tablist"') && markup.includes('>Source</span>'));
      assert.ok(!markup.includes('data-level="secondary"'), "Background uses one row of relevant tabs");
      assert.ok(!markup.includes('disabled=""'), "Background has no empty category tabs");
      continue;
    }
    if (widgetDefinition.type === "current_slot") {
      assert.ok(
        markup.includes("Font family") && markup.includes("Background image strength"),
        "Current Game exposes its supported font and backdrop controls",
      );
      continue;
    }
    if(widgetDefinition.type === 'slot_requests') {
      assert.ok(['Slot Requests layout','Row height','Artwork width','Artwork height','Artwork fit','Slot title font size','Username font size','Card spacing','Visible requests','Show avatars','Show queue positions'].every(label=>markup.includes(label)), 'Slot Requests exposes its supported queue/card controls');
      assert.ok(!markup.includes('Effect quality'), 'Slot Requests has no unsupported effects controls');
      continue;
    }
    if (widgetDefinition.type === "slot_window") {
      assert.ok(
        markup.includes("ScreenSplit source") &&
          markup.includes("Source URL") &&
          markup.includes("Mask") &&
          markup.includes("Performance") &&
          !markup.includes("Colour Theme"),
        "Slot Window exposes only its supported source, mask and performance controls",
      );
      continue;
    }
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

  const renderAllChatControls = (config) => renderToStaticMarkup(
    createElement(
      EditorControlContext.Provider,
      {
        value: {
          mode: "simple",
          search: "",
          simpleSections: [
            "Header", "Emotes", "Celebrations", "Roles & Message Glaze",
            "In-Chat Giveaway", "In-Chat Shoutout", "Backdrop", "Message Behaviour",
          ],
          sections: {},
          onSection: () => {},
          onTab: () => {},
        },
      },
      createElement(BetterWidgetControls, {
        type: "chat",
        config,
        onChange: () => {},
        onWidgetChange: () => {},
        widget: { width: 335, height: 468 },
      }),
    ),
  );
  const inactiveChatMarkup = renderAllChatControls({
    showViewerCount: false,
    bttvEnabled: false,
    roleEffects: { enabled: false },
    giveawayInChat: false,
    shoutoutInChat: false,
    texture: "none",
    autoFade: false,
  });
  for (const hiddenLabel of [
    "Viewer count (manual)", "Global BTTV emotes", "Glaze intensity",
    "Giveaway height in chat", "Clip height", "Texture strength", "Fade after",
  ]) {
    assert.ok(
      !inactiveChatMarkup.includes(hiddenLabel),
      `Chat hides inactive ${hiddenLabel} control`,
    );
  }

  const currentSlotWithoutBackdrop = renderToStaticMarkup(
    createElement(BetterWidgetControls, {
      type: "current_slot",
      config: { showBackdrop: false },
      onChange: () => {},
    }),
  );
  assert.ok(
    currentSlotWithoutBackdrop.includes("Font family") &&
      !currentSlotWithoutBackdrop.includes("Background image strength"),
    "Current Game keeps font selection and hides the unused backdrop strength",
  );

  const portraitCurrentSlot = renderToStaticMarkup(
    createElement(BetterWidgetControls, {
      type: "current_slot",
      config: { displayStyle: "portrait_card", showBackdrop: true },
      onChange: () => {},
    }),
  );
  for (const supportedControl of [
    "Best multiplier row",
    "portrait Accent Color",
    "portrait Panel Color",
  ]) {
    assert.ok(
      portraitCurrentSlot.includes(supportedControl),
      `Portrait Current Game exposes ${supportedControl}`,
    );
  }
  for (const unsupportedControl of [
    "Immersive slot background",
    "Background image strength",
    "badge Color",
  ]) {
    assert.ok(
      !portraitCurrentSlot.includes(unsupportedControl),
      `Portrait Current Game hides ${unsupportedControl}`,
    );
  }

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

  for (const stylesheet of ["ThemeTypography.css", "GreekPremium.css"]) {
    const themeCss = readFileSync(
      new URL(`../src/effects/ThemeEffects/${stylesheet}`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(
      themeCss,
      /(?:font-(?:size|family|weight|style)|letter-spacing|line-height)\s*:[^;{}]+!important/,
      `${stylesheet} does not override saved typography controls`,
    );
  }

  console.log("Widget control category checks passed.");
} finally {
  await server.close();
}
