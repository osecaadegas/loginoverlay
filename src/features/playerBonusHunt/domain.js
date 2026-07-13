export const PLAYER_PRODUCT_CODE = 'player_bonus_hunt';
export const PLAYER_PLAN_CODE = 'player_monthly';

export const HUNT_STATUSES = ['active', 'completed', 'archived'];
export const BONUS_STATUSES = ['unopened', 'opened'];
export const BONUS_TYPES = ['normal', 'super', 'supreme'];

export const SUPPORTED_CURRENCIES = [
  'EUR', 'USD', 'GBP', 'CAD', 'AUD', 'BRL', 'NOK', 'SEK', 'DKK', 'PLN',
];

export class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function roundMoney(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

export function roundRatio(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

export function clampNonNegative(value) {
  return Math.max(0, roundMoney(value));
}

export function normalizeCurrency(currency = 'EUR') {
  const normalized = String(currency || 'EUR').trim().toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(normalized)) {
    throw new ValidationError('Unsupported currency', { currency });
  }
  return normalized;
}

export function calculateTotalDeposits(hunt = {}) {
  return roundMoney(toNumber(hunt.starting_deposit) + toNumber(hunt.additional_deposits));
}

export function calculateTotalWithdrawals(hunt = {}) {
  return roundMoney(toNumber(hunt.initial_withdrawal) + toNumber(hunt.total_withdrawals));
}

export function calculateNetDeposited(hunt = {}) {
  return roundMoney(calculateTotalDeposits(hunt) - calculateTotalWithdrawals(hunt));
}

export function calculateBonusHuntTarget(hunt = {}) {
  return clampNonNegative(calculateNetDeposited(hunt));
}

export function calculateBreakEven(hunt = {}) {
  return calculateBonusHuntTarget(hunt);
}

function openedBonuses(bonuses = []) {
  return (bonuses || []).filter((bonus) => (bonus.status || 'unopened') === 'opened');
}

export function calculateTotalPayout(bonuses = []) {
  return roundMoney(openedBonuses(bonuses).reduce((sum, bonus) => sum + toNumber(bonus.payout), 0));
}

export function calculateProfitLoss(hunt = {}, bonuses = []) {
  return roundMoney(calculateTotalPayout(bonuses) - calculateBreakEven(hunt));
}

export function calculateBonusMultiplier(bonus = {}) {
  const bet = toNumber(bonus.bet_size);
  if (bet <= 0) return null;
  const payout = toNumber(bonus.payout);
  return roundRatio(payout / bet);
}

export function calculateBonusProfitLoss(bonus = {}) {
  return roundMoney(toNumber(bonus.payout) - toNumber(bonus.bonus_cost));
}

export function calculateRemainingBreakEven(hunt = {}, bonuses = []) {
  return clampNonNegative(calculateBreakEven(hunt) - calculateTotalPayout(bonuses));
}

export function calculateRemainingBet(bonuses = []) {
  return roundMoney((bonuses || [])
    .filter((bonus) => (bonus.status || 'unopened') !== 'opened')
    .reduce((sum, bonus) => sum + toNumber(bonus.bet_size), 0));
}

export function calculateRequiredAveragePayout(hunt = {}, bonuses = []) {
  const remaining = calculateRemainingBreakEven(hunt, bonuses);
  const unopened = bonuses.filter((bonus) => (bonus.status || 'unopened') !== 'opened').length;
  if (remaining <= 0 || unopened <= 0) return 0;
  return roundMoney(remaining / unopened);
}

export function calculateRequiredAverageMultiplier(hunt = {}, bonuses = []) {
  const remaining = calculateRemainingBreakEven(hunt, bonuses);
  const remainingBet = calculateRemainingBet(bonuses);
  if (remaining <= 0 || remainingBet <= 0) return null;
  return roundRatio(remaining / remainingBet);
}

export function calculateHuntStatistics(hunt = {}, bonusesInput = []) {
  const bonuses = (bonusesInput || []).filter((bonus) => !bonus.deleted_at);
  const opened = openedBonuses(bonuses);
  const unopened = bonuses.filter((bonus) => (bonus.status || 'unopened') !== 'opened');
  const payouts = opened.map((bonus) => toNumber(bonus.payout));
  const multipliers = opened
    .map((bonus) => bonus.multiplier ?? calculateBonusMultiplier(bonus))
    .map((value) => toNumber(value, null))
    .filter((value) => value !== null && Number.isFinite(value));
  const totalPayout = calculateTotalPayout(bonuses);
  const totalSpent = roundMoney(bonuses.reduce((sum, bonus) => sum + toNumber(bonus.bonus_cost), 0));
  const totalBet = roundMoney(bonuses.reduce((sum, bonus) => sum + toNumber(bonus.bet_size), 0));
  const remainingBet = calculateRemainingBet(bonuses);
  const bestWin = opened.reduce((best, bonus) => toNumber(bonus.payout) > toNumber(best?.payout, -Infinity) ? bonus : best, null);
  const worstWin = opened.reduce((worst, bonus) => toNumber(bonus.payout) < toNumber(worst?.payout, Infinity) ? bonus : worst, null);
  const bestMultiplierBonus = opened.reduce((best, bonus) => {
    const value = toNumber(bonus.multiplier ?? calculateBonusMultiplier(bonus), -Infinity);
    return value > toNumber(best?.multiplier ?? (best ? calculateBonusMultiplier(best) : null), -Infinity) ? bonus : best;
  }, null);
  const worstMultiplierBonus = opened.reduce((worst, bonus) => {
    const value = toNumber(bonus.multiplier ?? calculateBonusMultiplier(bonus), Infinity);
    return value < toNumber(worst?.multiplier ?? (worst ? calculateBonusMultiplier(worst) : null), Infinity) ? bonus : worst;
  }, null);
  const profitLoss = calculateProfitLoss(hunt, bonuses);
  const breakEven = calculateBreakEven(hunt);
  const remainingBreakEven = calculateRemainingBreakEven(hunt, bonuses);
  const completion = bonuses.length > 0 ? Math.round((opened.length / bonuses.length) * 100) : 0;

  return {
    currency: normalizeCurrency(hunt.currency || 'EUR'),
    startingDeposit: roundMoney(hunt.starting_deposit),
    additionalDeposits: roundMoney(hunt.additional_deposits),
    totalDeposits: calculateTotalDeposits(hunt),
    totalWithdrawals: calculateTotalWithdrawals(hunt),
    netDeposited: calculateNetDeposited(hunt),
    target: breakEven,
    stopLoss: calculateTotalWithdrawals(hunt),
    currentBalance: roundMoney(hunt.current_balance),
    breakEven,
    remainingBreakEven,
    profitLoss,
    totalPayout,
    totalSpent,
    totalBet,
    remainingBet,
    totalBonuses: bonuses.length,
    openedBonuses: opened.length,
    remainingBonuses: unopened.length,
    completion,
    bestWin,
    worstWin,
    bestMultiplier: bestMultiplierBonus ? roundRatio(bestMultiplierBonus.multiplier ?? calculateBonusMultiplier(bestMultiplierBonus)) : null,
    worstMultiplier: worstMultiplierBonus ? roundRatio(worstMultiplierBonus.multiplier ?? calculateBonusMultiplier(worstMultiplierBonus)) : null,
    bestMultiplierBonus,
    worstMultiplierBonus,
    averagePayout: opened.length ? roundMoney(totalPayout / opened.length) : 0,
    averageMultiplier: multipliers.length ? roundRatio(multipliers.reduce((sum, value) => sum + value, 0) / multipliers.length) : null,
    requiredAveragePayout: calculateRequiredAveragePayout(hunt, bonuses),
    requiredAverageMultiplier: calculateRequiredAverageMultiplier(hunt, bonuses),
    liveBreakEvenMultiplier: calculateRequiredAverageMultiplier(hunt, bonuses),
  };
}

export function groupByCurrency(items, getCurrency = (item) => item.currency || 'EUR') {
  return items.reduce((groups, item) => {
    const currency = normalizeCurrency(getCurrency(item));
    groups[currency] = groups[currency] || [];
    groups[currency].push(item);
    return groups;
  }, {});
}

export function calculateLibraryStatistics(hunts = [], bonuses = []) {
  const huntsById = new Map((hunts || []).map((hunt) => [hunt.id, hunt]));
  const activeBonuses = (bonuses || []).filter((bonus) => !bonus.deleted_at);
  const bonusWithCurrency = activeBonuses.map((bonus) => ({
    ...bonus,
    currency: huntsById.get(bonus.hunt_id)?.currency || bonus.currency || 'EUR',
  }));
  const openedWithCurrency = bonusWithCurrency.filter((bonus) => (bonus.status || 'unopened') === 'opened');
  const huntStats = (hunts || []).map((hunt) => ({
    hunt,
    stats: calculateHuntStatistics(hunt, activeBonuses.filter((bonus) => bonus.hunt_id === hunt.id)),
  }));
  const totalsByCurrency = {};

  for (const { hunt, stats } of huntStats) {
    const currency = normalizeCurrency(hunt.currency || 'EUR');
    totalsByCurrency[currency] = totalsByCurrency[currency] || {
      currency,
      totalDeposited: 0,
      totalWithdrawn: 0,
      currentBalance: 0,
      totalSpent: 0,
      totalBet: 0,
      totalPayout: 0,
      breakEven: 0,
      breakEvenMultiplier: null,
      remainingBreakEven: 0,
      profitLoss: 0,
      huntCount: 0,
    };
    totalsByCurrency[currency].totalDeposited = roundMoney(totalsByCurrency[currency].totalDeposited + stats.totalDeposits);
    totalsByCurrency[currency].totalWithdrawn = roundMoney(totalsByCurrency[currency].totalWithdrawn + stats.totalWithdrawals);
    totalsByCurrency[currency].currentBalance = roundMoney(totalsByCurrency[currency].currentBalance + stats.currentBalance);
    totalsByCurrency[currency].totalSpent = roundMoney(totalsByCurrency[currency].totalSpent + stats.totalSpent);
    totalsByCurrency[currency].totalBet = roundMoney(totalsByCurrency[currency].totalBet + stats.totalBet);
    totalsByCurrency[currency].totalPayout = roundMoney(totalsByCurrency[currency].totalPayout + stats.totalPayout);
    totalsByCurrency[currency].breakEven = roundMoney(totalsByCurrency[currency].breakEven + stats.breakEven);
    totalsByCurrency[currency].remainingBreakEven = roundMoney(totalsByCurrency[currency].remainingBreakEven + stats.remainingBreakEven);
    totalsByCurrency[currency].profitLoss = roundMoney(totalsByCurrency[currency].profitLoss + stats.profitLoss);
    totalsByCurrency[currency].huntCount += 1;
  }

  for (const row of Object.values(totalsByCurrency)) {
    row.breakEvenMultiplier = row.totalBet > 0 ? roundRatio(row.breakEven / row.totalBet) : null;
  }

  const bestWinsByPayout = [...openedWithCurrency].sort((a, b) => toNumber(b.payout) - toNumber(a.payout));
  const worstWinsByPayout = [...openedWithCurrency].sort((a, b) => toNumber(a.payout) - toNumber(b.payout));
  const bestWinsByMultiplier = [...openedWithCurrency].sort((a, b) => toNumber(b.multiplier ?? calculateBonusMultiplier(b)) - toNumber(a.multiplier ?? calculateBonusMultiplier(a)));
  const worstWinsByMultiplier = [...openedWithCurrency].sort((a, b) => toNumber(a.multiplier ?? calculateBonusMultiplier(a)) - toNumber(b.multiplier ?? calculateBonusMultiplier(b)));

  const slotMap = new Map();
  for (const bonus of bonusWithCurrency) {
    const key = `${(bonus.slot_name || 'Unknown').toLowerCase()}|${(bonus.provider_name || '').toLowerCase()}|${bonus.currency}`;
    const existing = slotMap.get(key) || {
      slotName: bonus.slot_name || 'Unknown slot',
      providerName: bonus.provider_name || '',
      slotImageUrl: bonus.slot_image_url || '',
      currency: bonus.currency,
      plays: 0,
      totalPayout: 0,
      totalCost: 0,
      profitLoss: 0,
      multipliers: [],
    };
    existing.plays += 1;
    existing.totalPayout = roundMoney(existing.totalPayout + toNumber(bonus.payout));
    existing.totalCost = roundMoney(existing.totalCost + toNumber(bonus.bonus_cost));
    existing.profitLoss = roundMoney(existing.profitLoss + calculateBonusProfitLoss(bonus));
    const multiplier = bonus.multiplier ?? calculateBonusMultiplier(bonus);
    if (multiplier !== null) existing.multipliers.push(toNumber(multiplier));
    slotMap.set(key, existing);
  }

  const slots = [...slotMap.values()].map((slot) => ({
    ...slot,
    averageMultiplier: slot.multipliers.length
      ? roundRatio(slot.multipliers.reduce((sum, value) => sum + value, 0) / slot.multipliers.length)
      : null,
    averagePayout: slot.plays ? roundMoney(slot.totalPayout / slot.plays) : 0,
  }));

  return {
    totalsByCurrency,
    bestWinsByPayout,
    worstWinsByPayout,
    bestWinsByMultiplier,
    worstWinsByMultiplier,
    mostProfitableSlots: [...slots].sort((a, b) => b.profitLoss - a.profitLoss),
    leastProfitableSlots: [...slots].sort((a, b) => a.profitLoss - b.profitLoss),
    mostPlayedSlots: [...slots].sort((a, b) => b.plays - a.plays),
    highestTotalPayout: [...slots].sort((a, b) => b.totalPayout - a.totalPayout),
    highestTotalLoss: [...slots].sort((a, b) => a.profitLoss - b.profitLoss),
    averageMultiplier: openedWithCurrency.length
      ? roundRatio(openedWithCurrency.reduce((sum, bonus) => sum + toNumber(bonus.multiplier ?? calculateBonusMultiplier(bonus)), 0) / openedWithCurrency.length)
      : null,
    averagePayout: openedWithCurrency.length
      ? roundMoney(openedWithCurrency.reduce((sum, bonus) => sum + toNumber(bonus.payout), 0) / openedWithCurrency.length)
      : 0,
    huntCount: hunts.length,
    bonusCount: activeBonuses.length,
    openedCount: openedWithCurrency.length,
    slots,
    hunts: huntStats,
  };
}

function assertText(value, label, { required = false, max = 160 } = {}) {
  const text = String(value || '').trim();
  if (required && !text) throw new ValidationError(`${label} is required`);
  if (text.length > max) throw new ValidationError(`${label} is too long`, { max });
  return text;
}

function assertMoney(value, label, { required = false } = {}) {
  if ((value === null || value === undefined || value === '') && !required) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new ValidationError(`${label} must be zero or greater`);
  if (Math.round(n * 100) !== n * 100) throw new ValidationError(`${label} must use at most 2 decimal places`);
  return roundMoney(n);
}

function assertOptionalNumber(value, label, { min = 0, max = Infinity } = {}) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new ValidationError(`${label} is invalid`);
  return roundRatio(n);
}

