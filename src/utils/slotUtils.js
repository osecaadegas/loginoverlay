import { supabase } from '../config/supabaseClient';

// Default slot image for fallback
export const DEFAULT_SLOT_IMAGE = 'https://i.imgur.com/8E3ucNx.png';

// In-memory cache for slots
let slotsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all slots from Supabase with caching
 * @returns {Promise<Array>} Array of slot objects
 */
export async function getAllSlots() {
  // Check if cache is valid
  if (slotsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    return slotsCache;
  }

  try {
    // Fetch all slots - use range to bypass default 1000 row limit
    let allSlots = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('slots')
        .select('*')
        .order('name', { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error('Error fetching slots:', error);
        break;
      }

      if (data && data.length > 0) {
        allSlots = [...allSlots, ...data];
        from += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    // Update cache
    slotsCache = allSlots;
    cacheTimestamp = Date.now();

    return slotsCache;
  } catch (error) {
    console.error('Error fetching slots:', error);
    return slotsCache || [];
  }
}

/**
 * Find a slot by name (case-insensitive)
 * @param {string} slotName - Name of the slot to find
 * @returns {Promise<Object|null>} Slot object or null if not found
 */
export async function findSlotByName(slotName) {
  const slots = await getAllSlots();
  return slots.find(s => s.name.toLowerCase() === slotName.toLowerCase()) || null;
}

/**
 * Get all unique providers
 * @returns {Promise<Array<string>>} Array of provider names
 */
export async function getAllProviders() {
  const slots = await getAllSlots();
  const providers = [...new Set(slots.map(slot => slot.provider))];
  return providers.sort();
}

/**
 * Filter slots by provider
 * @param {Array<string>} providers - Array of provider names to filter by
 * @returns {Promise<Array>} Filtered array of slots
 */
export async function getSlotsByProviders(providers) {
  const slots = await getAllSlots();
  if (!providers || providers.length === 0) {
    return [];
  }
  return slots.filter(slot => providers.includes(slot.provider));
}

/**
 * Get a random selection of slots
 * @param {number} count - Number of random slots to get
 * @param {Array<string>} providers - Optional array of providers to filter by
 * @returns {Promise<Array>} Random selection of slots
 */
export async function getRandomSlots(count = 10, providers = null) {
  let slots = await getAllSlots();
  
  if (providers && providers.length > 0) {
    slots = slots.filter(slot => providers.includes(slot.provider));
  }
  
  // Shuffle and take the requested count
  const shuffled = [...slots].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Provider priority order for slot suggestions.
 * Lower index = higher priority. Providers not in this list sort alphabetically after.
 */
const PROVIDER_PRIORITY = [
  'pragmatic play',
  'hacksaw',
  'nolimit city',
  'relax gaming',
  'play\'n go',
  'push gaming',
  'bgaming',
];

/**
 * Sort an array of slots by provider priority, then alphabetically by name.
 * Slots whose provider matches a priority entry (case-insensitive, includes partial)
 * come first in the defined order; the rest follow sorted by name.
 * @param {Array} slotList - Array of slot objects with `provider` and `name`
 * @returns {Array} New sorted array
 */
export function sortSlotsByProviderPriority(slotList) {
  if (!slotList || slotList.length === 0) return slotList;

  const getPriority = (provider) => {
    if (!provider) return PROVIDER_PRIORITY.length;
    const p = provider.toLowerCase();
    for (let i = 0; i < PROVIDER_PRIORITY.length; i++) {
      if (p.includes(PROVIDER_PRIORITY[i]) || PROVIDER_PRIORITY[i].includes(p)) return i;
    }
    return PROVIDER_PRIORITY.length;
  };

  return [...slotList].sort((a, b) => {
    const pa = getPriority(a.provider);
    const pb = getPriority(b.provider);
    if (pa !== pb) return pa - pb;
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Search slots by name
 * @param {string} searchTerm - Search term to match against slot names
 * @returns {Promise<Array>} Array of matching slots
 */
export async function searchSlotsByName(searchTerm) {
  const slots = await getAllSlots();
  const term = searchTerm.toLowerCase();
  const filtered = slots.filter(slot => slot.name.toLowerCase().includes(term));
  return sortSlotsByProviderPriority(filtered);
}

/**
 * Invalidate the cache (force refresh on next fetch)
 */
export function invalidateCache() {
  slotsCache = null;
  cacheTimestamp = null;
}

/**
 * Prefetch slots data (useful for initialization)
 * @returns {Promise<Array>} Array of slot objects
 */
export async function prefetchSlots() {
  return await getAllSlots();
}

/**
 * Get cache status information
 * @returns {Object} Cache status with isCached and age properties
 */
export function getCacheStatus() {
  return {
    isCached: !!slotsCache,
    age: cacheTimestamp ? Date.now() - cacheTimestamp : null,
    count: slotsCache ? slotsCache.length : 0
  };
}

// ============================================================================
// SLOT MANAGEMENT FUNCTIONS (For SlotModder role)
// ============================================================================

/**
 * Add a new slot to the database
 * @param {Object} slotData - Slot data with name, provider, image
 * @returns {Promise<Object>} Result with success status and data/error
 */
export async function addSlot(slotData) {
  try {
    const { name, provider, image } = slotData;
    
    if (!name || !provider || !image) {
      return { success: false, error: 'Name, provider, and image are required' };
    }

    const { data, error } = await supabase
      .from('slots')
      .insert([{ name, provider, image }])
      .select()
      .single();

    if (error) {
      console.error('Error adding slot:', error);
      return { success: false, error: error.message };
    }

    // Invalidate cache to force refresh
    invalidateCache();

    return { success: true, data };
  } catch (error) {
    console.error('Error adding slot:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing slot
 * @param {string} slotId - UUID of the slot to update
 * @param {Object} updates - Object with fields to update
 * @returns {Promise<Object>} Result with success status and data/error
 */
export async function updateSlot(slotId, updates) {
  try {
    const { data, error } = await supabase
      .from('slots')
      .update(updates)
      .eq('id', slotId)
      .select()
      .single();

    if (error) {
      console.error('Error updating slot:', error);
      return { success: false, error: error.message };
    }

    // Invalidate cache to force refresh
    invalidateCache();

    return { success: true, data };
  } catch (error) {
    console.error('Error updating slot:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a slot from the database
 * @param {string} slotId - UUID of the slot to delete
 * @returns {Promise<Object>} Result with success status and error if any
 */
export async function deleteSlot(slotId) {
  try {
    const { error } = await supabase
      .from('slots')
      .delete()
      .eq('id', slotId);

    if (error) {
      console.error('Error deleting slot:', error);
      return { success: false, error: error.message };
    }

    // Invalidate cache to force refresh
    invalidateCache();

    return { success: true };
  } catch (error) {
    console.error('Error deleting slot:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a single slot by ID
 * @param {string} slotId - UUID of the slot
 * @returns {Promise<Object|null>} Slot object or null
 */
export async function getSlotById(slotId) {
  try {
    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single();

    if (error) {
      console.error('Error fetching slot:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching slot:', error);
    return null;
  }
}
