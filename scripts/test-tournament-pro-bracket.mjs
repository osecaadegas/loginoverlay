import assert from "node:assert/strict";
import { generateBracket, propagateWinner } from "../src/components/TournamentsPage/bracketUtils.js";
import { setManualWinner } from "../src/components/OverlayCenter/widgets/tournament/tournamentEngine.js";
import { getProBracketComparison, getProBracketStage } from "../src/components/OverlayCenter/widgets/tournament/proBracketStage.js";

const players = Array.from({ length: 8 }, (_, index) => ({ id: `p${index + 1}`, name: `Player ${index + 1}`, avatarUrl: `/avatar-${index + 1}.png`, slot: { name: `Slot ${index + 1}`, image: `/slot-${index + 1}.png`, provider: `Provider ${index + 1}` } }));
let bracket = generateBracket(players, "bonus_bo3");
assert.deepEqual(bracket.map((stage) => stage.matches.length), [4, 2, 1]);
assert.equal(getProBracketStage(bracket).stage.matches.length, 4);
assert.equal(getProBracketComparison(bracket[0].matches[0]).index, 0);

function win(stage, index, winner = "player1") {
  bracket = bracket.map((round, roundIndex) => roundIndex === stage
    ? { ...round, matches: round.matches.map((match, matchIndex) => matchIndex === index ? setManualWinner(match, winner) : match) }
    : round);
  bracket = propagateWinner(bracket, stage, index);
}

for (let index = 0; index < 3; index += 1) win(0, index);
assert.equal(getProBracketStage(bracket).stage.matches.length, 4, "one unresolved quarter-final holds the stage");
win(0, 3);
assert.equal(getProBracketStage(bracket).stage.matches.length, 2);
assert.deepEqual(bracket[1].matches.map((match) => [match.player1, match.player2]), [["Player 1", "Player 3"], ["Player 5", "Player 7"]]);
win(1, 0);
assert.equal(getProBracketStage(bracket).stage.matches.length, 2, "one unresolved semi-final holds the stage");
win(1, 1);
assert.equal(getProBracketStage(bracket).stage.matches.length, 1);
assert.deepEqual([bracket[2].matches[0].player1, bracket[2].matches[0].player2], ["Player 1", "Player 5"]);
win(2, 0);
assert.equal(getProBracketStage(bracket).champion.name, "Player 1");
assert.equal(getProBracketStage(bracket).champion.avatar, "/avatar-1.png");

const corrected = bracket.map((stage, index) => index === 2 ? { ...stage, matches: [{ ...stage.matches[0], winner: null, status: "in_progress" }] } : stage);
assert.equal(getProBracketStage(corrected).champion, null, "a corrected final returns to the live final stage");
assert.equal(getProBracketStage(corrected).stage.matches.length, 1);
console.log("PRO BRACKET stage progression, saved winners, avatars and correction checks passed.");
