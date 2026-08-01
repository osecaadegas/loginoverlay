import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import {
  createConnectFourBoard,
  dropConnectFourPiece,
  findConnectFourWinner,
  isConnectFourDraw,
  normalizeConnectFourBoard,
  type ConnectFourBoard,
  type ConnectFourPlayer,
} from "../src/features/connectFour/engine";
import { parseConnectFourCommand } from "../src/features/connectFour/commandParser";
import { createHmac } from "node:crypto";
import {
  buildConnectFourAnnouncement,
  parseConnectFourCommand as parseRuntimeCommand,
  verifyTwitchEventSubSignature,
} from "../api/_lib/connect-four-runtime.js";

function play(columns: number[]): ConnectFourBoard {
  let board = createConnectFourBoard();
  columns.forEach((column, index) => {
    board = dropConnectFourPiece(
      board,
      column,
      (index % 2 === 0 ? 1 : 2) as ConnectFourPlayer,
    ).board;
  });
  return board;
}

const emptyBoard = createConnectFourBoard();
const firstMove = dropConnectFourPiece(emptyBoard, 3, 1);
assert.equal(firstMove.row, 5);
assert.equal(firstMove.board[5][3], 1);
assert.equal(emptyBoard[5][3], 0, "moves must not mutate the previous board");

let fullColumn = createConnectFourBoard();
for (let index = 0; index < 6; index += 1) {
  fullColumn = dropConnectFourPiece(
    fullColumn,
    0,
    index % 2 === 0 ? 1 : 2,
  ).board;
}
assert.throws(() => dropConnectFourPiece(fullColumn, 0, 1), /full/);
assert.throws(() => dropConnectFourPiece(emptyBoard, 7, 1), /between 0 and 6/);

assert.equal(
  findConnectFourWinner(play([0, 0, 1, 1, 2, 2, 3])),
  1,
  "horizontal win",
);
assert.equal(
  findConnectFourWinner(play([0, 1, 0, 1, 0, 1, 0])),
  1,
  "vertical win",
);
assert.equal(
  findConnectFourWinner(play([0, 1, 1, 2, 4, 2, 2, 3, 4, 3, 5, 3, 3])),
  1,
  "rising diagonal win",
);
assert.equal(
  findConnectFourWinner(play([3, 2, 2, 1, 5, 1, 1, 0, 5, 0, 6, 0, 0])),
  1,
  "falling diagonal win",
);

const drawBoard = normalizeConnectFourBoard([
  [1, 1, 2, 2, 1, 1, 2],
  [2, 2, 1, 1, 2, 2, 1],
  [1, 1, 2, 2, 1, 1, 2],
  [2, 2, 1, 1, 2, 2, 1],
  [1, 1, 2, 2, 1, 1, 2],
  [2, 2, 1, 1, 2, 2, 1],
]);
assert.equal(isConnectFourDraw(drawBoard), true);
assert.deepEqual(normalizeConnectFourBoard([[1]]), createConnectFourBoard());

assert.deepEqual(parseConnectFourCommand("!connect4 start 250"), {
  type: "start",
  wager: 250,
});
assert.deepEqual(parseConnectFourCommand(" !CONNECT4 join "), { type: "join" });
assert.deepEqual(parseConnectFourCommand("!connect4 7"), {
  type: "drop",
  column: 6,
});
assert.deepEqual(parseConnectFourCommand("!connect4 drop 1"), {
  type: "drop",
  column: 0,
});
assert.deepEqual(parseConnectFourCommand("!connect4 reset"), { type: "reset" });
assert.equal(parseConnectFourCommand("!connect4 start 0"), null);
assert.equal(parseConnectFourCommand("!connect4 start 1.5"), null);
assert.equal(parseConnectFourCommand("!connect4 8"), null);
assert.equal(parseConnectFourCommand("!connect4 join now"), null);
assert.equal(parseConnectFourCommand("!other 1"), null);
assert.deepEqual(parseRuntimeCommand("!connect4 drop 4"), {
  type: "drop",
  column: 3,
});
assert.equal(
  buildConnectFourAnnouncement(
    {
      status: "waiting",
      wager: 250,
      player_one_display_name: "Alice",
    },
    "start",
  ),
  "Alice started Connect 4 for 250 points. Join with !connect4 join",
);
assert.equal(
  buildConnectFourAnnouncement(
    {
      status: "active",
      current_player: 2,
      player_one_display_name: "Alice",
      player_two_display_name: "Bob",
    },
    "reminder",
  ),
  "Bob, 10 seconds left! Play with !connect4 1 through !connect4 7",
);

const secret = "0123456789abcdef";
const rawBody = Buffer.from('{"challenge":"verified"}');
const timestamp = new Date().toISOString();
const messageId = "event-message-id";
const signature = `sha256=${createHmac("sha256", secret)
  .update(messageId + timestamp)
  .update(rawBody)
  .digest("hex")}`;
const headers = {
  "twitch-eventsub-message-id": messageId,
  "twitch-eventsub-message-timestamp": timestamp,
  "twitch-eventsub-message-signature": signature,
};
assert.equal(verifyTwitchEventSubSignature({ headers, rawBody, secret }), true);
assert.equal(
  verifyTwitchEventSubSignature({
    headers,
    rawBody: Buffer.from("tampered"),
    secret,
  }),
  false,
);
assert.equal(
  verifyTwitchEventSubSignature({
    headers: {
      ...headers,
      "twitch-eventsub-message-timestamp": "2020-01-01T00:00:00Z",
    },
    rawBody,
    secret,
  }),
  false,
);

