import { useEffect, useState } from "react";
import { supabase } from "../../../../config/supabaseClient";
import {
  createConnectFourBoard,
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
}

interface ConnectFourWidgetProps {
  userId?: string;
}

function normalizeState(value: Record<string, unknown>): ConnectFourState {
  return {
    match_id: String(value.match_id || ""),
    status: String(value.status || "waiting"),
    wager: Number(value.wager) || 0,
    board: normalizeConnectFourBoard(value.board),
    player_one_display_name: String(value.player_one_display_name || "Player 1"),
    player_two_display_name: value.player_two_display_name
      ? String(value.player_two_display_name)
      : null,
    current_player: value.current_player === 1 || value.current_player === 2
      ? value.current_player
      : null,
    winner: value.winner === 1 || value.winner === 2 ? value.winner : null,
    move_count: Number(value.move_count) || 0,
    last_move: value.last_move && typeof value.last_move === "object"
      ? value.last_move as ConnectFourState["last_move"]
      : null,
    completion_reason: value.completion_reason ? String(value.completion_reason) : null,
  };
}

function getStatus(state: ConnectFourState | null): string {
  if (!state) return "!connect4 start <points>";
  if (state.status === "funding_start" || state.status === "funding_join") return "Confirming points";
  if (state.status === "waiting") return `Join for ${state.wager.toLocaleString()} points`;
  if (state.status === "active" && state.current_player) {
    return `${state.current_player === 1 ? state.player_one_display_name : state.player_two_display_name}'s turn`;
  }
  if (state.completion_reason === "draw") return "Draw - points refunded";
  if (state.completion_reason === "reset") return "Game cancelled";
  if (state.winner) {
    return `${state.winner === 1 ? state.player_one_display_name : state.player_two_display_name} wins`;
  }
  if (state.status === "error") return "Point settlement needs attention";
  return "Game complete";
}

export default function ConnectFourWidget({ userId }: ConnectFourWidgetProps) {
  const [state, setState] = useState<ConnectFourState | null>(null);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;

    supabase
      .from("connect_four_public_state")
      .select("match_id,status,wager,board,player_one_display_name,player_two_display_name,current_player,winner,move_count,last_move,completion_reason")
      .eq("streamer_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.warn("[ConnectFour] State load failed", error.message);
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
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const board = state?.board || createConnectFourBoard();
  const playerOne = state?.player_one_display_name || "Player 1";
  const playerTwo = state?.player_two_display_name || "Player 2";

  return (
    <section className="connect-four-widget" aria-label="Chat Connect 4">
      <header className="connect-four-head">
        <div>
          <span className="connect-four-kicker">CHAT CONNECT 4</span>
          <strong>{getStatus(state)}</strong>
        </div>
        {state?.wager ? <b>{state.wager.toLocaleString()} PTS</b> : null}
      </header>

      <div className="connect-four-board" role="grid" aria-label="Connect 4 board">
        {board.flatMap((row, rowIndex) =>
          row.map((cell, columnIndex) => {
            const isLastMove = state?.last_move?.row === rowIndex
              && state.last_move.column === columnIndex;
            return (
              <div className="connect-four-cell" role="gridcell" key={`${rowIndex}-${columnIndex}`}>
                {cell !== 0 ? (
                  <span
                    key={`${state?.match_id}-${state?.move_count}-${rowIndex}-${columnIndex}`}
                    className={`connect-four-coin connect-four-coin--p${cell}${isLastMove ? " is-latest" : ""}`}
                  />
                ) : null}
              </div>
            );
          }),
        )}
      </div>

      <footer className="connect-four-players">
        <span className={state?.current_player === 1 ? "is-current" : ""}>
          <i className="connect-four-dot connect-four-dot--p1" />{playerOne}
        </span>
        <span className={state?.current_player === 2 ? "is-current" : ""}>
          <i className="connect-four-dot connect-four-dot--p2" />{playerTwo}
        </span>
      </footer>
    </section>
  );
}