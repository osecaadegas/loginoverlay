import assert from "node:assert/strict";
import {
  createConnectFourBoard,
  dropConnectFourCoin,
  findConnectFourDropRow,
  findConnectFourWin,
  isConnectFourBoardFull,
  normalizeConnectFourBoard,
  parseConnectFourCommand,
} from "../src/features/connectFour/engine.js";

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
assert.deepEqual(parseConnectFourCommand("!player2"), { type: "join" });
assert.deepEqual(parseConnectFourCommand("!play 7"), {
  type: "move",
  column: 6,
});
assert.deepEqual(parseConnectFourCommand("4"), { type: "move", column: 3 });
assert.equal(parseConnectFourCommand("hello"), null);
assert.equal(normalizeConnectFourBoard([]).length, 6);
assert.equal(
  isConnectFourBoardFull(
    Array.from({ length: 6 }, () => new Array(7).fill(1)),
  ),
  true,
);

console.log("Connect4 engine tests passed");
