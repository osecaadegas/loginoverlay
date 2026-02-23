import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheLifeData } from './hooks/useTheLifeData';
import { supabase } from '../../config/supabaseClient';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useDragScroll } from './hooks/useDragScroll';
import { useLanguage } from '../../contexts/LanguageContext';
import './TheLife.css';

// Components
import WipeCountdown from './components/WipeCountdown';

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

// Fallback images for category info (local files)
const categoryFallbackImages = {
  crimes: '/thelife/categories/crimes.png',
  pvp: '/thelife/categories/pvp.png',
  businesses: '/thelife/categories/businesses.png',
  brothel: '/thelife/categories/brothel.png',
  inventory: '/thelife/categories/Inventory.png',
  jail: '/thelife/categories/Jail.png',
  hospital: '/thelife/categories/Hospital.png',
  market: '/thelife/categories/BlackMarket.png',
  bank: '/thelife/categories/BlackMarket.png',
  docks: '/thelife/categories/Docks.png',
  stats: '/thelife/categories/skills.png',
  leaderboard: '/thelife/categories/pvp.png',
  highstakes: '/thelife/categories/high-stakes.png',
  skills: '/thelife/categories/skills.png',
  playermarket: '/thelife/categories/playermarket.png',
  profile: '/thelife/categories/pvp.png',
};

// Portuguese translations for category info
const categoryTranslations = {
  crimes: {
    name: 'Crimes',
    nameEn: 'Crimes',
    desc: 'Realize assaltos e roubos para ganhar dinheiro rápido. Crimes de nível mais alto oferecem recompensas maiores, mas com maior risco de prisão.',
    descEn: 'Pull off heists and robberies for fast cash. Higher-level crimes offer bigger rewards but carry greater risk of jail time.'
  },
  pvp: {
    name: 'Combate PvP',
    nameEn: 'PvP Combat',
    desc: 'Ataque outros jogadores para roubar seu dinheiro e enviá-los ao hospital. Seu nível e HP determinam suas chances de vitória.',
    descEn: 'Attack other players to steal their cash and send them to the hospital. Your level and HP determine your chances of winning.'
  },
  businesses: {
    name: 'Negócios',
    nameEn: 'Businesses',
    desc: 'Possua e opere vários negócios para gerar renda passiva. Melhore seus negócios para aumentar a produção e os lucros.',
    descEn: 'Own and operate businesses to generate passive income. Upgrade to increase production and profits.'
  },
  brothel: {
    name: 'Bordel',
    nameEn: 'Brothel',
    desc: 'Contrate trabalhadores para gerar renda passiva. Melhore seu bordel para desbloquear mais vagas e aumentar seus ganhos por hora.',
    descEn: 'Hire workers to generate passive income. Upgrade your brothel to unlock more slots and boost hourly earnings.'
  },
  inventory: {
    name: 'Estoque',
    nameEn: 'Inventory',
    desc: 'Armazene itens ganhos de negócios e atividades. Itens especiais como Cartões de Saída da Prisão podem ajudá-lo a escapar de situações difíceis.',
    descEn: 'Store items earned from businesses and activities. Special items like Get Out of Jail cards can help you escape tough situations.'
  },
  jail: {
    name: 'Prisão',
    nameEn: 'Jail',
    desc: 'Quando crimes falham, você acaba aqui. Use um Cartão de Saída da Prisão ou pague suborno para escapar cedo, ou aguarde sua sentença.',
    descEn: 'When crimes fail, you end up here. Use a Get Out of Jail card or pay a bribe to escape early, or wait out your sentence.'
  },
  hospital: {
    name: 'Hospital',
    nameEn: 'Hospital',
    desc: 'Recupere seu HP após batalhas ou crimes fracassados. Pague por serviços médicos para voltar à ação mais rápido.',
    descEn: 'Recover your HP after battles or failed crimes. Pay for medical services to get back into action faster.'
  },
  market: {
    name: 'Mercado Negro',
    nameEn: 'Black Market',
    desc: 'Venda drogas nas ruas para altos lucros mas com risco de prisão, ou use as docas seguras para vendas garantidas com pagamentos menores.',
    descEn: 'Sell drugs on the streets for high profits but risk jail, or use the safe docks for guaranteed sales at lower payouts.'
  },
  bank: {
    name: 'Banco',
    nameEn: 'Bank',
    desc: 'Mantenha seu dinheiro seguro de outros jogadores. Deposite seu dinheiro para protegê-lo de perdas em PvP e roubos.',
    descEn: 'Keep your money safe from other players. Deposit your cash to protect it from PvP losses and robberies.'
  },
  stats: {
    name: 'Estatísticas',
    nameEn: 'Stats',
    desc: 'Acompanhe o progresso da sua carreira criminal incluindo total de crimes, taxa de sucesso, registro PvP e sequências de login.',
    descEn: 'Track your criminal career progress including total crimes, success rate, PvP record, and login streaks.'
  },
  leaderboard: {
    name: 'Classificação',
    nameEn: 'Leaderboard',
    desc: 'Compita com outros jogadores pelos primeiros lugares. Rankings são baseados em dinheiro total, nível e sucesso criminal.',
    descEn: 'Compete with other players for the top spots. Rankings are based on total cash, level, and criminal success.'
  },
  highstakes: {
    name: 'Apostas Altas',
    nameEn: 'High Stakes',
    desc: 'Jogue jogos de cassino de alto risco. Aposte seu dinheiro suado em Blackjack, Roleta e mais!',
    descEn: 'Play high-risk casino games. Bet your hard-earned cash on Blackjack, Roulette and more!'
  },
  playermarket: {
    name: 'Mercado de Jogadores',
    nameEn: 'Player Market',
    desc: 'Compre, venda e troque itens com outros jogadores. Liste seus itens ou faça ofertas no mercado peer-to-peer.',
    descEn: 'Buy, sell and trade items with other players. List your items or make offers on the peer-to-peer market.'
  },
  skills: {
    name: 'Habilidades',
    nameEn: 'Skills',
    desc: 'Treine e melhore suas habilidades para desbloquear vantagens no jogo.',
    descEn: 'Train and improve your skills to unlock advantages in the game.'
  },
  docks: {
    name: 'Docas',
    nameEn: 'Docks',
    desc: 'Venda mercadorias de forma segura nas docas por pagamentos garantidos.',
    descEn: 'Sell goods safely at the docks for guaranteed payments.'
  },
  profile: {
    name: 'Perfil',
    nameEn: 'Profile',
    desc: 'Veja e personalize o seu perfil de jogador.',
    descEn: 'View and customize your player profile.'
  }
};

