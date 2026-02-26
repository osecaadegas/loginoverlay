import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheLifeData } from './hooks/useTheLifeData';
import { supabase } from '../../config/supabaseClient';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './TheLife.css';
import './TheLifeSimple.css';

// Components
import WipeCountdown from './components/WipeCountdown';
import CategoryNav from './components/CategoryNav';

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
import TheLifeHighStakes from './categories/TheLifeHighStakes';

/**
 * Main The Life Container Component — Simplified UI
 * Clean layout: compact header → stats → pill tabs → content → mobile bottom nav
 */
export default function TheLife() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isPt = language === 'pt';
  
  // Background music
  const audioRef = useRef(null);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showMoreStats, setShowMoreStats] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('theLifeMusicEnabled');
    if (saved !== null) setIsMusicEnabled(saved === 'true');
    else localStorage.setItem('theLifeMusicEnabled', 'true');
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.1;
      if (isMusicEnabled) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isMusicEnabled]);

  const toggleMusic = () => {
    const newState = !isMusicEnabled;
    setIsMusicEnabled(newState);
    localStorage.setItem('theLifeMusicEnabled', newState);
  };
  
  // Get all game data
  const {
    player,
    setPlayer,
    setPlayerFromAction,
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

  // Auto-dismiss messages
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message.text, setMessage]);

  if (loading) {
    return (
      <div className="tls-page">
        <div className="tls-loading">
          <div className="tls-loading-spinner" />
          <span>{isPt ? 'Carregando...' : 'Loading...'}</span>
        </div>
      </div>
    );
  }

  const isInJail = player?.jail_until && new Date(player.jail_until) > new Date();
  const isInHospital = player?.hospital_until && new Date(player.hospital_until) > new Date();
  const isRestricted = isInJail || isInHospital;

  // Quick Refill Stamina
  const quickRefillStamina = async () => {
    try {
      const staminaItems = theLifeInventory.filter(inv => {
        if (!inv.item?.effect) return false;
        try {
          const effect = typeof inv.item.effect === 'string' ? JSON.parse(inv.item.effect) : inv.item.effect;
          return effect.type === 'stamina';
        } catch { return false; }
      });
      if (staminaItems.length === 0) {
        setMessage({ type: 'error', text: isPt ? 'Sem itens de stamina!' : 'No stamina items!' });
        return;
      }
      const itemToUse = staminaItems[0];
      const { data, error } = await supabase.rpc('use_consumable_item', { p_inventory_id: itemToUse.id });
      if (error) throw error;
      if (!data?.success) { setMessage({ type: 'error', text: data?.error || 'Failed' }); return; }
      if (data.overdose) {
        setMessage({ type: 'error', text: '💀 OVERDOSE!' });
      } else {
        const effect = typeof itemToUse.item.effect === 'string' ? JSON.parse(itemToUse.item.effect) : itemToUse.item.effect;
        setMessage({ type: 'success', text: `+${data.effect_value} stamina` });
      }
      initializePlayer();
      loadTheLifeInventory();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to use item' });
    }
  };

  const staminaItemCount = theLifeInventory.filter(inv => {
    if (!inv.item?.effect) return false;
    try { return JSON.parse(inv.item.effect).type === 'stamina'; } catch { return false; }
  }).reduce((sum, inv) => sum + inv.quantity, 0);

  const hpPct = player?.max_hp ? Math.round((player.hp / player.max_hp) * 100) : 100;
  const staminaPct = player?.max_stamina ? Math.round((player.stamina / player.max_stamina) * 100) : 100;
  const xpPct = player?.level ? Math.round((player.xp / (player.level * 100)) * 100) : 0;

  // Bottom nav items for mobile
  const bottomNavItems = [
    { key: 'crimes', icon: '🔫', label: isPt ? 'Crimes' : 'Crimes' },
    { key: 'businesses', icon: '🏢', label: isPt ? 'Negócios' : 'Business' },
    { key: 'pvp', icon: '⚔️', label: 'PvP' },
    { key: 'inventory', icon: '🎒', label: isPt ? 'Estoque' : 'Stash' },
    { key: 'bank', icon: '🏦', label: isPt ? 'Banco' : 'Bank' },
  ];

  return (
    <div className="tls-page">
      <audio ref={audioRef} src="/music/thelifemusic.mp3" loop preload="auto" />

      {/* ===== TOAST NOTIFICATION ===== */}
      {message.text && (
        <div className={`tls-toast tls-toast--${message.type}`}>
          <span className="tls-toast__icon">
            {message.type === 'success' ? '✓' : message.type === 'error' ? '✗' : 'ℹ'}
          </span>
          <span className="tls-toast__text">{message.text}</span>
          <button className="tls-toast__close" onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      <div className="tls-container">
        {/* ===== COMPACT HEADER ===== */}
        <header className="tls-header">
          <img src="/thelife/thelife.png" alt="The Life" className="tls-logo" />
          <div className="tls-header__right">
            <WipeCountdown />
            <button className="tls-icon-btn" onClick={() => setShowSettings(true)} title="Settings">⚙️</button>
            <button className="tls-icon-btn" onClick={() => navigate('/games/thelife/news')} title="News">📰</button>
          </div>
        </header>

        {/* ===== MONEY BAR ===== */}
        <div className="tls-money-bar">
          <div className="tls-money tls-money--cash">
            <span className="tls-money__icon">💵</span>
            <span className="tls-money__val">${player?.cash?.toLocaleString() || '0'}</span>
          </div>
          <div className="tls-money tls-money--bank">
            <span className="tls-money__icon">🏦</span>
            <span className="tls-money__val">${player?.bank_balance?.toLocaleString() || '0'}</span>
          </div>
          <div className="tls-level-badge">
            Lv.{player?.level || 1}
          </div>
        </div>

        {/* ===== STATS PANEL (collapsible) ===== */}
        <div className="tls-stats">
          {/* Primary bars — always visible */}
          <div className="tls-stats__primary">
            <div className="tls-bar tls-bar--hp" title={`HP: ${player?.hp}/${player?.max_hp}`}>
              <div className="tls-bar__fill" style={{ width: `${hpPct}%` }} />
              <span className="tls-bar__label">❤️ {player?.hp}/{player?.max_hp}</span>
            </div>
            <div className="tls-bar tls-bar--stamina" title={`Stamina: ${player?.stamina}/${player?.max_stamina}`}>
              <div className="tls-bar__fill" style={{ width: `${staminaPct}%` }} />
              <span className="tls-bar__label">⚡ {player?.stamina}/{player?.max_stamina}</span>
              {staminaItemCount > 0 && player?.stamina < player?.max_stamina && (
                <button className="tls-bar__action" onClick={quickRefillStamina} title="Refill">+{staminaItemCount}</button>
              )}
            </div>
            <div className="tls-bar tls-bar--xp" title={`XP: ${player?.xp}/${player?.level * 100}`}>
              <div className="tls-bar__fill" style={{ width: `${xpPct}%` }} />
              <span className="tls-bar__label">⭐ {player?.xp}/{player?.level * 100} XP</span>
            </div>
          </div>

          {/* Toggle more stats */}
          <button className="tls-stats__toggle" onClick={() => setShowMoreStats(!showMoreStats)}>
            {showMoreStats ? (isPt ? '▲ Menos' : '▲ Less') : (isPt ? '▼ Mais Stats' : '▼ More Stats')}
          </button>

          {/* Secondary stats — collapsible */}
          {showMoreStats && (
            <div className="tls-stats__secondary">
              <div className="tls-bar tls-bar--sm tls-bar--power">
                <div className="tls-bar__fill" style={{ width: `${Math.min((player?.power || 0), 100)}%` }} />
                <span className="tls-bar__label">💪 {isPt ? 'Poder' : 'Power'}: {player?.power || 0}</span>
              </div>
              <div className="tls-bar tls-bar--sm tls-bar--intel">
                <div className="tls-bar__fill" style={{ width: `${Math.min((player?.intelligence || 0), 100)}%` }} />
                <span className="tls-bar__label">🧠 {isPt ? 'Inteligência' : 'Intel'}: {player?.intelligence || 0}</span>
              </div>
              <div className="tls-bar tls-bar--sm tls-bar--defense">
                <div className="tls-bar__fill" style={{ width: `${Math.min((player?.defense || 0), 100)}%` }} />
                <span className="tls-bar__label">🛡️ {isPt ? 'Defesa' : 'Defense'}: {player?.defense || 0}</span>
              </div>
              <div className="tls-bar tls-bar--sm tls-bar--addiction">
                <div className="tls-bar__fill" style={{ width: `${((player?.addiction || 0) / (player?.max_addiction || 100)) * 100}%` }} />
                <span className="tls-bar__label">💊 {isPt ? 'Vício' : 'Addiction'}: {player?.addiction || 0}/{player?.max_addiction || 100}</span>
              </div>
            </div>
          )}
        </div>

        {/* ===== QUICK TOOLBAR ===== */}
        <div className="tls-toolbar">
          <button className={`tls-toolbar__btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>🏆 <span className="tls-toolbar__label">{isPt ? 'Ranking' : 'Leaderboard'}</span></button>
          <button className={`tls-toolbar__btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>👤 <span className="tls-toolbar__label">{isPt ? 'Perfil' : 'Profile'}</span></button>
          <button className={`tls-toolbar__btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>📊 <span className="tls-toolbar__label">{isPt ? 'Estatísticas' : 'Stats'}</span></button>
          <button className="tls-toolbar__btn tls-toolbar__btn--gold" onClick={() => navigate('/games/thelife/season-pass')}>
            ⭐ <span className="tls-toolbar__label">{isPt ? 'Passe' : 'Pass'}</span>
          </button>
          <button className={`tls-toolbar__btn ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>📈 <span className="tls-toolbar__label">{isPt ? 'Habilidades' : 'Skills'}</span></button>
          {isMusicEnabled ? (
            <button className="tls-toolbar__btn" onClick={toggleMusic} title="Mute music">🔊 <span className="tls-toolbar__label">{isPt ? 'Som' : 'Sound'}</span></button>
          ) : (
            <button className="tls-toolbar__btn" onClick={toggleMusic} title="Enable music">🔇 <span className="tls-toolbar__label">{isPt ? 'Som' : 'Sound'}</span></button>
          )}
        </div>

        {/* ===== STATUS WARNINGS ===== */}
        {isInJail && (
          <div className="tls-alert tls-alert--warn">
            🔒 {isPt ? 'Na prisão até' : 'In jail until'} {new Date(player.jail_until).toLocaleTimeString()}
            <button className="tls-alert__action" onClick={() => setActiveTab('jail')}>{isPt ? 'Ir' : 'Go'} →</button>
          </div>
        )}
        {isInHospital && (
          <div className="tls-alert tls-alert--danger">
            🏥 {isPt ? 'No hospital até' : 'In hospital until'} {new Date(player.hospital_until).toLocaleTimeString()}
            <button className="tls-alert__action" onClick={() => setActiveTab('hospital')}>{isPt ? 'Ir' : 'Go'} →</button>
          </div>
        )}

        {/* ===== CATEGORY PILL TABS ===== */}
        <CategoryNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isRestricted={isRestricted}
        />

        {/* ===== ACTIVE TAB CONTENT ===== */}
        <div className="tls-content">
          {activeTab === 'crimes' && (
            <TheLifeCrimes player={player} setPlayer={setPlayer} setPlayerFromAction={setPlayerFromAction}
              robberies={robberies} setMessage={setMessage} showEventMessage={showEventMessage}
              user={user} isInJail={isInJail} isInHospital={isInHospital} loadTheLifeInventory={loadTheLifeInventory} />
          )}
          {activeTab === 'bank' && (
            <TheLifeBank player={player} setPlayer={setPlayer} setPlayerFromAction={setPlayerFromAction}
              depositAmount={depositAmount} setDepositAmount={setDepositAmount}
              withdrawAmount={withdrawAmount} setWithdrawAmount={setWithdrawAmount}
              setMessage={setMessage} user={user} />
          )}
          {activeTab === 'pvp' && (
            <TheLifePVP player={player} setPlayer={setPlayer} setPlayerFromAction={setPlayerFromAction}
              onlinePlayers={onlinePlayers} loadOnlinePlayers={loadOnlinePlayers}
              setMessage={setMessage} isInHospital={isInHospital} setActiveTab={setActiveTab} user={user} />
          )}
          {activeTab === 'businesses' && (
            <TheLifeBusinesses player={player} setPlayer={setPlayer} setPlayerFromAction={setPlayerFromAction}
              businesses={businesses} ownedBusinesses={ownedBusinesses} drugOps={drugOps} setDrugOps={setDrugOps}
              setMessage={setMessage} loadOwnedBusinesses={loadOwnedBusinesses} loadDrugOps={loadDrugOps}
              isInHospital={isInHospital} user={user} />
          )}
          {activeTab === 'brothel' && (
            <TheLifeBrothel player={player} setPlayer={setPlayer} setPlayerFromAction={setPlayerFromAction}
              brothel={brothel} setBrothel={setBrothel} availableWorkers={availableWorkers}
              hiredWorkers={hiredWorkers} showHiredWorkers={showHiredWorkers} setShowHiredWorkers={setShowHiredWorkers}
              setMessage={setMessage} loadBrothel={loadBrothel} loadHiredWorkers={loadHiredWorkers}
              isInHospital={isInHospital} user={user} />
          )}
          {activeTab === 'inventory' && (
            <TheLifeInventory theLifeInventory={theLifeInventory} player={player} setPlayer={setPlayer}
              setPlayerFromAction={setPlayerFromAction} setMessage={setMessage}
              loadTheLifeInventory={loadTheLifeInventory} initializePlayer={initializePlayer} user={user} />
          )}
          {activeTab === 'jail' && (
            <TheLifeJail player={player} setPlayer={setPlayer} setPlayerFromAction={setPlayerFromAction}
              jailTimeRemaining={jailTimeRemaining} isInJail={isInJail} theLifeInventory={theLifeInventory}
              setMessage={setMessage} loadTheLifeInventory={loadTheLifeInventory} user={user} />
          )}
          {activeTab === 'leaderboard' && (
            <TheLifeLeaderboard leaderboard={leaderboard} player={player} loadLeaderboard={loadLeaderboard} />
          )}
          {activeTab === 'hospital' && (
            <TheLifeHospital player={player} setPlayer={setPlayer} setPlayerFromAction={setPlayerFromAction}
              isInHospital={isInHospital} hospitalTimeRemaining={hospitalTimeRemaining}
              setMessage={setMessage} initializePlayer={initializePlayer} user={user} />
          )}
          {activeTab === 'market' && (
            <TheLifeBlackMarket player={player} setPlayer={setPlayer} setPlayerFromAction={setPlayerFromAction}
              theLifeInventory={theLifeInventory} marketSubTab={marketSubTab} setMarketSubTab={setMarketSubTab}
              setMessage={setMessage} loadTheLifeInventory={loadTheLifeInventory}
              showEventMessage={showEventMessage} initializePlayer={initializePlayer}
              isInHospital={isInHospital} user={user} />
          )}
          {activeTab === 'docks' && (
            <TheLifeDocks player={player} setPlayer={setPlayer} setPlayerFromAction={setPlayerFromAction}
              theLifeInventory={theLifeInventory} setMessage={setMessage}
              loadTheLifeInventory={loadTheLifeInventory} user={user} />
          )}
          {activeTab === 'profile' && (
            <TheLifeProfile player={player} setPlayer={setPlayer} setPlayerFromAction={setPlayerFromAction}
              theLifeInventory={theLifeInventory} setMessage={setMessage}
              loadTheLifeInventory={loadTheLifeInventory} initializePlayer={initializePlayer} user={user} />
          )}
          {activeTab === 'skills' && (
            <TheLifeSkills player={player} setPlayer={setPlayer} setPlayerFromAction={setPlayerFromAction}
              setMessage={setMessage} isInHospital={isInHospital} user={user} />
          )}
          {activeTab === 'stats' && (
            <TheLifeStats player={player} />
          )}
          {activeTab === 'highstakes' && (
            player?.level >= 15 ? (
              <TheLifeHighStakes player={player} setPlayer={setPlayer} setPlayerFromAction={setPlayerFromAction}
                setMessage={setMessage} showEventMessage={showEventMessage}
                user={user} isInJail={isInJail} isInHospital={isInHospital} />
            ) : (
              <div className="tls-locked">
                <span className="tls-locked__icon">🔒</span>
                <h3>{isPt ? 'Apostas Altas Bloqueadas' : 'High Stakes Locked'}</h3>
                <p>{isPt ? 'Precisa de Nível 15' : 'Requires Level 15'} &middot; {isPt ? 'Seu nível' : 'Your level'}: {player?.level || 1}</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="tls-bottom-nav">
        {bottomNavItems.map(item => (
          <button
            key={item.key}
            className={`tls-bottom-nav__item ${activeTab === item.key ? 'active' : ''} ${isRestricted && ['crimes','businesses','pvp'].includes(item.key) ? 'disabled' : ''}`}
            onClick={() => !isRestricted || !['crimes','businesses','pvp'].includes(item.key) ? setActiveTab(item.key) : null}
          >
            <span className="tls-bottom-nav__icon">{item.icon}</span>
            <span className="tls-bottom-nav__label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ===== EVENT POPUP ===== */}
      {showEventPopup && eventPopupData && (
        <div className="tls-modal-overlay" onClick={() => setShowEventPopup(false)}>
          <div className="tls-modal" onClick={(e) => e.stopPropagation()}>
            <button className="tls-modal__close" onClick={() => setShowEventPopup(false)}>×</button>
            {eventPopupData.image_url && (
              <img src={eventPopupData.image_url} alt="" className="tls-modal__img" />
            )}
            <p className="tls-modal__text">{eventPopupData.message}</p>
          </div>
        </div>
      )}

      {/* ===== SETTINGS MODAL ===== */}
      {showSettings && (
        <div className="tls-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="tls-modal tls-modal--settings" onClick={(e) => e.stopPropagation()}>
            <div className="tls-modal__header">
              <h2>⚙️ {isPt ? 'Configurações' : 'Settings'}</h2>
              <button className="tls-modal__close" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="tls-modal__body">
              <div className="tls-setting">
                <span>🎵 {isPt ? 'Música de Fundo' : 'Background Music'}</span>
                <label className="tls-toggle">
                  <input type="checkbox" checked={isMusicEnabled} onChange={toggleMusic} />
                  <span className="tls-toggle__slider"></span>
                </label>
              </div>
              <p className="tls-setting__hint">{isPt ? 'Toca a 10% do volume' : 'Plays at 10% volume'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
