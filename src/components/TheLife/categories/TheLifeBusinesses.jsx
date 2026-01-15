import { supabase } from '../../../config/supabaseClient';
import { getMaxBusinessSlots, getUpgradeCost } from '../utils/gameUtils';
import { useRef, useState } from 'react';
import '../styles/TheLifeBusinesses.css';

/**
 * Businesses Category Component
 * Handles business purchase, operations, upgrades, and sales
 */
export default function TheLifeBusinesses({ 
  player,
  setPlayer,
  businesses,
  ownedBusinesses,
  drugOps,
  setDrugOps,
  setMessage,
  loadOwnedBusinesses,
  loadDrugOps,
  isInHospital,
  user
}) {
  const scrollContainerRef = useRef(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [infoPopupData, setInfoPopupData] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [inputQuantity, setInputQuantity] = useState(1);
  const [maxQuantity, setMaxQuantity] = useState(1);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  const buyBusiness = async (business) => {
    if (isInHospital) {
      setMessage({ type: 'error', text: 'You cannot buy businesses while in hospital!' });
      return;
    }
    
    if (player.cash < business.purchase_price) {
      setMessage({ type: 'error', text: `Need $${business.purchase_price.toLocaleString()} to buy ${business.name}!` });
      return;
    }

    if (player.level < business.min_level_required) {
      setMessage({ type: 'error', text: `Need level ${business.min_level_required} to buy ${business.name}!` });
      return;
    }

    const maxSlots = getMaxBusinessSlots(player.level);
    if (ownedBusinesses.length >= maxSlots) {
      setMessage({ 
        type: 'error', 
        text: `Business limit reached! You can own ${maxSlots} businesses. Level up for more slots (max 7).` 
      });
      return;
    }

    try {
      await supabase
        .from('the_life_player_businesses')
        .insert({
          player_id: player.id,
          business_id: business.id
        });

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - business.purchase_price })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      loadOwnedBusinesses();
      loadDrugOps();
      setMessage({ type: 'success', text: `Purchased ${business.name}!` });
    } catch (err) {
      console.error('Error buying business:', err);
      setMessage({ type: 'error', text: 'Failed to buy business!' });
    }
  };

  const startBusiness = async (business) => {
    const ownsIt = ownedBusinesses.some(ob => ob.business_id === business.id);
    if (!ownsIt) {
      setMessage({ type: 'error', text: 'You need to buy this business first!' });
      return;
    }

    const productionCost = business.production_cost || business.cost;
    if (player.cash < productionCost) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }

    const requiredStamina = business.stamina_cost || business.ticket_cost || 5;
    if (player.stamina < requiredStamina) {
      setMessage({ type: 'error', text: `Need ${requiredStamina} stamina to start production!` });
      return;
    }

    // Check if business requires items (new multi-item system)
    const { data: requiredItems } = await supabase
      .from('the_life_business_required_items')
      .select(`
        *,
        item:the_life_items!the_life_business_required_items_item_id_fkey(*)
      `)
      .eq('business_id', business.id);

    if (requiredItems && requiredItems.length > 0) {
      // Get player inventory
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!playerData) return;

      const { data: inventory } = await supabase
        .from('the_life_player_inventory')
        .select('*, item:the_life_items(*)')
        .eq('player_id', playerData.id);

      // Check which required items player has
      const availableOptions = requiredItems.map(reqItem => {
        const invItem = inventory?.find(inv => inv.item_id === reqItem.item_id);
        return {
          ...reqItem,
          playerQuantity: invItem?.quantity || 0,
          inventoryId: invItem?.id || null
        };
      }).filter(opt => opt.playerQuantity >= opt.quantity_required);

      if (availableOptions.length === 0) {
        const itemNames = requiredItems.map(ri => `${ri.quantity_required}x ${ri.item.name}`).join(' OR ');
        setMessage({ 
          type: 'error', 
          text: `You need one of: ${itemNames}` 
        });
        return;
      }

      // Show modal for player to select item
      setSelectedBusiness(business);
      setAvailableItems(availableOptions);
      setShowItemModal(true);
      return;
    }

    // No items required, start normally
    startProduction(business, null);
  };

  const startProduction = async (business, selectedOption) => {
    try {
      const productionCost = business.production_cost || business.cost;
      const requiredStamina = business.stamina_cost || business.ticket_cost || 5;

      // Handle item consumption if option selected
      if (selectedOption) {
        const quantityToUse = inputQuantity || selectedOption.quantity_required;
        
        // Remove items from inventory
        if (selectedOption.playerQuantity === quantityToUse) {
          await supabase
            .from('the_life_player_inventory')
            .delete()
            .eq('id', selectedOption.inventoryId);
        } else {
          await supabase
            .from('the_life_player_inventory')
            .update({ quantity: selectedOption.playerQuantity - quantityToUse })
            .eq('id', selectedOption.inventoryId);
        }

        // Calculate reward based on quantity and conversion rate
        let cashReward = selectedOption.reward_cash * quantityToUse;
        
        // Apply conversion rate if exists (for money laundering)
        if (business.conversion_rate) {
          // Apply 200,000 max cap for money laundering
          const maxCashReward = 200000;
          const uncappedReward = Math.floor(cashReward * (1 - business.conversion_rate));
          cashReward = Math.min(uncappedReward, maxCashReward);
        }

        // Store reward info in production
        business.calculated_cash_reward = cashReward;
        business.reward_item_id = selectedOption.reward_item_id;
        business.reward_item_quantity = (selectedOption.reward_item_quantity || 1) * quantityToUse;
      }

      const completedAt = new Date(Date.now() + business.duration_minutes * 60 * 1000);
      
      const { data: playerData, error: playerError } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (playerError) throw playerError;

      const { error: prodError } = await supabase
        .from('the_life_business_productions')
        .upsert({
          player_id: playerData.id,
          business_id: business.id,
          reward_item_id: business.reward_item_id,
          reward_item_quantity: business.reward_item_quantity,
          reward_cash: business.calculated_cash_reward || 0,
          completed_at: completedAt.toISOString(),
          collected: false
        }, {
          onConflict: 'player_id,business_id'
        });

      if (prodError) throw prodError;

      const opData = {
        [business.id]: true,
        [`${business.id}_completed_at`]: completedAt.toISOString(),
        [`${business.id}_reward_item_id`]: business.reward_item_id,
        [`${business.id}_reward_item_quantity`]: business.reward_item_quantity,
        [`${business.id}_reward_cash`]: business.calculated_cash_reward || 0
      };

      setDrugOps(prev => ({ ...prev, ...opData }));

      const { data: updatedPlayer, error: costError } = await supabase
        .from('the_life_players')
        .update({ 
          cash: player.cash - productionCost,
          stamina: player.stamina - requiredStamina,
          last_stamina_refill: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (costError) throw costError;
      setPlayer(updatedPlayer);
      setMessage({ type: 'success', text: `Started ${business.name}! Wait ${business.duration_minutes} minutes. (-${requiredStamina} stamina)` });
    } catch (err) {
      console.error('Error running business:', err);
      setMessage({ type: 'error', text: `Error: ${err.message}` });
    }
  };

  const collectBusiness = async (business) => {
    try {
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!playerData) return;

      const ownedBusiness = ownedBusinesses.find(ob => ob.business_id === business.id);
      const upgradeLevel = ownedBusiness?.upgrade_level || 1;

      const rewardItemId = drugOps[`${business.id}_reward_item_id`];
      const baseRewardQuantity = drugOps[`${business.id}_reward_item_quantity`];
      const storedCashReward = drugOps[`${business.id}_reward_cash`] || 0;

      const quantityMultiplier = 1 + ((upgradeLevel - 1) * 0.5);
      const rewardQuantity = Math.floor(baseRewardQuantity * quantityMultiplier);

      const cashMultiplier = 1 + ((upgradeLevel - 1) * 0.3);

      // Check if there's a stored cash reward (from item-based businesses)
      if (storedCashReward > 0) {
        const cashProfit = Math.floor(storedCashReward * cashMultiplier);
        
        const { data: updatedPlayer, error: cashError } = await supabase
          .from('the_life_players')
          .update({ cash: player.cash + cashProfit })
          .eq('user_id', user.id)
          .select()
          .single();

        if (cashError) throw cashError;
        setPlayer(updatedPlayer);
        setMessage({ 
          type: 'success', 
          text: `Collected $${cashProfit.toLocaleString()}! ${upgradeLevel > 1 ? `(Lvl ${upgradeLevel} bonus!)` : ''}` 
        });
      } else if (business.reward_type === 'items' && rewardItemId && rewardQuantity) {
        const { data: existing, error: checkError } = await supabase
          .from('the_life_player_inventory')
          .select('*')
          .eq('player_id', playerData.id)
          .eq('item_id', rewardItemId)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existing) {
          const { error: updateError } = await supabase
            .from('the_life_player_inventory')
            .update({ quantity: existing.quantity + rewardQuantity })
            .eq('id', existing.id);
          
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('the_life_player_inventory')
            .insert({
              player_id: playerData.id,
              item_id: rewardItemId,
              quantity: rewardQuantity
            });
          
          if (insertError) throw insertError;
        }

        setMessage({ 
          type: 'success', 
          text: `Collected ${rewardQuantity}x items! ${upgradeLevel > 1 ? `(Lvl ${upgradeLevel} bonus!)` : ''}` 
        });
      } else {
        const baseCashProfit = business.profit || 0;
        const cashProfit = Math.floor(baseCashProfit * cashMultiplier);
        
        const { data: updatedPlayer, error: cashError } = await supabase
          .from('the_life_players')
          .update({ cash: player.cash + cashProfit })
          .eq('user_id', user.id)
          .select()
          .single();

        if (cashError) throw cashError;
        setPlayer(updatedPlayer);
        setMessage({ 
          type: 'success', 
          text: `Collected $${cashProfit.toLocaleString()}! ${upgradeLevel > 1 ? `(Lvl ${upgradeLevel} bonus!)` : ''}` 
        });
      }

      const { error: collectError } = await supabase
        .from('the_life_business_productions')
        .update({ collected: true })
        .eq('player_id', playerData.id)
        .eq('business_id', business.id)
        .eq('collected', false);

      if (collectError) throw collectError;

      setDrugOps(prev => {
        const newOps = { ...prev };
        delete newOps[business.id];
        delete newOps[`${business.id}_completed_at`];
        delete newOps[`${business.id}_reward_item_id`];
        delete newOps[`${business.id}_reward_item_quantity`];
        return newOps;
      });
    } catch (err) {
      console.error('Error collecting business:', err);
      setMessage({ type: 'error', text: 'Failed to collect!' });
    }
  };

  const upgradeBusiness = async (business) => {
    const ownedBusiness = ownedBusinesses.find(ob => ob.business_id === business.id);
    if (!ownedBusiness) {
      setMessage({ type: 'error', text: 'You need to own this business first!' });
      return;
    }

    const currentLevel = ownedBusiness.upgrade_level || 1;
    if (currentLevel >= 10) {
      setMessage({ type: 'error', text: 'Business is already at max level!' });
      return;
    }

    const upgradeCost = getUpgradeCost(business, currentLevel);
    if (player.cash < upgradeCost) {
      setMessage({ type: 'error', text: `Need $${upgradeCost.toLocaleString()} to upgrade!` });
      return;
    }

    try {
      const { error: upgradeError } = await supabase
        .from('the_life_player_businesses')
        .update({ upgrade_level: currentLevel + 1 })
        .eq('id', ownedBusiness.id);

      if (upgradeError) throw upgradeError;

      const { data, error: cashError } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - upgradeCost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (cashError) throw cashError;
      setPlayer(data);
      setMessage({ 
        type: 'success', 
        text: `${business.name} upgraded to level ${currentLevel + 1}!` 
      });
      loadOwnedBusinesses();
    } catch (err) {
      console.error('Error upgrading business:', err);
      setMessage({ type: 'error', text: `Failed to upgrade: ${err.message}` });
    }
  };

  const sellBusiness = async (business) => {
    const sellPrice = Math.floor((business.purchase_price || 5000) / 3);
    if (!window.confirm(`Sell ${business.name} for $${sellPrice.toLocaleString()}?`)) {
      return;
    }

    const ownedBusiness = ownedBusinesses.find(ob => ob.business_id === business.id);
    if (!ownedBusiness) return;

    try {
      const { error } = await supabase
        .from('the_life_player_businesses')
        .delete()
        .eq('id', ownedBusiness.id);
      
      if (error) throw error;

      const { data, error: cashError } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash + sellPrice })
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (cashError) throw cashError;
      setPlayer(data);
      setMessage({ type: 'success', text: `Sold ${business.name} for $${sellPrice.toLocaleString()}!` });
      loadOwnedBusinesses();
      loadDrugOps();
    } catch (err) {
      console.error('Error selling business:', err);
      setMessage({ type: 'error', text: 'Failed to sell business!' });
    }
  };

  return (
    <div className="businesses-section">
      <h2>💼 Business Operations</h2>
      <p>Start businesses and earn items. Higher levels unlock more profitable ventures.</p>
      <div className="business-slots-info">
        <span className="slots-label">Business Slots:</span>
        <span className="slots-count">{ownedBusinesses.length} / {getMaxBusinessSlots(player?.level || 1)}</span>
        {getMaxBusinessSlots(player?.level || 1) < 7 && (
          <span className="slots-hint">💡 Gain 1 slot every 5 levels (max 7)</span>
        )}
      </div>
      <div className="businesses-scroll-container">
        <button 
          className="scroll-arrow scroll-arrow-left" 
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ←
        </button>
        <div className="businesses-grid" ref={scrollContainerRef}>
        {businesses.filter(b => b.is_active).map(business => {
          const imageUrl = business.image_url || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400';
          const isRunning = drugOps?.[business.id];
          const completedAt = drugOps?.[`${business.id}_completed_at`];
          const isReady = completedAt && new Date(completedAt) <= new Date();
          const meetsLevel = player.level >= business.min_level_required;
          const ownsIt = ownedBusinesses.some(ob => ob.business_id === business.id);
          const productionCost = business.production_cost || business.cost;
          
          return (
            <div key={business.id} className="business-card">
              <div className="business-image-container">
                <img src={imageUrl} alt={business.name} className="business-image" />
                {ownsIt && <div className="hired-badge">OWNED</div>}
                <div className="business-header-overlay">
                  <h3>{business.item?.icon || '💼'} {business.name}</h3>
                  {!ownsIt && <span className="level-tag">🔒 {business.min_level_required}</span>}
                </div>
                <button 
                  className="info-tooltip-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInfoPopupData({
                      name: business.name,
                      icon: business.item?.icon || '💼',
                      owned: ownsIt,
                      purchasePrice: business.purchase_price || 5000,
                      description: business.description,
                      productionCost: productionCost,
                      duration: business.duration_minutes,
                      profit: business.profit || 0,
                      hasReward: !!business.reward_item_id,
                      minLevel: business.min_level_required
                    });
                    setShowInfoPopup(true);
                  }}
                >
                  ℹ️
                </button>
              </div>
              {!ownsIt ? (
                <div className="business-compact-actions">
                  {meetsLevel ? (
                    <button 
                      onClick={() => buyBusiness(business)} 
                      disabled={player?.cash < (business.purchase_price || 5000)}
                      className="compact-btn buy-btn"
                    >
                      {player?.cash >= (business.purchase_price || 5000) ? 
                        `💵 Buy $${(business.purchase_price || 5000).toLocaleString()}` : 
                        '🚫 No Cash'
                      }
                    </button>
                  ) : (
                    <div className="locked-compact">🔒 Lvl {business.min_level_required}</div>
                  )}
                </div>
              ) : (
                <>
                  {(() => {
                    const ownedBusiness = ownedBusinesses.find(ob => ob.business_id === business.id);
                    const upgradeLevel = ownedBusiness?.upgrade_level || 1;
                    const upgradeCost = getUpgradeCost(business, upgradeLevel);
                    
                    return (
                      <div className="business-compact-actions">
                        {meetsLevel ? (
                          <>
                            {isRunning ? (
                              <>
                                {isReady ? (
                                  <button 
                                    onClick={() => collectBusiness(business)} 
                                    className="compact-btn collect-btn"
                                  >
                                    ✅ Collect
                                  </button>
                                ) : (
                                  <div className="timer-compact">
                                    ⏱️ {Math.ceil((new Date(completedAt) - new Date()) / 60000)}m
                                  </div>
                                )}
                              </>
                            ) : (
                              <button 
                                onClick={() => startBusiness(business)} 
                                disabled={player?.cash < productionCost || player?.stamina < 5}
                                className="compact-btn start-btn"
                              >
                                ▶️ Start
                              </button>
                            )}
                            <div className="compact-actions-row">
                              {business.is_upgradeable !== false && upgradeLevel < 10 && (
                                <button 
                                  onClick={() => upgradeBusiness(business)}
                                  disabled={player?.cash < upgradeCost}
                                  className="compact-btn-small upgrade-btn"
                                  title={`Upgrade to Lvl ${upgradeLevel + 1}: $${upgradeCost.toLocaleString()}`}
                                >
                                  ⬆️ {upgradeLevel}
                                </button>
                              )}
                              <button 
                                onClick={() => sellBusiness(business)}
                                className="compact-btn-small sell-btn"
                                title={`Sell: $${Math.floor((business.purchase_price || 5000) / 3).toLocaleString()}`}
                              >
                                💰
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="locked-compact">🔒 Lvl {business.min_level_required}</div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
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

      {/* Item Selection Modal */}
      {showItemModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }} onClick={() => setShowItemModal(false)}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1f36 0%, #0f1419 100%)',
            border: '2px solid #d4af37',
            borderRadius: '12px',
            padding: '25px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{color: '#d4af37', marginBottom: '20px', fontSize: '1.3rem'}}>
              Select Item for {selectedBusiness?.name}
            </h3>

            {availableItems.map(option => {
              const maxQty = Math.floor(option.playerQuantity / option.quantity_required);
              const selectedQty = selectedItemId === option.item_id ? (inputQuantity || 1) : 1;
              
              let cashReward = option.reward_cash * selectedQty;
              if (selectedBusiness?.conversion_rate) {
                const maxCashReward = 50000;
                const uncappedReward = Math.floor(cashReward * (1 - selectedBusiness.conversion_rate));
                cashReward = Math.min(uncappedReward, maxCashReward);
              }

              return (
                <div key={option.item_id} style={{
                  background: selectedItemId === option.item_id ? 'rgba(212,175,55,0.2)' : 'rgba(0,0,0,0.3)',
                  border: selectedItemId === option.item_id ? '2px solid #d4af37' : '1px solid rgba(212,175,55,0.3)',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }} onClick={() => {
                  setSelectedItemId(option.item_id);
                  setMaxQuantity(maxQty);
                  setInputQuantity(1);
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px'}}>
                    <img src={option.item.icon} alt={option.item.name} style={{
                      width: '60px',
                      height: '60px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid rgba(212,175,55,0.5)'
                    }} />
                    <div style={{flex: 1}}>
                      <div style={{color: '#d4af37', fontWeight: '600', fontSize: '1.1rem', marginBottom: '5px'}}>
                        {option.item.name}
                      </div>
                      <div style={{fontSize: '0.85rem', color: '#cbd5e0'}}>
                        You have: {option.playerQuantity}
                      </div>
                    </div>
                  </div>

                  {selectedItemId === option.item_id && (
                    <div style={{marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(212,175,55,0.3)'}}>
                      <label style={{display: 'block', color: '#cbd5e0', marginBottom: '8px', fontSize: '0.9rem'}}>
                        Quantity: (Max: {maxQty})
                      </label>
                      <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        <input
                          type="number"
                          min="1"
                          max={maxQty}
                          value={inputQuantity}
                          onChange={(e) => setInputQuantity(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: 'rgba(0,0,0,0.5)',
                            border: '1px solid rgba(212,175,55,0.5)',
                            borderRadius: '5px',
                            color: 'white',
                            fontSize: '1rem'
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInputQuantity(maxQty);
                          }}
                          style={{
                            padding: '10px 15px',
                            background: 'rgba(212,175,55,0.3)',
                            border: '1px solid #d4af37',
                            borderRadius: '5px',
                            color: '#d4af37',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{
                    marginTop: '12px',
                    padding: '10px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '5px',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}>
                    <div style={{color: '#22c55e', fontWeight: '600', fontSize: '1rem'}}>
                      💰 Reward: ${cashReward.toLocaleString()}
                      {selectedBusiness?.conversion_rate && (
                        <>
                          <span style={{fontSize: '0.85rem', color: '#cbd5e0', marginLeft: '8px'}}>
                            ({(selectedBusiness.conversion_rate * 100).toFixed(0)}% fee applied)
                          </span>
                          {cashReward >= 50000 && (
                            <span style={{fontSize: '0.85rem', color: '#fbbf24', marginLeft: '8px', fontWeight: 'bold'}}>
                              (MAX CAP: $50,000)
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
              <button
                onClick={() => {
                  if (!selectedItemId) {
                    setMessage({ type: 'error', text: 'Please select an item!' });
                    return;
                  }
                  const selectedOption = availableItems.find(opt => opt.item_id === selectedItemId);
                  startProduction(selectedBusiness, selectedOption);
                  setShowItemModal(false);
                }}
                disabled={!selectedItemId}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: selectedItemId ? '#22c55e' : '#666',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: selectedItemId ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                ✓ Confirm
              </button>
              <button
                onClick={() => setShowItemModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ✗ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Popup Modal */}
      {showInfoPopup && infoPopupData && (
        <div className="business-info-overlay" onClick={() => setShowInfoPopup(false)}>
          <div className="business-info-popup" onClick={(e) => e.stopPropagation()}>
            <button className="info-popup-close" onClick={() => setShowInfoPopup(false)}>✕</button>
            
            <div className="info-popup-header">
              <span className="info-popup-icon">{infoPopupData.icon}</span>
              <h3>{infoPopupData.name}</h3>
            </div>

            {!infoPopupData.owned ? (
              <div className="info-popup-content">
                <div className="info-section">
                  <div className="info-label">Purchase Price</div>
                  <div className="info-value purchase-price">💵 ${infoPopupData.purchasePrice.toLocaleString()}</div>
                </div>
                
                <div className="info-section">
                  <div className="info-label">Minimum Level</div>
                  <div className="info-value">🔒 Level {infoPopupData.minLevel}</div>
                </div>

                <div className="info-section full-width">
                  <div className="info-label">Description</div>
                  <div className="info-description">{infoPopupData.description}</div>
                </div>
              </div>
            ) : (
              <div className="info-popup-content">
                <div className="info-section">
                  <div className="info-label">Production Cost</div>
                  <div className="info-value cost">💰 ${infoPopupData.productionCost.toLocaleString()}</div>
                </div>

                <div className="info-section">
                  <div className="info-label">Stamina Required</div>
                  <div className="info-value stamina">⚡ 5 Stamina</div>
                </div>

                <div className="info-section">
                  <div className="info-label">Duration</div>
                  <div className="info-value duration">⏱️ {infoPopupData.duration} minutes</div>
                </div>

                <div className="info-section">
                  <div className="info-label">{infoPopupData.hasReward ? 'Reward' : 'Profit'}</div>
                  <div className="info-value profit">
                    {infoPopupData.hasReward ? '📦 Items' : `💵 $${infoPopupData.profit.toLocaleString()}`}
                  </div>
                </div>

                <div className="info-section full-width">
                  <div className="info-label">Description</div>
                  <div className="info-description">{infoPopupData.description}</div>
                </div>
              </div>
            )}

            <button className="info-popup-ok" onClick={() => setShowInfoPopup(false)}>
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
