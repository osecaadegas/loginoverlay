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

  // Initialize brothel
  const initBrothel = async () => {
    if (isInHospital) {
      setMessage({ type: 'error', text: 'You cannot manage your brothel while in hospital!' });
      return;
    }
    
    const cost = 5000;
    if (player.cash < cost) {
      setMessage({ type: 'error', text: 'Need $5,000 to start a brothel!' });
      return;
    }

    try {
      const initialSlots = player.level + 2;

      await supabase.from('the_life_brothels').insert({
        player_id: player.id,
        workers: 0,
        income_per_hour: 0,
        worker_slots: initialSlots,
        additional_slots: 0,
        slots_upgrade_cost: 50000
      });

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - cost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      await loadBrothel();
      setMessage({ type: 'success', text: 'Brothel opened successfully!' });
    } catch (err) {
      console.error('Error initializing brothel:', err);
      setMessage({ type: 'error', text: 'Failed to open brothel!' });
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

      await supabase.from('the_life_player_brothel_workers').insert(workersToInsert);

      const newTotalIncome = (brothel.income_per_hour || 0) + (worker.income_per_hour * quantity);
      const newWorkerCount = currentUsedSlots + quantity;

      await supabase.from('the_life_brothels').update({
        workers: newWorkerCount,
        income_per_hour: newTotalIncome
      }).eq('id', brothel.id);

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - totalCost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
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

      await supabase.from('the_life_player_brothel_workers')
        .delete()
        .in('id', instancesToDelete);

      const newTotalIncome = (brothel.income_per_hour || 0) - (hiredWorker.worker.income_per_hour * quantity);
      const newWorkerCount = hiredWorkers.length - quantity;

      await supabase.from('the_life_brothels').update({
        workers: Math.max(0, newWorkerCount),
        income_per_hour: Math.max(0, newTotalIncome)
      }).eq('id', brothel.id);

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash + sellPrice })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      await loadBrothel();
      await loadHiredWorkers();
      setMessage({ type: 'success', text: `Sold ${quantity}x ${hiredWorker.worker.name} for $${sellPrice.toLocaleString()}!` });
    } catch (err) {
      console.error('Error selling worker:', err);
      setMessage({ type: 'error', text: 'Failed to sell worker!' });
    }
  };

  // Collect income
  const collectIncome = async () => {
    if (!brothel || !brothel.income_per_hour) {
      setMessage({ type: 'error', text: 'Hire some workers first!' });
      return;
    }

    const lastCollection = new Date(brothel.last_collection);
    const now = new Date();
    const hoursPassed = (now - lastCollection) / 1000 / 60 / 60;

    if (hoursPassed < 1) {
      const minutesLeft = Math.ceil((1 - hoursPassed) * 60);
      setMessage({ type: 'error', text: `Collection available in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}!` });
      return;
    }

    const fullHours = Math.floor(hoursPassed);
    const income = fullHours * brothel.income_per_hour;

    if (income <= 0) {
      setMessage({ type: 'error', text: 'No income to collect yet!' });
      return;
    }

    try {
      await supabase.from('the_life_brothels').update({
        last_collection: now.toISOString(),
        total_earned: (brothel.total_earned || 0) + income
      }).eq('id', brothel.id);

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash + income })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      await loadBrothel();
      setMessage({ type: 'success', text: `Collected $${income.toLocaleString()} (${fullHours} hour${fullHours !== 1 ? 's' : ''})!` });
    } catch (err) {
      console.error('Error collecting income:', err);
      setMessage({ type: 'error', text: 'Failed to collect income!' });
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

      await supabase.from('the_life_brothels').update({
        additional_slots: newAdditionalSlots,
        slots_upgrade_cost: newUpgradeCost
      }).eq('id', brothel.id);

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - upgradeCost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
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

  // If brothel not opened yet
  if (!brothel) {
    return (
      <div className="brothel-container">
        <div className="brothel-init-card">
          <div className="init-icon">🏩</div>
          <h2>Start Your Brothel Empire</h2>
          <p className="init-description">
            Build and manage your own business. Hire workers to generate passive income every hour.
          </p>
          <div className="init-details">
            <div className="init-detail">
              <span className="detail-label">Initial Cost:</span>
              <span className="detail-value">$5,000</span>
            </div>
            <div className="init-detail">
              <span className="detail-label">Starting Slots:</span>
              <span className="detail-value">{player.level + 2} Workers</span>
            </div>
          </div>
          <button 
            onClick={initBrothel} 
            disabled={player?.cash < 5000}
            className="btn-primary btn-large"
          >
            {player?.cash < 5000 ? 'Insufficient Funds' : 'Open Brothel - $5,000'}
          </button>
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
