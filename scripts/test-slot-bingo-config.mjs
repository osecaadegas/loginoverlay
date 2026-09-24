import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "error",
  optimizeDeps: { disabled: true },
  plugins: [react()],
  root: process.cwd(),
  server: { middlewareMode: true },
});

try {
  const { default: SlotBingoConfig } = await server.ssrLoadModule(
    "/src/components/OverlayCenter/widgets/slot-bingo/SlotBingoConfig.jsx",
  );
  const markup = renderToStaticMarkup(
    React.createElement(SlotBingoConfig, {
      config: {},
      onChange: () => {},
    }),
  );

  assert.match(markup, /Slot Bingo setup/);
  assert.match(markup, /<dt>Lines<\/dt><dd>\d+<\/dd>/);
  assert.match(markup, /Board &amp; payouts/);
  console.log("Slot Bingo config render test passed.");
} finally {
  await server.close();
}
