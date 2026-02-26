import { supabase } from '../../../config/supabaseClient';
import { useRef, useState } from 'react';
import { useDragScroll } from '../hooks/useDragScroll';
import { addSeasonPassXP } from '../hooks/useSeasonPassXP';
import '../styles/TheLifeCrimes.css';

/**
 * Crimes Category Component
 * Handles all crime-related actions and UI
 * 
 * SECURITY: All crime calculations happen server-side via RPC
 */
export default function TheLifeCrimes({ 
  player, 
  setPlayer,
  setPlayerFromAction, 
  robberies, 
  setMessage, 
  showEventMessage,
  user,
  isInJail,
  isInHospital,
  loadTheLifeInventory 
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

  // Display-only calculation for UI (actual success calculated server-side)
  const calculateDisplaySuccessChance = (robbery) => {
    // This is ONLY for display purposes - the real roll happens server-side
    let successChance = robbery.success_rate;
    
    const crimeLevel = robbery.min_level_required;
    if (crimeLevel <= 10) {
      successChance += 5;
    } else if (crimeLevel <= 30) {
      successChance += 0;
    } else if (crimeLevel <= 60) {
      successChance -= 3;
    } else if (crimeLevel <= 100) {
      successChance -= 6;
    } else {
      successChance -= 10;
    }
    
    const levelDifference = player.level - robbery.min_level_required;
    if (levelDifference >= 0) {
      successChance += Math.min(levelDifference * 2, 10);
    } else {
      successChance += (levelDifference * 5);
    }
    
    const hpPercentage = player.hp / player.max_hp;
    if (hpPercentage < 0.5) {
      const hpPenalty = (0.5 - hpPercentage) * 20;
      successChance -= hpPenalty;
    }
    
    const dailyCatches = player.daily_catches || 0;
    const catchPenalty = Math.min(dailyCatches * 3, 15);
    successChance -= catchPenalty;
    
    const totalWealth = (player.cash || 0) + (player.bank_balance || 0);
    if (totalWealth > 1000000) {
      const wealthPenalty = Math.min(Math.floor(Math.log10(totalWealth / 1000000) + 1), 5);
      successChance -= wealthPenalty;
    }
    
    if (player.level > 20) {
      const notorietyPenalty = Math.min(Math.floor((player.level - 20) * 0.1), 5);
      successChance -= notorietyPenalty;
    }
    
    return Math.max(10, Math.min(85, successChance));
  };

  // SECURE: Use server-side RPC for crime execution
  const attemptRobbery = async (robbery) => {
    // Prevent spam clicking
    if (loading || cooldownCrimeId === robbery.id) {
      return;
    }

    // Client-side checks (server validates these too)
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

      // Call secure server-side function
      const { data: result, error } = await supabase.rpc('execute_crime_rate_limited', {
        p_crime_id: robbery.id
      });

      if (error) throw error;

      if (!result.success && result.error) {
        // Rate limited or validation error
        setMessage({ type: 'error', text: result.error });
        return;
      }

      // Process server response
      const crimeResult = result;
      
      if (crimeResult.crime_success) {
        // Successful crime
        let successMessage = `Success! You earned $${crimeResult.reward?.toLocaleString() || 0} and ${crimeResult.xp_gained || 0} XP! (${Math.round(crimeResult.success_chance)}% chance)`;
        
        // Handle item drops if any
        if (crimeResult.dropped_items && crimeResult.dropped_items.length > 0) {
          successMessage += `\n💎 You also found: ${crimeResult.dropped_items.join(', ')}`;
          if (loadTheLifeInventory) {
            loadTheLifeInventory();
          }
        }
        
        setMessage({ type: 'success', text: successMessage });
        
        // Check for level up
        if (crimeResult.leveled_up) {
          setMessage({ 
            type: 'success', 
            text: `Level Up! You are now level ${crimeResult.new_level}!` 
          });
        }
      } else {
        // Failed crime
        if (crimeResult.in_hospital) {
          setMessage({ 
            type: 'error', 
            text: `Failed! You ran out of HP and are sent to hospital for 30 minutes! (${Math.round(crimeResult.success_chance)}% chance)` 
          });
        } else {
          const catchCount = crimeResult.daily_catches || 1;
          const catchWarning = catchCount > 1 ? ` 🔴 Caught ${catchCount}x today!` : '';
          setMessage({ 
            type: 'error', 
            text: `Failed! You're in jail for ${crimeResult.jail_time || 0} min (-${crimeResult.hp_lost || 0} HP).${catchWarning} [${Math.round(crimeResult.success_chance)}% success]` 
          });
        }
        
        showEventMessage('jail_crime');
      }

      // Refresh player data from server
      const { data: updatedPlayer, error: fetchError } = await supabase
        .from('the_life_players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!fetchError && updatedPlayer) {
        setPlayerFromAction(updatedPlayer);
      }

      // Add XP to Season Pass
      if (crimeResult.xp_gained > 0) {
        await addSeasonPassXP(user.id, crimeResult.xp_gained, 'crime', robbery.id.toString());
      }

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
          
          // Use display calculation function for UI (actual roll is server-side)
          const displaySuccessChance = calculateDisplaySuccessChance(robbery);
          
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
