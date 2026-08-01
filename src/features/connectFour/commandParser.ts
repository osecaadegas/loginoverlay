export type ConnectFourCommand =
  | { type: "start"; wager: number }
  | { type: "join" }
  | { type: "drop"; column: number }
  | { type: "reset" };

const COMMAND_PREFIX = "!connect4";
const MAX_WAGER = 1_000_000_000;

export function parseConnectFourCommand(message: unknown): ConnectFourCommand | null {
  const text = String(message || "").trim();
  if (!text) return null;

  const parts = text.split(/\s+/);
  if (parts[0]?.toLowerCase() !== COMMAND_PREFIX) return null;

  const action = parts[1]?.toLowerCase();
  if (action === "join" && parts.length === 2) return { type: "join" };
  if (action === "reset" && parts.length === 2) return { type: "reset" };

  if (action === "start" && parts.length === 3) {
    const wager = Number(parts[2]);
    if (Number.isSafeInteger(wager) && wager > 0 && wager <= MAX_WAGER) {
      return { type: "start", wager };
    }
    return null;
  }

  const requestedColumn = action === "drop" && parts.length === 3 ? parts[2] : parts.length === 2 ? parts[1] : null;
  const column = Number(requestedColumn);
  if (Number.isInteger(column) && column >= 1 && column <= 7) {
    return { type: "drop", column: column - 1 };
  }

  return null;
}