function normalizeSlotVolatility(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).trim().toLowerCase();
  if (!['low', 'medium', 'high', 'very_high'].includes(normalized)) {
    throw new ValidationError('Slot volatility is invalid');
  }
  return normalized;
}

function normalizeSlotFeatures(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 12);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 12);
  return [];
}

function normalizeBonusType(value) {
  const normalized = String(value || 'normal').trim().toLowerCase();
  if (!BONUS_TYPES.includes(normalized)) {
    throw new ValidationError('Bonus type is invalid');
  }
  return normalized;
}

export function normalizeHuntPayload(input = {}, { partial = false } = {}) {
  const payload = {};
  const maybe = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (!partial || maybe('name')) payload.name = assertText(input.name, 'Hunt name', { required: !partial, max: 120 });
  if (!partial || maybe('casino_name')) payload.casino_name = assertText(input.casino_name, 'Casino name', { max: 120 });
  if (!partial || maybe('currency')) payload.currency = normalizeCurrency(input.currency || 'EUR');
  if (!partial || maybe('starting_deposit')) payload.starting_deposit = assertMoney(input.starting_deposit, 'Starting deposit', { required: !partial });
  if (!partial || maybe('additional_deposits')) payload.additional_deposits = assertMoney(input.additional_deposits, 'Additional deposits');
  if (!partial || maybe('initial_withdrawal')) payload.initial_withdrawal = assertMoney(input.initial_withdrawal, 'Initial withdrawal');
  if (!partial || maybe('total_withdrawals')) payload.total_withdrawals = assertMoney(input.total_withdrawals, 'Withdrawals');
  if (!partial || maybe('current_balance')) payload.current_balance = assertMoney(input.current_balance, 'Current balance');
  if (!partial || maybe('hunt_date')) {
    const date = input.hunt_date || new Date().toISOString().slice(0, 10);
    if (Number.isNaN(Date.parse(date))) throw new ValidationError('Hunt date is invalid');
    payload.hunt_date = date;
  }
  if (!partial || maybe('status')) {
    const status = input.status || 'active';
    if (!HUNT_STATUSES.includes(status)) throw new ValidationError('Invalid hunt status');
    payload.status = status;
  }
  if (!partial || maybe('notes')) payload.notes = assertText(input.notes, 'Notes', { max: 2000 });
  return payload;
}

