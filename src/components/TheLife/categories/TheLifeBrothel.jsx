import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { useDragScroll } from '../hooks/useDragScroll';
import '../styles/TheLifeBrothel.css';

/**
 * COMPLETE REWRITE - Brothel Management System
 * Modern, clean, fully responsive design
 */
export default function TheLifeBrothel({ 
  player,
  setPlayer,
  setPlayerFromAction,
  brothel,
  setBrothel,
  availableWorkers,
  hiredWorkers,
  setMessage,
  loadBrothel,
  loadHiredWorkers,
  isInHospital,
  user
}) {
  const [showHiredWorkers, setShowHiredWorkers] = useState(false);
  const [showAvailableWorkers, setShowAvailableWorkers] = useState(true);
  const [isHiring, setIsHiring] = useState(false);
  const [hireQuantities, setHireQuantities] = useState({});
  const [sellQuantities, setSellQuantities] = useState({});
  const [isCollecting, setIsCollecting] = useState(false);
  const hiredScrollRef = useRef(null);
  const availableScrollRef = useRef(null);
  const hiredDragScroll = useDragScroll(hiredScrollRef);
  const availableDragScroll = useDragScroll(availableScrollRef);

  // Sync worker count when data loads
  useEffect(() => {
    const syncWorkerCount = async () => {
      if (brothel && hiredWorkers.length > 0) {
        const actualCount = hiredWorkers.length;
        const storedCount = brothel.workers || 0;
        
        // Fix mismatch
        if (actualCount !== storedCount) {
          console.log(`Syncing worker count: stored=${storedCount}, actual=${actualCount}`);
          await supabase.from('the_life_brothels').update({
            workers: actualCount
          }).eq('id', brothel.id);
          
          // Reload to get updated data
          await loadBrothel();
        }
      }
    };
    
    syncWorkerCount();
  }, [brothel, hiredWorkers]);

  // Initialize brothel - Unlock first 3 slots for $50,000
  const initBrothel = async () => {
    if (isInHospital) {
      setMessage({ type: 'error', text: 'You cannot manage your brothel while in hospital!' });
      return;
    }
    
    const cost = 50000;
    if (player.cash < cost) {
      setMessage({ type: 'error', text: 'Need $50,000 to unlock the brothel!' });
      return;
    }

    try {
      const initialSlots = 3; // Fixed 3 initial slots

      const { error: insertError } = await supabase.from('the_life_brothels').insert({
        player_id: player.id,
        workers: 0,
        income_per_hour: 0,
        worker_slots: initialSlots,
        additional_slots: 0,
        slots_upgrade_cost: 100000
      });
      if (insertError) throw insertError;

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - cost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayerFromAction(data);
      await loadBrothel();
      setMessage({ type: 'success', text: 'Brothel unlocked! 3 worker slots available!' });
    } catch (err) {
      console.error('Error initializing brothel:', err);
      setMessage({ type: 'error', text: 'Failed to unlock brothel!' });
    }
  };

  // Hire a worker
  const hireWorker = async (worker, quantity = 1) => {
    // Prevent spam clicking
    if (isHiring) {
      return;
    }

    if (!brothel) {
      setMessage({ type: 'error', text: 'You need to open a brothel first!' });
      return;
    }

    const totalSlots = (brothel.worker_slots || 3) + (brothel.additional_slots || 0);
    const usedSlots = hiredWorkers.length; // Use actual hired workers count

    if (usedSlots + quantity > totalSlots) {
      setMessage({ type: 'error', text: `Not enough slots! Need ${quantity} but only ${totalSlots - usedSlots} available` });
      return;
    }

    const totalCost = worker.hire_cost * quantity;
    if (player.cash < totalCost) {
      setMessage({ type: 'error', text: `Need $${totalCost.toLocaleString()} to hire ${quantity}x ${worker.name}!` });
      return;
    }

    if (player.level < worker.min_level_required) {
      setMessage({ type: 'error', text: `Need level ${worker.min_level_required} to hire ${worker.name}!` });
      return;
    }

    setIsHiring(true);

    try {
      // Double-check slot availability in database before inserting
      const { data: currentWorkers, error: checkError } = await supabase
        .from('the_life_player_brothel_workers')
        .select('id')
        .eq('player_id', player.id);

      if (checkError) throw checkError;

      const currentUsedSlots = currentWorkers.length;
      if (currentUsedSlots + quantity > totalSlots) {
        setMessage({ type: 'error', text: `Not enough slots! Need ${quantity} but only ${totalSlots - currentUsedSlots} available` });
        setIsHiring(false);
        return;
      }

      // Hire multiple workers
      const workersToInsert = Array(quantity).fill(null).map(() => ({
        player_id: player.id,
        worker_id: worker.id
      }));

      const { error: insertError } = await supabase.from('the_life_player_brothel_workers').insert(workersToInsert);
      if (insertError) throw insertError;

      const newTotalIncome = (brothel.income_per_hour || 0) + (worker.income_per_hour * quantity);
      const newWorkerCount = currentUsedSlots + quantity;

      const { error: brothelError } = await supabase.from('the_life_brothels').update({
        workers: newWorkerCount,
        income_per_hour: newTotalIncome
      }).eq('id', brothel.id);
      if (brothelError) throw brothelError;

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - totalCost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayerFromAction(data);
      await loadBrothel();
      await loadHiredWorkers();
      setMessage({ type: 'success', text: `Hired ${quantity}x ${worker.name} successfully!` });
    } catch (err) {
      console.error('Error hiring worker:', err);
      setMessage({ type: 'error', text: 'Failed to hire worker!' });
    } finally {
      setIsHiring(false);
    }
  };

  // Sell a worker
  const sellWorker = async (hiredWorker, quantity = 1) => {
    // If this is a grouped worker, we need to validate we have enough
    const availableCount = hiredWorker.count || 1;
    
    if (quantity > availableCount) {
      setMessage({ type: 'error', text: `You only have ${availableCount}x ${hiredWorker.worker.name}!` });
      return;
    }

    const sellPrice = Math.floor(hiredWorker.worker.hire_cost / 3) * quantity;
    if (!window.confirm(`Sell ${quantity}x ${hiredWorker.worker.name} for $${sellPrice.toLocaleString()}?`)) {
      return;
    }

    try {
      // Get the worker instances to delete
      const instancesToDelete = hiredWorker.allInstances 
        ? hiredWorker.allInstances.slice(0, quantity).map(w => w.id)
        : [hiredWorker.id];

      const { error: deleteError } = await supabase.from('the_life_player_brothel_workers')
        .delete()
        .in('id', instancesToDelete);
      if (deleteError) throw deleteError;

      const newTotalIncome = (brothel.income_per_hour || 0) - (hiredWorker.worker.income_per_hour * quantity);
      const newWorkerCount = hiredWorkers.length - quantity;

      const { error: brothelError } = await supabase.from('the_life_brothels').update({
        workers: Math.max(0, newWorkerCount),
        income_per_hour: Math.max(0, newTotalIncome)
      }).eq('id', brothel.id);
      if (brothelError) throw brothelError;

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash + sellPrice })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayerFromAction(data);
      await loadBrothel();
      await loadHiredWorkers();
      setMessage({ type: 'success', text: `Sold ${quantity}x ${hiredWorker.worker.name} for $${sellPrice.toLocaleString()}!` });
    } catch (err) {
      console.error('Error selling worker:', err);
      setMessage({ type: 'error', text: 'Failed to sell worker!' });
    }
  };

  // SECURE: Use server-side RPC for income collection
  const collectIncome = async () => {
    if (isCollecting) return;
    
    if (!brothel || !brothel.income_per_hour) {
      setMessage({ type: 'error', text: 'Hire some workers first!' });
      return;
    }

    try {
      setIsCollecting(true);
      
      // Call secure server-side function (uses server time, not client clock!)
      const { data: result, error } = await supabase.rpc('collect_brothel_income');

      if (error) throw error;

      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      // Refresh player data
      const { data: updatedPlayer } = await supabase
        .from('the_life_players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (updatedPlayer) {
        setPlayerFromAction(updatedPlayer);
      }

      await loadBrothel();
      setMessage({ type: 'success', text: `Collected $${result.income.toLocaleString()} (${result.hours_collected} hour${result.hours_collected !== 1 ? 's' : ''})!` });
    } catch (err) {
      console.error('Error collecting income:', err);
      setMessage({ type: 'error', text: 'Failed to collect income!' });
    } finally {
      setIsCollecting(false);
    }
  };

  // Upgrade slots
  const upgradeSlots = async () => {
    if (!brothel) {
      setMessage({ type: 'error', text: 'You need to open a brothel first!' });
      return;
    }

    if (player.level < 5) {
      setMessage({ type: 'error', text: 'Need level 5 to upgrade worker slots!' });
      return;
    }

    const currentTotalSlots = (brothel.worker_slots || 3) + (brothel.additional_slots || 0);
    if (currentTotalSlots >= 50) {
      setMessage({ type: 'error', text: 'Maximum 50 worker slots reached!' });
      return;
    }

    const upgradeCost = brothel.slots_upgrade_cost || 50000;
    if (player.cash < upgradeCost) {
      setMessage({ type: 'error', text: `Need $${upgradeCost.toLocaleString()} to upgrade slots!` });
      return;
    }

    try {
      const newAdditionalSlots = (brothel.additional_slots || 0) + 2;
      const newUpgradeCost = upgradeCost * 2;

      const { error: upgradeError } = await supabase.from('the_life_brothels').update({
        additional_slots: newAdditionalSlots,
        slots_upgrade_cost: newUpgradeCost
      }).eq('id', brothel.id);
      if (upgradeError) throw upgradeError;

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - upgradeCost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayerFromAction(data);
      await loadBrothel();
      setMessage({ type: 'success', text: 'Brothel upgraded! +2 worker slots' });
    } catch (err) {
      console.error('Error upgrading brothel:', err);
      setMessage({ type: 'error', text: 'Failed to upgrade brothel!' });
    }
  };

  // Calculate available income
  const calculateAvailableIncome = () => {
    if (!brothel || !brothel.last_collection) return 0;
    const lastCollection = new Date(brothel.last_collection);
    const now = new Date();
    const hoursPassed = (now - lastCollection) / 1000 / 60 / 60;
    const fullHours = Math.floor(hoursPassed);
    return fullHours * (brothel.income_per_hour || 0);
  };

  // If brothel not opened yet - show unlock card AND workers preview
  if (!brothel) {
    return (
      <div className="brothel-container">
        {/* Unlock Card */}
        <div className="brothel-init-card">
          <div className="init-icon">🔒</div>
          <h2>Unlock Your Brothel</h2>
          <p className="init-description">
            Pay $50,000 to unlock the brothel and get 3 worker slots to start generating passive income.
          </p>
          <div className="init-details">
            <div className="init-detail">
              <span className="detail-label">Unlock Cost:</span>
              <span className="detail-value">$50,000</span>
            </div>
            <div className="init-detail">
              <span className="detail-label">Initial Slots:</span>
              <span className="detail-value">3 Workers</span>
            </div>
          </div>
          <button 
            onClick={initBrothel} 
            disabled={player?.cash < 50000}
            className="btn-primary btn-large"
          >
            {player?.cash < 50000 ? `Need $${(50000 - player?.cash).toLocaleString()} more` : 'Unlock Brothel - $50,000'}
          </button>
        </div>

        {/* Workers Preview (Locked) */}
        <div className="section">
          <div className="section-header-compact">
            <span className="section-title">🎯 Available Workers ({availableWorkers.length})</span>
          </div>
          <div className="alert alert-info">
            🔒 Unlock the brothel above to start hiring workers!
          </div>
          <div 
            className="workers-grid"
            ref={availableScrollRef}
            {...availableDragScroll}
          >
            {availableWorkers.map(worker => (
              <div key={worker.id} className={`worker-card worker-rarity-${worker.rarity} worker-locked`}>
                <div className="worker-image">
                  <img src={worker.image_url} alt={worker.name} />
                </div>
                <div className="worker-details">
                  <h4 className="worker-name">{worker.name}</h4>
                  <p className="worker-description">{worker.description}</p>
                  
                  <div className="worker-stats">
                    <div className="worker-stat">
                      <span className="stat-icon">💵</span>
                      <span className="stat-text">${worker.income_per_hour}/hr</span>
                    </div>
                    <div className="worker-stat">
                      <span className="stat-icon">⭐</span>
                      <span className="stat-text">Level {worker.min_level_required}</span>
                    </div>
                  </div>

                  <div className="btn-disabled">🔒 Unlock Brothel First</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main brothel view
  const totalSlots = (brothel.worker_slots || 3) + (brothel.additional_slots || 0);
  const usedSlots = hiredWorkers.length; // Use actual hired workers count
  const availableIncome = calculateAvailableIncome();
  const slotsFull = usedSlots >= totalSlots;
  const upgradeCost = brothel.slots_upgrade_cost || 50000;
  const canCollect = brothel.income_per_hour && availableIncome > 0;
  const canUpgrade = player?.level >= 5 && totalSlots < 50;

  return (
    <div className="brothel-container">
      {/* Stats Grid 2x3 */}
      <div className="brothel-stats-grid">
        <div className="stat-tile">
          <span className="stat-tile-value">{usedSlots}/{totalSlots}</span>
          <span className="stat-tile-label">Workers</span>
        </div>
        
        <div className="stat-tile">
          <span className="stat-tile-value">${(brothel.income_per_hour || 0).toLocaleString()}</span>
          <span className="stat-tile-label">Per Hour</span>
        </div>
        
        <div className="stat-tile stat-tile-highlight">
          <span className="stat-tile-value">${availableIncome.toLocaleString()}</span>
          <span className="stat-tile-label">Ready</span>
        </div>
        
        <div className="stat-tile">
          <span className="stat-tile-value">${(brothel.total_earned || 0).toLocaleString()}</span>
          <span className="stat-tile-label">Total Earned</span>
        </div>

        {/* Collect Income Tile */}
        <button 
          onClick={collectIncome}
          className={`stat-tile stat-tile-action ${canCollect ? 'stat-tile-collect' : 'stat-tile-disabled'}`}
          disabled={!canCollect}
        >
          <span className="stat-tile-value">💰 Collect</span>
          <span className="stat-tile-label">{canCollect ? `$${availableIncome.toLocaleString()}` : 'Nothing yet'}</span>
        </button>
        
        {/* Upgrade Tile */}
        <button 
          onClick={upgradeSlots}
          className={`stat-tile stat-tile-action ${canUpgrade && player.cash >= upgradeCost ? 'stat-tile-upgrade' : 'stat-tile-disabled'}`}
          disabled={!canUpgrade || player.cash < upgradeCost}
        >
          <span className="stat-tile-value">⬆️ Upgrade</span>
          <span className="stat-tile-label">
            {!canUpgrade 
              ? (totalSlots >= 50 ? 'Max slots' : 'Need Lvl 5')
              : `+2 for $${(upgradeCost / 1000000).toFixed(1)}B`
            }
          </span>
        </button>
      </div>

      {/* Hired Workers Section */}
      {hiredWorkers.length > 0 && (
        <div className={`section ${!showHiredWorkers ? 'section-collapsed' : ''}`}>
          <div className="section-header-compact" onClick={() => setShowHiredWorkers(!showHiredWorkers)}>
            <span className="section-title">💼 Your Workers ({usedSlots}/{totalSlots})</span>
            <span className="section-toggle">{showHiredWorkers ? '▼' : '▶'}</span>
          </div>
          
          {showHiredWorkers && (
            <div 
              className="workers-grid workers-grid-scroll"
              ref={hiredScrollRef}
              {...hiredDragScroll}
            >
              {/* Group workers by worker_id and show count */}
              {Object.values(
                hiredWorkers.reduce((acc, hw) => {
                  const key = hw.worker_id;
                  if (!acc[key]) {
                    acc[key] = {
                      ...hw,
                      count: 1,
                      allInstances: [hw]
                    };
                  } else {
                    acc[key].count++;
                    acc[key].allInstances.push(hw);
                  }
                  return acc;
                }, {})
              ).map(groupedWorker => (
                <div key={groupedWorker.worker_id} className="worker-card hired-worker">
                  <div className="worker-image">
                    <img src={groupedWorker.worker.image_url} alt={groupedWorker.worker.name} />
                    {groupedWorker.count > 1 && (
                      <div className="worker-quantity-badge">×{groupedWorker.count}</div>
                    )}
                  </div>
                  <div className="worker-details">
                    <h4 className="worker-name">{groupedWorker.worker.name}</h4>
                    <div className="worker-income">
                      <span className="income-icon">💵</span>
                      <span className="income-value">${groupedWorker.worker.income_per_hour}/hr {groupedWorker.count > 1 ? `(×${groupedWorker.count})` : ''}</span>
                    </div>
                    <div className="worker-actions">
                      <input
                        type="number"
                        min="1"
                        max={groupedWorker.count}
                        value={sellQuantities[groupedWorker.worker_id] || 1}
                        onChange={(e) => setSellQuantities({
                          ...sellQuantities,
                          [groupedWorker.worker_id]: Math.max(1, Math.min(groupedWorker.count, parseInt(e.target.value) || 1))
                        })}
                        className="quantity-input"
                      />
                      <button 
                        onClick={() => sellWorker(groupedWorker, sellQuantities[groupedWorker.worker_id] || 1)}
                        className="btn-sell"
                      >
                        Sell - ${(Math.floor(groupedWorker.worker.hire_cost / 3) * (sellQuantities[groupedWorker.worker_id] || 1)).toLocaleString()}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Available Workers Section */}
      <div className={`section ${!showAvailableWorkers ? 'section-collapsed' : ''}`}>
        <div className="section-header-compact" onClick={() => setShowAvailableWorkers(!showAvailableWorkers)}>
          <span className="section-title">🎯 Available Workers ({availableWorkers.length})</span>
          <span className="section-toggle">{showAvailableWorkers ? '▼' : '▶'}</span>
        </div>

        {showAvailableWorkers && (
          <>
            {slotsFull && (
              <div className="alert alert-warning">
                ⚠️ All worker slots full! {player?.level >= 5 ? 'Upgrade your brothel to hire more workers.' : 'Reach level 5 to unlock brothel upgrades.'}
              </div>
            )}

            <div 
              className="workers-grid"
              ref={availableScrollRef}
              {...availableDragScroll}
            >
          {availableWorkers.map(worker => {
            const hiredCount = hiredWorkers.filter(hw => hw.worker_id === worker.id).length;
            const canAfford = player?.cash >= worker.hire_cost;
            const meetsLevel = player?.level >= worker.min_level_required;
            const canHire = !slotsFull && canAfford && meetsLevel;
            const maxQuantity = Math.min(
              totalSlots - usedSlots,
              Math.floor(player?.cash / worker.hire_cost)
            );

            return (
              <div key={worker.id} className={`worker-card worker-rarity-${worker.rarity}`}>
                <div className="worker-image">
                  <img src={worker.image_url} alt={worker.name} />
                </div>
                <div className="worker-details">
                  <div className="worker-name-row">
                    <h4 className="worker-name">{worker.name}</h4>
                    {hiredCount > 0 && (
                      <div className="hired-badge-inline">Owned ×{hiredCount}</div>
                    )}
                  </div>
                  <p className="worker-description">{worker.description}</p>
                  
                  <div className="worker-stats">
                    <div className="worker-stat">
                      <span className="stat-icon">💵</span>
                      <span className="stat-text">${worker.income_per_hour}/hr</span>
                    </div>
                    <div className="worker-stat">
                      <span className="stat-icon">⭐</span>
                      <span className="stat-text">Level {worker.min_level_required}</span>
                    </div>
                  </div>

                  {slotsFull ? (
                    <div className="btn-disabled">No Slots Available</div>
                  ) : !meetsLevel ? (
                    <div className="btn-disabled">Level {worker.min_level_required} Required</div>
                  ) : (
                    <div className="worker-actions">
                      <input
                        type="number"
                        min="1"
                        max={maxQuantity}
                        value={hireQuantities[worker.id] || 1}
                        onChange={(e) => setHireQuantities({
                          ...hireQuantities,
                          [worker.id]: Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1))
                        })}
                        className="quantity-input"
                      />
                      <button 
                        onClick={() => hireWorker(worker, hireQuantities[worker.id] || 1)}
                        disabled={!canAfford || isHiring}
                        className="btn-hire"
                      >
                        {isHiring ? 'Hiring...' : canAfford ? `Hire - $${(worker.hire_cost * (hireQuantities[worker.id] || 1)).toLocaleString()}` : 'Insufficient Funds'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
