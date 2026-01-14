// Inventory utility functions

import { supabase } from '../config/supabaseClient';

/**
 * Award an item to a user
 * @param {string} userId - The user's UUID
 * @param {string} itemId - The item's UUID
 * @param {number} quantity - How many to award (default: 1)
 * @returns {Promise<object>} The awarded item details
 */
export async function awardItemToUser(userId, itemId, quantity = 1) {
  try {
    // Check if user already has this item
    const { data: existing, error: checkError } = await supabase
      .from('user_inventory')
      .select('*')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      // Update quantity if item already exists
      const { data, error } = await supabase
        .from('user_inventory')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, existed: true };
    } else {
      // Insert new item
      const { data, error } = await supabase
        .from('user_inventory')
        .insert({
          user_id: userId,
          item_id: itemId,
          quantity: quantity
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, existed: false };
    }
  } catch (error) {
    console.error('Error awarding item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove an item from user's inventory
 * @param {string} userId - The user's UUID
 * @param {string} itemId - The item's UUID
 * @param {number} quantity - How many to remove (default: 1)
 * @returns {Promise<object>} Result of the operation
 */
export async function removeItemFromUser(userId, itemId, quantity = 1) {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('user_inventory')
      .select('*')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .single();

    if (checkError) throw checkError;

    if (existing.quantity <= quantity) {
      // Remove item entirely if quantity is depleted
      const { error } = await supabase
        .from('user_inventory')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;
      return { success: true, removed: true };
    } else {
      // Decrease quantity
      const { data, error } = await supabase
        .from('user_inventory')
        .update({ quantity: existing.quantity - quantity })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data, removed: false };
    }
  } catch (error) {
    console.error('Error removing item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all available items
 * @param {string} type - Filter by type (optional)
 * @param {string} rarity - Filter by rarity (optional)
 * @returns {Promise<Array>} List of items
 */
export async function getAllItems(type = null, rarity = null) {
  try {
    let query = supabase.from('items').select('*');

    if (type) {
      query = query.eq('type', type);
    }

    if (rarity) {
      query = query.eq('rarity', rarity);
    }

    const { data, error } = await query.order('rarity', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching items:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get user's inventory
 * @param {string} userId - The user's UUID
 * @returns {Promise<Array>} User's inventory items
 */
export async function getUserInventory(userId) {
  try {
    const { data, error } = await supabase
      .from('user_inventory')
      .select(`
        id,
        quantity,
        acquired_at,
        equipped,
        items (
          id,
          name,
          description,
          type,
          icon,
          rarity,
          tradeable
        )
      `)
      .eq('user_id', userId)
      .order('acquired_at', { ascending: false });

    if (error) throw error;

    // Transform data to flat structure
    const formattedInventory = data?.map(item => ({
      inventoryId: item.id,
      id: item.items.id,
      name: item.items.name,
      description: item.items.description,
      type: item.items.type,
      icon: item.items.icon,
      rarity: item.items.rarity,
      tradeable: item.items.tradeable,
      quantity: item.quantity,
      equipped: item.equipped,
      acquiredAt: item.acquired_at
    })) || [];

    return { success: true, data: formattedInventory };
  } catch (error) {
    console.error('Error fetching user inventory:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Award item by name (convenience function)
 * @param {string} userId - The user's UUID
 * @param {string} itemName - The item's name
 * @param {number} quantity - How many to award (default: 1)
 * @returns {Promise<object>} The awarded item details
 */
export async function awardItemByName(userId, itemName, quantity = 1) {
  try {
    // Find item by name
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id')
      .eq('name', itemName)
      .single();

    if (itemError) throw itemError;

    return await awardItemToUser(userId, item.id, quantity);
  } catch (error) {
    console.error('Error awarding item by name:', error);
    return { success: false, error: error.message };
  }
}
