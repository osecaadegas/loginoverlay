import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStreamElements } from '../../context/StreamElementsContext';
import { supabase } from '../../config/supabaseClient';
import AuthModal from '../Auth/AuthModal';

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [casinoOffers, setCasinoOffers] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [giveaways, setGiveaways] = useState([]);
  const [pointStoreItems, setPointStoreItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [pointStoreSlide, setPointStoreSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('highlights'); // 'highlights', 'offers', 'giveaways', 'pointstore'
  const [aboutMeTab, setAboutMeTab] = useState('about'); // 'about' or 'stream'
  const [redeeming, setRedeeming] = useState(null);
  const { user } = useAuth();
  const { redeemPoints, points, isConnected } = useStreamElements();
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const pointStoreScrollRef = useRef(null);

  useEffect(() => {
    // Check if user has verified age
    const ageVerified = localStorage.getItem('ageVerified');
    if (!ageVerified) {
      setShowAgeVerification(true);
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load offers
      const { data: offersData, error: offersError } = await supabase
        .from('casino_offers')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(6);

      if (!offersError && offersData) {
        setCasinoOffers(offersData);
      }

      // Load giveaways
      const { data: giveawaysData, error: giveawaysError } = await supabase
        .from('giveaways')
        .select('*')
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (!giveawaysError && giveawaysData) {
        setGiveaways(giveawaysData);
      } else if (giveawaysError) {
        console.error('Error loading giveaways:', giveawaysError);
      }

      // Load point store items
      const { data: pointStoreData, error: pointStoreError } = await supabase
        .from('redemption_items')
        .select('*')
        .order('point_cost', { ascending: true });

      if (!pointStoreError && pointStoreData) {
        console.log('Point Store Raw Data:', pointStoreData);
        setPointStoreItems(pointStoreData.map(item => {
          console.log('Mapping item:', item.name, 'reward_details:', item.reward_details);
          return {
            id: item.id,
            name: item.name,
            description: item.description || '',
            reward_details: item.reward_details || '',
            image_url: item.image_url || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=800&h=450&fit=crop',
            cost: item.point_cost
          };
        }));
      } else if (pointStoreError) {
        console.error('Error loading point store items:', pointStoreError);
      }

      // Load highlights - use local videos
      const localHighlights = Array.from({ length: 13 }, (_, i) => ({
        id: i + 1,
        video_url: `/highlights/video${i + 1}.mp4`,
        title: `Highlight ${i + 1}`
      }));
      setHighlights(localHighlights);

    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOfferClick = (bonusLink) => {
    if (bonusLink) {
      window.open(bonusLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAgeConfirm = () => {
    localStorage.setItem('ageVerified', 'true');
    setShowAgeVerification(false);
  };

  const handleAgeDeny = () => {
    window.location.href = 'https://www.google.com';
  };

  const handleRedeem = async (item) => {
    if (!isConnected) {
      alert('Please connect your StreamElements account first!');
      navigate('/streamelements');
      return;
    }

    if (points < item.cost) {
      alert("You don't have enough points for this redemption!");
      return;
    }

    if (!confirm(`Redeem "${item.name}" for ${item.cost.toLocaleString()} points?`)) {
      return;
    }

    setRedeeming(item.id);
    const result = await redeemPoints(item.id, item.cost);
    setRedeeming(null);

    if (result.success) {
      alert('Redemption successful! Your reward has been applied.');
      await loadData();
    } else {
      alert(`Redemption failed: ${result.error || 'Unknown error'}`);
    }
  };

  const scrollHighlights = (direction) => {
    if (activeTab === 'pointstore') {
      const container = pointStoreScrollRef.current;
      if (container) {
        const cardWidth = 280; // Card width + gap
        const newPosition = direction === 'left' 
          ? Math.max(0, pointStoreSlide - 1)
          : Math.min(pointStoreItems.length - 5, pointStoreSlide + 1);
        
        setPointStoreSlide(newPosition);
        container.scrollTo({
          left: newPosition * cardWidth,
          behavior: 'smooth'
        });
      }
    } else {
      const container = scrollContainerRef.current;
      if (container) {
        const cardWidth = 248; // Width of one card + gap (240px + 8px gap)
        const scrollAmount = cardWidth; // Scroll 1 card at a time
        const newPosition = direction === 'left' 
          ? Math.max(0, currentSlide - 1)
          : Math.min(highlights.length - 7, currentSlide + 1);
        
        setCurrentSlide(newPosition);
        container.scrollTo({
          left: newPosition * cardWidth,
          behavior: 'smooth'
        });
      }
    }
  };

  return (
    <>
      {/* Age Verification Modal */}
      {showAgeVerification && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ width: '100%', maxWidth: '448px', backgroundColor: '#581c87', borderRadius: '24px', padding: '32px', textAlign: 'center', border: '2px solid #a855f7' }}>
            
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>🔞</div>
            
            <h1 style={{ fontSize: '30px', fontWeight: '900', color: 'white', marginBottom: '16px' }}>
              Age Verification
            </h1>
            
            <p style={{ fontSize: '14px', color: '#d1d5db', marginBottom: '24px' }}>
              This website contains gambling content. You must be 18+ to enter.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={handleAgeConfirm}
                style={{ padding: '12px 16px', backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#16a34a'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#22c55e'}
              >
                ✓ I'm 18+
              </button>
              <button
                onClick={handleAgeDeny}
                style={{ padding: '12px 16px', backgroundColor: '#374151', color: 'white', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#374151'}
              >
                ✗ Exit
              </button>
            </div>
            
            <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(168, 85, 247, 0.2)', fontSize: '11px', color: '#9ca3af' }}>
              18+ Only • Legal Compliance
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen pt-16 px-4 md:px-6 lg:px-8 pb-12">
        <div className="w-full max-w-[1850px] mx-auto space-y-6 md:space-y-8">
        
        {/* About Me Section */}
        <section className="mt-2 animate-fade-in">
          <div className="relative overflow-hidden rounded-lg border border-[#333] bg-[#1e1e1e] shadow-[0_8px_25px_rgba(0,0,0,0.6),inset_0_0_5px_rgba(0,255,0,0.05)]">
            {/* Window Bar */}
            <div className="h-8 bg-[#3c3c3c] flex items-center justify-between px-3 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff605c] hover:scale-110 transition-transform cursor-pointer"></div>
                  <div className="w-3 h-3 rounded-full bg-[#ffbd44] hover:scale-110 transition-transform cursor-pointer"></div>
                  <div className="w-3 h-3 rounded-full bg-[#00ca4e] hover:scale-110 transition-transform cursor-pointer"></div>
                </div>
                <div className="text-xs text-[#cccccc] ml-2 opacity-90 font-mono">about.tsx</div>
              </div>
              {/* Live Status & Follow Button */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-[#252526] px-2 py-1 rounded border border-[#1a1a1a]">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-red-400 font-mono font-bold">LIVE</span>
                </div>
                <a
                  href="https://www.twitch.tv/osecaadegas95"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-[10px] text-white font-bold transition-all duration-200 font-mono"
                >
                  <span>💜</span> FOLLOW
                </a>
              </div>
            </div>
            
            {/* Tab Bar */}
            <div className="h-9 bg-[#252526] flex items-center border-b border-[#1a1a1a]">
              <button
                onClick={() => setAboutMeTab('about')}
                className={`px-4 py-2 text-sm border-r border-[#1a1a1a] font-mono flex items-center gap-2 transition-colors ${
                  aboutMeTab === 'about'
                    ? 'text-[#00ff00] bg-[#1e1e1e]'
                    : 'text-[#999] bg-[#252526] hover:bg-[#2d2d2d] hover:text-[#ccc]'
                }`}
                style={aboutMeTab === 'about' ? { textShadow: '0 0 5px rgba(0,255,0,0.4)' } : {}}
              >
                <span className="text-base">👤</span> About Me
              </button>
              <button
                onClick={() => setAboutMeTab('stream')}
                className={`px-4 py-2 text-sm border-r border-[#1a1a1a] font-mono flex items-center gap-2 transition-colors ${
                  aboutMeTab === 'stream'
                    ? 'text-[#00ff00] bg-[#1e1e1e]'
                    : 'text-[#999] bg-[#252526] hover:bg-[#2d2d2d] hover:text-[#ccc]'
                }`}
                style={aboutMeTab === 'stream' ? { textShadow: '0 0 5px rgba(0,255,0,0.4)' } : {}}
              >
                <span className="text-base">🔴</span> Stream & Chat
              </button>
            </div>
            
            {/* Content */}
            <div className="pt-6 px-6 md:px-8 pb-2 bg-[#1e1e1e] h-[500px] overflow-auto">
            {aboutMeTab === 'about' ? (
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-center lg:items-start max-w-[1700px] mx-auto">
              <div className="flex-shrink-0">
                <div className="relative w-52 h-52 md:w-60 md:h-60 lg:w-72 lg:h-72">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full blur-2xl"></div>
                  <img 
                    src="/profile-foto.png" 
                    alt="osecaadegas - Miguel" 
                    className="relative w-full h-full rounded-full object-cover border-4 border-purple-500/40 shadow-2xl"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0 max-w-[1200px]">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-purple-400 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-4" style={{overflowWrap: 'break-word', wordWrap: 'break-word'}}>
                  Sobre Mim
                </h2>
                <div className="space-y-4 text-gray-300 text-sm md:text-base lg:text-lg leading-relaxed" style={{overflowWrap: 'break-word', wordWrap: 'break-word', whiteSpace: 'normal'}}>
                  <p>
                    Sou o Miguel, mais conhecido como osecaadegas. Sou um gajo simples e tranquilo. Trabalho aos fins de semana e, durante a semana, divido o tempo entre programação e streaming.
                  </p>
                  <p>
                    O meu conteúdo principal é online gambling, mas também sou fã de simuladores, FPS e iRacing. Acima de tudo, estou aqui para te fazer rir e para passarmos bons momentos juntos.
                  </p>
                  <p>
                    Se tiveres alguma questão ou precisares de ajuda, não hesites em mandar DM. Eu e toda a equipa estamos sempre disponíveis para ajudar.
                    E claro, de vez em quando também gosto de beber umas boas birras ou finos. Se não fosse assim, nem fazia sentido ter este nome, não é verdade? 🍺
                  </p>
                </div>
              </div>
            </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                {/* Stream Player */}
                <div className="lg:col-span-2">
                  <div className="relative w-full h-[435px]">
                    <iframe
                      src="https://player.twitch.tv/?channel=osecaadegas95&parent=www.osecaadegas.pt&parent=osecaadegas.pt&parent=localhost"
                      className="absolute top-0 left-0 w-full h-full rounded-lg border border-[#252526]"
                      allowFullScreen
                      title="Twitch Stream"
                    />
                  </div>
                </div>
                
                {/* Twitch Chat */}
                <div className="lg:col-span-1">
                  <div className="mb-1 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#00ff00] flex items-center gap-2 font-mono" style={{ textShadow: '0 0 3px rgba(0,255,0,0.3)' }}>
                        <span className="text-base">💬</span> CHAT
                      </h3>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded font-bold border border-red-500/30 font-mono text-[10px]">● LIVE</span>
                      <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded font-bold border border-purple-500/30 font-mono text-[10px]">Daily 8PM EST</span>
                    </div>
                  </div>
                  <div className="relative w-full h-[385px]">
                    <iframe
                      src="https://www.twitch.tv/embed/osecaadegas95/chat?parent=www.osecaadegas.pt&parent=osecaadegas.pt&parent=localhost&darkpopout"
                      className="absolute top-0 left-0 w-full h-full rounded-lg border border-[#252526]"
                      title="Twitch Chat"
                    />
                  </div>
                </div>
              </div>
            )}
            </div>
            
            {/* Status Bar */}
            <div className="h-7 bg-[#007acc] flex justify-between items-center px-4 border-t border-[#005f99]">
              {aboutMeTab === 'about' ? (
                <>
                  <span className="text-xs text-white opacity-90 font-mono">Profile loaded</span>
                  <span className="text-xs text-white opacity-90 font-mono">Ready</span>
                </>
              ) : (
                <>
                  <span className="text-xs text-white opacity-90 font-mono">Twitch Player Active</span>
                  <span className="text-xs text-white opacity-90 font-mono">Connected</span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Stream Highlights */}
        {highlights.length > 0 && (
          <section className="animate-fade-in">
            <div className="relative flex items-center justify-center">
              {/* VS Code Container */}
              <div className="relative overflow-hidden rounded-lg border border-[#333] bg-[#1e1e1e] shadow-[0_8px_25px_rgba(0,0,0,0.6),inset_0_0_5px_rgba(0,255,0,0.05)]">
                {/* Window Bar */}
                <div className="h-8 bg-[#3c3c3c] flex items-center justify-between px-3 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#ff605c] hover:scale-110 transition-transform cursor-pointer"></div>
                      <div className="w-3 h-3 rounded-full bg-[#ffbd44] hover:scale-110 transition-transform cursor-pointer"></div>
                      <div className="w-3 h-3 rounded-full bg-[#00ca4e] hover:scale-110 transition-transform cursor-pointer"></div>
                    </div>
                    <div className="text-xs text-[#cccccc] ml-2 opacity-90 font-mono">SecaHub</div>
                  </div>
                  {/* Navigation Arrows */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => scrollHighlights('left')}
                      disabled={activeTab === 'pointstore' ? pointStoreSlide === 0 : currentSlide === 0}
                      className="bg-[#252526] hover:bg-[#2d2d2d] disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm w-6 h-6 rounded flex items-center justify-center transition-all duration-200 border border-[#1a1a1a]"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => scrollHighlights('right')}
                      disabled={activeTab === 'pointstore' ? pointStoreSlide >= pointStoreItems.length - 5 : currentSlide >= highlights.length - 7}
                      className="bg-[#252526] hover:bg-[#2d2d2d] disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm w-6 h-6 rounded flex items-center justify-center transition-all duration-200 border border-[#1a1a1a]"
                    >
                      ›
                    </button>
                  </div>
                </div>
                
                {/* Tab Bar */}
                <div className="h-9 bg-[#252526] flex items-center border-b border-[#1a1a1a]">
                  <button
                    onClick={() => setActiveTab('highlights')}
                    className={`px-4 py-2 text-sm border-r border-[#1a1a1a] font-mono flex items-center gap-2 transition-colors ${
                      activeTab === 'highlights'
                        ? 'text-[#00ff00] bg-[#1e1e1e]'
                        : 'text-[#999] bg-[#252526] hover:bg-[#2d2d2d] hover:text-[#ccc]'
                    }`}
                    style={activeTab === 'highlights' ? { textShadow: '0 0 5px rgba(0,255,0,0.4)' } : {}}
                  >
                    <span className="text-base">🎬</span> <span className="hidden md:inline">Stream Highlights</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('offers')}
                    className={`px-4 py-2 text-sm border-r border-[#1a1a1a] font-mono flex items-center gap-2 transition-colors ${
                      activeTab === 'offers'
                        ? 'text-[#00ff00] bg-[#1e1e1e]'
                        : 'text-[#999] bg-[#252526] hover:bg-[#2d2d2d] hover:text-[#ccc]'
                    }`}
                    style={activeTab === 'offers' ? { textShadow: '0 0 5px rgba(0,255,0,0.4)' } : {}}
                  >
                    <span className="text-base">🎰</span> <span className="hidden md:inline">Partners & Offers</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('giveaways')}
                    className={`px-4 py-2 text-sm border-r border-[#1a1a1a] font-mono flex items-center gap-2 transition-colors ${
                      activeTab === 'giveaways'
                        ? 'text-[#00ff00] bg-[#1e1e1e]'
                        : 'text-[#999] bg-[#252526] hover:bg-[#2d2d2d] hover:text-[#ccc]'
                    }`}
                    style={activeTab === 'giveaways' ? { textShadow: '0 0 5px rgba(0,255,0,0.4)' } : {}}
                  >
                    <span className="text-base">🎁</span> <span className="hidden md:inline">Giveaways</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('pointstore')}
                    className={`px-4 py-2 text-sm border-r border-[#1a1a1a] font-mono flex items-center gap-2 transition-colors ${
                      activeTab === 'pointstore'
                        ? 'text-[#00ff00] bg-[#1e1e1e]'
                        : 'text-[#999] bg-[#252526] hover:bg-[#2d2d2d] hover:text-[#ccc]'
                    }`}
                    style={activeTab === 'pointstore' ? { textShadow: '0 0 5px rgba(0,255,0,0.4)' } : {}}
                  >
                    <span className="text-base">🏪</span> <span className="hidden md:inline">Point Store</span>
                  </button>
                </div>
                
                {/* Content with padding */}
                <div className="p-6 bg-[#1e1e1e] h-[480px] overflow-auto">
                {activeTab === 'highlights' ? (
                <div 
                  ref={scrollContainerRef}
                  className="flex gap-2 overflow-hidden w-full max-w-full"
                >
                  {highlights.map((highlight) => (
                    <div
                      key={highlight.id}
                      className="flex-shrink-0"
                      style={{ width: '240px' }}
                    >
                      <div className="relative overflow-hidden rounded-2xl border-2 border-purple-500/20 hover:border-purple-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/40">
                        <div style={{ aspectRatio: '9/16' }}>
                          <video
                            src={highlight.video_url}
                            className="w-full h-full object-cover"
                            autoPlay
                            loop
                            muted
                            playsInline
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>                ) : activeTab === 'giveaways' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 md:gap-x-4 gap-y-2 md:gap-y-3 w-full max-w-full">
                    {giveaways.length > 0 ? giveaways.map((giveaway) => (
                      <div
                        key={giveaway.id}
                        className="group relative bg-black/40 backdrop-blur-xl border border-green-500/20 rounded-3xl overflow-hidden transition-all duration-300 hover:border-green-500/60 hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/25"
                      >
                        <div className="relative aspect-video overflow-hidden">
                          <img 
                            src={giveaway.image_url || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=450&fit=crop'} 
                            alt={giveaway.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        </div>
                        <div className="p-3">
                          <h4 className="text-base font-black text-white mb-1.5 group-hover:text-green-400 transition-colors line-clamp-1">
                            {giveaway.title}
                          </h4>
                          <p className="text-gray-400 text-xs mb-2 line-clamp-2">{giveaway.description}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-green-400 font-bold">🎫 {giveaway.entries || 0} entries</span>
                            <span className="text-gray-400">{giveaway.ends_at ? new Date(giveaway.ends_at).toLocaleDateString() : 'TBA'}</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full text-center py-12 text-gray-400">
                        <span className="text-4xl mb-4 block">🎁</span>
                        <p>No active giveaways at the moment</p>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'pointstore' ? (
                  <div 
                    ref={pointStoreScrollRef}
                    className="flex gap-4 overflow-x-hidden w-full"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {pointStoreItems.length > 0 ? pointStoreItems.map((item) => {
                      const canAfford = isConnected && points >= item.cost;
                      const isRedeeming = redeeming === item.id;
                      const imageUrl = item.image_url || 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400&h=300&fit=crop';
                      
                      return (
                        <div
                          key={item.id}
                          className={`group relative bg-black/40 backdrop-blur-xl border rounded-3xl overflow-hidden transition-all duration-300 flex-shrink-0 ${
                            !canAfford || !isConnected 
                              ? 'border-gray-700/30 opacity-60' 
                              : 'border-purple-500/20 hover:border-purple-500/60 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/25'
                          }`}
                          style={{ width: '264px', minHeight: '420px' }}
                        >
                          {/* Image */}
                          <div className="relative aspect-video overflow-hidden">
                            <img 
                              src={imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          </div>
                          
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors flex-1 line-clamp-1">
                                {item.name}
                              </h4>
                              <div className="bg-gradient-to-br from-purple-500/30 to-blue-500/20 border border-purple-500/50 rounded-xl px-3 py-1.5 ml-2">
                                <div className="text-sm font-black text-purple-400 whitespace-nowrap">
                                  {item.cost.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            <p className="text-gray-400 text-xs mb-3 line-clamp-2">{item.description}</p>
                            
                            {/* Reward Details */}
                            {item.reward_details && (
                              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2 mb-3">
                                <div className="flex items-start gap-1.5">
                                  <span className="text-base">🎁</span>
                                  <span className="text-xs text-purple-300 font-medium line-clamp-2">
                                    {item.reward_details}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Redeem Button */}
                            <button
                              onClick={() => handleRedeem(item)}
                              disabled={!isConnected || !canAfford || isRedeeming}
                              className={`w-full font-bold py-3 px-4 rounded-xl text-sm transition-all duration-300 ${
                                !isConnected || !canAfford
                                  ? 'bg-gray-700/50 border border-gray-600 text-gray-300 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-500/60 hover:scale-105'
                              }`}
                            >
                              {!isConnected ? '🔒 Connect' : isRedeeming ? '⏳...' : canAfford ? '✨ Redeem' : '💰 Need More'}
                            </button>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="w-full text-center py-12 text-gray-400">
                        <span className="text-4xl mb-4 block">🏪</span>
                        <p>No items available in the point store</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 md:gap-x-4 gap-y-2 md:gap-y-3 w-full max-w-full">
                    {casinoOffers.map((offer) => (
                      <div
                        key={offer.id}
                        className="group relative bg-black/40 backdrop-blur-xl border border-purple-500/20 rounded-3xl overflow-hidden transition-all duration-300 hover:border-purple-500/60 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/25"
                      >
                        {/* Badge */}
                        {offer.badge && (
                          <div className="absolute top-4 right-4 z-10">
                            <div className={`px-3 py-1.5 rounded-xl font-black text-xs shadow-xl ${
                              offer.badge_class === 'hot' ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white' :
                              offer.badge_class === 'new' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                              'bg-gradient-to-r from-yellow-500 to-amber-500 text-black'
                            }`}>
                              {offer.badge}
                            </div>
                          </div>
                        )}
                        
                        {/* Image */}
                        <div className="relative aspect-video overflow-hidden">
                          <img 
                            src={offer.image_url || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=450&fit=crop'} 
                            alt={offer.casino_name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        </div>
                        
                        {/* Content */}
                        <div className="p-3">
                          <h4 className="text-base font-black text-white mb-1.5 group-hover:text-purple-400 transition-colors line-clamp-1">
                            {offer.casino_name}
                          </h4>
                          <p className="text-gray-400 text-xs mb-2 line-clamp-1">{offer.title}</p>
                          
                          {/* Bonus Details */}
                          <div className="space-y-1 mb-2">
                            {offer.bonus_value && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-purple-400">💰</span>
                                <span className="text-white font-bold">{offer.bonus_value}</span>
                              </div>
                            )}
                            {offer.free_spins && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-purple-400">🎰</span>
                                <span className="text-white font-bold">{offer.free_spins} FS</span>
                              </div>
                            )}
                            {offer.min_deposit && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-purple-400">💳</span>
                                <span className="text-gray-300">{offer.min_deposit}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* CTA Button */}
                          <button 
                            onClick={() => handleOfferClick(offer.bonus_link)}
                            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all duration-300 shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-500/60 hover:scale-105"
                          >
                            🎁 Claim
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
                
                {/* Status Bar */}
                <div className="h-7 bg-[#007acc] flex justify-between items-center px-4 border-t border-[#005f99]">
                  {activeTab === 'highlights' ? (
                    <>
                      <span className="text-xs text-white opacity-90 font-mono">{highlights.length} clips</span>
                      <span className="text-xs text-white opacity-90 font-mono">Loop Mode ∞</span>
                    </>
                  ) : activeTab === 'offers' ? (
                    <>
                      <span className="text-xs text-white opacity-90 font-mono">{casinoOffers.length} active offers</span>
                      <span className="text-xs text-white opacity-90 font-mono">Ready</span>
                    </>
                  ) : activeTab === 'giveaways' ? (
                    <>
                      <span className="text-xs text-white opacity-90 font-mono">{giveaways.length} giveaways</span>
                      <span className="text-xs text-white opacity-90 font-mono">Active</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-white opacity-90 font-mono">{pointStoreItems.length} items</span>
                      <span className="text-xs text-white opacity-90 font-mono">Available</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
    </>
  );
}