export function normalizeBonusPayload(input = {}, { partial = false } = {}) {
  const payload = {};
  const maybe = (key) => Object.prototype.hasOwnProperty.call(input, key);

  if (!partial || maybe('slot_id')) payload.slot_id = input.slot_id || null;
  if (!partial || maybe('slot_name')) payload.slot_name = assertText(input.slot_name, 'Slot name', { required: !partial, max: 160 });
  if (!partial || maybe('provider_name')) payload.provider_name = assertText(input.provider_name, 'Provider', { max: 120 });
  if (!partial || maybe('slot_image_url')) payload.slot_image_url = assertText(input.slot_image_url, 'Slot image URL', { max: 1000 });
  if (!partial || maybe('slot_rtp')) payload.slot_rtp = assertOptionalNumber(input.slot_rtp, 'Slot RTP', { max: 100 });
  if (!partial || maybe('slot_volatility')) payload.slot_volatility = normalizeSlotVolatility(input.slot_volatility);
  if (!partial || maybe('slot_max_win_multiplier')) payload.slot_max_win_multiplier = assertOptionalNumber(input.slot_max_win_multiplier, 'Slot max win');
  if (!partial || maybe('slot_theme')) payload.slot_theme = assertText(input.slot_theme, 'Slot theme', { max: 120 });
  if (!partial || maybe('slot_features')) payload.slot_features = normalizeSlotFeatures(input.slot_features);
  if (!partial || maybe('bonus_type')) payload.bonus_type = normalizeBonusType(input.bonus_type);
  if (!partial || maybe('bonus_cost')) payload.bonus_cost = assertMoney(input.bonus_cost, 'Bonus cost');
  if (!partial || maybe('bet_size')) payload.bet_size = assertMoney(input.bet_size, 'Bet size');
  if (!partial || maybe('payout')) payload.payout = assertMoney(input.payout, 'Payout');
  if (!partial || maybe('status')) {
    const status = input.status || 'unopened';
    if (!BONUS_STATUSES.includes(status)) throw new ValidationError('Invalid bonus status');
    payload.status = status;
    payload.opened_at = status === 'opened' ? (input.opened_at || new Date().toISOString()) : null;
  }
  if (!partial || maybe('position')) payload.position = Math.max(0, parseInt(input.position, 10) || 0);
  if (!partial || maybe('notes')) payload.notes = assertText(input.notes, 'Notes', { max: 1200 });
  const multiplier = input.multiplier ?? calculateBonusMultiplier({ ...input, ...payload });
  if (!partial || maybe('multiplier') || maybe('payout') || maybe('bet_size')) {
    payload.multiplier = multiplier === null ? null : roundRatio(multiplier);
  }
  if (!partial || maybe('payout') || maybe('bonus_cost')) {
    payload.profit_loss = calculateBonusProfitLoss({ ...input, ...payload });
  }
  return payload;
}

