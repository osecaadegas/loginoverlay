import { supabase } from '../../../config/supabaseClient';
import { adjustPlayerCash, adjustPlayerCashAndStamina } from '../utils/safeRpc';
import { getMaxBusinessSlots, getUpgradeCost } from '../utils/gameUtils';
import { useRef, useState } from 'react';
import { useDragScroll } from '../hooks/useDragScroll';
import '../styles/TheLifeBusinesses.css';
import { 
  SidePanel,
  PanelSection, 
  PanelSelectableCard, 
  PanelQuantityInput,
  PanelRewardPreview,
  PanelButton,
  PanelButtonGroup
} from '../components/SidePanel';

/**
 * Businesses Category Component
 * Handles business purchase, operations, upgrades, and sales
 */
export default function TheLifeBusinesses({ 
  player,
  setPlayer,
  setPlayerFromAction,
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
      const { error: insertError } = await supabase
        .from('the_life_player_businesses')
        .insert({
          player_id: player.id,
          business_id: business.id
        });

      if (insertError) throw insertError;

      // Use server-side RPC to deduct cash (with fallback)
      const cashResult = await adjustPlayerCash(-business.purchase_price, player, user.id);
      if (!cashResult.success) throw new Error(cashResult.error || 'Cash update failed');
      if (cashResult.player) setPlayerFromAction(cashResult.player);
      loadOwnedBusinesses();
      loadDrugOps();
      setMessage({ type: 'success', text: `Purchased ${business.name}!` });
    } catch (err) {
      console.error('Error buying business:', err);
      setMessage({ type: 'error', text: `Failed to buy business: ${err.message}` });
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
        // Input is capped at $200,000 (handled by UI), then fee is applied
        if (business.conversion_rate) {
          cashReward = Math.floor(cashReward * (1 - business.conversion_rate));
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

      // Use server-side RPC to deduct cash and stamina (with fallback)
      const cashResult = await adjustPlayerCashAndStamina(-productionCost, -requiredStamina, player, user.id);
      if (!cashResult.success) throw new Error(cashResult.error || 'Cost update failed');
      if (cashResult.player) setPlayerFromAction(cashResult.player);
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
        
        // Use server-side RPC to add cash (with fallback)
        const cashResult = await adjustPlayerCash(cashProfit, player, user.id);
        if (!cashResult.success) throw new Error(cashResult.error || 'Cash update failed');
        if (cashResult.player) setPlayerFromAction(cashResult.player);
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
        
        // Use server-side RPC to add cash (with fallback)
        const cashResult = await adjustPlayerCash(cashProfit, player, user.id);
        if (!cashResult.success) throw new Error(cashResult.error || 'Cash update failed');
        if (cashResult.player) setPlayerFromAction(cashResult.player);
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

      // Use server-side RPC to deduct cash (with fallback)
      const cashResult = await adjustPlayerCash(-upgradeCost, player, user.id);
      if (!cashResult.success) throw new Error(cashResult.error || 'Cash update failed');
      if (cashResult.player) setPlayerFromAction(cashResult.player);
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

      // Use server-side RPC to add cash (with fallback)
      const cashResult = await adjustPlayerCash(sellPrice, player, user.id);
      if (!cashResult.success) throw new Error(cashResult.error || 'Cash update failed');
      if (cashResult.player) setPlayerFromAction(cashResult.player);
      setMessage({ type: 'success', text: `Sold ${business.name} for $${sellPrice.toLocaleString()}!` });
      loadOwnedBusinesses();
      loadDrugOps();
    } catch (err) {
      console.error('Error selling business:', err);
      setMessage({ type: 'error', text: `Failed to sell business: ${err.message}` });
    }
  };

  return (
    <div className="businesses-section">
      <div className="businesses-header-row">
        <h2>💼 Business Operations</h2>
        <span className="slots-count-header">{ownedBusinesses.length} / {getMaxBusinessSlots(player?.level || 1)}</span>
      </div>
      <div className="businesses-scroll-container">
        <button 
          className="scroll-arrow scroll-arrow-left" 
          onClick={() => scroll('left')}
          aria-label="Scroll left"
        >
          ←
        </button>
        <div 
          className="businesses-grid" 
          ref={scrollContainerRef}
          {...dragScroll}
        >
        {businesses.filter(b => b.is_active).map(business => {
          const imageUrl = business.image_url || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400';
          const isRunning = drugOps?.[business.id];
          const completedAt = drugOps?.[`${business.id}_completed_at`];
          const isReady = completedAt && new Date(completedAt) <= new Date();
          const meetsLevel = player.level >= business.min_level_required;
          const ownsIt = ownedBusinesses.some(ob => ob.business_id === business.id);
          const productionCost = business.production_cost || business.cost;
          const ownedBusiness = ownedBusinesses.find(ob => ob.business_id === business.id);
          const upgradeLevel = ownedBusiness?.upgrade_level || 1;
          
          const upgradeCost = getUpgradeCost(business, upgradeLevel);
          const openInfo = (e) => {
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
          };

          return (
            <div key={business.id} className={`business-card ${ownsIt ? 'owned' : ''} ${isRunning ? 'running' : ''}`}>
              {/* Image with overlay info */}
              <div className="business-image-container">
                <img src={imageUrl} alt={business.name} className="business-image" loading="lazy" />
                <div className="business-card-overlay">
                  <div className="business-card-top">
                    {ownsIt && <span className="business-level-badge">Lvl {upgradeLevel}</span>}
                    <button className="business-info-icon" onClick={openInfo} title="Info">ℹ</button>
                  </div>
                  <div className="business-card-bottom">
                    <span className="business-name-badge">{business.name}</span>
                    {!ownsIt && !meetsLevel && <span className="level-tag">🔒 Lvl {business.min_level_required}</span>}
                  </div>
                </div>
                {isRunning && !isReady && (
                  <div className="business-progress-bar">
                    <div className="business-progress-fill" />
                  </div>
                )}
              </div>

              {/* Action Area */}
              <div className="business-compact-actions">
                {!ownsIt ? (
                  meetsLevel ? (
                    <button 
                      onClick={() => buyBusiness(business)} 
                      disabled={player?.cash < (business.purchase_price || 5000)}
                      className="biz-btn biz-buy"
                    >
                      <span className="biz-btn-label">Purchase</span>
                      <span className="biz-btn-price">${(business.purchase_price || 5000).toLocaleString()}</span>
                    </button>
                  ) : (
                    <div className="locked-compact">🔒 Level {business.min_level_required} Required</div>
                  )
                ) : isRunning ? (
                  isReady ? (
                    <button onClick={() => collectBusiness(business)} className="biz-btn biz-collect">
                      ✅ Collect Reward
                    </button>
                  ) : (
                    <div className="timer-compact">
                      ⏱️ {Math.ceil((new Date(completedAt) - new Date()) / 60000)}m remaining
                    </div>
                  )
                ) : (
                  <>
                    <div className="biz-actions-row">
                      <button 
                        onClick={() => startBusiness(business)} 
                        disabled={player?.cash < productionCost || player?.stamina < 5}
                        className="biz-btn biz-start"
                      >
                        ▶ Start
                      </button>
                      <button 
                        onClick={() => sellBusiness(business)}
                        className="biz-btn biz-sell"
                        title={`Sell: $${Math.floor((business.purchase_price || 5000) / 3).toLocaleString()}`}
                      >
                        Sell
                      </button>
                    </div>
                    {business.is_upgradeable !== false && upgradeLevel < 10 && (
                      <button 
                        onClick={() => upgradeBusiness(business)}
                        disabled={player?.cash < upgradeCost}
                        className="biz-btn biz-upgrade"
                      >
                        ⬆ Lvl {upgradeLevel + 1} · ${upgradeCost.toLocaleString()}
                      </button>
                    )}
                  </>
                )}
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

      {/* Item Selection Side Panel */}
      <SidePanel
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={`Select Item`}
        subtitle={selectedBusiness?.name}
        footer={
          <PanelButtonGroup>
            <PanelButton variant="danger" onClick={() => setShowItemModal(false)}>
              ✗ Cancel
            </PanelButton>
            <PanelButton 
              variant="success" 
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
            >
              ✓ Confirm
            </PanelButton>
          </PanelButtonGroup>
        }
      >
        <PanelSection title="Available Items">
          {availableItems.map(option => {
            let maxQty = Math.floor(option.playerQuantity / option.quantity_required);
            
            // For money laundering businesses with conversion rate, cap INPUT at $200,000
            if (selectedBusiness?.conversion_rate && option.reward_cash > 0) {
              const maxInputCap = 200000;
              const maxQtyFromCap = Math.floor(maxInputCap / option.reward_cash);
              maxQty = Math.min(maxQty, maxQtyFromCap);
            }
            
            const selectedQty = selectedItemId === option.item_id ? (inputQuantity || 1) : 1;
            
            // Calculate reward
            let cashReward = option.reward_cash * selectedQty;
            if (selectedBusiness?.conversion_rate) {
              cashReward = Math.floor(cashReward * (1 - selectedBusiness.conversion_rate));
            }

            return (
              <PanelSelectableCard
                key={option.item_id}
                selected={selectedItemId === option.item_id}
                onClick={() => {
                  setSelectedItemId(option.item_id);
                  setMaxQuantity(maxQty);
                  setInputQuantity(1);
                }}
                icon={option.item.image_url || option.item.icon}
                title={option.item.name}
                subtitle={`You have: ${option.playerQuantity}`}
                badge={`$${option.reward_cash.toLocaleString()}/ea`}
              >
                <PanelQuantityInput
                  label={`Quantity (Max: ${maxQty})`}
                  value={inputQuantity}
                  onChange={(val) => setInputQuantity(val)}
                  min={1}
                  max={maxQty}
                />
                <PanelRewardPreview 
                  amount={cashReward} 
                  label="Reward"
                  fee={selectedBusiness?.conversion_rate ? (selectedBusiness.conversion_rate * 100).toFixed(0) : null}
                />
              </PanelSelectableCard>
            );
          })}
        </PanelSection>
      </SidePanel>

      {/* Info Popup Modal */}
      {showInfoPopup && infoPopupData && (
        <div className="business-info-overlay" onClick={() => setShowInfoPopup(false)}>
          <div className="business-info-popup" onClick={(e) => e.stopPropagation()}>
            <button className="info-popup-close" onClick={() => setShowInfoPopup(false)}>✕</button>
            
            <div className="info-popup-header">
              <span className="info-popup-icon">{infoPopupData.icon}</span>
              <h3>{infoPopupData.name}</h3>
              {infoPopupData.owned && <span className="owned-badge-popup">✓ OWNED</span>}
            </div>

            {!infoPopupData.owned ? (
              <div className="info-popup-content">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-item-label">💵 Purchase Price</span>
                    <span className="info-item-value">${infoPopupData.purchasePrice.toLocaleString()}</span>
                  </div>
                  
                  <div className="info-item">
                    <span className="info-item-label">🔒 Min Level</span>
                    <span className="info-item-value">Level {infoPopupData.minLevel}</span>
                  </div>

                  <div className="info-item">
                    <span className="info-item-label">💰 Production Cost</span>
                    <span className="info-item-value">${infoPopupData.productionCost.toLocaleString()}</span>
                  </div>

                  <div className="info-item">
                    <span className="info-item-label">⏱️ Duration</span>
                    <span className="info-item-value">{infoPopupData.duration}m</span>
                  </div>

                  <div className="info-item">
                    <span className="info-item-label">⚡ Stamina Cost</span>
                    <span className="info-item-value">5 Stamina</span>
                  </div>

                  <div className="info-item">
                    <span className="info-item-label">{infoPopupData.hasReward ? '📦 Reward' : '💵 Profit'}</span>
                    <span className="info-item-value">
                      {infoPopupData.hasReward ? 'Items' : `$${infoPopupData.profit.toLocaleString()}`}
                    </span>
                  </div>
                </div>

                <div className="info-description-section">
                  <div className="info-section-title">📋 Description</div>
                  <p>{infoPopupData.description}</p>
                </div>

                <div className="upgrade-explanation-section">
                  <div className="info-section-title">📈 Upgrade System</div>
                  <p className="upgrade-intro">Once purchased, you can upgrade this business to increase efficiency and reduce costs.</p>
                  <table className="upgrade-table">
                    <thead>
                      <tr>
                        <th>Level</th>
                        <th>Upgrade Cost</th>
                        <th>Time Reduction</th>
                        <th>Benefit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>-</td>
                        <td>Base</td>
                        <td>Starting efficiency</td>
                      </tr>
                      <tr>
                        <td>2-5</td>
                        <td>Purchase × 0.5</td>
                        <td>-1 min/level</td>
                        <td>Faster production</td>
                      </tr>
                      <tr>
                        <td>6-10</td>
                        <td>Purchase × 0.7</td>
                        <td>-1 min/level</td>
                        <td>Maximum efficiency</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="upgrade-note">💡 Higher levels = Faster completion times!</p>
                </div>
              </div>
            ) : (
              <div className="info-popup-content">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-item-label">💰 Production Cost</span>
                    <span className="info-item-value">${infoPopupData.productionCost.toLocaleString()}</span>
                  </div>

                  <div className="info-item">
                    <span className="info-item-label">⚡ Stamina Required</span>
                    <span className="info-item-value">5 Stamina</span>
                  </div>

                  <div className="info-item">
                    <span className="info-item-label">⏱️ Duration</span>
                    <span className="info-item-value">{infoPopupData.duration}m</span>
                  </div>

                  <div className="info-item">
                    <span className="info-item-label">{infoPopupData.hasReward ? '📦 Reward' : '💵 Profit'}</span>
                    <span className="info-item-value">
                      {infoPopupData.hasReward ? 'Items' : `$${infoPopupData.profit.toLocaleString()}`}
                    </span>
                  </div>

                  <div className="info-item">
                    <span className="info-item-label">💵 Sell Value</span>
                    <span className="info-item-value">${Math.floor(infoPopupData.purchasePrice / 3).toLocaleString()}</span>
                  </div>

                  <div className="info-item">
                    <span className="info-item-label">🏪 Purchase Price</span>
                    <span className="info-item-value info-muted">${infoPopupData.purchasePrice.toLocaleString()}</span>
                  </div>
                </div>

                <div className="info-description-section">
                  <div className="info-section-title">📋 Description</div>
                  <p>{infoPopupData.description}</p>
                </div>

                <div className="upgrade-explanation-section">
                  <div className="info-section-title">📈 Upgrade Your Business</div>
                  <p className="upgrade-intro">Upgrade to reduce production time and increase efficiency!</p>
                  <table className="upgrade-table">
                    <thead>
                      <tr>
                        <th>Level</th>
                        <th>Upgrade Cost</th>
                        <th>Time Reduction</th>
                        <th>Total Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>-</td>
                        <td>Base time</td>
                        <td>0 min</td>
                      </tr>
                      <tr>
                        <td>2</td>
                        <td>${Math.floor(infoPopupData.purchasePrice * 0.5).toLocaleString()}</td>
                        <td>-1 min</td>
                        <td>1 min faster</td>
                      </tr>
                      <tr>
                        <td>3-5</td>
                        <td>${Math.floor(infoPopupData.purchasePrice * 0.5).toLocaleString()} each</td>
                        <td>-1 min/level</td>
                        <td>Up to 4 min faster</td>
                      </tr>
                      <tr>
                        <td>6-10</td>
                        <td>${Math.floor(infoPopupData.purchasePrice * 0.7).toLocaleString()} each</td>
                        <td>-1 min/level</td>
                        <td>Up to 9 min faster</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="upgrade-note">💡 Max level 10: Complete productions up to 9 minutes faster!</p>
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
