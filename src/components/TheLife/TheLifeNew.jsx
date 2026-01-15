import { useAuth } from '../../context/AuthContext';
import { useTheLifeData } from './hooks/useTheLifeData';
import { supabase } from '../../config/supabaseClient';
import './TheLife.css';

// Category Components
import TheLifeCrimes from './categories/TheLifeCrimes';
import TheLifePVP from './categories/TheLifePVP_NEW';
import './styles/TheLifePVP.css';
import TheLifeBusinesses from './categories/TheLifeBusinesses';
import TheLifeBrothel from './categories/TheLifeBrothel';
import TheLifeBank from './categories/TheLifeBank';
import TheLifeJail from './categories/TheLifeJail';
import TheLifeHospital from './categories/TheLifeHospital';
import TheLifeBlackMarket from './categories/TheLifeBlackMarket';
import TheLifeDocks from './categories/TheLifeDocks';
import TheLifeInventory from './categories/TheLifeInventory';
import TheLifeLeaderboard from './categories/TheLifeLeaderboard';
import TheLifeStats from './categories/TheLifeStats';
import TheLifeSkills from './categories/TheLifeSkills';
import TheLifeProfile from './categories/TheLifeProfile';

/**
 * Main The Life Container Component
 * Manages tab navigation and renders appropriate category components
 */
