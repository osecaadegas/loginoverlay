export const CONNECT_FOUR_ROWS = 6;
export const CONNECT_FOUR_COLUMNS = 7;
export const CONNECT_FOUR_TARGET = 4;

export function createConnectFourBoard() {
  return Array.from({ length: CONNECT_FOUR_ROWS }, () =>
    new Array(CONNECT_FOUR_COLUMNS).fill(0),
  );
}

export function normalizeConnectFourBoard(value) {
  if (!Array.isArray(value) || value.length !== CONNECT_FOUR_ROWS) {
    return createConnectFourBoard();
  }
  const normalized = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== CONNECT_FOUR_COLUMNS) {
      return createConnectFourBoard();
    }
    normalized.push(row.map((cell) => (cell === 1 || cell === 2 ? cell : 0)));
  }
  return normalized;
}

export function findConnectFourDropRow(boardValue, column) {
  const board = normalizeConnectFourBoard(boardValue);
  if (
    !Number.isInteger(column) ||
    column < 0 ||
    column >= CONNECT_FOUR_COLUMNS
  ) {
    return -1;
  }
  for (let row = CONNECT_FOUR_ROWS - 1; row >= 0; row -= 1) {
    if (board[row][column] === 0) return row;
  }
  return -1;
}

export function dropConnectFourCoin(boardValue, column, player) {
  if (player !== 1 && player !== 2) return null;
  const board = normalizeConnectFourBoard(boardValue);
  const row = findConnectFourDropRow(board, column);
  if (row < 0) return null;
  board[row][column] = player;
  return { board, row, column, player };
}

export function findConnectFourWin(boardValue, row, column) {
  const board = normalizeConnectFourBoard(boardValue);
  const player = board[row]?.[column];
  if (player !== 1 && player !== 2) return null;

  for (const [rowStep, columnStep] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]) {
    const line = [[row, column]];
    let nextRow = row + rowStep;
    let nextColumn = column + columnStep;
    while (
      nextRow >= 0 &&
      nextRow < CONNECT_FOUR_ROWS &&
      nextColumn >= 0 &&
      nextColumn < CONNECT_FOUR_COLUMNS &&
      board[nextRow][nextColumn] === player
    ) {
      line.push([nextRow, nextColumn]);
      nextRow += rowStep;
      nextColumn += columnStep;
    }
    nextRow = row - rowStep;
    nextColumn = column - columnStep;
    while (
      nextRow >= 0 &&
      nextRow < CONNECT_FOUR_ROWS &&
      nextColumn >= 0 &&
      nextColumn < CONNECT_FOUR_COLUMNS &&
      board[nextRow][nextColumn] === player
    ) {
      line.unshift([nextRow, nextColumn]);
      nextRow -= rowStep;
      nextColumn -= columnStep;
    }
    if (line.length >= CONNECT_FOUR_TARGET) {
      return { player, line: line.slice(0, CONNECT_FOUR_TARGET) };
    }
  }
  return null;
}

export function isConnectFourBoardFull(boardValue) {
  const board = normalizeConnectFourBoard(boardValue);
  return board[0].every((cell) => cell !== 0);
}

export function parseConnectFourCommand(rawValue) {
  const text = String(rawValue || "").trim();
  if (!text) return null;
  const [rawCommand, rawArgument] = text.split(/\s+/, 2);
  const command = rawCommand.toLowerCase();

  if (command === "!c4") {
    if (rawArgument?.toLowerCase() === "join") return { type: "join" };
    const amount = Number(rawArgument);
    return Number.isSafeInteger(amount) && amount > 0
      ? { type: "start", amount }
      : { type: "invalid", reason: "start_amount" };
  }
  if (command === "!player1") {
    const amount = Number(rawArgument);
    return Number.isSafeInteger(amount) && amount > 0
      ? { type: "start", amount }
      : { type: "invalid", reason: "start_amount" };
  }
  if (command === "!player2") return { type: "join" };
  if (["!play", "!drop", "!move", "!col"].includes(command)) {
    const column = Number(rawArgument);
    return Number.isInteger(column) && column >= 1 && column <= 7
      ? { type: "move", column: column - 1 }
      : { type: "invalid", reason: "column" };
  }
  if (/^[1-7]$/.test(command)) {
    return { type: "move", column: Number(command) - 1 };
  }
  const commandTypes = {
    "!points": "points",
    "!wager": "wager",
    "!forfeit": "forfeit",
    "!reset": "reset",
    "!help": "help",
  };
  return commandTypes[command] ? { type: commandTypes[command] } : null;
}
