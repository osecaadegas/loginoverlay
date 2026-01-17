import { supabase } from '../../../config/supabaseClient';

/**
 * Custom hook/utility to add XP to Season Pass when earned in The Life
 * This ensures the battle pass XP bar updates when players earn XP
 */

/**
 * Add XP to the user's Season Pass progress
 * @param {string} userId - The user's ID
 * @param {number} xpAmount - Amount of XP to add
 * @param {string} source - Source of XP (e.g., 'crime', 'street_sale', 'item_use')
 * @param {string} sourceId - Optional ID for the source (e.g., robbery_id)
 * @returns {Promise<number>} - New total XP or 0 if failed
 */
export const addSeasonPassXP = async (userId, xpAmount, source, sourceId = null) => {
  try {
    // Call the database function to add XP
    const { data, error } = await supabase
      .rpc('add_season_pass_xp', {
        p_user_id: userId,
        p_xp_amount: xpAmount,
        p_source: source,
        p_source_id: sourceId
      });

    if (error) {
      console.error('Error adding season pass XP:', error);
      return 0;
    }

    return data || 0;
  } catch (err) {
    console.error('Failed to add season pass XP:', err);
    return 0;
  }
};

/**
 * Hook for components that need to track/add season pass XP
 */
export const useSeasonPassXP = () => {
  return {
    addXP: addSeasonPassXP
  };
};

export default useSeasonPassXP;
