import { useEffect, useState, type CSSProperties } from "react";
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

function getWaitingMessage(state: ConnectFourState): string {
  if (state.status === "funding_start") return "Confirming Player 1 wager";
  if (state.status === "funding_join") return "Confirming Player 2 wager";
  if (state.completion_reason === "funding_failed") {
    return "Reconnect StreamElements and start again";
  }
  return "Waiting for Player 2";
}

function getPlayerRailLengthClass(name: string): string {
  if (name.length > 16) return " is-extra-long";
  if (name.length > 12) return " is-long";
  return "";
}

export default function ConnectFourWidget({
  userId,
  config = {},
  runtime = "editor",
}: Readonly<ConnectFourWidgetProps>) {
  const [state, setState] = useState<ConnectFourState | null>(null);

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

  const displayedState =
    state || (runtime === "editor" ? CONNECT_FOUR_PREVIEW_STATE : null);
  if (!displayedState) return null;

  const board = displayedState.board;
  const playerOne = displayedState.player_one_display_name;
  const playerTwo =
    displayedState.player_two_display_name || "Waiting for player";
  const playerTwoRailName =
    displayedState.player_two_display_name || "Player 2";
  const playerOneRailLengthClass = getPlayerRailLengthClass(playerOne);
  const playerTwoRailLengthClass = getPlayerRailLengthClass(playerTwoRailName);
  const title = stringValue(config.title, "CHAT CONNECT 4");
  const playerOneColor = stringValue(config.playerOneColor, "#ef4444");
  const playerTwoColor = stringValue(config.playerTwoColor, "#facc15");
  const boardColor = stringValue(config.boardColor, "#1e3a8a");
  const boardBorderColor = stringValue(config.boardBorderColor, "#1e3a8a");
  const titleColor = stringValue(config.titleColor, "#fbbf24");
  const textColor = stringValue(config.textColor, "#f7fbff");
  const mutedColor = stringValue(config.mutedColor, "#fff2b8");
  const fontFamily = stringValue(config.fontFamily, "'Rajdhani', sans-serif");
  const boardScale = Math.min(
    100,
    Math.max(40, Number(config.boardScale) || 84),
  );
  const showWager = config.showWager !== false;
  const showPlayers = config.showPlayers !== false;
  const animateDrops = config.animateDrops !== false;
  const pot = displayedState.wager * 2;
  const hasTwoPlayers = Boolean(displayedState.player_two_display_name);
  const widgetStyle = {
    color: textColor,
    fontFamily,
    "--connect-four-p1": playerOneColor,
    "--connect-four-p2": playerTwoColor,
    "--connect-four-board": boardColor,
    "--connect-four-board-border": boardBorderColor,
    "--connect-four-board-scale": `${boardScale}%`,
  } as CSSProperties;

  return (
    <section
      className="connect-four-widget"
      aria-label="Chat Connect 4"
      style={widgetStyle}
    >
      <div
        className={`connect-four-game${hasTwoPlayers ? " is-playing" : " is-waiting"}`}
      >
        <div className="connect-four-play-area">
          {showPlayers && (
            <div
              className={`connect-four-player-rail connect-four-player-rail--p1${playerOneRailLengthClass}${displayedState.current_player === 1 ? " is-current" : ""}`}
              aria-label={`Player 1: ${playerOne}`}
            >
              <i className="connect-four-player-coin connect-four-player-coin--p1" />
              <strong>
                {Array.from(playerOne).map((character, index) => (
                  <span key={`${character}-${index}`}>{character}</span>
                ))}
              </strong>
            </div>
          )}

          <div className="connect-four-board-stack">
            <div
              className="connect-four-board"
              role="grid"
              aria-label="Connect 4 board"
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
                      {rowIndex === 0 && (
                        <span
                          className="connect-four-hole-number"
                          aria-hidden="true"
                        >
                          {columnIndex + 1}
                        </span>
                      )}
                      {cell !== 0 ? (
                        <span
                          key={`${displayedState.match_id}-${displayedState.move_count}-${rowIndex}-${columnIndex}`}
                          className={`connect-four-coin connect-four-coin--p${cell}${isLastMove && animateDrops ? " is-latest" : ""}`}
                        />
                      ) : null}
                    </div>
                  );
                }),
              )}
              {displayedState.winner && (
                <div className="connect-four-win-overlay">
                  <strong>
                    {displayedState.winner === 1 ? playerOne : playerTwo} WINS!
                  </strong>
                  {pot > 0 && <span>+{pot.toLocaleString()} PTS</span>}
                </div>
              )}
            </div>
          </div>

          {showPlayers && (
            <div
              className={`connect-four-player-rail connect-four-player-rail--p2${playerTwoRailLengthClass}${displayedState.current_player === 2 ? " is-current" : ""}`}
              aria-label={`Player 2: ${playerTwoRailName}`}
            >
              <i className="connect-four-player-coin connect-four-player-coin--p2" />
              <strong>
                {Array.from(playerTwoRailName).map((character, index) => (
                  <span key={`${character}-${index}`}>{character}</span>
                ))}
              </strong>
            </div>
          )}

          {!hasTwoPlayers && (
            <aside className="connect-four-info">
              <div className="connect-four-title" style={{ color: titleColor }}>
                {title}
              </div>
              <strong>{getWaitingMessage(displayedState)}</strong>
              {showWager && displayedState.wager > 0 && (
                <span style={{ color: mutedColor }}>
                  {displayedState.wager.toLocaleString()} PTS each ·{" "}
                  {pot.toLocaleString()} PTS pot
                </span>
              )}
              <span>Join with !c4 join</span>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
