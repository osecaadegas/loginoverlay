import assert from "node:assert/strict";
import { getProMatchQueue } from "../src/components/OverlayCenter/widgets/tournament/proMatchQueue.js";

const matches = [
  { id: "one", player1: "Alpha", player2: "Beta", status: "completed", winner: "player1" },
  { id: "two", player1: "Gamma", player2: "Delta", status: "pending" },
  { id: "three", player1: "TBD", player2: "Echo", status: "pending" },
  { id: "four", player1: "Foxtrot", player2: "Hotel", status: "pending" },
];
assert.deepEqual(getProMatchQueue(matches, "one"), { next: matches[1], remaining: 2 });
assert.deepEqual(getProMatchQueue(matches, "two"), { next: matches[3], remaining: 1 });
assert.deepEqual(getProMatchQueue(matches, "four"), { next: null, remaining: 0 });
assert.deepEqual(getProMatchQueue(matches, "missing"), { next: null, remaining: 0 });
assert.deepEqual(getProMatchQueue([matches[0]], "one"), { next: null, remaining: 0 });
assert.equal(matches[1].status, "pending", "Queue lookup cannot activate a match");
console.log("PRO match queue ordering and unresolved-participant tests passed");
