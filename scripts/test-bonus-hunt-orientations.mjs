import assert from "node:assert/strict";
import { createElement } from "react";
import { readFileSync } from "node:fs";
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
  const { getBetterBonusOrientationHeight, getBetterBonusOrientationWidth } =
    await server.ssrLoadModule(
      "/src/components/OverlayCenter/editor/BetterWidgetPackages.jsx",
    );

  assert.deepEqual(
    ["vertical", "horizontal", "mainstream"].map((orientation) =>
      getBetterBonusOrientationWidth(orientation),
    ),
    [402, 1080, 372],
    "orientation changes use the intended widget geometry",
  );
  assert.deepEqual(
    ["vertical", "horizontal", "mainstream"].map((orientation) =>
      getBetterBonusOrientationHeight(orientation),
    ),
    [884, 280, 884],
    "horizontal orientation uses a thin frame without shrinking tall layouts",
  );

  const baseline = getAutomaticBetterHuntWin(null, [
    { id: "win", slot_name: "Big Bass", bet: 1, payout: 0 },
  ]);
  assert.equal(
    baseline.win,
    null,
    "initial payout data does not replay Win FX",
  );

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
  assert.equal(
    maxWin.win?.max,
    true,
    "database slot potential classifies Max Win",
  );

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
  assert.equal(
    disabledWin.win,
    null,
    "the widget Win FX toggle disables automation",
  );

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

    const expectedOrientationBody =
      orientation === "horizontal"
        ? markup.includes("better-hunt-hstrip-slot-stats") &&
          !markup.includes("better-hunt-list better-hunt-list--image")
        : markup.includes("better-hunt-list--image");
    const expectedDrawer =
      orientation === "horizontal"
        ? markup.includes("better-hunt-drawer--horizontal is-open")
        : markup.includes("better-hunt-drawer is-open");
    assert.ok(
      markup.includes(`data-orientation="${orientation}"`) &&
        markup.includes("better-hunt-image-stats-panel") &&
        markup.includes("better-hunt-stat-grid--grid") &&
        expectedOrientationBody &&
        expectedDrawer &&
        markup.includes(">Chat Requests<"),
      `${orientation} honors carousel, stats, list, drawer, and request controls`,
    );
    if (orientation === "horizontal") {
      assert.equal(
        (
          markup.match(/better-hunt-stat-grid better-hunt-stat-grid--grid/g) ||
          []
        ).length,
        1,
        "horizontal renders one full stats section",
      );
      assert.ok(
        markup.indexOf('<div class="better-hunt-hstrip-head"') <
          markup.indexOf('<div class="better-hunt-hstrip-slot-stats '),
        "horizontal places the Bonus and state header above slot stats",
      );
      assert.ok(
        markup.includes("better-hunt-hstrip-slot-rows") &&
          !markup.includes("better-hunt-list better-hunt-list--image"),
        "horizontal replaces the slot list with current slot stats",
      );
      assert.ok(
        markup.includes("better-hunt-horizontal") &&
          markup.includes("has-results") &&
          markup.includes("better-hunt-hstrip-results") &&
          markup.includes("better-hunt-drawer--horizontal is-open") &&
          markup.indexOf('aria-label="Best:') <
            markup.indexOf('aria-label="Worst:'),
        "horizontal stacks Best and Worst in the right result rail",
      );
    }
  }

  const landingSource = readFileSync(
    new URL("../src/components/LandingPage/LandingPage.jsx", import.meta.url),
    "utf8",
  );
  assert.ok(
    landingSource.includes("const height = isHorizontal ? 280 : 884") &&
      landingSource.includes("drawerAlwaysVisible: isHorizontal") &&
      landingSource.includes("panelWidth: width") &&
      landingSource.includes("panelHeight: height"),
    "landing uses the current thin horizontal geometry and visible result rail",
  );

  const horizontalRingMarkup = renderToStaticMarkup(
    createElement(BetterBonusHuntStyle, {
      config: {
        orientation: "horizontal",
        carouselMode: "3d",
        showRequests: false,
        startMoney: 100,
      },
      bonuses: [
        {
          id: "horizontal-ring",
          slot_name: "Mad Blast",
          bet: 1,
          rtp: 96.2,
          volatility: "high",
          max_win_multiplier: 10000,
        },
      ],
      stats: {},
      currency: "EUR",
    }),
  );
  assert.ok(
    horizontalRingMarkup.includes(
      "better-hunt-carousel better-hunt-carousel--ring",
    ) &&
      horizontalRingMarkup.includes("scale(1.18)") &&
      horizontalRingMarkup.includes(
        "grid-template-columns:minmax(0,1.35fr) minmax(92px,.8fr)",
      ) &&
      horizontalRingMarkup.includes(
        "height:100%;min-height:210px;align-self:stretch",
      ) &&
      horizontalRingMarkup.includes(
        "width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;display:block;object-fit:cover!important;object-position:center!important",
      ) &&
      horizontalRingMarkup.includes("height:210px;min-height:0") &&
      horizontalRingMarkup.includes("width:122px;height:172px"),
    "horizontal 3D mode uses consistent side artwork and the available ring height",
  );

  for (const tier of ["super", "extreme"]) {
    const slotName = tier === "super" ? "Starlight Princess" : "Wanted Dead";
    const tierMarkup = renderToStaticMarkup(
      createElement(BetterBonusHuntStyle, {
        config: {
          orientation: "horizontal",
          carouselMode: "3d",
          showRequests: false,
          startMoney: 100,
        },
        bonuses: [
          {
            id: `horizontal-${tier}`,
            slot_name: slotName,
            image_url: `https://example.com/${tier}.webp`,
            bet: 1,
            isSuperBonus: tier === "super",
            isExtremeBonus: tier === "extreme",
          },
        ],
        stats: {},
        currency: "EUR",
      }),
    );
    assert.ok(
      tierMarkup.includes(`better-hunt-hstrip-slot-stats--${tier}`) &&
        tierMarkup.includes(`alt="${slotName}"`) &&
        tierMarkup.includes(
          `better-hunt-card better-hunt-card--${tier} better-hunt-card--center`,
        ) &&
        tierMarkup.includes(
          ".better-hunt-hstrip-slot-art img{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;display:block;object-fit:cover!important;object-position:center!important}",
        ) &&
        tierMarkup.includes(
          ".better-hunt-image-stats-panel--super,.better-hunt-hstrip-slot-stats--super{animation:better-hunt-gold",
        ) &&
        tierMarkup.includes(
          ".better-hunt-image-stats-panel--extreme .better-hunt-image-stats-art img,.better-hunt-hstrip-slot-stats--extreme .better-hunt-hstrip-slot-art img{animation:better-hunt-cloak",
        ) &&
        tierMarkup.includes(
          ".better-hunt-ring .better-hunt-card--center.better-hunt-card--super{animation:better-hunt-gold",
        ) &&
        tierMarkup.includes(
          ".better-hunt-ring .better-hunt-card--center.better-hunt-card--extreme{animation:better-hunt-cloak",
        ),
      `horizontal ${tier} bonuses keep the left image sizing and animate the centered carousel card`,
    );
  }

  console.log("Bonus Hunt orientation control checks passed.");
} finally {
  await server.close();
}
