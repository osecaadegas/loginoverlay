import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createConnectFourBoard,
  dropConnectFourCoin,
  findConnectFourDropRow,
  findConnectFourWin,
  isConnectFourBoardFull,
  normalizeConnectFourBoard,
  parseConnectFourCommand,
} from "../src/features/connectFour/engine.js";
import {
  buildConnectFourAnnouncement,
  parseConnectFourCommand as parseRuntimeCommand,
} from "../api/_lib/connect-four-runtime.js";

const emptyBoard = createConnectFourBoard();
assert.equal(emptyBoard.length, 6);
assert.ok(emptyBoard.every((row) => row.length === 7));
assert.equal(findConnectFourDropRow(emptyBoard, 3), 5);

let board = emptyBoard;
for (let column = 0; column < 4; column += 1) {
  board = dropConnectFourCoin(board, column, 1).board;
}
assert.deepEqual(findConnectFourWin(board, 5, 3), {
  player: 1,
  line: [
    [5, 0],
    [5, 1],
    [5, 2],
    [5, 3],
  ],
});

board = createConnectFourBoard();
for (let row = 0; row < 4; row += 1) {
  board = dropConnectFourCoin(board, 2, 2).board;
}
assert.equal(findConnectFourWin(board, 2, 2)?.player, 2);

board = createConnectFourBoard();
board[5][0] = 1;
board[4][1] = 1;
board[3][2] = 1;
board[2][3] = 1;
assert.deepEqual(findConnectFourWin(board, 2, 3)?.line, [
  [2, 3],
  [3, 2],
  [4, 1],
  [5, 0],
]);

assert.deepEqual(parseConnectFourCommand("!player1 250"), {
  type: "start",
  amount: 250,
});
assert.deepEqual(parseConnectFourCommand("!c4 250"), {
  type: "start",
  amount: 250,
});
assert.deepEqual(parseConnectFourCommand("!c4 join"), { type: "join" });
assert.deepEqual(parseConnectFourCommand("!player2"), { type: "join" });
assert.deepEqual(parseConnectFourCommand("!play 7"), {
  type: "move",
  column: 6,
});
assert.deepEqual(parseConnectFourCommand("4"), { type: "move", column: 3 });
assert.equal(parseConnectFourCommand("hello"), null);
assert.equal(normalizeConnectFourBoard([]).length, 6);
assert.equal(
  isConnectFourBoardFull(Array.from({ length: 6 }, () => new Array(7).fill(1))),
  true,
);

assert.deepEqual(parseRuntimeCommand("!connect4 start 250"), {
  type: "start",
  wager: 250,
});
assert.deepEqual(parseRuntimeCommand("!c4 250"), {
  type: "start",
  wager: 250,
});
assert.deepEqual(parseRuntimeCommand("!c4 7"), {
  type: "start",
  wager: 7,
});
assert.deepEqual(parseRuntimeCommand("!c4 join"), { type: "join" });
assert.deepEqual(parseRuntimeCommand("!connect4 join"), { type: "join" });
assert.deepEqual(parseRuntimeCommand("!connect4 7"), {
  type: "drop",
  column: 6,
});
assert.deepEqual(parseRuntimeCommand("!player1 250"), {
  type: "start",
  wager: 250,
});
assert.deepEqual(parseRuntimeCommand("!player2"), { type: "join" });
assert.deepEqual(parseRuntimeCommand("!player2 250"), { type: "join" });
assert.deepEqual(parseRuntimeCommand("!connect4 join 250"), { type: "join" });
assert.deepEqual(parseRuntimeCommand("!play 7"), {
  type: "drop",
  column: 6,
});
assert.match(
  buildConnectFourAnnouncement(
    {
      status: "active",
      player_one_display_name: "Player One",
      player_two_display_name: "Player Two",
    },
    "join",
  ),
  /play with !play 1 through !play 7/,
);

