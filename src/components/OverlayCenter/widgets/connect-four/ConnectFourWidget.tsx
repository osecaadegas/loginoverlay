import { useEffect, useState } from "react";
import { supabase } from "../../../../config/supabaseClient";
import {
  normalizeConnectFourBoard,
  type ConnectFourBoard,
} from "../../../../features/connectFour/engine";
import "./ConnectFourWidget.css";

interface ConnectFourState {
  match_id: string;
  status: string;
  wager: number;
  board: ConnectFourBoard;
  player_one_display_name: string;
  player_two_display_name: string | null;
  current_player: 1 | 2 | null;
  winner: 1 | 2 | null;
  move_count: number;
  last_move: { row: number; column: number; player: 1 | 2 } | null;
  completion_reason: string | null;
  expires_at: string | null;
}

interface ConnectFourWidgetProps {
  userId?: string;
  config?: Record<string, unknown>;
  runtime?: "editor" | "obs";
}

const CONNECT_FOUR_PREVIEW_STATE: ConnectFourState = {
  match_id: "connect-four-editor-preview",
  status: "active",
  wager: 250,
  board: [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 2, 0, 0, 0],
    [0, 0, 1, 1, 2, 0, 0],
    [0, 1, 2, 1, 2, 0, 0],
  ],
  player_one_display_name: "Player One",
  player_two_display_name: "Player Two",
  current_player: 2,
  winner: null,
  move_count: 9,
  last_move: { row: 3, column: 3, player: 2 },
  completion_reason: null,
  expires_at: null,
};

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeState(value: Record<string, unknown>): ConnectFourState {
  return {
    match_id: stringValue(value.match_id),
    status: stringValue(value.status, "waiting"),
    wager: Number(value.wager) || 0,
    board: normalizeConnectFourBoard(value.board),
    player_one_display_name: stringValue(
      value.player_one_display_name,
      "Player 1",
    ),
    player_two_display_name: stringValue(value.player_two_display_name) || null,
    current_player:
      value.current_player === 1 || value.current_player === 2
        ? value.current_player
        : null,
    winner: value.winner === 1 || value.winner === 2 ? value.winner : null,
    move_count: Number(value.move_count) || 0,
    last_move:
      value.last_move && typeof value.last_move === "object"
        ? (value.last_move as ConnectFourState["last_move"])
        : null,
    completion_reason: stringValue(value.completion_reason) || null,
    expires_at: stringValue(value.expires_at) || null,
  };
}

function getStatus(state: ConnectFourState | null): string {
  if (!state) return "!connect4 start <points>";
  if (state.status === "funding_start" || state.status === "funding_join")
    return "Confirming points";
  if (state.status === "waiting")
    return `Join for ${state.wager.toLocaleString()} points`;
  if (state.status === "active" && state.current_player) {
    return `${state.current_player === 1 ? state.player_one_display_name : state.player_two_display_name}'s turn`;
  }
  if (state.completion_reason === "draw") return "Draw - points refunded";
  if (state.completion_reason === "reset") return "Game cancelled";
  if (state.completion_reason === "funding_failed")
    return "Wager failed - reconnect StreamElements";
  if (state.winner) {
    return `${state.winner === 1 ? state.player_one_display_name : state.player_two_display_name} wins`;
  }
  if (state.status === "error") return "Point settlement needs attention";
  return "Game complete";
}

function getCommandHelp(state: ConnectFourState): string {
  if (state.completion_reason === "funding_failed") {
    return "Reconnect StreamElements, then start a new game";
  }
  if (state.status === "waiting") {
    return "Player 2: !player2 or !connect4 join";
  }
  if (state.status === "active") {
    return "Move: !play 1-7 or !connect4 1-7";
  }
  return "Start: !player1 100 or !connect4 start 100";
}

