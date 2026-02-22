import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';

/**
 * Custom hook that manages all The Life game data and state
 * This centralizes data fetching and state management for all category components
 */
export const useTheLifeData = (user) => {
  // Core player state
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Guard: track when user actions update player to prevent poll from overwriting with stale data
  const lastPlayerActionRef = useRef(0);
  
  // Wrapped setPlayer that preserves equipment bonuses and marks user action timestamp
  // Accepts either raw DB data object OR a functional updater (prev => newState)
  const setPlayerFromAction = (dataOrUpdater) => {
    lastPlayerActionRef.current = Date.now();
    if (typeof dataOrUpdater === 'function') {
      // Functional updater: just set the timestamp, let the component handle the merge
      setPlayer(dataOrUpdater);
    } else {
      // Raw data from DB: merge and preserve equipment bonuses
      setPlayer(prev => {
        const powerBonus = prev?.equipment_power_bonus || 0;
        const defenseBonus = prev?.equipment_defense_bonus || 0;
        const merged = { ...prev, ...dataOrUpdater };
        // If data contains power/defense from DB, re-add equipment bonuses
        if ('power' in dataOrUpdater) {
          merged.power = dataOrUpdater.power + powerBonus;
        }
        if ('defense' in dataOrUpdater) {
          merged.defense = dataOrUpdater.defense + defenseBonus;
        }
        merged.equipment_power_bonus = powerBonus;
        merged.equipment_defense_bonus = defenseBonus;
        return merged;
      });
    }
  };
  
  // Tab management
  const [activeTab, setActiveTab] = useState('crimes');
  
  // Category-specific state
  const [robberies, setRobberies] = useState([]);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [ownedBusinesses, setOwnedBusinesses] = useState([]);
  const [drugOps, setDrugOps] = useState([]);
  const [brothel, setBrothel] = useState(null);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [hiredWorkers, setHiredWorkers] = useState([]);
  const [showHiredWorkers, setShowHiredWorkers] = useState(true);
  const [theLifeInventory, setTheLifeInventory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [jailTimeRemaining, setJailTimeRemaining] = useState(null);
  const [hospitalTimeRemaining, setHospitalTimeRemaining] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [marketSubTab, setMarketSubTab] = useState('store');
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [eventPopupData, setEventPopupData] = useState(null);
  const [categoryInfo, setCategoryInfo] = useState({});

  // Initialize player data
  const initializePlayer = async () => {
    try {
      let { data: playerData, error } = await supabase
        .from('the_life_players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Get username from user_profiles or user metadata
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('twitch_username')
          .eq('user_id', user.id)
          .single();

        const { data: newPlayer, error: createError } = await supabase
          .from('the_life_players')
          .insert({
            user_id: user.id,
            xp: 0,
            level: 1,
            hp: 100,
            max_hp: 100,
            stamina: 100,
            max_stamina: 100,
            cash: 500,
            bank_balance: 0,
            addiction: 0,
            max_addiction: 100,
            twitch_username: profileData?.twitch_username || user?.user_metadata?.preferred_username || null
          })
          .select()
          .single();

        if (createError) throw createError;
        playerData = newPlayer;
      } else if (playerData && !playerData.twitch_username) {
        // Update existing player with username if missing
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('twitch_username')
          .eq('user_id', user.id)
          .single();

        const updates = {};
        if (!playerData.twitch_username) {
          updates.twitch_username = profileData?.twitch_username || user?.user_metadata?.preferred_username || null;
        }

        if (Object.keys(updates).length > 0) {
          const { data: updatedPlayer } = await supabase
            .from('the_life_players')
            .update(updates)
            .eq('user_id', user.id)
            .select()
            .single();
          
          if (updatedPlayer) playerData = updatedPlayer;
        }
      }

      // Calculate equipped item bonuses (store separately, don't overwrite base stats)
      playerData.equipment_power_bonus = 0;
      playerData.equipment_defense_bonus = 0;
      
      if (playerData.equipped_weapon_id || playerData.equipped_gear_id) {
        const equipmentIds = [];
        if (playerData.equipped_weapon_id) equipmentIds.push(playerData.equipped_weapon_id);
        if (playerData.equipped_gear_id) equipmentIds.push(playerData.equipped_gear_id);

        const { data: equippedItems } = await supabase
          .from('the_life_items')
          .select('id, boost_type, boost_amount')
          .in('id', equipmentIds);

        if (equippedItems) {
          equippedItems.forEach(item => {
            if (item.boost_type === 'power' && item.boost_amount) {
              playerData.equipment_power_bonus += item.boost_amount;
            } else if (item.boost_type === 'defense' && item.boost_amount) {
              playerData.equipment_defense_bonus += item.boost_amount;
            }
          });
        }
        
        // Add bonuses to displayed values (base stats stay intact in DB columns)
        playerData.power = (playerData.power || 0) + playerData.equipment_power_bonus;
        playerData.defense = (playerData.defense || 0) + playerData.equipment_defense_bonus;
      }

      setPlayer(playerData);
      checkDailyBonus(playerData);
    } catch (err) {
      console.error('Error initializing player:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkDailyBonus = async (playerData) => {
    const lastBonus = playerData.last_daily_bonus;
    const now = new Date();
    
    if (!lastBonus) {
      await claimDailyBonus(1, playerData);
      return;
    }

    const lastBonusDate = new Date(lastBonus);
    const hoursSinceBonus = (now - lastBonusDate) / 1000 / 60 / 60;

    if (hoursSinceBonus >= 24 && hoursSinceBonus < 48) {
      await claimDailyBonus(playerData.consecutive_logins + 1, playerData);
    } else if (hoursSinceBonus >= 48) {
      await claimDailyBonus(1, playerData);
    }
  };

  const claimDailyBonus = async (newStreak, playerData) => {
    try {
      // Use server-side RPC to claim daily bonus (bypasses RLS security)
      const { data: result, error } = await supabase.rpc('claim_daily_bonus');
      
      if (error) {
        // If RPC doesn't exist, fall back to direct update
        if (error.code === '42883') {
          const newStamina = Math.min((playerData.stamina || 0) + 10, playerData.max_stamina || 300);
          const { data: updated } = await supabase
            .from('the_life_players')
            .update({ 
              stamina: newStamina, 
              last_daily_bonus: new Date().toISOString(),
              consecutive_logins: newStreak
            })
            .eq('user_id', user.id)
            .select()
            .single();
          if (updated) {
            setPlayerFromAction(updated);
            setMessage({ type: 'success', text: `Daily bonus claimed! +10 stamina (${newStreak} day streak)` });
          }
          return;
        }
        throw error;
      }
      if (!result?.success) return; // Silently skip if already claimed
      
      if (result.player) setPlayerFromAction(result.player);
      setMessage({ 
        type: 'success', 
        text: `Daily bonus claimed! +10 stamina (${result.new_streak} day streak)` 
      });
    } catch (err) {
      console.error('Error claiming daily bonus:', err);
    }
  };

  const startStaminaRefill = () => {
    const interval = setInterval(async () => {
      if (!user?.id) return;

      try {
        // Use server-side RPC for stamina refill (bypasses RLS security)
        const { data: result, error } = await supabase.rpc('refill_stamina');
        
        if (error) {
          // Silently ignore if function doesn't exist yet — fall back to direct update
          if (error.code === '42883') {
            // Direct fallback: calculate stamina refill
            const { data: p } = await supabase
              .from('the_life_players')
              .select('stamina, max_stamina, last_stamina_refill')
              .eq('user_id', user.id)
              .single();
            if (p && p.stamina < p.max_stamina && p.last_stamina_refill) {
              const hoursPassed = (Date.now() - new Date(p.last_stamina_refill).getTime()) / 3600000;
              if (hoursPassed >= 1) {
                const toAdd = Math.floor(hoursPassed) * 20;
                const newStamina = Math.min(p.stamina + toAdd, p.max_stamina);
                const { data: updated } = await supabase
                  .from('the_life_players')
                  .update({ stamina: newStamina, last_stamina_refill: new Date().toISOString() })
                  .eq('user_id', user.id)
                  .select()
                  .single();
                if (updated) setPlayerFromAction(updated);
              }
            }
            return;
          }
          console.error('Stamina refill error:', error);
          return;
        }
        
        if (result?.success && result.player) {
          setPlayerFromAction(result.player);
        }
      } catch (err) {
        console.error('Stamina refill error:', err);
      }
    }, 60000);

    return () => clearInterval(interval);
  };

  // Load functions for different categories
  const loadRobberies = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_robberies')
        .select('*')
        .eq('is_active', true)
        .order('min_level_required', { ascending: true });

      if (error) throw error;
      setRobberies(data || []);
    } catch (err) {
      console.error('Error loading robberies:', err);
      setRobberies([]);
    }
  };

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_businesses')
        .select('*')
        .eq('is_active', true)
        .order('min_level_required', { ascending: true });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (err) {
      console.error('Error loading businesses:', err);
      setBusinesses([]);
    }
  };

  const loadOwnedBusinesses = async () => {
    if (!player?.id) return;
    try {
      const { data, error } = await supabase
        .from('the_life_player_businesses')
        .select(`
          *,
          business:the_life_businesses(*)
        `)
        .eq('player_id', player.id);

      if (error) throw error;
      setOwnedBusinesses(data || []);
    } catch (err) {
      console.error('Error loading owned businesses:', err);
      setOwnedBusinesses([]);
    }
  };

  const loadTheLifeInventory = async () => {
    if (!player?.id) return;
    try {
      const { data, error } = await supabase
        .from('the_life_player_inventory')
        .select(`
          *,
          item:the_life_items(*)
        `)
        .eq('player_id', player.id);

      if (error) throw error;
      // Filter out any inventory entries where item join returned null (RLS or deleted item)
      setTheLifeInventory((data || []).filter(inv => inv.item !== null));
    } catch (err) {
      console.error('Error loading inventory:', err);
      setTheLifeInventory([]);
    }
  };

  const loadOnlinePlayers = async () => {
    try {
      // Clean up stale presence first (older than 90 seconds)
      await supabase.rpc('cleanup_stale_pvp_presence');

      // Get online players from presence system (last heartbeat within 90 seconds)
      const { data: presenceData, error: presenceError } = await supabase
        .from('the_life_pvp_presence')
        .select('player_id, user_id')
        .gte('last_heartbeat', new Date(Date.now() - 90 * 1000).toISOString());

      if (presenceError) throw presenceError;

      if (!presenceData || presenceData.length === 0) {
        setOnlinePlayers([]);
        return;
      }

      // Get player IDs that are online (excluding current user)
      const onlinePlayerIds = presenceData
        .filter(p => p.user_id !== user.id)
        .map(p => p.player_id);

      if (onlinePlayerIds.length === 0) {
        setOnlinePlayers([]);
        return;
      }

      // Fetch full player data for online players
      const { data, error } = await supabase
        .from('the_life_players')
        .select('id, user_id, level, xp, cash, bank_balance, pvp_wins, pvp_losses, hp, max_hp, power, intelligence, defense, avatar_url, se_username, hospital_until, jail_until')
        .in('id', onlinePlayerIds)
        .limit(50);

      if (error) throw error;

      // Filter out players in hospital or jail
      const now = new Date();
      const availablePlayers = data?.filter(p => {
        const inHospital = p.hospital_until && new Date(p.hospital_until) > now;
        const inJail = p.jail_until && new Date(p.jail_until) > now;
        return !inHospital && !inJail;
      }) || [];

      // Enrich with usernames from SE connections and profiles
      if (availablePlayers && availablePlayers.length > 0) {
        const userIds = availablePlayers.map(p => p.user_id);
        
        // Fetch SE usernames in batch
        const { data: seConnections } = await supabase
          .from('streamelements_connections')
          .select('user_id, se_username')
          .in('user_id', userIds);

        // Fetch Twitch usernames in batch
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, twitch_username')
          .in('user_id', userIds);

        // Create lookup maps
        const seUsernameMap = {};
        seConnections?.forEach(conn => {
          if (conn.se_username) {
            seUsernameMap[conn.user_id] = conn.se_username;
          }
        });

        const twitchUsernameMap = {};
        profiles?.forEach(profile => {
          if (profile.twitch_username) {
            twitchUsernameMap[profile.user_id] = profile.twitch_username;
          }
        });

        // Enrich player data with usernames (priority: SE > Twitch > fallback)
        const enrichedData = availablePlayers.map(playerData => {
          const username = seUsernameMap[playerData.user_id] || 
                          twitchUsernameMap[playerData.user_id] || 
                          'Player';
          
          return {
            ...playerData,
            username,
            net_worth: (playerData.cash || 0) + (playerData.bank_balance || 0)
          };
        });

        setOnlinePlayers(enrichedData);
      } else {
        setOnlinePlayers([]);
      }
    } catch (err) {
      console.error('Error loading online players:', err);
    }
  };

  const loadDrugOps = async () => {
    if (!player?.id) return;
    try {
      const { data, error } = await supabase
        .from('the_life_business_productions')
        .select('*')
        .eq('player_id', player.id)
        .eq('collected', false);

      if (error && error.code !== 'PGRST116') throw error;
      
      const opsData = {};
      if (data) {
        data.forEach(prod => {
          opsData[prod.business_id] = true;
          opsData[`${prod.business_id}_completed_at`] = prod.completed_at;
          opsData[`${prod.business_id}_reward_item_id`] = prod.reward_item_id;
          opsData[`${prod.business_id}_reward_item_quantity`] = prod.reward_item_quantity;
          opsData[`${prod.business_id}_reward_cash`] = prod.reward_cash || 0;
        });
      }
      setDrugOps(opsData);
    } catch (err) {
      console.error('Error loading drug ops:', err);
      setDrugOps({});
    }
  };

  const loadBrothel = async () => {
    if (!player?.id) return;
    try {
      const { data, error } = await supabase
        .from('the_life_brothels')
        .select('*')
        .eq('player_id', player.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setBrothel(data);
    } catch (err) {
      console.error('Error loading brothel:', err);
      setBrothel(null);
    }
  };

  const loadAvailableWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_brothel_workers')
        .select('*')
        .eq('is_active', true)
        .order('hire_cost', { ascending: true });

      if (error) throw error;
      setAvailableWorkers(data || []);
    } catch (err) {
      console.error('Error loading available workers:', err);
      setAvailableWorkers([]);
    }
  };

  const loadHiredWorkers = async () => {
    if (!player?.id) return;
    try {
      const { data, error } = await supabase
        .from('the_life_player_brothel_workers')
        .select(`
          *,
          worker:the_life_brothel_workers(*)
        `)
        .eq('player_id', player.id);

      if (error) throw error;
      // Filter out entries where worker join returned null
      setHiredWorkers((data || []).filter(hw => hw.worker !== null));
    } catch (err) {
      console.error('Error loading hired workers:', err);
      setHiredWorkers([]);
    }
  };

  const loadLeaderboard = async () => {
    try {
      // Clear existing data first to ensure fresh fetch
      setLeaderboard([]);
      
      // Fetch fresh data from database
      const { data, error } = await supabase
        .from('the_life_players')
        .select('id, user_id, level, xp, cash, bank_balance, pvp_wins, total_robberies, se_username, twitch_username')
        .order('level', { ascending: false })
        .order('xp', { ascending: false })
        .limit(10)
        .throwOnError();

      if (!data || data.length === 0) {
        setLeaderboard([]);
        return;
      }

      // Batch fetch usernames from SE connections and profiles for players without se_username
      const userIds = data.filter(p => !p.se_username && !p.twitch_username).map(p => p.user_id);
      
      let usernameMap = {};
      if (userIds.length > 0) {
        // First check streamelements_connections for SE username
        const { data: seConnections } = await supabase
          .from('streamelements_connections')
          .select('user_id, se_username')
          .in('user_id', userIds);
        
        seConnections?.forEach(conn => {
          if (conn.se_username) usernameMap[conn.user_id] = conn.se_username;
        });

        // Then check profiles for Twitch username as fallback
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, twitch_username')
          .in('user_id', userIds);
        
        profiles?.forEach(p => {
          if (p.twitch_username && !usernameMap[p.user_id]) {
            usernameMap[p.user_id] = p.twitch_username;
          }
        });
      }

      // Map usernames efficiently
      const enrichedData = data.map(playerData => ({
        ...playerData,
        username: playerData.se_username || 
                  playerData.twitch_username || 
                  usernameMap[playerData.user_id] || 
                  'Player',
        net_worth: (playerData.cash || 0) + (playerData.bank_balance || 0)
      }));

      setLeaderboard(enrichedData);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setLeaderboard([]);
    }
  };

  const showEventMessage = async (eventType) => {
    try {
      const { data, error } = await supabase
        .from('the_life_event_messages')
        .select('*')
        .eq('event_type', eventType)
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        const randomMessage = data[Math.floor(Math.random() * data.length)];
        setEventPopupData(randomMessage);
        setShowEventPopup(true);
        
        setTimeout(() => {
          setShowEventPopup(false);
        }, 5000);
      }
    } catch (err) {
      console.error('Error loading event message:', err);
    }
  };

  const loadCategoryInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_category_info')
        .select('*');

      if (error) {
        console.warn('Category info not available:', error.message);
        setCategoryInfo({});
        return;
      }
      
      // Convert array to object keyed by category_key
      const infoMap = {};
      data?.forEach(item => {
        infoMap[item.category_key] = item;
      });
      setCategoryInfo(infoMap);
    } catch (err) {
      console.error('Error loading category info:', err);
      setCategoryInfo({});
    }
  };

  // Initialize data on mount
  useEffect(() => {
    if (user) {
      initializePlayer();
      loadRobberies();
      loadBusinesses();
      loadAvailableWorkers();
      loadCategoryInfo();
      loadOnlinePlayers();
      loadLeaderboard();
    }
  }, [user]);

  // Load player-specific data after player is initialized
  useEffect(() => {
    if (player?.id) {
      loadTheLifeInventory();
      loadDrugOps();
      loadBrothel();
      loadHiredWorkers();
      loadOwnedBusinesses();
      startStaminaRefill();
    }
  }, [player?.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    // REPLACED REALTIME WITH POLLING TO REDUCE EGRESS
    console.warn('useTheLifeData: Realtime disabled for egress reduction. Using polling instead.');
    
    // Poll player data every 15 seconds (needs to be responsive for gameplay)
    const playerInterval = setInterval(async () => {
      // Skip poll if a user action just updated the player (prevent stale data overwrite)
      if (Date.now() - lastPlayerActionRef.current < 3000) return;
      
      const { data } = await supabase
        .from('the_life_players')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // Double-check guard again after async query (action may have happened during query)
      if (Date.now() - lastPlayerActionRef.current < 3000) return;
      
      if (data) {
        setPlayer(prevPlayer => {
          // Preserve equipment bonuses from initializePlayer
          const powerBonus = prevPlayer?.equipment_power_bonus || 0;
          const defenseBonus = prevPlayer?.equipment_defense_bonus || 0;
          return {
            ...prevPlayer,
            ...data,
            equipment_power_bonus: powerBonus,
            equipment_defense_bonus: defenseBonus,
            power: (data.power || 0) + powerBonus,
            defense: (data.defense || 0) + defenseBonus
          };
        });
        
        // If player was sent to hospital or jail, show message
        if (data.hp === 0 && data.hospital_until && (!player || player.hp !== 0)) {
          setMessage({ 
            type: 'error', 
            text: 'You were attacked and sent to the hospital!' 
          });
        }
      }
    }, 15000);
    
    // Poll inventory every 10 seconds for faster updates when items are received
    const inventoryInterval = setInterval(() => {
      loadTheLifeInventory();
    }, 10000);
    
    // Poll other data every 60 seconds (less critical)
    const dataInterval = setInterval(() => {
      loadRobberies();
      loadCategoryInfo();
    }, 60000);
    
    // Poll leaderboard every 30 seconds for responsive updates
    const leaderboardInterval = setInterval(() => {
      loadLeaderboard();
    }, 30000);

    return () => {
      clearInterval(playerInterval);
      clearInterval(inventoryInterval);
      clearInterval(dataInterval);
      clearInterval(leaderboardInterval);
    };
  }, [user?.id]); // Only depend on user.id, not player

  // Jail countdown timer
  useEffect(() => {
    if (!player?.jail_until) return;

    const interval = setInterval(() => {
      const now = new Date();
      const jailEnd = new Date(player.jail_until);
      const diff = jailEnd - now;

      if (diff <= 0) {
        setJailTimeRemaining(null);
        initializePlayer();
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setJailTimeRemaining({ minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player?.jail_until]);

  // Hospital countdown timer
  useEffect(() => {
    if (!player?.hospital_until) return;

    const interval = setInterval(() => {
      const now = new Date();
      const hospitalEnd = new Date(player.hospital_until);
      const diff = hospitalEnd - now;

      if (diff <= 0) {
        setHospitalTimeRemaining(null);
        initializePlayer();
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setHospitalTimeRemaining({ minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player?.hospital_until]);

  return {
    // State
    player,
    setPlayer,
    setPlayerFromAction,
    loading,
    message,
    setMessage,
    activeTab,
    setActiveTab,
    robberies,
    onlinePlayers,
    businesses,
    ownedBusinesses,
    drugOps,
    setDrugOps,
    brothel,
    setBrothel,
    availableWorkers,
    hiredWorkers,
    showHiredWorkers,
    setShowHiredWorkers,
    theLifeInventory,
    leaderboard,
    jailTimeRemaining,
    hospitalTimeRemaining,
    depositAmount,
    setDepositAmount,
    withdrawAmount,
    setWithdrawAmount,
    marketSubTab,
    setMarketSubTab,
    showEventPopup,
    setShowEventPopup,
    eventPopupData,
    categoryInfo,
    
    // Load functions
    initializePlayer,
    loadRobberies,
    loadBusinesses,
    loadOwnedBusinesses,
    loadTheLifeInventory,
    loadOnlinePlayers,
    loadDrugOps,
    loadBrothel,
    loadAvailableWorkers,
    loadHiredWorkers,
    loadLeaderboard,
    loadCategoryInfo,
    showEventMessage
  };
};
