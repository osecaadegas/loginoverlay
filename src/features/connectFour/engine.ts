export const CONNECT_FOUR_ROWS = 6;
export const CONNECT_FOUR_COLUMNS = 7;
export const CONNECT_FOUR_TARGET = 4;

export type ConnectFourPlayer = 1 | 2;
export type ConnectFourCell = 0 | ConnectFourPlayer;
export type ConnectFourBoard = ConnectFourCell[][];

export interface ConnectFourMoveResult {
  board: ConnectFourBoard;
  row: number;
  column: number;
  winner: ConnectFourPlayer | null;
  isDraw: boolean;
}

export function createConnectFourBoard(): ConnectFourBoard {
  return Array.from({ length: CONNECT_FOUR_ROWS }, () =>
    Array<ConnectFourCell>(CONNECT_FOUR_COLUMNS).fill(0)
  );
}

export function normalizeConnectFourBoard(value: unknown): ConnectFourBoard {
  if (!Array.isArray(value) || value.length !== CONNECT_FOUR_ROWS) {
    return createConnectFourBoard();
  }

  const board = value.map((row) => {
    if (!Array.isArray(row) || row.length !== CONNECT_FOUR_COLUMNS) return null;
    const cells = row.map((cell) => Number(cell));
    if (cells.some((cell) => cell !== 0 && cell !== 1 && cell !== 2)) return null;
    return cells as ConnectFourCell[];
  });

  return board.some((row) => row === null)
    ? createConnectFourBoard()
    : (board as ConnectFourBoard);
}

export function findConnectFourWinner(board: ConnectFourBoard): ConnectFourPlayer | null {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const;

  for (let row = 0; row < CONNECT_FOUR_ROWS; row += 1) {
    for (let column = 0; column < CONNECT_FOUR_COLUMNS; column += 1) {
      const player = board[row]?.[column];
      if (player !== 1 && player !== 2) continue;

      for (const [rowStep, columnStep] of directions) {
        let matches = 1;
        for (let offset = 1; offset < CONNECT_FOUR_TARGET; offset += 1) {
          const nextRow = row + rowStep * offset;
          const nextColumn = column + columnStep * offset;
          if (board[nextRow]?.[nextColumn] !== player) break;
          matches += 1;
        }
        if (matches === CONNECT_FOUR_TARGET) return player;
      }
    }
  }

  return null;
}

export function isConnectFourDraw(board: ConnectFourBoard): boolean {
  return findConnectFourWinner(board) === null && board[0].every((cell) => cell !== 0);
}

export function dropConnectFourPiece(
  board: ConnectFourBoard,
  column: number,
  player: ConnectFourPlayer
): ConnectFourMoveResult {
  if (!Number.isInteger(column) || column < 0 || column >= CONNECT_FOUR_COLUMNS) {
    throw new RangeError("Column must be between 0 and 6");
  }

  const row = board.findLastIndex((cells) => cells[column] === 0);
  if (row < 0) throw new Error("Column is full");

  const nextBoard = board.map((cells) => [...cells]) as ConnectFourBoard;
  nextBoard[row][column] = player;
  const winner = findConnectFourWinner(nextBoard);

  return {
    board: nextBoard,
    row,
    column,
    winner,
    isDraw: winner === null && nextBoard[0].every((cell) => cell !== 0),
  };
}