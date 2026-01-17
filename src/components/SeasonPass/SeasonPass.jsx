import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStreamElements } from '../../context/StreamElementsContext';
import { supabase } from '../../config/supabaseClient';
import './SeasonPass.css';

/**
 * Season Pass / The Syndicate - Underground Battle Pass
 * 70 Tiers with Budget (SE Points) and Premium (Stripe) tracks
 */
export default function SeasonPass() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points: userPoints, updateUserPoints } = useStreamElements();
  
  // State
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState(null);
  const [seasonData, setSeasonData] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [playerProgress, setPlayerProgress] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [seasonEnded, setSeasonEnded] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectedItem, setInspectedItem] = useState(null);
  const [claimingTier, setClaimingTier] = useState(null);
  const [message, setMessage] = useState(null);
  
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });

  // XP required per tier (scales up)
  const getXPForTier = (tier) => {
    // Base 500 XP, increases by 100 per tier
    return 500 + (tier - 1) * 100;
  };

  // Calculate current tier from total XP
  const calculateTierFromXP = (totalXP) => {
    let xpRemaining = totalXP;
    let tier = 0;
    
    while (xpRemaining >= getXPForTier(tier + 1) && tier < 70) {
      xpRemaining -= getXPForTier(tier + 1);
      tier++;
    }
    
    return {
      currentTier: tier,
      xpInCurrentTier: xpRemaining,
      xpRequiredForNext: tier < 70 ? getXPForTier(tier + 1) : 0
    };
  };

  // Load season data and player progress
  useEffect(() => {
    if (!user) return;
    loadSeasonData();
  }, [user]);

  // Countdown timer for season end
  useEffect(() => {
    if (!seasonData?.end_date) return;

    const updateTimer = () => {
      const now = new Date();
      const endDate = new Date(seasonData.end_date);
      const diff = endDate - now;

      if (diff <= 0) {
        setSeasonEnded(true);
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [seasonData]);

  const loadSeasonData = async () => {
    try {
      setLoading(true);

      // Get wipe settings for season end date
      const { data: wipeData } = await supabase
        .from('the_life_wipe_settings')
        .select('scheduled_at, is_active')
        .single();

      // Get current season data
      let { data: season } = await supabase
        .from('season_pass_seasons')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!season) {
        // Create default season if none exists
        season = {
          id: 1,
          season_number: 1,
          name: 'Underground Empire',
          end_date: wipeData?.scheduled_at || null,
          is_active: true
        };
      } else if (wipeData?.scheduled_at) {
        // Sync season end with wipe timer
        season.end_date = wipeData.scheduled_at;
      }

      setSeasonData(season);

      // Get all tier rewards
      const { data: tierData } = await supabase
        .from('season_pass_tiers')
        .select(`
          *,
          budget_reward:season_pass_rewards!season_pass_tiers_budget_reward_id_fkey(*),
          premium_reward:season_pass_rewards!season_pass_tiers_premium_reward_id_fkey(*)
        `)
        .eq('season_id', season.id)
        .order('tier_number', { ascending: true });

      // Generate 70 tiers if not enough in database
      const allTiers = generateTiersWithData(tierData || [], 70);
      setTiers(allTiers);

      // Get player progress
      const { data: progress } = await supabase
        .from('season_pass_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('season_id', season.id)
        .single();

      if (progress) {
        setPlayerProgress({
          ...progress,
          ...calculateTierFromXP(progress.total_xp || 0)
        });
      } else {
        // Create initial progress
        const { data: newProgress } = await supabase
          .from('season_pass_progress')
          .insert({
            user_id: user.id,
            season_id: season.id,
            total_xp: 0,
            has_premium: false,
            claimed_budget_tiers: [],
            claimed_premium_tiers: []
          })
          .select()
          .single();

        setPlayerProgress({
          ...(newProgress || { total_xp: 0, has_premium: false, claimed_budget_tiers: [], claimed_premium_tiers: [] }),
          currentTier: 0,
          xpInCurrentTier: 0,
          xpRequiredForNext: getXPForTier(1)
        });
      }

      // Get player data for display
      const { data: player } = await supabase
        .from('the_life_players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setPlayerData(player);

    } catch (error) {
      console.error('Error loading season data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate placeholder tiers with database data where available
  const generateTiersWithData = (dbTiers, totalTiers) => {
    const tiers = [];
    const dbTierMap = {};
    
    dbTiers.forEach(t => {
      dbTierMap[t.tier_number] = t;
    });

    const defaultIcons = ['fa-gift', 'fa-money-bill-wave', 'fa-gem', 'fa-box', 'fa-bolt', 'fa-star'];
    const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

    for (let i = 1; i <= totalTiers; i++) {
      if (dbTierMap[i]) {
        tiers.push(dbTierMap[i]);
      } else {
        // Generate placeholder tier
        const rarity = i % 10 === 0 ? 'legendary' : 
                       i % 5 === 0 ? 'epic' : 
                       i % 3 === 0 ? 'rare' : 
                       i % 2 === 0 ? 'uncommon' : 'common';
        
        tiers.push({
          tier_number: i,
          budget_reward: {
            id: `placeholder-budget-${i}`,
            name: `Tier ${i} Reward`,
            type: 'Currency',
            icon: defaultIcons[i % defaultIcons.length],
            rarity: rarity === 'legendary' ? 'rare' : rarity === 'epic' ? 'uncommon' : 'common',
            quantity: 1000 * i
          },
          premium_reward: {
            id: `placeholder-premium-${i}`,
            name: `Premium Tier ${i}`,
            type: 'Exclusive',
            icon: defaultIcons[(i + 2) % defaultIcons.length],
            rarity: rarity,
            quantity: 1
          },
          xp_required: getXPForTier(i)
        });
      }
    }

    return tiers;
  };

  // Claim tier reward
  const claimReward = async (tierNumber, track) => {
    if (seasonEnded) {
      setMessage({ type: 'error', text: 'Season has ended! Rewards can no longer be claimed.' });
      return;
    }

    if (!playerProgress || playerProgress.currentTier < tierNumber) {
      setMessage({ type: 'error', text: 'You haven\'t reached this tier yet!' });
      return;
    }

    const claimedKey = track === 'budget' ? 'claimed_budget_tiers' : 'claimed_premium_tiers';
    const alreadyClaimed = playerProgress[claimedKey]?.includes(tierNumber);

    if (alreadyClaimed) {
      setMessage({ type: 'error', text: 'Already claimed!' });
      return;
    }

    if (track === 'premium' && !playerProgress.has_premium) {
      setMessage({ type: 'error', text: 'Premium track required! Purchase to unlock.' });
      return;
    }

    if (track === 'budget' && !playerProgress.has_budget) {
      setMessage({ type: 'error', text: 'Budget track required! Purchase to unlock.' });
      return;
    }

    try {
      setClaimingTier({ tier: tierNumber, track });

      // Get the tier reward
      const tier = tiers.find(t => t.tier_number === tierNumber);
      const reward = track === 'budget' ? tier.budget_reward : tier.premium_reward;

      // Grant reward to player (add to inventory, give cash, etc.)
      await grantReward(reward);

      // Update claimed tiers
      const newClaimedTiers = [...(playerProgress[claimedKey] || []), tierNumber];
      
      await supabase
        .from('season_pass_progress')
        .update({ [claimedKey]: newClaimedTiers })
        .eq('user_id', user.id)
        .eq('season_id', seasonData.id);

      setPlayerProgress(prev => ({
        ...prev,
        [claimedKey]: newClaimedTiers
      }));

      setMessage({ type: 'success', text: `Claimed: ${reward.name}!` });
      setShowInspectModal(false);

    } catch (error) {
      console.error('Error claiming reward:', error);
      setMessage({ type: 'error', text: 'Failed to claim reward' });
    } finally {
      setClaimingTier(null);
    }
  };

  // Grant reward to player based on type
  const grantReward = async (reward) => {
    if (!reward) return;

    switch (reward.type?.toLowerCase()) {
      case 'currency':
      case 'cash':
        // Add cash to player
        await supabase
          .from('the_life_players')
          .update({ cash: (playerData?.cash || 0) + (reward.quantity || 0) })
          .eq('user_id', user.id);
        break;

      case 'item':
      case 'weapon':
      case 'gear':
        // Add item to inventory
        if (reward.item_id) {
          const { data: existingItem } = await supabase
            .from('the_life_inventory')
            .select('*')
            .eq('user_id', user.id)
            .eq('item_id', reward.item_id)
            .single();

          if (existingItem) {
            await supabase
              .from('the_life_inventory')
              .update({ quantity: existingItem.quantity + (reward.quantity || 1) })
              .eq('id', existingItem.id);
          } else {
            await supabase
              .from('the_life_inventory')
              .insert({
                user_id: user.id,
                item_id: reward.item_id,
                quantity: reward.quantity || 1
              });
          }
        }
        break;

      case 'xp':
        // Add XP to player
        await supabase
          .from('the_life_players')
          .update({ xp: (playerData?.xp || 0) + (reward.quantity || 0) })
          .eq('user_id', user.id);
        break;

      default:
        console.log('Unknown reward type:', reward.type);
    }
  };

  // Purchase Premium track via Stripe
  const purchasePremium = async () => {
    try {
      if (!session?.user) {
        setMessage({ type: 'error', text: 'You must be logged in to purchase Premium' });
        return;
      }

      setMessage({ type: 'info', text: 'Redirecting to checkout...' });

      // Call the Stripe checkout API
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          seasonId: currentSeason?.id || 1,
          priceId: import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID, // Optional: for Stripe Price ID
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error purchasing premium:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to start purchase' });
    }
  };

  // Purchase Budget track via SE Points
  const purchaseBudget = async () => {
    try {
      if (!user) {
        setMessage({ type: 'error', text: 'You must be logged in to purchase Budget' });
        return;
      }

      const budgetCost = seasonData?.budget_price_points || 5000;

      if (userPoints < budgetCost) {
        setMessage({ type: 'error', text: `Not enough SE Points! You need ${budgetCost.toLocaleString()} points.` });
        return;
      }

      setMessage({ type: 'info', text: 'Processing purchase...' });

      // Deduct SE Points (negative amount to subtract)
      const deductResult = await updateUserPoints(-budgetCost);
      
      if (!deductResult || !deductResult.success) {
        throw new Error(deductResult?.error || 'Failed to deduct points');
      }

      // Update database to mark budget as purchased
      const { error: updateError } = await supabase
        .from('season_pass_progress')
        .update({ 
          has_budget: true,
          budget_purchased_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('season_id', seasonData?.id || 1);

      if (updateError) {
        console.error('Error updating budget status:', updateError);
        throw new Error('Failed to update budget status');
      }

      // Update local state
      setPlayerProgress(prev => ({
        ...prev,
        has_budget: true,
        budget_purchased_at: new Date().toISOString()
      }));

      setMessage({ type: 'success', text: '🎉 Budget Pass purchased successfully!' });
    } catch (error) {
      console.error('Error purchasing budget:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to purchase Budget Pass' });
    }
  };

  // Drag scroll handlers
  const handleMouseDown = (e) => {
    if (!trackRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.pageX - trackRef.current.offsetLeft,
      scrollLeft: trackRef.current.scrollLeft
    });
    trackRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    const walk = (x - dragStart.x) * 2;
    trackRef.current.scrollLeft = dragStart.scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (trackRef.current) {
      trackRef.current.style.cursor = 'grab';
    }
  };

  const handleWheel = (e) => {
    if (!trackRef.current) return;
    e.preventDefault();
    trackRef.current.scrollLeft += e.deltaY;
  };

  // Open item inspection modal
  const inspectItem = (tier, track) => {
    if (isDragging) return;
    const reward = track === 'budget' ? tier.budget_reward : tier.premium_reward;
    setInspectedItem({
      tier,
      track,
      reward,
      isReached: playerProgress?.currentTier >= tier.tier_number,
      isClaimed: track === 'budget' 
        ? playerProgress?.claimed_budget_tiers?.includes(tier.tier_number)
        : playerProgress?.claimed_premium_tiers?.includes(tier.tier_number)
    });
    setShowInspectModal(true);
  };

  // Scroll to current tier on load
  useEffect(() => {
    if (!loading && trackRef.current && playerProgress) {
      const segmentWidth = 220;
      const targetScroll = Math.max(0, (playerProgress.currentTier - 2) * segmentWidth);
      trackRef.current.scrollLeft = targetScroll;
    }
  }, [loading, playerProgress]);

  // Get rarity color
  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return '#fbbf24';
      case 'epic': return '#a855f7';
      case 'rare': return '#3b82f6';
      case 'uncommon': return '#22c55e';
      default: return '#94a3b8';
    }
  };

  if (loading) {
    return (
      <div className="season-pass-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading The Syndicate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="season-pass-container">
      {/* Atmospheric Background */}
      <div className="fog-container">
        <div className="fog-img"></div>
        <div className="fog-overlay-gradient"></div>
        <div className="fog-carbon-texture"></div>
      </div>

      {/* Top Navigation HUD */}
      <header className="season-pass-header glass-hud">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/games/thelife')}>
            <i className="fas fa-arrow-left"></i>
            <span>Back to Game</span>
          </button>
          <div className="header-divider"></div>
          <div className="glitch-effect" data-text="THE SYNDICATE">THE SYNDICATE</div>
        </div>

        <div className="header-right">
          <div className="season-timer">
            <span className="timer-label">Season {seasonData?.season_number || 1} Ends In</span>
            {seasonEnded ? (
              <span className="timer-ended">SEASON ENDED</span>
            ) : timeRemaining ? (
              <span className="timer-value">
                {timeRemaining.days}D : {String(timeRemaining.hours).padStart(2, '0')}H : {String(timeRemaining.minutes).padStart(2, '0')}M
              </span>
            ) : (
              <span className="timer-value">--:--:--</span>
            )}
          </div>
          
          {/* Budget Button - SE Points */}
          {!playerProgress?.has_budget && (
            <button className="get-budget-btn" onClick={purchaseBudget}>
              <i className="fas fa-coins"></i>
              <span>GET BUDGET</span>
              <span className="budget-cost">{(seasonData?.budget_price_points || 5000).toLocaleString()} pts</span>
            </button>
          )}
          
          {playerProgress?.has_budget && !playerProgress?.has_premium && (
            <div className="budget-badge">
              <i className="fas fa-check-circle"></i>
              <span>BUDGET</span>
            </div>
          )}
          
          {!playerProgress?.has_premium && (
            <button className="get-premium-btn" onClick={purchasePremium}>
              <span>GET PREMIUM</span>
            </button>
          )}
          
          {playerProgress?.has_premium && (
            <div className="premium-badge">
              <i className="fas fa-crown"></i>
              <span>PREMIUM</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="season-pass-main">
        {/* Left Side Info Panel */}
        <div className="info-panel">
          <h2 className="season-title">
            {(seasonData?.name || 'Underground Empire').split(' ')[0]}<br/>
            <span className="season-title-accent">{(seasonData?.name || 'Underground Empire').split(' ').slice(1).join(' ') || 'Empire'}</span>
          </h2>
          <div className="title-line"></div>
          <p className="season-description">
            Rise through the criminal ranks. Earn exclusive contraband, weapons, and safehouse upgrades.
          </p>
        </div>

        {/* Bottom Center XP Bar */}
        <div className="xp-bar-container">
          <div className="rank-widget">
            <div className="rank-header">
              <span className="rank-label">Current Tier</span>
              <span className="rank-number">{playerProgress?.currentTier || 0}</span>
            </div>
            <div className="xp-bar">
              <div 
                className="xp-fill" 
                style={{ 
                  width: playerProgress?.xpRequiredForNext 
                    ? `${(playerProgress.xpInCurrentTier / playerProgress.xpRequiredForNext) * 100}%` 
                    : '0%' 
                }}
              ></div>
            </div>
            <div className="xp-text">
              <span>{playerProgress?.xpInCurrentTier || 0} XP</span>
              <span>{playerProgress?.xpRequiredForNext || getXPForTier(1)} XP</span>
            </div>
          </div>
        </div>

        {/* The Battle Pass Track Area */}
        <div className="track-area">
          {/* Track Labels */}
          <div className="track-labels">
            <div className="track-label premium-label">
              <div className="label-text">PREMIUM</div>
              <div className="label-sub">Exclusive Rewards</div>
            </div>
            <div className="track-label budget-label">
              <div className="label-text">BUDGET</div>
              <div className="label-sub">SE Points Track</div>
            </div>
          </div>

          {/* Scrollable Track */}
          <div 
            className="track-wrapper"
            ref={trackRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {tiers.map((tier) => {
              const isReached = playerProgress?.currentTier >= tier.tier_number;
              const budgetClaimed = playerProgress?.claimed_budget_tiers?.includes(tier.tier_number);
              const premiumClaimed = playerProgress?.claimed_premium_tiers?.includes(tier.tier_number);

              return (
                <div 
                  key={tier.tier_number} 
                  className={`level-segment ${isReached ? 'reached' : ''}`}
                >
                  {/* Connector Line */}
                  <div className={`connector-line ${isReached ? 'active' : ''}`}></div>

                  {/* Premium Card (Top) */}
                  <div 
                    className={`item-card premium rarity-${tier.premium_reward?.rarity || 'common'}`}
                    onClick={() => inspectItem(tier, 'premium')}
                  >
                    <div className="card-texture"></div>
                    <div className="rarity-glow" style={{ '--r-color': getRarityColor(tier.premium_reward?.rarity) }}></div>
                    
                    {tier.premium_reward?.image_url ? (
                      <div className="card-image">
                        <img src={tier.premium_reward.image_url} alt={tier.premium_reward.name} />
                      </div>
                    ) : (
                      <div className="card-content">
                        <i 
                          className={`fas ${tier.premium_reward?.icon || 'fa-gift'}`}
                          style={{ color: tier.premium_reward?.rarity === 'legendary' ? '#fbbf24' : '#e5e7eb' }}
                        ></i>
                      </div>
                    )}
                    <div className="card-info">
                      <div className="item-type">{tier.premium_reward?.type || 'Reward'}</div>
                      <div className="item-name">{tier.premium_reward?.name || `Tier ${tier.tier_number}`}</div>
                    </div>

                    {!isReached && (
                      <div className="status-overlay">
                        <i className="fas fa-lock"></i>
                      </div>
                    )}
                    {isReached && premiumClaimed && (
                      <div className="status-overlay claimed">
                        <div className="claimed-stamp">TAKEN</div>
                      </div>
                    )}
                    {isReached && !premiumClaimed && !playerProgress?.has_premium && (
                      <div className="status-overlay premium-locked">
                        <i className="fas fa-crown"></i>
                      </div>
                    )}
                  </div>

                  {/* Level Badge (Middle) */}
                  <div className="level-pylon"></div>
                  <div className={`level-badge ${isReached ? 'reached' : ''}`}>
                    <span>{tier.tier_number}</span>
                  </div>

                  {/* Budget Card (Bottom) */}
                  <div 
                    className={`item-card budget rarity-${tier.budget_reward?.rarity || 'common'}`}
                    onClick={() => inspectItem(tier, 'budget')}
                  >
                    <div className="card-texture"></div>
                    <div className="rarity-glow" style={{ '--r-color': getRarityColor(tier.budget_reward?.rarity) }}></div>
                    
                    {tier.budget_reward?.image_url ? (
                      <div className="card-image">
                        <img src={tier.budget_reward.image_url} alt={tier.budget_reward.name} />
                      </div>
                    ) : (
                      <div className="card-content">
                        <i 
                          className={`fas ${tier.budget_reward?.icon || 'fa-gift'}`}
                          style={{ color: '#94a3b8' }}
                        ></i>
                      </div>
                    )}
                    <div className="card-info">
                      <div className="item-type">{tier.budget_reward?.type || 'Reward'}</div>
                      <div className="item-name">{tier.budget_reward?.name || `Tier ${tier.tier_number}`}</div>
                    </div>

                    {!isReached && (
                      <div className="status-overlay">
                        <i className="fas fa-lock"></i>
                      </div>
                    )}
                    {isReached && budgetClaimed && (
                      <div className="status-overlay claimed">
                        <div className="claimed-stamp">TAKEN</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* End padding */}
            <div className="track-end-padding"></div>
          </div>

          {/* Right Fade Gradient */}
          <div className="track-fade-right"></div>
        </div>

        {/* Bottom Legend */}
        <footer className="season-pass-footer">
          <div className="rarity-legend">
            <div className="legend-item"><div className="dot common"></div> Common</div>
            <div className="legend-item"><div className="dot uncommon"></div> Uncommon</div>
            <div className="legend-item"><div className="dot rare"></div> Rare</div>
            <div className="legend-item"><div className="dot epic"></div> Epic</div>
            <div className="legend-item"><div className="dot legendary"></div> Legendary</div>
          </div>
          <div className="scroll-hint">
            <span>Scroll to Navigate</span>
            <span className="hint-controls">[DRAG or WHEEL]</span>
          </div>
        </footer>
      </main>

      {/* Inspection Modal */}
      {showInspectModal && inspectedItem && (
        <div className="inspect-overlay" onClick={() => setShowInspectModal(false)}>
          <div className="inspect-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowInspectModal(false)}>
              <i className="fas fa-times"></i>
            </button>

            <div className="modal-content" style={{ '--rarity-color': getRarityColor(inspectedItem.reward?.rarity) }}>
              <div className="modal-bg-glow"></div>
              
              <div className="modal-type">{inspectedItem.reward?.type || 'Reward'}</div>
              <h2 className="modal-name">{inspectedItem.reward?.name || 'Unknown'}</h2>
              
              <div className="modal-icon-container">
                <i 
                  className={`fas ${inspectedItem.reward?.icon || 'fa-gift'}`}
                  style={{ color: getRarityColor(inspectedItem.reward?.rarity) }}
                ></i>
              </div>

              <div className="modal-details">
                <div className="detail-row">
                  <span className="detail-label">Tier</span>
                  <span className="detail-value">{inspectedItem.tier.tier_number}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Track</span>
                  <span className="detail-value" style={{ color: inspectedItem.track === 'premium' ? '#fbbf24' : '#94a3b8' }}>
                    {inspectedItem.track === 'premium' ? 'Premium' : 'Budget'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Rarity</span>
                  <span className="detail-value" style={{ color: getRarityColor(inspectedItem.reward?.rarity) }}>
                    {inspectedItem.reward?.rarity?.charAt(0).toUpperCase() + inspectedItem.reward?.rarity?.slice(1) || 'Common'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">
                    {inspectedItem.isClaimed ? 'Claimed' : inspectedItem.isReached ? 'Available' : 'Locked'}
                  </span>
                </div>
                {inspectedItem.reward?.quantity && (
                  <div className="detail-row">
                    <span className="detail-label">Amount</span>
                    <span className="detail-value">{inspectedItem.reward.quantity.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {seasonEnded ? (
                <button className="modal-action disabled">
                  Season Ended
                </button>
              ) : inspectedItem.isClaimed ? (
                <button className="modal-action disabled">
                  Already Claimed
                </button>
              ) : !inspectedItem.isReached ? (
                <button className="modal-action disabled">
                  Tier Not Reached (Need Tier {inspectedItem.tier.tier_number})
                </button>
              ) : inspectedItem.track === 'premium' && !playerProgress?.has_premium ? (
                <button className="modal-action premium-required" onClick={purchasePremium}>
                  <i className="fas fa-crown"></i> Unlock Premium to Claim
                </button>
              ) : (
                <button 
                  className="modal-action claim"
                  onClick={() => claimReward(inspectedItem.tier.tier_number, inspectedItem.track)}
                  disabled={claimingTier}
                >
                  {claimingTier ? 'Claiming...' : 'Claim Reward'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Toast */}
      {message && (
        <div className={`toast-message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}
    </div>
  );
}
