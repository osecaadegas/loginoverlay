import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
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
  const [isHiring, setIsHiring] = useState(false);

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
  const hireWorker = async (worker) => {
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

    if (usedSlots >= totalSlots) {
      setMessage({ type: 'error', text: `No worker slots available! (${usedSlots}/${totalSlots} used)` });
      return;
    }

    if (player.cash < worker.hire_cost) {
      setMessage({ type: 'error', text: `Need $${worker.hire_cost.toLocaleString()} to hire ${worker.name}!` });
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
      if (currentUsedSlots >= totalSlots) {
        setMessage({ type: 'error', text: `No worker slots available! (${currentUsedSlots}/${totalSlots} used)` });
        setIsHiring(false);
        return;
      }

      await supabase.from('the_life_player_brothel_workers').insert({
        player_id: player.id,
        worker_id: worker.id
      });

      const newTotalIncome = (brothel.income_per_hour || 0) + worker.income_per_hour;
      const newWorkerCount = currentUsedSlots + 1; // Use verified count

      await supabase.from('the_life_brothels').update({
        workers: newWorkerCount,
        income_per_hour: newTotalIncome
      }).eq('id', brothel.id);

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - worker.hire_cost })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      await loadBrothel();
      await loadHiredWorkers();
      setMessage({ type: 'success', text: `${worker.name} hired successfully!` });
    } catch (err) {
      console.error('Error hiring worker:', err);
      setMessage({ type: 'error', text: 'Failed to hire worker!' });
    } finally {
      setIsHiring(false);
    }
  };

  // Sell a worker
  const sellWorker = async (hiredWorker) => {
    const sellPrice = Math.floor(hiredWorker.worker.hire_cost / 3);
    if (!window.confirm(`Sell ${hiredWorker.worker.name} for $${sellPrice.toLocaleString()}?`)) {
      return;
    }

    try {
      await supabase.from('the_life_player_brothel_workers').delete().eq('id', hiredWorker.id);

      const newTotalIncome = (brothel.income_per_hour || 0) - hiredWorker.worker.income_per_hour;
      const newWorkerCount = hiredWorkers.length - 1; // Calculate from actual count

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
      setMessage({ type: 'success', text: `Sold ${hiredWorker.worker.name} for $${sellPrice.toLocaleString()}!` });
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

  return (
    <div className="brothel-container">
      {/* Stats Header */}
      <div className="brothel-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">Workers</div>
            <div className="stat-value">{usedSlots}/{totalSlots}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💵</div>
          <div className="stat-content">
            <div className="stat-label">Income/Hour</div>
            <div className="stat-value">${(brothel.income_per_hour || 0).toLocaleString()}</div>
          </div>
        </div>
        
        <div className="stat-card stat-highlight">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Available</div>
            <div className="stat-value">${availableIncome.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Total Earned</div>
            <div className="stat-value">${(brothel.total_earned || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="brothel-actions">
        <button 
          onClick={collectIncome}
          className="btn-primary"
          disabled={!brothel.income_per_hour || availableIncome <= 0}
        >
          <span className="btn-icon">💰</span>
          Collect Income
        </button>
        
        {player?.level >= 5 && totalSlots < 50 && (
          <button 
            onClick={upgradeSlots}
            className="btn-secondary"
            disabled={player.cash < (brothel.slots_upgrade_cost || 50000)}
          >
            <span className="btn-icon">⬆️</span>
            Upgrade (+2 Slots) - ${(brothel.slots_upgrade_cost || 50000).toLocaleString()}
          </button>
        )}
      </div>

      {/* Hired Workers Section */}
      {hiredWorkers.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h3>💼 Your Workers ({usedSlots}/{totalSlots})</h3>
            <button 
              onClick={() => setShowHiredWorkers(!showHiredWorkers)}
              className="btn-toggle"
            >
              {showHiredWorkers ? 'Hide' : 'Show'} Workers
            </button>
          </div>
          
          {showHiredWorkers && (
            <div className="workers-grid workers-grid-scroll">
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
                    <button 
                      onClick={() => sellWorker(groupedWorker.allInstances[0])}
                      className="btn-sell"
                    >
                      Sell One - ${Math.floor(groupedWorker.worker.hire_cost / 3).toLocaleString()}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Available Workers Section */}
      <div className="section">
        <div className="section-header">
          <h3>🎯 Available Workers</h3>
        </div>

        {slotsFull && (
          <div className="alert alert-warning">
            ⚠️ All worker slots full! {player?.level >= 5 ? 'Upgrade your brothel to hire more workers.' : 'Reach level 5 to unlock brothel upgrades.'}
          </div>
        )}

        <div className="workers-grid">
          {availableWorkers.map(worker => {
            const hiredCount = hiredWorkers.filter(hw => hw.worker_id === worker.id).length;
            const canAfford = player?.cash >= worker.hire_cost;
            const meetsLevel = player?.level >= worker.min_level_required;
            const canHire = !slotsFull && canAfford && meetsLevel;

            return (
              <div key={worker.id} className="worker-card">
                <div className="worker-image">
                  <img src={worker.image_url} alt={worker.name} />
                  <div className={`rarity-badge rarity-${worker.rarity}`}>
                    {worker.rarity}
                  </div>
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
                    <button 
                      onClick={() => hireWorker(worker)}
                      disabled={!canAfford || isHiring}
                      className="btn-hire"
                    >
                      {isHiring ? 'Hiring...' : canAfford ? `Hire - $${worker.hire_cost.toLocaleString()}` : 'Insufficient Funds'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
