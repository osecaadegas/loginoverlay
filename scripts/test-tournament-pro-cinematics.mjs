import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({ logLevel: "silent", server: { middlewareMode: true, hmr: false } });
try {
  const { snapshotProMatches, diffProVisualEvents, createProProcessedRegistry } =
    await server.ssrLoadModule("/src/components/OverlayCenter/widgets/tournament/proVisualEvents.js");
  const { updateRoundData, setManualWinner } = await server.ssrLoadModule("/src/components/OverlayCenter/widgets/tournament/tournamentEngine.js");
  const match = {
    id: "cinematic-test", type: "bonus_bo3", status: "pending", winner: null,
    player1: "One", player2: "Two",
    rounds: Array.from({ length: 3 }, (_, index) => ({ roundNum: index + 1,
      player1: { bonusCost: 10, bonusPayout: null }, player2: { bonusCost: 10, bonusPayout: null } })),
  };
  const snapshot = (value) => snapshotProMatches([value]);
  assert.notEqual(snapshotProMatches([match], "tournament-one")[0].tournamentId,
    snapshotProMatches([match], "tournament-two")[0].tournamentId);
  const revised = updateRoundData(match, 0, "player1", { bonusPayout: 25 });
  assert.equal(revised.rounds[0].revision, 1, "A real round edit creates a saved visual revision");
  assert.equal(updateRoundData(revised, 0, "player1", { bonusPayout: 25 }).rounds[0].revision, 1,
    "Duplicate updates do not create a new revision");
  assert.equal(setManualWinner(match, "player1").revision, 1, "Manual match results gain a saved revision");
  assert.equal(setManualWinner(setManualWinner(match, "player1"), "player1").revision, 1,
    "Repeated manual result delivery keeps its revision");
  let before = snapshot(match);
  let after = snapshot({ ...match, status: "in_progress" });
  assert.deepEqual(diffProVisualEvents(before, after).events.map((event) => event.type), ["intro"]);

  before = after;
  const firstPayout = { ...match, status: "in_progress", rounds: match.rounds.map((round, index) =>
    index === 0 ? { ...round, player1: { ...round.player1, bonusPayout: 25 } } : round) };
  after = snapshot(firstPayout);
  assert.deepEqual(diffProVisualEvents(before, after).events.map((event) => event.type), ["payout"]);
  assert.deepEqual(diffProVisualEvents(after, after).events, [], "Duplicate realtime results do not replay");

  before = after;
  const completeRound = { ...firstPayout, rounds: firstPayout.rounds.map((round, index) =>
    index === 0 ? { ...round, player2: { ...round.player2, bonusPayout: 5 } } : round) };
  after = snapshot(completeRound);
  const result = diffProVisualEvents(before, after).events;
  const otherTournament = diffProVisualEvents(snapshotProMatches([firstPayout], "tournament-two"),
    snapshotProMatches([completeRound], "tournament-two")).events;
  assert.notEqual(result[0].key, otherTournament[0].key, "Identical match revisions in different tournaments have distinct event identities");
  assert.equal(result.length, 1);
  assert.equal(result[0].type, "result");
  assert.equal(result[0].winner, "player1");
  assert.deepEqual(result[0].fromScore, { player1: 0, player2: 0 });
  assert.deepEqual(result[0].toScore, { player1: 1, player2: 0 });
  assert.equal(result[0].payouts.length, 1, "Only newly confirmed payout counts");

  const corrected = { ...completeRound, rounds: completeRound.rounds.map((round, index) =>
    index === 0 ? { ...round, player2: { ...round.player2, bonusPayout: 35 } } : round) };
  const correction = diffProVisualEvents(after, snapshot(corrected)).events[0];
  assert.equal(correction.winner, "player2");
  assert.notEqual(correction.key, result[0].key, "Corrected result has a new stable revision key");

  const tied = { ...firstPayout, rounds: firstPayout.rounds.map((round, index) =>
    index === 0 ? { ...round, player2: { ...round.player2, bonusPayout: 25 } } : round) };
  assert.equal(diffProVisualEvents(before, snapshot(tied)).events[0].winner, "draw");
  assert.equal(diffProVisualEvents(after, snapshot(match)).reset, true, "Reset cancels old visuals");

  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const registry = createProProcessedRegistry(storage, "test", 2);
  registry.add("a"); registry.add("a"); registry.add("b");
  assert.equal(createProProcessedRegistry(storage, "test").has("a"), true, "Browser-source reload shares processed identities");
  registry.add("c");
  assert.equal(registry.has("a"), false, "Processed identities stay bounded");
  registry.clear();
  assert.equal(registry.has("c"), false);
  console.log("PRO cinematic event, correction, reset and dedup tests passed");
} finally {
  await server.close();
}