export function getPeriodRange(period = 'all', anchorDate = new Date(), custom = {}) {
  const anchor = new Date(anchorDate);
  if (Number.isNaN(anchor.getTime())) throw new ValidationError('Invalid period date');

  if (period === 'all') return { start: null, end: null };
  if (period === 'custom') {
    const customStart = custom.start ? new Date(custom.start) : null;
    const customEnd = custom.end ? new Date(custom.end) : null;
    if (!customStart || !customEnd || Number.isNaN(customStart.getTime()) || Number.isNaN(customEnd.getTime())) {
      throw new ValidationError('Custom date range is invalid');
    }
    customStart.setHours(0, 0, 0, 0);
    customEnd.setHours(23, 59, 59, 999);
    return { start: customStart.toISOString(), end: customEnd.toISOString() };
  }
  if (period === 'daily') {
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 23, 59, 59, 999));
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (period === 'weekly') {
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 0, 0, 0, 0));
    const day = start.getUTCDay() || 7;
    start.setUTCDate(start.getUTCDate() - day + 1);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (period === 'yearly') {
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(anchor.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
    return { start: start.toISOString(), end: end.toISOString() };
  }
  if (period === 'monthly') {
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    return { start: start.toISOString(), end: end.toISOString() };
  }
  throw new ValidationError('Invalid period');
}