/**
 * Main The Life Container Component
 * Manages tab navigation and renders appropriate category components
 */
export default function TheLife() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isPt = language === 'pt';
  
  // Background music state - default to true for autoplay
  const audioRef = useRef(null);
  const tabsScrollRef = useRef(null);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const tabsDragScroll = useDragScroll(tabsScrollRef);
  
  // Initialize audio and load saved preferences
  useEffect(() => {
    const savedMusicState = localStorage.getItem('theLifeMusicEnabled');
    // If no saved state, default to true (enabled)
    if (savedMusicState !== null) {
      setIsMusicEnabled(savedMusicState === 'true');
    } else {
      // First time - set to enabled and save it
      localStorage.setItem('theLifeMusicEnabled', 'true');
    }
  }, []);

  // Handle music play/pause at 10% volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.1; // Always 10% volume
      if (isMusicEnabled) {
        audioRef.current.play().catch(err => console.log('Audio play failed:', err));
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
  
  // Get all game data and state from custom hook
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

  // Auto-dismiss messages after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message.text, setMessage]);

  // Get current category info with translation support + fallback images (must be before any early returns)
  const currentCategoryInfo = useMemo(() => {
    const info = categoryInfo?.[activeTab];
    const translation = categoryTranslations[activeTab];
    const fallbackImg = categoryFallbackImages[activeTab];

    // Build info object — use DB data when available, fall back to translations + local images
    const name = isPt
      ? (translation?.name || info?.category_name || activeTab)
      : (info?.category_name || translation?.nameEn || translation?.name || activeTab);
    const desc = isPt
      ? (translation?.desc || info?.description || '')
      : (info?.description || translation?.descEn || translation?.desc || '');
    const img = info?.image_url || fallbackImg || '';

    if (!name && !desc) return null;

    return {
      ...(info || {}),
      category_name: name,
      description: desc,
      image_url: img,
    };
  }, [categoryInfo, activeTab, isPt]);

  if (loading) {
    return (
      <div className="the-life-container">
        <div className="loading">{isPt ? 'Carregando The Life...' : 'Loading The Life...'}</div>
      </div>
    );
  }

  const isInJail = player?.jail_until && new Date(player.jail_until) > new Date();
  const isInHospital = player?.hospital_until && new Date(player.hospital_until) > new Date();
  const isRestricted = isInJail || isInHospital; // Restricted when in jail OR hospital

  // Quick Refill Stamina function
  const quickRefillStamina = async () => {
    try {
      // Find stamina consumables in inventory
      const staminaItems = theLifeInventory.filter(inv => {
        if (!inv.item?.effect) return false;
        try {
          const effect = typeof inv.item.effect === 'string' ? JSON.parse(inv.item.effect) : inv.item.effect;
          return effect.type === 'stamina';
        } catch {
          return false;
        }
      });

      if (staminaItems.length === 0) {
        setMessage({ type: 'error', text: 'No stamina items in inventory!' });
        return;
      }

      // Use the first stamina item found via server-side RPC
      const itemToUse = staminaItems[0];
      const { data, error } = await supabase.rpc('use_consumable_item', {
        p_inventory_id: itemToUse.id
      });

      if (error) throw error;
      if (!data?.success) {
        setMessage({ type: 'error', text: data?.error || 'Failed to use item' });
        return;
      }

      if (data.overdose) {
        setMessage({ type: 'error', text: '💀 OVERDOSE! Your addiction hit 100! You collapsed and were rushed to the hospital!' });
      } else {
        const effect = typeof itemToUse.item.effect === 'string' ? JSON.parse(itemToUse.item.effect) : itemToUse.item.effect;
        const addictionGain = effect.addiction || 0;
        setMessage({ type: 'success', text: `Used ${itemToUse.item.name}! +${data.effect_value} stamina${addictionGain > 0 ? ` (+${addictionGain} addiction)` : ''}` });
      }

      initializePlayer();
      loadTheLifeInventory();
    } catch (err) {
      console.error('Error using stamina item:', err);
      setMessage({ type: 'error', text: 'Failed to use item' });
    }
  };

  // Get stamina item count
  const staminaItemCount = theLifeInventory.filter(inv => {
    if (!inv.item?.effect) return false;
    try {
      const effect = JSON.parse(inv.item.effect);
      return effect.type === 'stamina';
    } catch {
      return false;
    }
  }).reduce((sum, inv) => sum + inv.quantity, 0);

  return (
    <div className="the-life-page">
    <div className="the-life-container">
      {/* Background Music */}
      <audio 
        ref={audioRef} 
        src="/music/thelifemusic.mp3" 
        loop 
        preload="auto"
      />

      <div className="the-life-header">
        <img src="/thelife/thelife.png" alt="The Life" className="game-logo" />
        <WipeCountdown />
      </div>

      {message.text && (
        <div className={`game-message ${message.type}`}>
          <span className="message-icon">{message.type === 'success' ? '✓' : message.type === 'error' ? '!' : 'ℹ'}</span>
          <span className="message-text">{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      {/* ===== REDESIGNED MENUS AREA ===== */}

      {/* Player Stats Card */}
      <div className="player-stats-bar">
        <div className="stats-left-section">
          <div className="stat-group">
            <div className="stat-bar">
              <div className="stat-fill xp-fill" style={{ width: `${(player?.xp / (player?.level * 100)) * 100}%` }} />
              <span className="stat-text">LEVEL {player?.level} - {player?.xp} / {player?.level * 100} XP</span>
            </div>
          </div>
          <div className="stat-group">
            <div className="stat-bar">
              <div className="stat-fill hp-fill" style={{ width: `${(player?.hp / player?.max_hp) * 100}%` }} />
              <span className="stat-text">HP: {player?.hp} / {player?.max_hp}</span>
            </div>
          </div>
          <div className="stat-group">
            <div className="stat-bar">
              <div className="stat-fill stamina-fill" style={{ width: `${(player?.stamina / player?.max_stamina) * 100}%` }} />
              <span className="stat-text">STAMINA: {player?.stamina} / {player?.max_stamina}</span>
            </div>
          </div>
          <div className="stat-group">
            <div className="stat-bar addiction-bar">
              <div className="stat-fill addiction-fill" style={{ width: `${((player?.addiction || 0) / (player?.max_addiction || 100)) * 100}%` }} />
              <span className="stat-text">ADDICTION: {player?.addiction || 0} / {player?.max_addiction || 100}</span>
            </div>
          </div>
        </div>

        <div className="stats-right-section">
          <div className="stat-group">
            <div className="stat-bar">
              <div className="stat-fill power-fill" style={{ width: `${Math.min(((player?.power || 0) / 100) * 100, 100)}%` }} />
              <span className="stat-text">POWER: {player?.power || 0}</span>
            </div>
          </div>
          <div className="stat-group">
            <div className="stat-bar">
              <div className="stat-fill intelligence-fill" style={{ width: `${Math.min(((player?.intelligence || 0) / 100) * 100, 100)}%` }} />
              <span className="stat-text">INTELLIGENCE: {player?.intelligence || 0}</span>
            </div>
          </div>
          <div className="stat-group">
            <div className="stat-bar">
              <div className="stat-fill defense-fill" style={{ width: `${Math.min(((player?.defense || 0) / 100) * 100, 100)}%` }} />
              <span className="stat-text">DEFENSE: {player?.defense || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cash + Quick Access Row */}
      <div className="menus-action-bar">
        <div className="cash-display compact">
          <div className="cash-item">
            <span className="cash-icon">💵</span>
            <div className="cash-info">
              <span className="cash-value">${player?.cash?.toLocaleString()}</span>
              <span className="cash-label">{isPt ? 'Dinheiro' : 'Cash'}</span>
            </div>
          </div>
          <div className="cash-item">
            <span className="cash-icon">🏦</span>
            <div className="cash-info">
              <span className="cash-value">${player?.bank_balance?.toLocaleString()}</span>
              <span className="cash-label">{isPt ? 'Banco' : 'Bank'}</span>
            </div>
          </div>
        </div>
        <div className="quick-access-tabs-inline">
          <button className="quick-tab-inline compact settings-btn" onClick={() => setShowSettings(true)}>
            ⚙️ Settings
          </button>
          <button className={`quick-tab-inline compact ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
            🏆 Leaderboard
          </button>
          <button
            className={`quick-tab-inline compact ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => !isRestricted && setActiveTab('bank')}
            disabled={isRestricted}
            style={{opacity: isRestricted ? 0.5 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer'}}
          >
            🏦 Bank
          </button>
          <button className={`quick-tab-inline compact ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            👤 Profile
          </button>
          <button className="quick-tab-inline compact season-pass-btn" onClick={() => navigate('/games/thelife/season-pass')}>
            <span className="sp-icon">⭐</span>
            <span className="sp-text">Season Pass</span>
            <span className="sp-badge">NEW</span>
          </button>
          <button className="quick-tab-inline compact news-btn" onClick={() => navigate('/games/thelife/news')}>
            <span className="news-icon-btn">📰</span>
            <span className="news-text">News</span>
            <span className="news-live-dot"></span>
          </button>
          {staminaItemCount > 0 && player?.stamina < player?.max_stamina && (
            <button className="quick-tab-inline compact refill-btn" onClick={quickRefillStamina} title={`Use stamina item (${staminaItemCount} available)`}>
              ⚡ Refill ({staminaItemCount})
            </button>
          )}
        </div>
      </div>

      {/* Category Info Display */}
      {currentCategoryInfo && (
        <div className="category-info-display">
          {currentCategoryInfo.image_url && (
            <div className="category-info-image">
              <img
                src={currentCategoryInfo.image_url}
                alt={currentCategoryInfo.category_name}
                onError={(e) => {
                  const fallback = categoryFallbackImages[activeTab];
                  if (fallback && e.target.src !== fallback) {
                    e.target.src = fallback;
                  }
                }}
              />
            </div>
          )}
          <div className="category-info-text">
            <h3>{currentCategoryInfo.category_name}</h3>
            <p>{currentCategoryInfo.description}</p>
          </div>
        </div>
      )}

      {/* Status Warnings */}
      {isInJail && (
        <div className="status-warning jail">
          ⚠️ {isPt ? 'Você está na prisão até' : 'You are in jail until'} {new Date(player.jail_until).toLocaleTimeString()}
        </div>
      )}

      {isInHospital && (
        <div className="status-warning hospital">
          🏥 {isPt ? 'Você está no hospital até' : 'You are in hospital until'} {new Date(player.hospital_until).toLocaleTimeString()}
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
          aria-label="Scroll tabs left"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div 
          className="game-tabs-scroll"
          ref={tabsScrollRef}
          {...tabsDragScroll}
        >
          <div className="game-tabs">
            {/* CRIMES */}
            <button 
              className={`tab tab-image ${activeTab === 'crimes' ? 'active' : ''}`}
              onClick={() => !isRestricted && setActiveTab('crimes')}
              disabled={isRestricted}
              style={{opacity: isRestricted ? 0.5 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/crimes.png" alt="Crimes" />
            </button>
            {/* BUSINESSES */}
            <button
              className={`tab tab-image ${activeTab === 'businesses' ? 'active' : ''}`}
              onClick={() => !isRestricted && setActiveTab('businesses')}
              disabled={isRestricted}
              style={{opacity: isRestricted ? 0.5 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/businesses.png" alt="Businesses" />
            </button>
            {/* BROTHEL */}
            <button 
              className={`tab tab-image ${activeTab === 'brothel' ? 'active' : ''}`}
              onClick={() => !isRestricted && setActiveTab('brothel')}
              disabled={isRestricted}
              style={{opacity: isRestricted ? 0.5 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/brothel.png" alt="Brothel" />
            </button>
            {/* PVP */}
            <button 
              className={`tab tab-image ${activeTab === 'pvp' ? 'active' : ''}`}
              onClick={() => !isRestricted && setActiveTab('pvp')}
              disabled={isRestricted}
              style={{opacity: isRestricted ? 0.5 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/pvp.png" alt="PvP" />
            </button>
            {/* HIGH STAKES */}
            <button 
              className={`tab tab-image ${activeTab === 'highstakes' ? 'active' : ''}`}
              onClick={() => !isRestricted && setActiveTab('highstakes')}
              disabled={isRestricted}
              style={{opacity: isRestricted ? 0.5 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer'}}
              title="High Stakes"
            >
              <img src="/thelife/categories/high-stakes.png" alt="High Stakes" />
            </button>
            {/* DOCKS */}
            <button 
              className={`tab tab-image ${activeTab === 'docks' ? 'active' : ''}`}
              onClick={() => !isRestricted && setActiveTab('docks')}
              disabled={isRestricted}
              style={{opacity: isRestricted ? 0.5 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/Docks.png" alt="Docks" />
            </button>
            {/* BLACK MARKET */}
            <button 
              className={`tab tab-image ${activeTab === 'market' ? 'active' : ''}`}
              onClick={() => !isRestricted && setActiveTab('market')}
              disabled={isRestricted}
              style={{opacity: isRestricted ? 0.5 : 1, cursor: isRestricted ? 'not-allowed' : 'pointer'}}
            >
              <img src="/thelife/categories/BlackMarket.png" alt="Market" />
            </button>
            {/* SKILLS */}
            <button 
              className={`tab tab-image ${activeTab === 'skills' ? 'active' : ''}`}
              onClick={() => setActiveTab('skills')}
            >
              <img src="/thelife/categories/skills.png" alt="Skills" />
            </button>
            {/* INVENTORY/STASH */}
            <button 
              className={`tab tab-image ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <img src="/thelife/categories/Inventory.png" alt="Inventory" />
            </button>
            {/* JAIL */}
            <button 
              className={`tab tab-image ${activeTab === 'jail' ? 'active' : ''}`}
              onClick={() => setActiveTab('jail')}
            >
              <img src="/thelife/categories/Jail.png" alt="Jail" />
            </button>
            {/* HOSPITAL */}
            <button 
              className={`tab tab-image ${activeTab === 'hospital' ? 'active' : ''}`}
              onClick={() => setActiveTab('hospital')}
            >
              <img src="/thelife/categories/Hospital.png" alt="Hospital" />
            </button>
          </div>
        </div>
        <button 
          className="tab-scroll-btn right"
          onClick={() => {
            const container = document.querySelector('.game-tabs-scroll');
            container.scrollBy({ left: 150, behavior: 'smooth' });
          }}
          aria-label="Scroll tabs right"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Render Active Tab Content */}
      {activeTab === 'crimes' && (
        <TheLifeCrimes
          player={player}
          setPlayer={setPlayer}
          setPlayerFromAction={setPlayerFromAction}
          robberies={robberies}
          setMessage={setMessage}
          showEventMessage={showEventMessage}
          user={user}
          isInJail={isInJail}
          isInHospital={isInHospital}
          loadTheLifeInventory={loadTheLifeInventory}
        />
      )}

      {activeTab === 'bank' && (
        <TheLifeBank
          player={player}
          setPlayer={setPlayer}
          setPlayerFromAction={setPlayerFromAction}
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
          setPlayerFromAction={setPlayerFromAction}
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
          setPlayerFromAction={setPlayerFromAction}
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
          setPlayerFromAction={setPlayerFromAction}
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
          setPlayerFromAction={setPlayerFromAction}
          setMessage={setMessage}
          loadTheLifeInventory={loadTheLifeInventory}
          initializePlayer={initializePlayer}
          user={user}
        />
      )}

      {activeTab === 'jail' && (
        <TheLifeJail
          player={player}
          setPlayer={setPlayer}
          setPlayerFromAction={setPlayerFromAction}
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
          loadLeaderboard={loadLeaderboard}
        />
      )}

      {activeTab === 'hospital' && (
        <TheLifeHospital
          player={player}
          setPlayer={setPlayer}
          setPlayerFromAction={setPlayerFromAction}
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
          setPlayerFromAction={setPlayerFromAction}
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
          setPlayerFromAction={setPlayerFromAction}
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
          setPlayerFromAction={setPlayerFromAction}
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
          setPlayerFromAction={setPlayerFromAction}
          setMessage={setMessage}
          isInHospital={isInHospital}
          user={user}
        />
      )}

      {activeTab === 'highstakes' && (
        player?.level >= 15 ? (
          <TheLifeHighStakes
            player={player}
            setPlayer={setPlayer}
            setPlayerFromAction={setPlayerFromAction}
            setMessage={setMessage}
            showEventMessage={showEventMessage}
            user={user}
            isInJail={isInJail}
            isInHospital={isInHospital}
          />
        ) : (
          <div className="locked-content">
            <div className="locked-icon">🔒</div>
            <h3>High Stakes Locked</h3>
            <p>You need to reach <span className="level-requirement">Level 15</span> to access the High Stakes area.</p>
            <p className="current-level">Your current level: <span>{player?.level || 1}</span></p>
          </div>
        )
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h2>⚙️ Settings</h2>
              <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="settings-content">
              <div className="setting-item">
                <div className="setting-label">
                  <span className="setting-icon">🎵</span>
                  <span>Background Music</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={isMusicEnabled}
                    onChange={toggleMusic}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="setting-info">
                <p>Music plays at 10% volume when enabled</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