export default function ConnectFourWidget({
  userId,
  config = {},
  runtime = "editor",
}: Readonly<ConnectFourWidgetProps>) {
  const [state, setState] = useState<ConnectFourState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;

    supabase
      .from("connect_four_public_state")
      .select(
        "match_id,status,wager,board,player_one_display_name,player_two_display_name,current_player,winner,move_count,last_move,completion_reason,expires_at",
      )
      .eq("streamer_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error)
          console.warn("[ConnectFour] State load failed", error.message);
        if (active && data) setState(normalizeState(data));
      });

    const channel = supabase
      .channel(`connect-four:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connect_four_public_state",
          filter: `streamer_id=eq.${userId}`,
        },
        (payload) => {
          if (active && payload.new && Object.keys(payload.new).length > 0) {
            setState(normalizeState(payload.new));
          } else if (active && payload.eventType === "DELETE") {
            setState(null);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (state?.status !== "active" || !state.expires_at) return undefined;
    const expiresAt = Date.parse(state.expires_at);
    if (!Number.isFinite(expiresAt)) return undefined;

    const processDeadline = () => {
      fetch("/api/connect-four-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: state.match_id }),
      }).catch((error) =>
        console.warn("[ConnectFour] Deadline check failed", error),
      );
    };
    const reminderTimer = window.setTimeout(
      processDeadline,
      Math.max(0, expiresAt - Date.now() - 10_000),
    );
    const expiryTimer = window.setTimeout(
      processDeadline,
      Math.max(0, expiresAt - Date.now() + 250),
    );

    return () => {
      window.clearTimeout(reminderTimer);
      window.clearTimeout(expiryTimer);
    };
  }, [state?.expires_at, state?.match_id, state?.status]);

  useEffect(() => {
    if (state?.status !== "active" || !state.expires_at) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state?.expires_at, state?.status]);

  const displayedState = state ||
    (runtime === "editor" ? CONNECT_FOUR_PREVIEW_STATE : null);
  if (!displayedState) return null;

  const board = displayedState.board;
  const playerOne = displayedState.player_one_display_name;
  const playerTwo =
    displayedState.player_two_display_name || "Waiting for player";
  const title = stringValue(config.title, "CHAT CONNECT 4");
  const playerOneColor = stringValue(config.playerOneColor, "#ffd23f");
  const playerTwoColor = stringValue(config.playerTwoColor, "#f04444");
  const boardColor = stringValue(config.boardColor, "#08191f");
  const boardBorderColor = stringValue(config.boardBorderColor, "#a8d7df");
  const titleColor = stringValue(config.titleColor, "#f5c542");
  const textColor = stringValue(config.textColor, "#f7fbff");
  const mutedColor = stringValue(config.mutedColor, "#fff2b8");
  const fontFamily = stringValue(
    config.fontFamily,
    "'Rajdhani', sans-serif",
  );
  const fontScale = Math.min(1.5, Math.max(0.7, Number(config.fontScale) / 100 || 1));
  const showWager = config.showWager !== false;
  const showPlayers = config.showPlayers !== false;
  const showCommandHelp = config.showCommandHelp !== false;
  const showMoveCount = config.showMoveCount !== false;
  const showTurnTimer = config.showTurnTimer !== false;
  const animateDrops = config.animateDrops !== false;
  const secondsRemaining = displayedState.expires_at
    ? Math.max(0, Math.ceil((Date.parse(displayedState.expires_at) - now) / 1000))
    : null;

  return (
    <section
      className="connect-four-widget"
      aria-label="Chat Connect 4"
      style={{ color: textColor, fontFamily }}
    >
      <header className="connect-four-head">
        <div>
          <span
            className="connect-four-kicker"
            style={{
              color: titleColor,
              fontSize: `clamp(${10 * fontScale}px, ${2.2 * fontScale}cqh, ${18 * fontScale}px)`,
            }}
          >
            {title}
          </span>
          <strong
            style={{
              fontSize: `clamp(${14 * fontScale}px, ${3.4 * fontScale}cqh, ${28 * fontScale}px)`,
            }}
          >
            {getStatus(displayedState)}
          </strong>
        </div>
        {showWager && displayedState.wager ? (
          <b style={{ color: mutedColor }}>
            {displayedState.wager.toLocaleString()} PTS
          </b>
        ) : null}
      </header>

      {(showCommandHelp || showMoveCount || showTurnTimer) && (
        <div className="connect-four-details">
          {showCommandHelp && <span>{getCommandHelp(displayedState)}</span>}
          <div>
            {showMoveCount && <b>MOVE {displayedState.move_count}/42</b>}
            {showTurnTimer && displayedState.status === "active" && secondsRemaining !== null && (
              <b className={secondsRemaining <= 10 ? "is-urgent" : ""}>
                {secondsRemaining}s
              </b>
            )}
          </div>
        </div>
      )}

      <div
        className="connect-four-board"
        role="grid"
        aria-label="Connect 4 board"
        style={{ backgroundColor: boardColor, borderColor: boardBorderColor }}
      >
        {board.flatMap((row, rowIndex) =>
          row.map((cell, columnIndex) => {
            const isLastMove =
              displayedState.last_move?.row === rowIndex &&
              displayedState.last_move.column === columnIndex;
            return (
              <div
                className="connect-four-cell"
                role="gridcell"
                key={`${rowIndex}-${columnIndex}`}
              >
                {cell !== 0 ? (
                  <span
                    key={`${displayedState.match_id}-${displayedState.move_count}-${rowIndex}-${columnIndex}`}
                    className={`connect-four-coin connect-four-coin--p${cell}${isLastMove && animateDrops ? " is-latest" : ""}`}
                    style={{
                      backgroundColor:
                        cell === 1 ? playerOneColor : playerTwoColor,
                    }}
                  />
                ) : null}
              </div>
            );
          }),
        )}
      </div>

      {showPlayers && <footer
        className="connect-four-players"
        style={{
          fontSize: `clamp(${12 * fontScale}px, ${2.7 * fontScale}cqh, ${22 * fontScale}px)`,
        }}
      >
        <span className={displayedState.current_player === 1 ? "is-current" : ""}>
          <i
            className="connect-four-dot connect-four-dot--p1"
            style={{ backgroundColor: playerOneColor }}
          />
          {playerOne}
        </span>
        <span className={displayedState.current_player === 2 ? "is-current" : ""}>
          <i
            className="connect-four-dot connect-four-dot--p2"
            style={{ backgroundColor: playerTwoColor }}
          />
          {playerTwo}
        </span>
      </footer>}
    </section>
  );
}