export default function TheLife() {
  const { user } = useAuth();
  
  // Get all game data and state from custom hook
  const {
    player,
    setPlayer,
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
    showEventMessage
  } = useTheLifeData(user);

  if (loading) {
    return (
      <div className="the-life-container">
        <div className="loading">Loading The Life...</div>
      </div>
    );
  }

  const isInJail = player?.jail_until && new Date(player.jail_until) > new Date();
  const isInHospital = player?.hospital_until && new Date(player.hospital_until) > new Date();

  // Get current category info (only if categoryInfo is loaded)
  const currentCategoryInfo = categoryInfo && categoryInfo[activeTab] ? categoryInfo[activeTab] : null;

  // Quick Refill Stamina function
  const quickRefillStamina = async () => {
    try {
      // Find stamina consumables in inventory
      const staminaItems = theLifeInventory.filter(inv => {
        if (!inv.item.effect) return false;
        try {
          const effect = JSON.parse(inv.item.effect);
          return effect.type === 'stamina';
        } catch {
          return false;
        }
      });

      if (staminaItems.length === 0) {
        setMessage({ type: 'error', text: 'No stamina items in inventory!' });
        return;
      }

      // Use the first stamina item found
      const itemToUse = staminaItems[0];
      const effect = JSON.parse(itemToUse.item.effect);

      // Update player stamina
      const newStamina = Math.min(player.max_stamina, player.stamina + effect.value);
      const { error: playerError } = await supabase
        .from('the_life_players')
        .update({ stamina: newStamina })
        .eq('user_id', user.id);

      if (playerError) throw playerError;

      // Remove one from inventory
      if (itemToUse.quantity > 1) {
        await supabase
          .from('the_life_player_inventory')
          .update({ quantity: itemToUse.quantity - 1 })
          .eq('id', itemToUse.id);
      } else {
        await supabase
          .from('the_life_player_inventory')
          .delete()
          .eq('id', itemToUse.id);
      }

      setMessage({ type: 'success', text: `Used ${itemToUse.item.name}! +${effect.value} stamina` });
      initializePlayer();
      loadTheLifeInventory();
    } catch (err) {
      console.error('Error using stamina item:', err);
      setMessage({ type: 'error', text: 'Failed to use item' });
    }
  };

  // Get stamina item count
  const staminaItemCount = theLifeInventory.filter(inv => {
    if (!inv.item.effect) return false;
    try {
      const effect = JSON.parse(inv.item.effect);
      return effect.type === 'stamina';
    } catch {
      return false;
    }
  }).reduce((sum, inv) => sum + inv.quantity, 0);

  return (
    <div className="the-life-container">
      <div className="the-life-header">
        <img src="/thelife/thelife.png" alt="The Life" className="game-logo" />
      </div>

      {message.text && (
        <div className={`game-message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      {/* Player Stats and Category Info Container */}
      <div className="stats-and-info-container">
        {/* Player Stats Bar */}
        <div className="player-stats-bar">
          <div className="stats-left-section">
          <div className="stat-group">
            <div className="stat-bar">
              <div 
                className="stat-fill xp-fill" 
                style={{ width: `${(player?.xp / (player?.level * 100)) * 100}%` }}
              />
              <span className="stat-text">LEVEL {player?.level} - {player?.xp} / {player?.level * 100} XP</span>
            </div>
          </div>

          <div className="stat-group">
            <div className="stat-bar">
              <div 
                className="stat-fill hp-fill" 
                style={{ width: `${(player?.hp / player?.max_hp) * 100}%` }}
              />
              <span className="stat-text">HP: {player?.hp} / {player?.max_hp}</span>
            </div>
          </div>

          <div className="stat-group">
            <div className="stat-bar">
              <div 
                className="stat-fill stamina-fill" 
                style={{ width: `${(player?.stamina / player?.max_stamina) * 100}%` }}
              />
              <span className="stat-text">STAMINA: {player?.stamina} / {player?.max_stamina}</span>
            </div>
          </div>
        </div>

        <div className="stats-right-section">
          <div className="stat-group">
            <div className="stat-bar">
              <div 
                className="stat-fill power-fill" 
                style={{ width: `${Math.min(((player?.power || 0) / 100) * 100, 100)}%` }}
              />
              <span className="stat-text">POWER: {player?.power || 0}</span>
            </div>
          </div>

          <div className="stat-group">
            <div className="stat-bar">
              <div 
                className="stat-fill intelligence-fill" 
                style={{ width: `${Math.min(((player?.intelligence || 0) / 100) * 100, 100)}%` }}
              />
              <span className="stat-text">INTELLIGENCE: {player?.intelligence || 0}</span>
            </div>
          </div>

          <div className="stat-group">
            <div className="stat-bar">
              <div 
                className="stat-fill defense-fill" 
                style={{ width: `${Math.min(((player?.defense || 0) / 100) * 100, 100)}%` }}
              />
              <span className="stat-text">DEFENSE: {player?.defense || 0}</span>
            </div>
          </div>
        </div>

        <div className="stats-bottom-section">
          {/* Quick Access Buttons Inside Stats Card */}
          <div className="quick-access-tabs-inline">
            <button 
              className={`quick-tab-inline compact ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              🏆 Leaderboard
            </button>
            <button 
              className={`quick-tab-inline compact ${activeTab === 'bank' ? 'active' : ''}`}
              onClick={() => !isInJail && setActiveTab('bank')}
              disabled={isInJail}
              style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
            >
              🏦 Bank
            </button>
            <button 
              className={`quick-tab-inline compact ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              👤 Profile
            </button>
            {staminaItemCount > 0 && player?.stamina < player?.max_stamina && (
              <button 
                className="quick-tab-inline compact refill-btn"
                onClick={quickRefillStamina}
                title={`Use stamina item (${staminaItemCount} available)`}
              >
                ⚡ Refill ({staminaItemCount})
              </button>
            )}
            </button>
          </div>

          <div className="cash-display">
            <div className="cash-item">
              <span className="cash-icon">💵</span>
              <span className="cash-value">${player?.cash?.toLocaleString()}</span>
              <span className="cash-label">Cash</span>
            </div>
            <div className="cash-item">
              <span className="cash-icon">🏦</span>
              <span className="cash-value">${player?.bank_balance?.toLocaleString()}</span>
              <span className="cash-label">Bank</span>
            </div>
          </div>
        </div>
        </div>

        {/* Category Info Display */}
        {currentCategoryInfo && (
          <div className="category-info-display">
            <div className="category-info-text">
              <h3>{currentCategoryInfo.category_name}</h3>
              <p>{currentCategoryInfo.description}</p>
            </div>
            <div className="category-info-image">
              <img src={currentCategoryInfo.image_url} alt={currentCategoryInfo.category_name} />
            </div>
          </div>
        )}
      </div>

      {/* Status Warnings */}
      {isInJail && (
        <div className="status-warning jail">
          ⚠️ You are in jail until {new Date(player.jail_until).toLocaleTimeString()}
        </div>
      )}

      {isInHospital && (
        <div className="status-warning hospital">
          🏥 You are in hospital until {new Date(player.hospital_until).toLocaleTimeString()}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="game-tabs-wrapper">
        <button 
          className="tab-scroll-btn left"
          onClick={() => {
            const container = document.querySelector('.game-tabs-scroll');
            container.scrollBy({ left: -150, behavior: 'smooth' });
          }}
        >
          ‹
        </button>
        <div className="game-tabs-scroll">
          <div className="game-tabs">
            <button 
              className={`tab tab-image ${activeTab === 'crimes' ? 'active' : ''}`}
              onClick={() => !isInJail && setActiveTab('crimes')}
              disabled={isInJail}
              style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/crimes.png" alt="Crimes" />
            </button>
            <button 
              className={`tab tab-image ${activeTab === 'pvp' ? 'active' : ''}`}
              onClick={() => !isInJail && setActiveTab('pvp')}
              disabled={isInJail}
              style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/pvp.png" alt="PvP" />
            </button>
            <button
              className={`tab tab-image ${activeTab === 'businesses' ? 'active' : ''}`}
              onClick={() => !isInJail && setActiveTab('businesses')}
              disabled={isInJail}
              style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/businesses.png" alt="Businesses" />
            </button>
            <button 
              className={`tab tab-image ${activeTab === 'brothel' ? 'active' : ''}`}
              onClick={() => !isInJail && setActiveTab('brothel')}
              disabled={isInJail}
              style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/brothel.png" alt="Brothel" />
            </button>
            <button 
              className={`tab tab-image ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => !isInJail && setActiveTab('inventory')}
              disabled={isInJail}
              style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/Inventory.png" alt="Inventory" />
            </button>
            <button 
              className={`tab tab-image ${activeTab === 'jail' ? 'active' : ''}`}
              onClick={() => setActiveTab('jail')}
            >
              <img src="/thelife/categories/Jail.png" alt="Jail" />
            </button>
            <button 
              className={`tab tab-image ${activeTab === 'hospital' ? 'active' : ''}`}
              onClick={() => setActiveTab('hospital')}
            >
              <img src="/thelife/categories/Hospital.png" alt="Hospital" />
            </button>
            <button 
              className={`tab tab-image ${activeTab === 'market' ? 'active' : ''}`}
              onClick={() => !isInJail && setActiveTab('market')}
              disabled={isInJail}
              style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/BlackMarket.png" alt="Market" />
            </button>
            <button 
              className={`tab tab-image ${activeTab === 'docks' ? 'active' : ''}`}
              onClick={() => !isInJail && setActiveTab('docks')}
              disabled={isInJail}
              style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/Docks.png" alt="Docks" />
            </button>
            <button 
              className={`tab tab-image ${activeTab === 'skills' ? 'active' : ''}`}
              onClick={() => !isInJail && setActiveTab('skills')}
              disabled={isInJail}
              style={{opacity: isInJail ? 0.5 : 1, cursor: isInJail ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/skills.png" alt="Skills" />
            </button>
          </div>
        </div>
        <button 
          className="tab-scroll-btn right"
          onClick={() => {
            const container = document.querySelector('.game-tabs-scroll');
            container.scrollBy({ left: 150, behavior: 'smooth' });
          }}
        >
          ›
        </button>
      </div>

      {/* Render Active Tab Content */}
      {activeTab === 'crimes' && (
        <TheLifeCrimes
          player={player}
          setPlayer={setPlayer}
          robberies={robberies}
          setMessage={setMessage}
          showEventMessage={showEventMessage}
          user={user}
          isInJail={isInJail}
          isInHospital={isInHospital}
        />
      )}

      {activeTab === 'bank' && (
        <TheLifeBank
          player={player}
          setPlayer={setPlayer}
          depositAmount={depositAmount}
          setDepositAmount={setDepositAmount}
          withdrawAmount={withdrawAmount}
          setWithdrawAmount={setWithdrawAmount}
          setMessage={setMessage}
          user={user}
        />
      )}

      {activeTab === 'pvp' && (
        <TheLifePVP
          player={player}
          setPlayer={setPlayer}
          onlinePlayers={onlinePlayers}
          loadOnlinePlayers={loadOnlinePlayers}
          setMessage={setMessage}
          isInHospital={isInHospital}
          setActiveTab={setActiveTab}
          user={user}
        />
      )}

      {activeTab === 'businesses' && (
        <TheLifeBusinesses
          player={player}
          setPlayer={setPlayer}
          businesses={businesses}
          ownedBusinesses={ownedBusinesses}
          drugOps={drugOps}
          setDrugOps={setDrugOps}
          setMessage={setMessage}
          loadOwnedBusinesses={loadOwnedBusinesses}
          loadDrugOps={loadDrugOps}
          isInHospital={isInHospital}
          user={user}
        />
      )}

      {activeTab === 'brothel' && (
        <TheLifeBrothel
          player={player}
          setPlayer={setPlayer}
          brothel={brothel}
          setBrothel={setBrothel}
          availableWorkers={availableWorkers}
          hiredWorkers={hiredWorkers}
          showHiredWorkers={showHiredWorkers}
          setShowHiredWorkers={setShowHiredWorkers}
          setMessage={setMessage}
          loadBrothel={loadBrothel}
          loadHiredWorkers={loadHiredWorkers}
          isInHospital={isInHospital}
          user={user}
        />
      )}

      {activeTab === 'inventory' && (
        <TheLifeInventory
          theLifeInventory={theLifeInventory}
          player={player}
          setPlayer={setPlayer}
          setMessage={setMessage}
          loadTheLifeInventory={loadTheLifeInventory}
          user={user}
        />
      )}

      {activeTab === 'jail' && (
        <TheLifeJail
          player={player}
          setPlayer={setPlayer}
          jailTimeRemaining={jailTimeRemaining}
          isInJail={isInJail}
          theLifeInventory={theLifeInventory}
          setMessage={setMessage}
          loadTheLifeInventory={loadTheLifeInventory}
          user={user}
        />
      )}

      {activeTab === 'leaderboard' && (
        <TheLifeLeaderboard
          leaderboard={leaderboard}
          player={player}
        />
      )}

      {activeTab === 'hospital' && (
        <TheLifeHospital
          player={player}
          setPlayer={setPlayer}
          isInHospital={isInHospital}
          hospitalTimeRemaining={hospitalTimeRemaining}
          setMessage={setMessage}
          initializePlayer={initializePlayer}
          user={user}
        />
      )}

      {activeTab === 'market' && (
        <TheLifeBlackMarket
          player={player}
          setPlayer={setPlayer}
          theLifeInventory={theLifeInventory}
          marketSubTab={marketSubTab}
          setMarketSubTab={setMarketSubTab}
          setMessage={setMessage}
          loadTheLifeInventory={loadTheLifeInventory}
          showEventMessage={showEventMessage}
          initializePlayer={initializePlayer}
          isInHospital={isInHospital}
          user={user}
        />
      )}

      {activeTab === 'docks' && (
        <TheLifeDocks
          player={player}
          setPlayer={setPlayer}
          theLifeInventory={theLifeInventory}
          setMessage={setMessage}
          loadTheLifeInventory={loadTheLifeInventory}
          user={user}
        />
      )}

      {activeTab === 'profile' && (
        <TheLifeProfile
          player={player}
          setPlayer={setPlayer}
          theLifeInventory={theLifeInventory}
          setMessage={setMessage}
          loadTheLifeInventory={loadTheLifeInventory}
          initializePlayer={initializePlayer}
          user={user}
        />
      )}

      {activeTab === 'skills' && (
        <TheLifeSkills
          player={player}
          setPlayer={setPlayer}
          setMessage={setMessage}
          isInHospital={isInHospital}
          user={user}
        />
      )}

      {/* Event Popup Modal */}
      {showEventPopup && eventPopupData && (
        <div className="event-popup-overlay" onClick={() => setShowEventPopup(false)}>
          <div className="event-popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="event-popup-close" onClick={() => setShowEventPopup(false)}>×</button>
            <div className="event-popup-image">
              <img src={eventPopupData.image_url} alt="Event" />
            </div>
            <div className="event-popup-message">
              <p>{eventPopupData.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