const packagesSource = readFileSync(
  new URL(
    "../src/components/OverlayCenter/editor/BetterWidgetPackages.jsx",
    import.meta.url,
  ),
  "utf8",
);
const registrySource = readFileSync(
  new URL(
    "../src/components/OverlayCenter/editor/betterWidgetRegistry.jsx",
    import.meta.url,
  ),
  "utf8",
);
const obsOverlaySource = readFileSync(
  new URL(
    "../src/components/OverlayCenter/editor/BetterObsOverlay.jsx",
    import.meta.url,
  ),
  "utf8",
);
const listenerSource = readFileSync(
  new URL("../src/hooks/useConnectFourListener.js", import.meta.url),
  "utf8",
);
const widgetSource = readFileSync(
  new URL(
    "../src/components/OverlayCenter/widgets/connect-four/ConnectFourWidget.tsx",
    import.meta.url,
  ),
  "utf8",
);
const widgetStylesSource = readFileSync(
  new URL(
    "../src/components/OverlayCenter/widgets/connect-four/ConnectFourWidget.css",
    import.meta.url,
  ),
  "utf8",
);
const slideshowSource = readFileSync(
  new URL(
    "../src/components/OverlayCenter/widgets/slideshow-frame/SlideshowFrameWidget.jsx",
    import.meta.url,
  ),
  "utf8",
);
const slideshowStylesSource = readFileSync(
  new URL(
    "../src/components/OverlayCenter/widgets/slideshow-frame/SlideshowFrameWidget.css",
    import.meta.url,
  ),
  "utf8",
);
const apiSource = readFileSync(
  new URL("../api/chat-commands.js", import.meta.url),
  "utf8",
);
const baseMigration = readFileSync(
  new URL("../migrations/036_chat_connect_four.sql", import.meta.url),
  "utf8",
);
const deadlineMigration = readFileSync(
  new URL("../migrations/037_connect_four_turn_deadlines.sql", import.meta.url),
  "utf8",
);

