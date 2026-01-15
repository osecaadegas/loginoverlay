import { supabase } from '../../../config/supabaseClient';
import { useRef, useState } from 'react';
import { useDragScroll } from '../hooks/useDragScroll';
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
      const levelDifference = player.level - robbery.min_level_required;
      let successChance = robbery.success_rate;
      
      if (levelDifference >= 0) {
        successChance += (levelDifference * 5);
      } else {
        successChance += (levelDifference * 10);
      }
      
      const hpPercentage = player.hp / player.max_hp;
      if (hpPercentage < 0.5) {
        const hpPenalty = (0.5 - hpPercentage) * 30;
        successChance -= hpPenalty;
      }
      
      successChance = Math.max(5, Math.min(95, successChance));
      
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
        const levelDifference = player.level - robbery.min_level_required;
        let jailMultiplier = 1;
        
        if (levelDifference < 0) {
          jailMultiplier = 1 + (Math.abs(levelDifference) * 0.5);
        }
        
        const hpPercentage = player.hp / player.max_hp;
        if (hpPercentage < 0.5) {
          const hpPenalty = (0.5 - hpPercentage) * 1.0;
          jailMultiplier += hpPenalty;
        }
        
        const jailTime = Math.floor(robbery.jail_time_minutes * jailMultiplier);
        const jailUntil = new Date();
        jailUntil.setMinutes(jailUntil.getMinutes() + jailTime);
        const newHP = Math.max(0, player.hp - robbery.hp_loss_on_fail);
        updates.hp = newHP;
        
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
          setMessage({ 
            type: 'error', 
            text: `Failed! You're in jail for ${jailTime} minutes and lost ${robbery.hp_loss_on_fail} HP (${Math.round(successChance)}% chance)` 
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
      
      await supabase.from('the_life_robbery_history').insert({
        player_id: player.id,
        robbery_id: robbery.id,
        success,
        reward,
        xp_gained: success ? robbery.xp_reward : Math.floor(robbery.xp_reward / 2),
        jail_time_minutes: actualJailTime
      });

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
                onClick={() => {
                  if (!isDisabled) {
                    attemptRobbery(robbery);
                  }
                }}
                style={{
                  cursor: isDisabled ? 'not-allowed' : 'pointer'
                }}
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
                <div className="crime-tap-hint">
                  👆 Tap to Commit Crime
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
