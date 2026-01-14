// Calculation utilities for bonus hunt tracking

/**
 * Calculate the average multiplier from opened bonuses only
 * Formula: Total payout / Total bet size of opened bonuses
 * @param {Array} bonuses - Array of bonus objects
 * @returns {number} Average multiplier
 */
export const calculateAverageMultiplier = (bonuses) => {
  if (!Array.isArray(bonuses)) return 0;
  
  // Only count bonuses that have been opened (have multiplier)
  const openedBonuses = bonuses.filter(bonus => 
    bonus.multiplier !== null && bonus.multiplier !== undefined
  );
  
  if (openedBonuses.length === 0) return 0;
  
  // Total payout from opened bonuses
  const totalPayout = openedBonuses.reduce((sum, bonus) => sum + (bonus.betSize * bonus.multiplier), 0);
  
  // Total bet size of opened bonuses
  const totalBetSize = openedBonuses.reduce((sum, bonus) => sum + bonus.betSize, 0);
  
  if (totalBetSize === 0) return 0;
  
  // Average multiplier = total payout / total bet size
  return totalPayout / totalBetSize;
};

/**
 * Calculate the required multiplier to break even
 * Formula: |profit/loss| / totalBetValue = BE X
 * Example: Lost €500, have €5 in bets = need 100x average to break even
 * @param {Array} bonuses - Array of bonus objects
 * @param {number} profitLoss - Current profit/loss value
 * @returns {number} Required multiplier for break-even
 */
export const calculateRequiredMultiplier = (bonuses, profitLoss) => {
  if (!Array.isArray(bonuses) || bonuses.length === 0) return 0;
  
  // Sum of all bonus bet values
  const totalBetValue = bonuses.reduce((sum, b) => sum + (b.betSize || 0), 0);
  
  // If total bet value is 0 or profit/loss is 0, return 0
  if (totalBetValue === 0 || profitLoss === 0) return 0;
  
  // If already in profit, return 0 (already past break-even)
  if (profitLoss > 0) return 0;
  
  // Formula: |profit/loss| / totalBetValue = required multiplier
  // Example: -500 loss / 5 bet = 100x needed
  return Math.abs(profitLoss) / totalBetValue;
};

/**
 * Calculate total cost from bonuses
 * @param {Array} bonuses - Array of bonus objects
 * @returns {number} Total cost
 */
export const calculateTotalCost = (bonuses) => {
  return bonuses.reduce((sum, bonus) => sum + (bonus.betSize || 0), 0);
};

/**
 * Calculate total return from opened bonuses
 * @param {Array} bonuses - Array of bonus objects
 * @returns {number} Total return
 */
export const calculateTotalReturn = (bonuses) => {
  return bonuses.reduce((sum, bonus) => {
    if (bonus.multiplier !== null && bonus.multiplier !== undefined) {
      return sum + (bonus.betSize * bonus.multiplier);
    }
    return sum;
  }, 0);
};

/**
 * Calculate profit/loss
 * Formula: (stopMoney - startMoney) + sum of all payouts
 * If you start with 1000 and stop at 500, that's -500 (loss)
 * Then add each payout to increase the total
 * @param {number} startMoney - Starting money amount
 * @param {number} stopMoney - Stop loss money amount
 * @param {number} totalReturn - Total return from bonuses (sum of all payouts)
 * @returns {number} Profit or loss
 */
export const calculateProfitLoss = (startMoney, stopMoney, totalReturn) => {
  return (stopMoney - startMoney) + totalReturn;
};

/**
 * Count opened bonuses
 * @param {Array} bonuses - Array of bonus objects
 * @returns {number} Number of opened bonuses
 */
export const countOpenedBonuses = (bonuses) => {
  return bonuses.filter(bonus => 
    bonus.multiplier !== null && bonus.multiplier !== undefined
  ).length;
};

/**
 * Find best performing slot
 * @param {Array} bonuses - Array of bonus objects
 * @returns {Object|null} Best slot object
 */
export const findBestSlot = (bonuses) => {
  const openedBonuses = bonuses.filter(b => b.multiplier !== null && b.multiplier !== undefined && b.multiplier > 0);
  if (openedBonuses.length === 0) return null;
  
  return openedBonuses.reduce((best, current) => {
    return current.multiplier > (best?.multiplier || 0) ? current : best;
  }, null);
};

/**
 * Find worst performing slot
 * @param {Array} bonuses - Array of bonus objects
 * @returns {Object|null} Worst slot object
 */
export const findWorstSlot = (bonuses) => {
  const openedBonuses = bonuses.filter(b => b.multiplier !== null && b.multiplier !== undefined && b.multiplier > 0);
  if (openedBonuses.length === 0) return null;
  
  return openedBonuses.reduce((worst, current) => {
    return current.multiplier < (worst?.multiplier || Infinity) ? current : worst;
  }, null);
};

/**
 * Calculate all stats at once
 * @param {Array} bonuses - Array of bonus objects
 * @param {number} startMoney - Starting money amount
 * @param {number} stopMoney - Stop loss money amount
 * @returns {Object} Object containing all calculated stats
 */
export const calculateStats = (bonuses, startMoney = 0, stopMoney = 0) => {
  const totalBonuses = bonuses.length;
  const totalCost = calculateTotalCost(bonuses);
  const totalReturn = calculateTotalReturn(bonuses);
  const profitLoss = calculateProfitLoss(startMoney, stopMoney, totalReturn);
  const averageMultiplier = calculateAverageMultiplier(bonuses);
  const requiredMultiplier = calculateRequiredMultiplier(bonuses, profitLoss);
  const openedBonuses = countOpenedBonuses(bonuses);
  const unopenedBonuses = totalBonuses - openedBonuses;
  const bestSlot = findBestSlot(bonuses);
  const worstSlot = findWorstSlot(bonuses);

  return {
    totalBonuses,
    totalCost,
    totalReturn,
    profitLoss,
    averageMultiplier,
    requiredMultiplier,
    openedBonuses,
    unopenedBonuses,
    bestSlot,
    worstSlot
  };
};