const migration = readFileSync(
  new URL("../migrations/033_chat_connect_four.sql", import.meta.url),
  "utf8",
);
const commandRetention = migration.indexOf(
  "DELETE FROM public.connect_four_command_events",
);
const matchRetention = migration.indexOf(
  "DELETE FROM public.connect_four_matches",
);
const publicStateSync = migration.indexOf(
  "PERFORM public.connect_four_sync_public_state(created_match_id)",
);
assert.ok(
  commandRetention > 0,
  "new matches must remove prior command history",
);
assert.ok(
  matchRetention > commandRetention,
  "new matches must remove the prior match after its commands",
);
assert.ok(
  publicStateSync > matchRetention,
  "the latest snapshot must be published after retention cleanup",
);
assert.match(
  migration,
  /IF error_text IS NOT NULL AND active_match\.id IS NULL THEN\s+DELETE FROM public\.connect_four_command_events/,
  "ignored commands without a match must not accumulate",
);

const deadlineMigration = readFileSync(
  new URL("../migrations/034_connect_four_turn_deadlines.sql", import.meta.url),
  "utf8",
);
assert.match(deadlineMigration, /now\(\) \+ interval '60 seconds'/);
assert.match(deadlineMigration, /now\(\) \+ interval '10 seconds'/);
assert.match(deadlineMigration, /FOR UPDATE/);
assert.match(deadlineMigration, /completion_reason = 'timeout'/);
assert.match(
  deadlineMigration,
  /REVOKE ALL ON FUNCTION public\.process_connect_four_turn_deadline\(uuid\) FROM PUBLIC/,
);

const apiRouter = readFileSync(
  new URL("../api/[...path].js", import.meta.url),
  "utf8",
);
assert.match(apiRouter, /"connect-four-turn": connectFourTurnHandler/);
assert.equal(
  existsSync(new URL("../api/connect-four-turn.js", import.meta.url)),
  false,
  "the deadline endpoint must remain behind the catch-all function",
);
const topLevelApiFunctions = readdirSync(
  new URL("../api/", import.meta.url),
  { withFileTypes: true },
).filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
assert.ok(
  topLevelApiFunctions.length <= 12,
  "Vercel Hobby deployments support at most 12 serverless functions",
);

const connectFourRoute = readFileSync(
  new URL("../api/_lib/routes/connect-four.js", import.meta.url),
  "utf8",
);
assert.match(connectFourRoute, /req\.method !== "GET"/);
assert.match(connectFourRoute, /findChatSubscription/);
assert.match(
  connectFourRoute,
  /status:\s*enabled\?\.status\s*\|\|\s*"authorization_required"/,
);

const builtinWidgets = readFileSync(
  new URL(
    "../src/components/OverlayCenter/widgets/builtinWidgets.js",
    import.meta.url,
  ),
  "utf8",
);
assert.match(builtinWidgets, /type: "connect_four"/);
assert.match(builtinWidgets, /configPanel: ConnectFourConfig/);
assert.match(builtinWidgets, /component: ConnectFourWidget/);

const overlayControlCenter = readFileSync(
  new URL(
    "../src/components/OverlayCenter/OverlayControlCenter.jsx",
    import.meta.url,
  ),
  "utf8",
);
assert.match(
  overlayControlCenter,
  /const PRIMARY_TOOLS = \[[\s\S]*?"connect_four"/,
  "Connect 4 must remain visible in the Overlay Center catalog",
);
assert.match(overlayControlCenter, /function BufferedConfigPanel/);
assert.match(overlayControlCenter, /onBlur=\{commit\}/);
assert.match(overlayControlCenter, /setTimeout\(commit, 1000\)/);

const connectFourWidget = readFileSync(
  new URL(
    "../src/components/OverlayCenter/widgets/connect-four/ConnectFourWidget.tsx",
    import.meta.url,
  ),
  "utf8",
);
for (const setting of [
  "title",
  "playerOneColor",
  "playerTwoColor",
  "boardColor",
  "showWager",
  "showPlayers",
  "animateDrops",
]) {
  assert.match(
    connectFourWidget,
    new RegExp(`config\\.${setting}`),
    `${setting} must be consumed by the OBS renderer`,
  );
}

const connectFourListener = readFileSync(
  new URL("../src/hooks/useConnectFourListener.js", import.meta.url),
  "utf8",
);
assert.match(connectFourListener, /useTwitchChat/);
assert.match(connectFourListener, /cmd=connect-four/);
assert.match(connectFourListener, /message_id: message\.id/);
assert.match(connectFourListener, /chatter_id: message\.twitchUserId/);

const chatCommands = readFileSync(
  new URL("../api/chat-commands.js", import.meta.url),
  "utf8",
);
assert.match(chatCommands, /case 'connect-four'/);
assert.match(chatCommands, /processConnectFourCommand/);

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
assert.match(app, /useConnectFourListener\(\)/);

console.log("connect four engine and parser tests passed");
