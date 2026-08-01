import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  parseConnectFourCommand as parseRuntimeCommand,
  verifyTwitchEventSubSignature,
} from "../api/_lib/connect-four-runtime.js";

function play(columns: number[]): ConnectFourBoard {
  let board = createConnectFourBoard();
  columns.forEach((column, index) => {
    board = dropConnectFourPiece(board, column, (index % 2 === 0 ? 1 : 2) as ConnectFourPlayer).board;
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
  fullColumn = dropConnectFourPiece(fullColumn, 0, index % 2 === 0 ? 1 : 2).board;
}
assert.throws(() => dropConnectFourPiece(fullColumn, 0, 1), /full/);
assert.throws(() => dropConnectFourPiece(emptyBoard, 7, 1), /between 0 and 6/);

assert.equal(findConnectFourWinner(play([0, 0, 1, 1, 2, 2, 3])), 1, "horizontal win");
assert.equal(findConnectFourWinner(play([0, 1, 0, 1, 0, 1, 0])), 1, "vertical win");
assert.equal(findConnectFourWinner(play([0, 1, 1, 2, 4, 2, 2, 3, 4, 3, 5, 3, 3])), 1, "rising diagonal win");
assert.equal(findConnectFourWinner(play([3, 2, 2, 1, 5, 1, 1, 0, 5, 0, 6, 0, 0])), 1, "falling diagonal win");

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

assert.deepEqual(parseConnectFourCommand("!connect4 start 250"), { type: "start", wager: 250 });
assert.deepEqual(parseConnectFourCommand(" !CONNECT4 join "), { type: "join" });
assert.deepEqual(parseConnectFourCommand("!connect4 7"), { type: "drop", column: 6 });
assert.deepEqual(parseConnectFourCommand("!connect4 drop 1"), { type: "drop", column: 0 });
assert.deepEqual(parseConnectFourCommand("!connect4 reset"), { type: "reset" });
assert.equal(parseConnectFourCommand("!connect4 start 0"), null);
assert.equal(parseConnectFourCommand("!connect4 start 1.5"), null);
assert.equal(parseConnectFourCommand("!connect4 8"), null);
assert.equal(parseConnectFourCommand("!connect4 join now"), null);
assert.equal(parseConnectFourCommand("!other 1"), null);
assert.deepEqual(parseRuntimeCommand("!connect4 drop 4"), { type: "drop", column: 3 });

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
  verifyTwitchEventSubSignature({ headers, rawBody: Buffer.from("tampered"), secret }),
  false,
);
assert.equal(
  verifyTwitchEventSubSignature({
    headers: { ...headers, "twitch-eventsub-message-timestamp": "2020-01-01T00:00:00Z" },
    rawBody,
    secret,
  }),
  false,
);

const migration = readFileSync(
  new URL("../migrations/033_chat_connect_four.sql", import.meta.url),
  "utf8",
);
const commandRetention = migration.indexOf("DELETE FROM public.connect_four_command_events");
const matchRetention = migration.indexOf("DELETE FROM public.connect_four_matches");
const publicStateSync = migration.indexOf("PERFORM public.connect_four_sync_public_state(created_match_id)");
assert.ok(commandRetention > 0, "new matches must remove prior command history");
assert.ok(matchRetention > commandRetention, "new matches must remove the prior match after its commands");
assert.ok(publicStateSync > matchRetention, "the latest snapshot must be published after retention cleanup");
assert.match(
  migration,
  /IF error_text IS NOT NULL AND active_match\.id IS NULL THEN\s+DELETE FROM public\.connect_four_command_events/,
  "ignored commands without a match must not accumulate",
);

console.log("connect four engine and parser tests passed");