assert.match(packagesSource, /type: "connect_four"/);
assert.match(packagesSource, /BetterConnectFourControls/);
assert.match(
  packagesSource,
  /showConnectFour: false[\s\S]*?next\.showConnectFour = next\.showConnectFour === true/,
);
assert.match(
  packagesSource,
  /label="Connect 4 takeover"[\s\S]*?set\(\{ showConnectFour \}\)/,
);
assert.match(packagesSource, /label="Board size"[\s\S]*?min=\{40\}/);
assert.match(packagesSource, /connect_four: \{[\s\S]*?chatCommand: "!c4"/);
assert.match(
  packagesSource,
  /mergedConfig\.chatCommand === "!connect4"[\s\S]*?\? "!c4"/,
);
assert.match(registrySource, /connect_four: ConnectFourWidget/);
assert.match(
  registrySource,
  /function migrateLegacyConnectFourConfig[\s\S]*?playerOneColor: "#facc15"[\s\S]*?playerTwoColor: "#ef4444"/,
);
assert.match(listenerSource, /better_editor_overlays/);
assert.match(
  listenerSource,
  /widgetType === "slideshow_frame"[\s\S]*?showConnectFour === true/,
);
assert.match(listenerSource, /lowerText === "!c4"/);
assert.match(listenerSource, /config\.chatCommand \|\| "!c4"/);
assert.match(widgetSource, /Math\.max\(40, Number\(config\.boardScale\)/);
assert.match(widgetSource, /Join with !c4 join/);
assert.doesNotMatch(widgetSource, /!player2|!connect4/);
assert.match(widgetSource, /const WINNER_DISPLAY_MS = 10_000/);
assert.match(widgetSource, /const WIDGET_FADE_MS = 700/);
assert.match(widgetSource, /previewWhenIdle = true/);
assert.match(widgetSource, /winnerDisplayMs = WINNER_DISPLAY_MS/);
assert.match(widgetSource, /winnerHideAfterMs/);
assert.match(widgetSource, /onVisibilityChange\?\.\(isVisible\)/);
assert.match(
  obsOverlaySource,
  /renderBetterWidgetInstance\(\{[\s\S]*?runtime: "obs"/,
);
assert.match(
  widgetSource,
  /winnerDeadlineRef\.current\?\.matchId !== state\.match_id/,
);
assert.match(widgetSource, /winnerStartedAt \+[\s\S]*?winnerDisplayMs/);
assert.match(widgetSource, /winnerVisibility !== "hidden"/);
assert.match(widgetSource, /winnerVisibility === "fading"/);
assert.match(
  widgetSource,
  /className="connect-four-confetti"[\s\S]*?Array\.from\(\{ length: 24 \}/,
);
assert.match(
  widgetSource,
  /className="connect-four-winner-card"[\s\S]*?connect-four-winner-label[\s\S]*?connect-four-winner-points/,
);
assert.match(
  slideshowSource,
  /connectFourActive \|\|[\s\S]*?window\.setInterval/,
);
assert.match(
  slideshowSource,
  /<ConnectFourWidget[\s\S]*?previewWhenIdle=\{false\}[\s\S]*?winnerHideAfterMs=\{5_000\}[\s\S]*?onVisibilityChange=\{handleConnectFourVisibility\}/,
);
assert.match(
  slideshowSource,
  /data-connect-four=\{connectFourActive \? "active" : "idle"\}/,
);
assert.match(
  widgetSource,
  /const hasTwoPlayers = Boolean\(displayedState\.player_two_display_name\)/,
);
assert.match(
  widgetSource,
  /!hasTwoPlayers && \([\s\S]*?<aside className="connect-four-info">/,
);
assert.match(
  widgetSource,
  /connect-four-player-rail--p1[\s\S]*?connect-four-board-stack[\s\S]*?connect-four-player-rail--p2/,
);
assert.doesNotMatch(widgetSource, /showPlayers && hasTwoPlayers/);
assert.doesNotMatch(widgetSource, /connect-four-scorebar/);
assert.match(
  widgetSource,
  /rowIndex === 0[\s\S]*?className="connect-four-hole-number"[\s\S]*?columnIndex \+ 1/,
);
assert.match(widgetStylesSource, /\.connect-four-info \{/);
assert.match(
  widgetStylesSource,
  /\.connect-four-widget\.is-fading \{[\s\S]*?opacity: 0/,
);
assert.match(
  widgetStylesSource,
  /\.connect-four-win-overlay \{[\s\S]*?z-index: 10;[\s\S]*?place-items: center/,
);
assert.match(
  widgetStylesSource,
  /\.connect-four-winner-card \{[\s\S]*?z-index: 12;[\s\S]*?text-align: center;[\s\S]*?0 0 38px rgba\(245, 158, 11, 0\.72\)/,
);
assert.match(
  widgetStylesSource,
  /\.connect-four-confetti \{[\s\S]*?z-index: 11;[\s\S]*?connect-four-confetti-splash/,
);
assert.match(
  slideshowStylesSource,
  /data-connect-four="active"[\s\S]*?better-slideshow-frame__media-layer[\s\S]*?opacity: 0/,
);
assert.match(
  slideshowStylesSource,
  /\.better-slideshow-frame__connect-four \{[\s\S]*?transform: translateY\(105%\)/,
);
assert.match(
  slideshowStylesSource,
  /\.better-slideshow-frame__connect-four\.is-active \{[\s\S]*?transform: translateY\(0\)/,
);
assert.match(widgetStylesSource, /width: clamp\(210px, 34%, 300px\)/);
assert.match(
  widgetStylesSource,
  /\.connect-four-info \.connect-four-title \{[\s\S]*?font-size: clamp\(18px, 3cqh, 24px\)/,
);
assert.match(
  widgetStylesSource,
  /\.connect-four-info > strong \{[\s\S]*?font-size: clamp\(16px, 2\.7cqh, 22px\)/,
);
assert.match(
  widgetStylesSource,
  /\.connect-four-info > span \{[\s\S]*?font-size: clamp\(14px, 2\.2cqh, 18px\)/,
);
assert.match(widgetStylesSource, /\.connect-four-player-rail strong \{/);
assert.match(
  widgetStylesSource,
  /\.connect-four-player-rail\.is-long strong \{/,
);
assert.match(
  widgetStylesSource,
  /color: #fff;[\s\S]*?font-size: clamp\(18px, 3\.2cqh, 26px\)/,
);
assert.match(widgetStylesSource, /\.connect-four-hole-number \{/);
assert.match(widgetStylesSource, /font-size: clamp\(14px, 3cqh, 23px\)/);
assert.match(apiSource, /case ["']connect-four["']/);
assert.match(
  baseMigration,
  /CREATE TABLE IF NOT EXISTS public\.connect_four_public_state/,
);
assert.match(
  baseMigration,
  /ALTER PUBLICATION supabase_realtime ADD TABLE public\.connect_four_public_state/,
);
assert.match(deadlineMigration, /process_connect_four_turn_deadline/);

console.log("Connect4 engine and integration tests passed");
