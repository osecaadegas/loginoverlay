import { calcMatchWinner, calcRoundWinner, getBoScoreboard } from "./tournamentEngine.js";

const resolved = (match) => {
  const winner = match?.winner || calcMatchWinner(match);
  return match?.status === "completed" && (winner === "player1" || winner === "player2")
    && match?.[winner] && match[winner] !== "TBD";
};

// Bracket data is authoritative. A stage stays on screen until all of its
// matches have confirmed winners and the next stage has assigned participants.
export function getProBracketStage(bracketData = []) {
  if (!Array.isArray(bracketData) || !bracketData.length) return null;
  for (let index = 0; index < bracketData.length; index += 1) {
    const stage = bracketData[index];
    const matches = stage?.matches || [];
    if (!matches.length || !matches.every(resolved)) return { index, stage, champion: null };
    const next = bracketData[index + 1];
    if (next && (!(next.matches || []).length || !(next.matches || []).every((match) => match.player1 && match.player1 !== "TBD" && match.player2 && match.player2 !== "TBD"))) {
      return { index, stage, champion: null };
    }
  }
  const stage = bracketData[bracketData.length - 1];
  const final = stage.matches[0];
  const finalWinner = final.winner || calcMatchWinner(final);
  const champion = finalWinner === "player1" ? { name: final.player1, avatar: final.player1Avatar, score: getBoScoreboard(final) }
    : { name: final.player2, avatar: final.player2Avatar, score: getBoScoreboard(final) };
  return { index: bracketData.length - 1, stage, champion };
}

export function getProBracketComparison(match) {
  const rounds = match?.rounds || [];
  const firstPending = rounds.findIndex((round) => calcRoundWinner(round, match.type) === null);
  const index = firstPending >= 0 && !match?.winner ? firstPending : Math.max(0, rounds.findLastIndex((round) => calcRoundWinner(round, match?.type) !== null));
  return { index, round: rounds[index] || null, result: rounds[index] ? calcRoundWinner(rounds[index], match?.type) : null };
}
