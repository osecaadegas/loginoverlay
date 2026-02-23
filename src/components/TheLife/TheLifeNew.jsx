import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheLifeData } from './hooks/useTheLifeData';
import { supabase } from '../../config/supabaseClient';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './TheLife.css';
import './TheLifeClean.css';

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
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [contentKey, setContentKey] = useState(0); // for content transition animation
  const [showSecondary, setShowSecondary] = useState(false); // collapsible secondary stats
  
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
    <div className="the-life-container tl-clean">
      {/* Background Music */}
      <audio 
        ref={audioRef} 
        src="/music/thelifemusic.mp3" 
        loop 
        preload="auto"
      />

      {/* ===== COMPACT HEADER ===== */}
      <header className="tl-header">
        <img src="/thelife/thelife.png" alt="The Life" className="tl-logo" />
        <WipeCountdown />
      </header>

      {/* Toast Message */}
      {message.text && (
        <div className={`tl-toast tl-toast--${message.type}`}>
          <span className="tl-toast__icon">{message.type === 'success' ? '✓' : message.type === 'error' ? '✕' : 'ℹ'}</span>
          <span className="tl-toast__text">{message.text}</span>
          <button className="tl-toast__close" onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      {/* ===== PRIMARY STATS BAR — always visible ===== */}
      <div className="tl-stats">
        <div className="tl-stats__row">
          {/* Level + XP */}
          <div className="tl-bar" title={`${player?.xp} / ${player?.level * 100} XP`}>
            <div className="tl-bar__fill tl-bar--xp" style={{ width: `${(player?.xp / (player?.level * 100)) * 100}%` }} />
            <span className="tl-bar__label">LVL {player?.level}</span>
            <span className="tl-bar__value">{player?.xp}/{player?.level * 100} XP</span>
          </div>
          {/* HP */}
          <div className="tl-bar" title={`${player?.hp} / ${player?.max_hp} HP`}>
            <div className="tl-bar__fill tl-bar--hp" style={{ width: `${(player?.hp / player?.max_hp) * 100}%` }} />
            <span className="tl-bar__label">HP</span>
            <span className="tl-bar__value">{player?.hp}/{player?.max_hp}</span>
          </div>
          {/* Stamina */}
          <div className="tl-bar" title={`${player?.stamina} / ${player?.max_stamina} Stamina`}>
            <div className="tl-bar__fill tl-bar--stamina" style={{ width: `${(player?.stamina / player?.max_stamina) * 100}%` }} />
            <span className="tl-bar__label">⚡</span>
            <span className="tl-bar__value">{player?.stamina}/{player?.max_stamina}</span>
          </div>
        </div>

        {/* Cash + Bank — inline with stats */}
        <div className="tl-stats__money">
          <span className="tl-money tl-money--cash">
            <span className="tl-money__icon">💵</span>
            ${player?.cash?.toLocaleString()}
          </span>
          <span className="tl-money tl-money--bank">
            <span className="tl-money__icon">🏦</span>
            ${player?.bank_balance?.toLocaleString()}
          </span>
        </div>

        {/* Toggle secondary stats */}
        <button
          className="tl-stats__toggle"
          onClick={() => setShowSecondary(s => !s)}
          aria-expanded={showSecondary}
          aria-label="Toggle secondary stats"
        >
          {showSecondary ? '▲ Hide Stats' : '▼ More Stats'}
        </button>

        {/* Collapsible secondary stats panel */}
        {showSecondary && (
          <div className="tl-stats__secondary">
            <div className="tl-bar tl-bar--sm" title={`Power: ${player?.power || 0}`}>
              <div className="tl-bar__fill tl-bar--power" style={{ width: `${Math.min((player?.power || 0), 100)}%` }} />
              <span className="tl-bar__label">PWR</span>
              <span className="tl-bar__value">{player?.power || 0}</span>
            </div>
            <div className="tl-bar tl-bar--sm" title={`Intelligence: ${player?.intelligence || 0}`}>
              <div className="tl-bar__fill tl-bar--intel" style={{ width: `${Math.min((player?.intelligence || 0), 100)}%` }} />
              <span className="tl-bar__label">INT</span>
              <span className="tl-bar__value">{player?.intelligence || 0}</span>
            </div>
            <div className="tl-bar tl-bar--sm" title={`Defense: ${player?.defense || 0}`}>
              <div className="tl-bar__fill tl-bar--def" style={{ width: `${Math.min((player?.defense || 0), 100)}%` }} />
              <span className="tl-bar__label">DEF</span>
              <span className="tl-bar__value">{player?.defense || 0}</span>
            </div>
            <div className="tl-bar tl-bar--sm" title={`Addiction: ${player?.addiction || 0} / ${player?.max_addiction || 100}`}>
              <div className="tl-bar__fill tl-bar--addiction" style={{ width: `${((player?.addiction || 0) / (player?.max_addiction || 100)) * 100}%` }} />
              <span className="tl-bar__label">ADC</span>
              <span className="tl-bar__value">{player?.addiction || 0}/{player?.max_addiction || 100}</span>
            </div>
          </div>
        )}
      </div>

      {/* ===== QUICK ACCESS TOOLBAR ===== */}
      <div className="tl-toolbar">
        <button className="tl-toolbar__btn" onClick={() => setShowSettings(true)}>⚙️</button>
        <button className={`tl-toolbar__btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>🏆</button>
        <button
          className={`tl-toolbar__btn ${activeTab === 'bank' ? 'active' : ''}`}
          onClick={() => !isRestricted && setActiveTab('bank')}
          disabled={isRestricted}
        >🏦</button>
        <button className={`tl-toolbar__btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>👤</button>
        <button className="tl-toolbar__btn tl-toolbar__btn--gold" onClick={() => navigate('/games/thelife/season-pass')}>
          ⭐ <span className="tl-toolbar__label">Pass</span>
        </button>
        <button className="tl-toolbar__btn tl-toolbar__btn--blue" onClick={() => navigate('/games/thelife/news')}>
          📰 <span className="tl-toolbar__label">News</span>
        </button>
        {staminaItemCount > 0 && player?.stamina < player?.max_stamina && (
          <button className="tl-toolbar__btn tl-toolbar__btn--gold" onClick={quickRefillStamina} title={`Use stamina item (${staminaItemCount} left)`}>
            ⚡ Refill ({staminaItemCount})
          </button>
        )}
      </div>

      {/* Status Warnings */}
      {isInJail && (
        <div className="tl-alert tl-alert--warn">
          ⚠️ {isPt ? 'Você está na prisão até' : 'In jail until'} {new Date(player.jail_until).toLocaleTimeString()}
        </div>
      )}
      {isInHospital && (
        <div className="tl-alert tl-alert--danger">
          🏥 {isPt ? 'Você está no hospital até' : 'In hospital until'} {new Date(player.hospital_until).toLocaleTimeString()}
        </div>
      )}

      {/* ===== CATEGORY NAVIGATION ===== */}
      <CategoryNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setContentKey(k => k + 1);
        }}
        isRestricted={isRestricted}
        onCategorySound={null}
      />

      {/* Render Active Tab Content — wrapped for animated transition */}
      <div className="cn-content-enter" key={contentKey}>
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
      </div>{/* end cn-content-enter */}

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
