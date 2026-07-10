import assert from 'node:assert/strict';
import {
  calculateBonusMultiplier,
  calculateHuntStatistics,
  calculateLibraryStatistics,
  calculateNetDeposited,
  calculateProfitLoss,
  calculateRequiredAverageMultiplier,
  calculateRequiredAveragePayout,
  getPeriodRange,
  normalizeBonusPayload,
  normalizeHuntPayload,
} from '../src/features/playerBonusHunt/domain.js';
import { isSubscriptionEntitled } from '../api/_lib/player-access.js';

const hunt = {
  id: 'hunt-1',
  currency: 'EUR',
  starting_deposit: 500,
  additional_deposits: 100,
  initial_withdrawal: 50,
  total_withdrawals: 25,
  current_balance: 300,
  hunt_date: '2026-07-10',
};

assert.equal(calculateNetDeposited(hunt), 525);
assert.equal(calculateProfitLoss(hunt), -225);

const bonuses = [
  { id: 'b1', hunt_id: 'hunt-1', slot_name: 'Alpha', provider_name: 'A', bonus_cost: 50, bet_size: 1, payout: 200, status: 'opened' },
  { id: 'b2', hunt_id: 'hunt-1', slot_name: 'Beta', provider_name: 'B', bonus_cost: 80, bet_size: 2, payout: 0, status: 'opened' },
  { id: 'b3', hunt_id: 'hunt-1', slot_name: 'Gamma', provider_name: 'A', bonus_cost: 40, bet_size: 1, payout: 0, status: 'unopened' },
  { id: 'b4', hunt_id: 'hunt-1', slot_name: 'Delta', provider_name: 'A', bonus_cost: 40, bet_size: 2, payout: 0, status: 'unopened' },
];

assert.equal(calculateBonusMultiplier(bonuses[0]), 200);
assert.equal(calculateRequiredAveragePayout(hunt, bonuses), 112.5);
assert.equal(calculateRequiredAverageMultiplier(hunt, bonuses), 75);

const stats = calculateHuntStatistics(hunt, bonuses);
assert.equal(stats.breakEven, 525);
assert.equal(stats.remainingBreakEven, 225);
assert.equal(stats.totalPayout, 200);
assert.equal(stats.totalSpent, 210);
assert.equal(stats.openedBonuses, 2);
assert.equal(stats.remainingBonuses, 2);
assert.equal(stats.bestWin.slot_name, 'Alpha');
assert.equal(stats.worstWin.slot_name, 'Beta');
assert.equal(stats.bestMultiplier, 200);
assert.equal(stats.averagePayout, 100);

const library = calculateLibraryStatistics([{ ...hunt, name: 'Main' }], bonuses);
assert.equal(library.totalsByCurrency.EUR.totalDeposited, 600);
assert.equal(library.totalsByCurrency.EUR.totalWithdrawn, 75);
assert.equal(library.mostPlayedSlots[0].plays, 1);
assert.equal(library.bestWinsByPayout[0].slot_name, 'Alpha');

assert.equal(isSubscriptionEntitled({ status: 'trialing', trial_ends_at: '2099-01-01T00:00:00Z' }), true);
assert.equal(isSubscriptionEntitled({ status: 'trialing', trial_ends_at: '2000-01-01T00:00:00Z' }), false);
assert.equal(isSubscriptionEntitled({ status: 'active', current_period_end: '2099-01-01T00:00:00Z' }), true);
assert.equal(isSubscriptionEntitled({ status: 'canceled', current_period_end: '2099-01-01T00:00:00Z' }), false);

assert.equal(normalizeHuntPayload({ name: 'H', currency: 'EUR', starting_deposit: 1 }).currency, 'EUR');
assert.equal(normalizeBonusPayload({ slot_name: 'S', bet_size: 2, payout: 10 }).multiplier, 5);

const month = getPeriodRange('monthly', '2026-07-10T12:00:00Z');
assert.equal(month.start.slice(0, 10), '2026-07-01');
assert.equal(month.end.slice(0, 10), '2026-07-31');

console.log('player bonus hunt tests passed');
