import { supabase } from '../../../config/supabaseClient';

/**
 * Utility functions for The Life game actions
 */

// Calculate max business slots based on level
export const getMaxBusinessSlots = (level) => {
  const baseSlots = 1;
  const bonusSlots = Math.floor(level / 5);
  return Math.min(baseSlots + bonusSlots, 7);
};

// Calculate business upgrade cost
export const getUpgradeCost = (business, currentLevel) => {
  const baseCost = (business.purchase_price || 5000) * 2;
  return Math.floor(baseCost * Math.pow(1.8, currentLevel - 1));
};

// Calculate bribe amount based on remaining jail time
export const calculateBribeAmount = (player) => {
  if (!player?.jail_until) return { bribeAmount: 0, percentage: 0, remainingMinutes: 0 };
  
  const now = new Date();
  const jailEnd = new Date(player.jail_until);
  const remainingMinutes = Math.max(0, Math.ceil((jailEnd - now) / 1000 / 60));
  
  const basePercentage = 5;
  const increasePerHalfHour = 2;
  const percentageIncrease = Math.floor(remainingMinutes / 30) * increasePerHalfHour;
  const totalPercentage = Math.min(50, basePercentage + percentageIncrease);
  
  const totalWealth = (player.cash || 0) + (player.bank_balance || 0);
  const calculatedBribe = Math.floor(totalWealth * (totalPercentage / 100));
  
  // Server enforces minimum of $100 - make sure client shows the same
  const bribeAmount = Math.max(100, calculatedBribe);
  
  return { bribeAmount, percentage: totalPercentage, remainingMinutes };
};
