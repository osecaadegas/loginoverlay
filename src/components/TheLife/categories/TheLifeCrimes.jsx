import { supabase } from '../../../config/supabaseClient';
import { useRef, useState } from 'react';
import { useDragScroll } from '../hooks/useDragScroll';
import { addSeasonPassXP } from '../hooks/useSeasonPassXP';
import '../styles/TheLifeCrimes.css';

/**
 * Crimes Category Component
 * Handles all crime-related actions and UI
 */
export default function TheLifeCrimes({ 
  player, 
  setPlayer, 
  robberies, 
  setMessage, 
  showEventMessage,
  user,
  isInJail,
  isInHospital 
}) {
  const scrollContainerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [cooldownCrimeId, setCooldownCrimeId] = useState(null);
  const dragScroll = useDragScroll(scrollContainerRef);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  const attemptRobbery = async (robbery) => {
    // Prevent spam clicking
    if (loading || cooldownCrimeId === robbery.id) {
      return;
    }

    if (player.stamina < robbery.stamina_cost) {
      setMessage({ type: 'error', text: 'Not enough stamina!' });
      return;
    }

    if (player.jail_until && new Date(player.jail_until) > new Date()) {
      setMessage({ type: 'error', text: 'You are in jail!' });
      return;
    }

    try {
      setLoading(true);
      setCooldownCrimeId(robbery.id);
      
      // === BALANCED DYNAMIC JAIL CHANCE SYSTEM ===
      // Base success chance from the robbery
      let successChance = robbery.success_rate;
      
      // === CRIME DIFFICULTY FACTOR ===
      // Easy crimes (low level req) = safer, less police attention
      // Hard crimes (high level req) = riskier, more police attention
      // Level 1-10:   Petty crimes      +5%  (cops don't care much)
      // Level 11-30:  Standard crimes    0%  (normal police attention)
      // Level 31-60:  Serious crimes    -3%  (increased heat)
      // Level 61-100: Major crimes      -6%  (heavy police presence)
      // Level 101+:   Legendary heists -10%  (FBI/SWAT level)
      let crimeDifficultyMod = 0;
      const crimeLevel = robbery.min_level_required;
      if (crimeLevel <= 10) {
        crimeDifficultyMod = 5; // Petty crimes
      } else if (crimeLevel <= 30) {
        crimeDifficultyMod = 0; // Standard
      } else if (crimeLevel <= 60) {
        crimeDifficultyMod = -3; // Serious
      } else if (crimeLevel <= 100) {
        crimeDifficultyMod = -6; // Major
      } else {
        crimeDifficultyMod = -10; // Legendary (101+)
      }
      successChance += crimeDifficultyMod;
      
      // Level difference bonus/penalty
      const levelDifference = player.level - robbery.min_level_required;
      if (levelDifference >= 0) {
        // Higher level = better chance, but capped at +10%
        successChance += Math.min(levelDifference * 2, 10);
      } else {
        // Under-leveled = harder (-5% per level under)
        successChance += (levelDifference * 5);
      }
      
      // HP penalty for being low health
      const hpPercentage = player.hp / player.max_hp;
      if (hpPercentage < 0.5) {
        const hpPenalty = (0.5 - hpPercentage) * 20; // Max -10% at 0 HP
        successChance -= hpPenalty;
      }
      
      // === BALANCED: Daily catches penalty ===
      // Each catch today = -3% (resets at midnight)
      // This discourages spam but doesn't destroy your chances
      const dailyCatches = player.daily_catches || 0;
      const catchPenalty = Math.min(dailyCatches * 3, 15); // Max -15% from daily catches
      successChance -= catchPenalty;
      
      // === BALANCED: Wealth-based risk factor ===
      // Rich players attract slightly more attention
      // But it's mild - max -5% even for billionaires
      const totalWealth = (player.cash || 0) + (player.bank_balance || 0);
      let wealthPenalty = 0;
      if (totalWealth > 1000000) {
        // Logarithmic scale: $1M = -1%, $10M = -2%, $100M = -3%, $1B = -4%, max -5%
        wealthPenalty = Math.min(Math.floor(Math.log10(totalWealth / 1000000) + 1), 5);
        successChance -= wealthPenalty;
      }
      
      // === BALANCED: Level-based notoriety ===
      // High level = cops know your name, but mild penalty
      // Max -5% even at level 200
      let notorietyPenalty = 0;
      if (player.level > 20) {
        notorietyPenalty = Math.min(Math.floor((player.level - 20) * 0.1), 5);
        successChance -= notorietyPenalty;
      }
      
      // Clamp between 10% and 85%
      // Never impossible (min 10%), never too easy (max 85%)
      successChance = Math.max(10, Math.min(85, successChance));
      
      const roll = Math.random() * 100;
      const success = roll < successChance;

      const reward = success 
        ? Math.floor(Math.random() * (robbery.max_reward - robbery.base_reward) + robbery.base_reward)
        : 0;

      let updates = {
        stamina: player.stamina - robbery.stamina_cost,
        total_robberies: player.total_robberies + 1,
        xp: player.xp + (success ? robbery.xp_reward : Math.floor(robbery.xp_reward / 2))
      };

      if (success) {
        updates.cash = player.cash + reward;
        updates.successful_robberies = player.successful_robberies + 1;
        
        // Check for item drops
        const { data: drops } = await supabase
          .from('the_life_crime_drops')
          .select(`
            *,
            item:the_life_items(*)
          `)
          .eq('crime_id', robbery.id);

        const droppedItems = [];
        if (drops && drops.length > 0) {
          for (const drop of drops) {
            const dropRoll = Math.random() * 100;
            if (dropRoll < drop.drop_chance) {
              const quantity = Math.floor(Math.random() * (drop.max_quantity - drop.min_quantity + 1)) + drop.min_quantity;
              
              // Add item to inventory
              const { data: existingItem } = await supabase
                .from('the_life_player_inventory')
                .select('*')
                .eq('player_id', player.id)
                .eq('item_id', drop.item_id)
                .single();

              if (existingItem) {
                await supabase
                  .from('the_life_player_inventory')
                  .update({ quantity: existingItem.quantity + quantity })
                  .eq('id', existingItem.id);
              } else {
                await supabase
                  .from('the_life_player_inventory')
                  .insert({
                    player_id: player.id,
                    item_id: drop.item_id,
                    quantity: quantity
                  });
              }

              droppedItems.push(`${drop.item.name} x${quantity}`);
            }
          }
        }

        let successMessage = `Success! You earned $${reward.toLocaleString()} and ${robbery.xp_reward} XP! (${Math.round(successChance)}% chance)`;
        if (droppedItems.length > 0) {
          successMessage += `\n💎 You also found: ${droppedItems.join(', ')}`;
        }
        
        setMessage({ 
          type: 'success', 
          text: successMessage
        });
      } else {
        // === DYNAMIC JAIL TIME SYSTEM ===
        let jailMultiplier = 1;
        
        // === CRIME DIFFICULTY AFFECTS JAIL TIME ===
        // Easy crimes (low level req) = shorter sentences (petty theft)
        // Hard crimes (high level req) = longer sentences (major felonies)
        const crimeLevel = robbery.min_level_required;
        if (crimeLevel <= 10) {
          jailMultiplier *= 0.7; // -30% jail for petty crimes
        } else if (crimeLevel <= 30) {
          jailMultiplier *= 1.0; // Standard jail time
        } else if (crimeLevel <= 60) {
          jailMultiplier *= 1.2; // +20% jail for serious crimes
        } else if (crimeLevel <= 100) {
          jailMultiplier *= 1.4; // +40% jail for major crimes
        } else {
          jailMultiplier *= 1.7; // +70% jail for legendary heists (101+)
        }
        
        // Under-leveled = longer jail time
        if (levelDifference < 0) {
          jailMultiplier += (Math.abs(levelDifference) * 0.3);
        }
        
        // Low HP = longer jail (you're weaker, easier to catch)
        const hpPercentage = player.hp / player.max_hp;
        if (hpPercentage < 0.5) {
          jailMultiplier += (0.5 - hpPercentage) * 0.5;
        }
        
        // === NEW: Daily catches increase jail time ===
        // Each catch today adds +10% to jail time (max +30%)
        const currentDailyCatches = player.daily_catches || 0;
        jailMultiplier += Math.min(currentDailyCatches * 0.1, 0.3);
        
        // === NEW: Wealth-based jail time ===
        // Rich players get slightly longer sentences (courts are harsher)
        const totalWealth = (player.cash || 0) + (player.bank_balance || 0);
        if (totalWealth > 1000000) {
          // Logarithmic scale: $1M = 0%, $10M = ~17%, $100M = ~25%, $1B = ~30%
          const wealthMultiplier = Math.min(Math.log10(totalWealth / 1000000) * 0.1, 0.3); // Max +30%
          jailMultiplier += wealthMultiplier;
        }
        
        // === NEW: High level = more notorious = longer sentence ===
        if (player.level > 30) {
          // Starts at level 30, max +25% at level 150+
          jailMultiplier += Math.min((player.level - 30) * 0.002, 0.25); // Max +25%
        }
        
        // Calculate final jail time (minimum 5 mins, max 3x base)
        const jailTime = Math.max(5, Math.min(Math.floor(robbery.jail_time_minutes * jailMultiplier), robbery.jail_time_minutes * 3));
        const jailUntil = new Date();
        jailUntil.setMinutes(jailUntil.getMinutes() + jailTime);
        const newHP = Math.max(0, player.hp - robbery.hp_loss_on_fail);
        updates.hp = newHP;
        
        // === NEW: Track daily catches ===
        // Reset if it's a new day
        const lastCatchReset = player.last_catch_reset ? new Date(player.last_catch_reset) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (!lastCatchReset || lastCatchReset < today) {
          updates.daily_catches = 1;
          updates.last_catch_reset = today.toISOString().split('T')[0];
        } else {
          updates.daily_catches = (player.daily_catches || 0) + 1;
        }
        updates.total_times_caught = (player.total_times_caught || 0) + 1;
        
        // If HP reaches 0, send to hospital instead of jail
        if (newHP === 0) {
          const hospitalUntil = new Date();
          hospitalUntil.setMinutes(hospitalUntil.getMinutes() + 30);
          updates.hospital_until = hospitalUntil.toISOString();
          setMessage({ 
            type: 'error', 
            text: `Failed! You ran out of HP and are sent to hospital for 30 minutes! (${Math.round(successChance)}% chance)` 
          });
        } else {
          updates.jail_until = jailUntil.toISOString();
          const catchCount = updates.daily_catches;
          const catchWarning = catchCount > 1 ? ` 🔴 Caught ${catchCount}x today!` : '';
          setMessage({ 
            type: 'error', 
            text: `Failed! You're in jail for ${jailTime} min (-${robbery.hp_loss_on_fail} HP).${catchWarning} [${Math.round(successChance)}% success]` 
          });
        }
        
        showEventMessage('jail_crime');
      }

      const xpForNextLevel = player.level * 100;
      if (updates.xp >= xpForNextLevel) {
        updates.level = player.level + 1;
        updates.xp = updates.xp - xpForNextLevel;
        setMessage({ 
          type: 'success', 
          text: `Level Up! You are now level ${updates.level}!` 
        });
      }

      const { data, error } = await supabase
        .from('the_life_players')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      let jailMultiplierForLog = levelDifference < 0 ? 1 + (Math.abs(levelDifference) * 0.5) : 1;
      const actualJailTime = success ? 0 : Math.floor(robbery.jail_time_minutes * jailMultiplierForLog);
      const xpEarned = success ? robbery.xp_reward : Math.floor(robbery.xp_reward / 2);
      
      await supabase.from('the_life_robbery_history').insert({
        player_id: player.id,
        robbery_id: robbery.id,
        success,
        reward,
        xp_gained: xpEarned,
        jail_time_minutes: actualJailTime
      });

      // Add XP to Season Pass
      await addSeasonPassXP(user.id, xpEarned, 'crime', robbery.id.toString());

      setPlayer(data);
    } catch (err) {
      console.error('Error attempting robbery:', err);
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      // Set cooldown for 3 seconds to show full video animation
      setTimeout(() => {
        setLoading(false);
        setCooldownCrimeId(null);
      }, 3000);
    }
  };

  return (
    <div className="crimes-section">
      <div className="crimes-scroll-container">
        <button 
          className="scroll-arrow scroll-arrow-left" 
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ←
        </button>
        <div 
          className="robberies-grid" 
          ref={scrollContainerRef}
          {...dragScroll}
        >
          {robberies.map(robbery => {
          const defaultImage = 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=500';
          const imageUrl = robbery.image_url || defaultImage;
          
          const levelDifference = player.level - robbery.min_level_required;
          let displaySuccessChance = robbery.success_rate;
          if (levelDifference >= 0) {
            displaySuccessChance += (levelDifference * 5);
          } else {
            displaySuccessChance += (levelDifference * 10);
          }
          
          const hpPercentage = player.hp / player.max_hp;
          if (hpPercentage < 0.5) {
            const hpPenalty = (0.5 - hpPercentage) * 30;
            displaySuccessChance -= hpPenalty;
          }
          
          displaySuccessChance = Math.max(5, Math.min(95, displaySuccessChance));
          
          const isLoading = loading && cooldownCrimeId === robbery.id;
          const isDisabled = player.level < robbery.min_level_required || isInJail || isInHospital || player.stamina < robbery.stamina_cost || loading;
          
          return (
            <div 
              key={robbery.id} 
              className={`crime-card ${player.level < robbery.min_level_required ? 'locked' : ''} ${isLoading ? 'loading' : ''}`}
            >
              {isLoading && (
                <div className="loading-overlay">
                  <video 
                    className="crime-loading-video"
                    autoPlay 
                    loop
                    muted 
                    playsInline
                    src={`/crime-videos/${robbery.name.toLowerCase().replace(/\s+/g, '-')}.webm`}
                    onError={(e) => {
                      // Fallback to default video if crime-specific video doesn't exist
                      e.target.src = '/crime-videos/default-crime.webm';
                    }}
                  />
                  <span>Committing Crime...</span>
                </div>
              )}
              <div 
                className="crime-image-container"
              >
                <img src={imageUrl} alt={robbery.name} className="crime-image" />
                {player.level < robbery.min_level_required && (
                  <div className="locked-overlay">
                    <span>🔒 Level {robbery.min_level_required} Required</span>
                  </div>
                )}
                <div className="crime-overlay-top">
                  <h3 className="crime-title">{robbery.name}</h3>
                  <div className="crime-inline-stats">
                    <span className="inline-stat">⚡ {robbery.stamina_cost}</span>
                    <span className="inline-stat">✅ {Math.round(displaySuccessChance)}%</span>
                  </div>
                </div>
              </div>
              <button 
                className="crime-button"
                onClick={(e) => {
                  e.stopPropagation();
                  attemptRobbery(robbery);
                }}
                disabled={isDisabled}
              >
                {isLoading ? '⏳ Processing...' : player.level < robbery.min_level_required ? '🔒 Locked' : 'Commit Crime'}
              </button>
            </div>
          );
        })}
        </div>
        <button 
          className="scroll-arrow scroll-arrow-right" 
          onClick={() => scroll('right')}
          aria-label="Scroll right"
        >
          →
        </button>
      </div>
    </div>
  );
}
