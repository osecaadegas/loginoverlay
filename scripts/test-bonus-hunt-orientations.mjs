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
  const { BetterBonusHuntStyle, getAutomaticBetterHuntWin } =
    await server.ssrLoadModule(
      "/src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx",
    );
  const { getBetterBonusOrientationWidth } = await server.ssrLoadModule(
    "/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx",
  );

  assert.deepEqual(
    ["vertical", "horizontal", "mainstream"].map((orientation) =>
      getBetterBonusOrientationWidth(orientation),
    ),
    [402, 1080, 372],
    "orientation changes use the intended widget geometry",
  );

  const baseline = getAutomaticBetterHuntWin(null, [
    { id: "win", slot_name: "Big Bass", bet: 1, payout: 0 },
  ]);
  assert.equal(baseline.win, null, "initial payout data does not replay Win FX");

  const automaticWin = getAutomaticBetterHuntWin(baseline.snapshot, [
    {
      id: "win",
      slot_name: "Big Bass",
      bet: 1,
      payout: 1234.56,
      slot: { max_win_multiplier: 1500 },
    },
  ]);
  assert.equal(
    automaticWin.win?.mult,
    1234.56,
    "Win FX uses the exact calculated payout multiplier",
  );
  assert.equal(
    automaticWin.win?.max,
    false,
    "a qualifying win below the database slot potential is not Max Win",
  );

  const maxWin = getAutomaticBetterHuntWin(baseline.snapshot, [
    {
      id: "win",
      slot_name: "Big Bass",
      bet: 1,
      payout: 1500,
      slot: { max_win_multiplier: 1500 },
    },
  ]);
  assert.equal(maxWin.win?.max, true, "database slot potential classifies Max Win");

  const unknownPotentialWin = getAutomaticBetterHuntWin(baseline.snapshot, [
    { id: "win", slot_name: "Big Bass", bet: 1, payout: 5000 },
  ]);
  assert.equal(
    unknownPotentialWin.win?.max,
    false,
    "missing database potential never guesses Max Win",
  );

  const repeatedWin = getAutomaticBetterHuntWin(automaticWin.snapshot, [
    { id: "win", slot_name: "Big Bass", bet: 1, payout: 1200 },
  ]);
  assert.equal(repeatedWin.win, null, "an active 1000x payout does not replay");

  const disabledWin = getAutomaticBetterHuntWin(
    baseline.snapshot,
    [{ id: "win", slot_name: "Big Bass", bet: 1, payout: 1500 }],
    false,
  );
  assert.equal(disabledWin.win, null, "the widget Win FX toggle disables automation");

  for (const orientation of ["vertical", "horizontal", "mainstream"]) {
    const markup = renderToStaticMarkup(
      createElement(BetterBonusHuntStyle, {
        config: {
          orientation,
          sessionState: "ended",
          carouselMode: "imagestats",
          statsLayout: "grid",
          listMode: "image",
          visibleRows: 3,
          drawerAlwaysVisible: true,
          showRequests: true,
          slotRequests: [
            {
              id: `${orientation}-request`,
              slot_name: "Wanted Dead or a Wild",
              requested_by: "viewer_one",
            },
          ],
          startMoney: 100,
          stopMoney: 50,
        },
        bonuses: [
          {
            id: `${orientation}-bonus-best`,
            slot_name: "Bear Crazy",
            bet: 1,
            payout: 5,
            opened: true,
          },
          {
            id: `${orientation}-bonus-worst`,
            slot_name: "Sugar Rush",
            bet: 1,
            payout: 2,
            opened: true,
          },
        ],
        stats: {},
        currency: "EUR",
      }),
    );

    assert.ok(
      markup.includes(`data-orientation="${orientation}"`) &&
        markup.includes("better-hunt-image-stats-panel") &&
        markup.includes("better-hunt-stat-grid--grid") &&
        markup.includes("better-hunt-list--image") &&
        markup.includes("better-hunt-drawer is-open") &&
        markup.includes(">Chat Requests<"),
      `${orientation} honors carousel, stats, list, drawer, and request controls`,
    );
    if (orientation === "horizontal") {
      assert.equal(
        (markup.match(/better-hunt-stat-grid better-hunt-stat-grid--grid/g) || [])
          .length,
        1,
        "horizontal renders one full stats section",
      );
      assert.ok(
        markup.indexOf("better-hunt-hstrip-head") <
          markup.indexOf("better-hunt-list better-hunt-list--image"),
        "horizontal places the Bonus and state header above the left list",
      );
      assert.ok(
        !markup.includes("better-hunt-hstrip-stats"),
        "horizontal removes the duplicate compact stats row",
      );
    }
  }

  console.log("Bonus Hunt orientation control checks passed.");
} finally {
  await server.close();
}