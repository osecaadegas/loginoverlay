import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer";

const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:3010";
const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/__overlay-editor-control-audit") {
      await request.respond({
        contentType: "text/html",
        body: `<html><body style="margin:0;background:#171a20;color:#fff"><div id="root"></div>
          <script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
          window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
          window.__vite_plugin_react_preamble_installed__ = true;</script></body></html>`,
      });
    } else if (url.origin === new URL(baseUrl).origin && !url.pathname.startsWith("/api/")) {
      await request.continue();
    } else if (request.resourceType() === "image") {
      await request.respond({
        contentType: "image/webp",
        body: readFileSync(new URL("../public/player.webp", import.meta.url)),
      });
    } else if (["data:", "blob:"].includes(url.protocol)) {
      await request.continue();
    } else {
      await request.abort();
    }
  });

  await page.setViewport({ width: 1800, height: 1200 });
  await page.goto(`${baseUrl}/__overlay-editor-control-audit`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const { browserHash } = JSON.parse(
    readFileSync(new URL("../node_modules/.vite/deps/_metadata.json", import.meta.url), "utf8"),
  );

  await page.evaluate(async (version) => {
    const { default: React } = await import(`/node_modules/.vite/deps/react.js?v=${version}`);
    const { default: ReactDOM } = await import(`/node_modules/.vite/deps/react-dom_client.js?v=${version}`);
    const packages = await import("/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx");
    const registry = await import("/src/components/OverlayCenter/editor/betterWidgetRegistry.jsx");
    const { supabase } = await import("/src/config/supabaseClient.js");
    const scopeUrl = performance
      .getEntriesByType("resource")
      .find((entry) => new URL(entry.name).pathname.endsWith("/EditorControlScope.jsx"))?.name;
    const { EditorControlContext } = await import(scopeUrl);
    const originalRpc = supabase.rpc.bind(supabase);
    supabase.rpc = (name, args) =>
      name === "get_overlay_asset_access"
        ? Promise.resolve({ data: [], error: null })
        : originalRpc(name, args);
    await import("/src/index.css");
    await import("/src/components/OverlayCenter/OverlayRenderer.css");
    await import("/src/components/OverlayCenter/editor/BetterWidgetPackages.css");

    const root = ReactDOM.createRoot(document.getElementById("root"));
    const openSections = new Proxy({}, { get: () => true });
    const disabledLiveConnections = {
      twitchChannel: "",
      twitchEnabled: false,
      youtubeEnabled: false,
      kickEnabled: false,
      showNowPlaying: false,
      showCrypto: false,
      animation: "none",
      animations: false,
    };
    window.controlAudit = {
      React,
      packages,
      registry,
      types: registry.getBetterWidgetTypes(),
      base(type) {
        const definition = registry.getBetterWidgetDefinition(type);
        return packages.ensureBetterWidgetConfig(type, {
          ...definition.defaultConfig,
          ...disabledLiveConnections,
          showBackdrop: true,
          __appearancePreviewMessages: [
            { id: "audit", username: "Audit Viewer", message: "Visible editor message" },
          ],
        });
      },
      mount(type, config) {
        const definition = registry.getBetterWidgetDefinition(type);
        const nextConfig = config || this.base(type);
        const instance = registry.createBetterInstance(type, { config: nextConfig });
        this.current = { type, config: nextConfig, instance };
        this.lastConfig = null;
        this.lastWidget = null;
        root.render(
          React.createElement("main", { style: { display: "flex", gap: 18, padding: 12 } },
            React.createElement("aside", { style: { width: 360, flex: "0 0 360px" } },
              React.createElement(EditorControlContext.Provider, {
                value: {
                  mode: "advanced",
                  tab: "__all",
                  search: "",
                  simpleSections: definition.editor.simpleSections,
                  sections: openSections,
                  onSection() {},
                  onTab() {},
                },
              }, React.createElement(packages.BetterWidgetControls, {
                type,
                config: nextConfig,
                widget: instance,
                onChange: (changed) => {
                  window.controlAudit.mount(type, changed);
                  window.controlAudit.lastConfig = changed;
                },
                onWidgetChange: (changed) => {
                  window.controlAudit.lastWidget = changed;
                },
              }))),
            React.createElement("section", {
              "data-audit-preview": type,
              style: { width: instance.width, height: instance.height, overflow: "hidden" },
            }, React.createElement(packages.BetterWidgetPreview, {
              type,
              config: nextConfig,
              widget: instance,
              allWidgets: [],
            })),
          ),
        );
      },
      mountRuntime(type, runtime, scale, config) {
        const base = config || this.base(type);
        const original = registry.createBetterInstance(type, { config: base });
        const instance = {
          ...original,
          x: 0,
          y: 0,
          width: Math.max(1, Math.round(original.width * scale)),
          height: Math.max(1, Math.round(original.height * scale)),
        };
        root.render(React.createElement("main", {
          style: { margin: 0, width: instance.width, height: instance.height, overflow: "hidden" },
        }, React.createElement("div", {
          "data-runtime-preview": type,
          style: { width: "100%", height: "100%", overflow: "hidden" },
        }, registry.renderBetterWidgetInstance({
          instance,
          layout: { instances: [instance] },
          mode: "mock",
          runtime,
          renderScale: scale,
        }))));
      },
    };
  }, browserHash);

  const settle = () => page.evaluate(() => new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const mount = async (type, config) => {
    await page.evaluate(({ type, config }) => window.controlAudit.mount(type, config), { type, config });
    await settle();
  };

  const types = await page.evaluate(() => window.controlAudit.types);
  assert.equal(types.length, 17, "The audit covers every production editor widget");
  const sampleParity = await page.evaluate(() => {
    const sentinel = {
      fontFamily: "Georgia, serif",
      borderColor: "#123456",
      borderRadius: 19,
      colourTheme: "rose",
      theme: "rose",
      subElements: {
        container: {
          fontFamily: "Verdana, sans-serif",
          borderColor: "#654321",
          borderRadius: 23,
        },
      },
      themeEffects: {
        orbital: { hudGlow: 37 },
      },
    };
    const preserveKeys = [
      "fontFamily",
      "borderColor",
      "borderRadius",
      "colourTheme",
      "theme",
      "subElements",
      "themeEffects",
    ];
    return window.controlAudit.types.map((type) => {
      const definition = window.controlAudit.registry.getBetterWidgetDefinition(type);
      const liveConfig = window.controlAudit.packages.ensureBetterWidgetConfig(type, {
        ...definition.defaultConfig,
        ...sentinel,
        layout: "compact",
        showRequests: true,
        showSlotRequests: true,
        showNowPlaying: false,
        showCounter: false,
        twitchEnabled: true,
      });
      const sampleConfig = window.controlAudit.registry.resolveBetterWidgetConfig(
        type,
        liveConfig,
        "mock",
      );
      return {
        type,
        preserved: preserveKeys.every((key) =>
          JSON.stringify(sampleConfig[key]) === JSON.stringify(liveConfig[key])),
        sampleConfig,
      };
    });
  });
  for (const result of sampleParity) {
    assert.equal(
      result.preserved,
      true,
      `${result.type}: sample data preserves live fonts, edges, colours and theme effects`,
    );
    assert.doesNotMatch(
      JSON.stringify(result.sampleConfig),
      /brutuspolus|www\.brutuspolus|osecaadegas95/i,
      `${result.type}: sample data contains no streamer-specific fixture`,
    );
  }
  const parityByType = Object.fromEntries(sampleParity.map((item) => [item.type, item.sampleConfig]));
  assert.equal(parityByType.tournament.layout, "compact", "Tournament sample preserves the configured layout");
  assert.equal(parityByType.bonus_hunt.showRequests, true, "Bonus Hunt sample preserves request visibility");
  assert.equal(parityByType.bonus_hunt.showSlotRequests, true, "Bonus Hunt sample preserves slot-request visibility");
  assert.equal(parityByType.navbar.showNowPlaying, false, "Navbar sample preserves section visibility");
  assert.equal(parityByType.slideshow_frame.showCounter, false, "Slideshow sample preserves counter visibility");
  assert.equal(parityByType.chat.twitchEnabled, true, "Chat sample preserves source configuration while previewOnly prevents connections");
  assert.equal(parityByType.current_slot.slot?.name, "Gates of Olympus 1000", "Current Slot receives neutral sample game data");
  assert.equal(parityByType.current_slot.__previewPersonalBest?.best_win, 540, "Current Slot receives sample personal-record data");
  const inventory = [];
  const descriptorsByType = new Map();
  for (const type of types) {
    await mount(type);
    const result = await page.evaluate(() => {
      const visible = (element) => {
        const bounds = element.getBoundingClientRect();
        return !element.disabled && bounds.width > 0 && bounds.height > 0;
      };
      const controls = [...document.querySelectorAll(
        'aside input:not([type="file"]):not([type="hidden"]), aside select, aside textarea, aside button.bp-toggle',
      )].filter(visible);
      const describe = (element, index) => ({
        index,
        tag: element.tagName,
        type: element.type || "",
        label: element.closest("label")?.textContent?.replace(/\s+/g, " ").trim()
          || element.textContent?.replace(/\s+/g, " ").trim()
          || `control-${index}`,
        options: element.tagName === "SELECT" ? element.options.length : 0,
        optionValues: element.tagName === "SELECT" ? [...element.options].map((option) => option.value) : [],
        value: element.value,
        min: element.min,
        max: element.max,
      });
      return {
        controls: controls.map(describe),
        optionGroups: [...document.querySelectorAll(
          "aside .bp-segmented, aside .bp-hunt-choice-grid, aside .bp-theme-grid",
        )].filter(visible).map((group, groupIndex) => ({
          groupIndex,
          label: group.getAttribute("aria-label")
            || group.closest(".bp-section,.bp-hunt-section")?.querySelector("h4,.bp-section__head")?.textContent?.replace(/\s+/g, " ").trim()
            || `option-group-${groupIndex}`,
          buttons: [...group.querySelectorAll("button")].filter(visible).map((button, buttonIndex) => ({
            buttonIndex,
            label: button.textContent.replace(/\s+/g, " ").trim(),
            active: button.classList.contains("is-active") || button.getAttribute("aria-pressed") === "true",
          })),
        })),
        previewNodes: document.querySelector("[data-audit-preview]")?.querySelectorAll("*").length || 0,
        emptySections: [...document.querySelectorAll("aside .bp-section")]
          .filter((section) => !section.querySelector("input,select,textarea,button:not(.bp-section__head),.bp-segmented,.bp-theme-grid,.bp-hunt-choice-grid"))
          .map((section) => section.textContent.replace(/\s+/g, " ").trim()),
      };
    });
    assert(result.previewNodes > 0, `${type}: preview rendered`);
    assert.deepEqual(result.emptySections, [], `${type}: no empty settings sections`);
    for (const control of result.controls) {
      assert(control.label, `${type}: every visible control has a label`);
      if (control.tag === "SELECT" && !control.label.startsWith("Camera source")) {
        assert(control.options > 1, `${type}/${control.label}: unsupported single-option selector is hidden`);
      }
    }
    descriptorsByType.set(type, result.controls);
    descriptorsByType.set(`${type}:groups`, result.optionGroups);
    inventory.push({
      type,
      controls: result.controls.length,
      numericControls: result.controls.filter((control) => ["range", "number"].includes(control.type)).length,
      selectOptions: result.controls
        .filter((control) => control.tag === "SELECT")
        .reduce((sum, control) => sum + control.options, 0),
      groupedOptions: result.optionGroups.reduce((sum, group) => sum + group.buttons.length, 0),
    });
  }

  let verifiedMutations = 0;
  for (const { type, controls } of inventory) {
    const baseConfig = await page.evaluate((widgetType) =>
      JSON.parse(JSON.stringify(window.controlAudit.base(widgetType))), type);
    for (let controlIndex = 0; controlIndex < controls; controlIndex += 1) {
      await mount(type, baseConfig);
      const outcome = await page.evaluate(async (index) => {
        const visible = (element) => {
          const bounds = element.getBoundingClientRect();
          return !element.disabled && bounds.width > 0 && bounds.height > 0;
        };
        const elements = [...document.querySelectorAll(
          'aside input:not([type="file"]):not([type="hidden"]), aside select, aside textarea, aside button.bp-toggle',
        )].filter(visible);
        const element = elements[index];
        if (!element) return { changed: false, reason: "control disappeared" };
        const beforeConfig = JSON.stringify(window.controlAudit.current.config);
        const beforeWidget = window.controlAudit.lastWidget;
        if (element.matches("button.bp-toggle")) {
          element.click();
        } else if (element.tagName === "SELECT") {
          const option = [...element.options].find((item) => item.value !== element.value);
          if (!option && element.closest("label")?.textContent?.startsWith("Camera source")) {
            return { skipped: true, reason: "no camera permission or device available" };
          }
          if (!option) return { changed: false, reason: "no alternate option" };
          element.value = option.value;
          element.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          const setter = Object.getOwnPropertyDescriptor(
            element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
            "value",
          )?.set;
          const isSourceUrl = element.closest("label")?.textContent?.includes("Source URL");
          let nextValue = isSourceUrl
            ? "http://127.0.0.1:17832/view/panel-1?token=0123456789abcdef0123456789abcdef0123456789abcdef"
            : "Audit value";
          if (["range", "number"].includes(element.type)) {
            const min = Number(element.min);
            const max = Number(element.max);
            const current = Number(element.value);
            nextValue = String(Number.isFinite(min) && current !== min
              ? min
              : Number.isFinite(max) ? max : current + 1);
          } else if (element.type === "color") {
            nextValue = element.value.toLowerCase() === "#123456" ? "#654321" : "#123456";
          } else if (["checkbox", "radio"].includes(element.type)) {
            element.click();
            return { changed: true, beforeConfig, beforeWidget };
          } else if (element.value === nextValue) {
            nextValue = "Audit value 2";
          }
          setter.call(element, nextValue);
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          if (isSourceUrl) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
            element.closest(".bp-controls--slot-window")?.querySelector(".bp-inline-actions button:last-child")?.click();
          }
        }
        return { changed: true, beforeConfig, beforeWidget };
      }, controlIndex);
      if (outcome.skipped) continue;
      assert(outcome.changed, `${type} control ${controlIndex}: ${outcome.reason}`);
      await settle();
      const mutation = await page.evaluate(({ beforeConfig, beforeWidget }) => ({
        configChanged: window.controlAudit.lastConfig != null
          && JSON.stringify(window.controlAudit.lastConfig) !== beforeConfig,
        widgetChanged: window.controlAudit.lastWidget != null
          && window.controlAudit.lastWidget !== beforeWidget,
        previewNodes: document.querySelector("[data-audit-preview]")?.querySelectorAll("*").length || 0,
      }), outcome);
      assert(
        mutation.configChanged || mutation.widgetChanged,
        `${type} control ${controlIndex} (${JSON.stringify(descriptorsByType.get(type)?.[controlIndex])}): visible control has no configuration effect`,
      );
      assert(mutation.previewNodes > 0, `${type} control ${controlIndex}: preview survives change`);
      verifiedMutations += 1;
    }
  }

  let boundaryMutations = 0;
  let conditionalStates = 0;
  for (const { type } of inventory) {
    const baseConfig = await page.evaluate((widgetType) =>
      JSON.parse(JSON.stringify(window.controlAudit.base(widgetType))), type);
    const descriptors = descriptorsByType.get(type);
    for (const descriptor of descriptors) {
      const values = descriptor.tag === "SELECT"
        ? descriptor.optionValues.filter((value) => value !== descriptor.value)
        : ["range", "number"].includes(descriptor.type)
          ? [...new Set([
              descriptor.min,
              Number.isFinite(Number(descriptor.min)) && Number.isFinite(Number(descriptor.max))
                ? String((Number(descriptor.min) + Number(descriptor.max)) / 2)
                : "",
              descriptor.max,
            ].filter((value) => value !== "" && value !== descriptor.value))]
          : [];
      for (const value of values) {
        await mount(type, baseConfig);
        const outcome = await page.evaluate(({ index, value }) => {
          const visible = (element) => {
            const bounds = element.getBoundingClientRect();
            return !element.disabled && bounds.width > 0 && bounds.height > 0;
          };
          const element = [...document.querySelectorAll(
            'aside input:not([type="file"]):not([type="hidden"]), aside select, aside textarea, aside button.bp-toggle',
          )].filter(visible)[index];
          if (!element) return { changed: false, reason: "control disappeared" };
          const beforeConfig = JSON.stringify(window.controlAudit.current.config);
          const beforeWidget = window.controlAudit.lastWidget;
          const setter = Object.getOwnPropertyDescriptor(
            element.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype,
            "value",
          )?.set;
          setter.call(element, String(value));
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return { changed: true, beforeConfig, beforeWidget };
        }, { index: descriptor.index, value });
        assert(outcome.changed, `${type}/${descriptor.label}: ${outcome.reason}`);
        await settle();
        assert.equal(
          await page.evaluate(({ beforeConfig, beforeWidget }) => (
            window.controlAudit.lastConfig != null
              && JSON.stringify(window.controlAudit.lastConfig) !== beforeConfig
          ) || (
            window.controlAudit.lastWidget != null
              && window.controlAudit.lastWidget !== beforeWidget
          ), outcome),
          true,
          `${type}/${descriptor.label}: option or boundary ${value} has no effect`,
        );
        if (descriptor.tag === "SELECT") {
          const state = await page.evaluate(() => ({
            previewNodes: document.querySelector("[data-audit-preview]")?.querySelectorAll("*").length || 0,
            emptySections: [...document.querySelectorAll("aside .bp-section")]
              .filter((section) => !section.querySelector("input,select,textarea,button:not(.bp-section__head),.bp-segmented,.bp-theme-grid,.bp-hunt-choice-grid"))
              .map((section) => section.textContent.replace(/\s+/g, " ").trim()),
          }));
          assert(state.previewNodes > 0, `${type}/${descriptor.label}/${value}: conditional preview renders`);
          assert.deepEqual(state.emptySections, [], `${type}/${descriptor.label}/${value}: no empty conditional settings`);
          conditionalStates += 1;
        }
        boundaryMutations += 1;
      }
    }
  }

  let groupedOptionMutations = 0;
  for (const { type } of inventory) {
    const baseConfig = await page.evaluate((widgetType) =>
      JSON.parse(JSON.stringify(window.controlAudit.base(widgetType))), type);
    for (const group of descriptorsByType.get(`${type}:groups`)) {
      for (const button of group.buttons.filter((item) => !item.active)) {
        await mount(type, baseConfig);
        const outcome = await page.evaluate(({ groupIndex, buttonIndex }) => {
          const visible = (element) => {
            const bounds = element.getBoundingClientRect();
            return !element.disabled && bounds.width > 0 && bounds.height > 0;
          };
          const groups = [...document.querySelectorAll(
            "aside .bp-segmented, aside .bp-hunt-choice-grid, aside .bp-theme-grid",
          )].filter(visible);
          const target = [...(groups[groupIndex]?.querySelectorAll("button") || [])].filter(visible)[buttonIndex];
          if (!target) return { changed: false, reason: "option disappeared" };
          const beforeConfig = JSON.stringify(window.controlAudit.current.config);
          const beforeWidget = window.controlAudit.lastWidget;
          target.click();
          return { changed: true, beforeConfig, beforeWidget };
        }, { groupIndex: group.groupIndex, buttonIndex: button.buttonIndex });
        assert(outcome.changed, `${type}/${group.label}/${button.label}: ${outcome.reason}`);
        await settle();
        assert.equal(
          await page.evaluate(({ beforeConfig, beforeWidget }) => (
            window.controlAudit.lastConfig != null
              && JSON.stringify(window.controlAudit.lastConfig) !== beforeConfig
          ) || (
            window.controlAudit.lastWidget != null
              && window.controlAudit.lastWidget !== beforeWidget
          ), outcome),
          true,
          `${type}/${group.label}/${button.label}: option has no effect`,
        );
        const state = await page.evaluate(() => ({
          previewNodes: document.querySelector("[data-audit-preview]")?.querySelectorAll("*").length || 0,
          emptySections: [...document.querySelectorAll("aside .bp-section")]
            .filter((section) => !section.querySelector("input,select,textarea,button:not(.bp-section__head),.bp-segmented,.bp-theme-grid,.bp-hunt-choice-grid"))
            .map((section) => section.textContent.replace(/\s+/g, " ").trim()),
        }));
        assert(state.previewNodes > 0, `${type}/${group.label}/${button.label}: option preview renders`);
        assert.deepEqual(state.emptySections, [], `${type}/${group.label}/${button.label}: no empty option settings`);
        conditionalStates += 1;
        groupedOptionMutations += 1;
      }
    }
  }

  const responsiveChecks = [];
  for (const [width, height] of [[1920, 1080], [2560, 1440], [1366, 768]]) {
    const scale = Math.min(width / 1920, height / 1080);
    await page.setViewport({ width, height });
    for (const type of types) {
      for (const runtime of ["editor", "obs"]) {
        await page.evaluate(({ type, runtime, scale }) =>
          window.controlAudit.mountRuntime(type, runtime, scale), { type, runtime, scale });
        await settle();
        const result = await page.$eval("[data-runtime-preview]", (host) => ({
          nodes: host.querySelectorAll("*").length,
          clientWidth: host.clientWidth,
          clientHeight: host.clientHeight,
          scrollWidth: host.scrollWidth,
          scrollHeight: host.scrollHeight,
          horizontalOverflow: host.scrollWidth > host.clientWidth + 2,
          verticalOverflow: host.scrollHeight > host.clientHeight + 2,
        }));
        assert(result.nodes > 0, `${type}/${runtime}/${width}x${height}: renderer mounted`);
        assert.equal(result.horizontalOverflow, false, `${type}/${runtime}/${width}x${height}: no horizontal overflow`);
        assert.equal(result.verticalOverflow, false, `${type}/${runtime}/${width}x${height}: no vertical overflow (${JSON.stringify(result)})`);
        responsiveChecks.push(`${type}:${runtime}:${width}x${height}`);
      }
    }
  }

  assert.deepEqual(pageErrors, [], `Editor audit browser errors: ${pageErrors.join(" | ")}`);
  const totalControls = inventory.reduce((sum, item) => sum + item.controls, 0);
  assert(totalControls > 100, "The audit discovered the complete advanced control surface");
  console.log(JSON.stringify({ widgets: types.length, visibleControls: totalControls, verifiedMutations, boundaryMutations, groupedOptionMutations, conditionalStates, responsiveChecks: responsiveChecks.length, inventory }, null, 2));
  console.log("Overlay editor control inventory and capability visibility checks passed.");
} finally {
  await browser.close();
}
