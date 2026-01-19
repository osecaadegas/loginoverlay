import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../config/supabaseClient';
import { useTranslation, T } from '../../../hooks/useTranslation';
import { useLanguage } from '../../../contexts/LanguageContext';
import LanguageSwitcher from '../../LanguageSwitcher';
import './TheLifeJournal.css';

/**
 * The Life Underground Journal - Full Page News Experience
 * A newspaper/journal styled page for game news and events
 */
export default function TheLifeJournal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [player, setPlayer] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentDate] = useState(new Date());

  // Load player data
  useEffect(() => {
    if (user) {
      loadPlayerData();
      loadLeaderboard();
    }
  }, [user]);

  const loadPlayerData = async () => {
    try {
      const { data } = await supabase
        .from('the_life_players')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setPlayer(data);
    } catch (err) {
      console.log('Could not load player data');
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data } = await supabase
        .from('the_life_players')
        .select('id, user_id, level, xp, cash, bank_balance, pvp_wins, se_username, twitch_username')
        .order('cash', { ascending: false })
        .limit(10);
      
      const enriched = (data || []).map(p => ({
        ...p,
        username: p.se_username || p.twitch_username || 'Anonymous',
        net_worth: (p.cash || 0) + (p.bank_balance || 0)
      }));
      setLeaderboard(enriched);
    } catch (err) {
      console.log('Could not load leaderboard');
    }
  };

  // Fetch all news data
  const fetchNewsData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: storedNews } = await supabase
        .from('the_life_news_feed')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      const dynamicNews = await generateDynamicNews();
      
      const allNews = [...(storedNews || []), ...dynamicNews]
        .sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return new Date(b.created_at) - new Date(a.created_at);
        });

      setNews(allNews);
    } catch (err) {
      console.error('Error fetching news data:', err);
    } finally {
      setLoading(false);
    }
  }, [leaderboard, player]);

  // Generate dynamic news from current game state
  const generateDynamicNews = async () => {
    const dynamicNews = [];
    const now = new Date();

    // Leaderboard Top 3
    if (leaderboard && leaderboard.length > 0) {
      const medals = ['🥇', '🥈', '🥉'];
      const titles = ['THE BOSS', 'SECOND IN COMMAND', 'THIRD CHAIR'];
      
      leaderboard.slice(0, 3).forEach((p, index) => {
        dynamicNews.push({
          id: `leaderboard-${index}`,
          news_type: 'leaderboard',
          category: ['headline', 'featured', 'featured'][index],
          title: `${titles[index]}`,
          content: `${p.username} has claimed the #${index + 1} position on the streets with a staggering $${(p.net_worth || 0).toLocaleString()} empire. ${index === 0 ? 'All eyes are on this kingpin.' : 'The competition is fierce.'}`,
          icon: medals[index],
          player_name: p.username,
          priority: index === 0 ? 3 : 2,
          created_at: now.toISOString(),
        });
      });
    }

    // PVP Champion
    try {
      const { data: pvpData } = await supabase
        .from('the_life_players')
        .select('id, se_username, twitch_username, pvp_wins, pvp_losses')
        .gt('pvp_wins', 0)
        .order('pvp_losses', { ascending: true })
        .order('pvp_wins', { ascending: false })
        .limit(1)
        .single();

      if (pvpData) {
        const name = pvpData.se_username || pvpData.twitch_username || 'A mysterious fighter';
        dynamicNews.push({
          id: 'pvp-champion',
          news_type: 'pvp',
          category: 'featured',
          title: 'UNDEFEATED WARRIOR',
          content: `${name} continues their reign of terror in the underground fight clubs. With ${pvpData.pvp_wins} victories and only ${pvpData.pvp_losses} defeats, challengers beware.`,
          icon: '⚔️',
          player_name: name,
          priority: 2,
          created_at: now.toISOString(),
        });
      }
    } catch (err) {}

    // Rising Kingpin
    try {
      const { data: kingpinData } = await supabase
        .from('the_life_players')
        .select('id, se_username, twitch_username, level, total_robberies, successful_robberies')
        .gte('level', 3)
        .gt('total_robberies', 5)
        .order('level', { ascending: false })
        .limit(3);

      if (kingpinData && kingpinData.length > 0) {
        const kingpin = kingpinData.reduce((best, curr) => {
          const currRate = curr.successful_robberies / (curr.total_robberies || 1);
          const bestRate = best.successful_robberies / (best.total_robberies || 1);
          return currRate > bestRate ? curr : best;
        });
        
        const name = kingpin.se_username || kingpin.twitch_username || 'An ambitious criminal';
        dynamicNews.push({
          id: 'rising-kingpin',
          news_type: 'kingpin',
          category: 'breaking',
          title: 'RISING THROUGH THE RANKS',
          content: `Word on the street is that ${name} has been making serious moves. At level ${kingpin.level} with ${kingpin.successful_robberies} successful operations, the established powers should watch their backs.`,
          icon: '👑',
          player_name: name,
          priority: 3,
          created_at: now.toISOString(),
        });
      }
    } catch (err) {}

    // Dock Boats
    try {
      const { data: boatData } = await supabase
        .from('the_life_dock_boats')
        .select(`
          id, name, arrival_time, departure_time, max_shipments, current_shipments,
          the_life_items!the_life_dock_boats_item_id_fkey (name)
        `)
        .eq('is_active', true)
        .gte('departure_time', now.toISOString())
        .order('departure_time', { ascending: true })
        .limit(3);

      if (boatData && boatData.length > 0) {
        boatData.forEach((boat) => {
          const arrivalTime = new Date(boat.arrival_time);
          const departureTime = new Date(boat.departure_time);
          const isArrived = arrivalTime <= now;
          const minutesLeft = Math.floor((departureTime - now) / (1000 * 60));
          
          dynamicNews.push({
            id: `dock-${boat.id}`,
            news_type: 'dock',
            category: isArrived ? 'urgent' : 'shipping',
            title: isArrived ? 'VESSEL IN PORT' : 'INCOMING CARGO',
            content: isArrived 
              ? `The ${boat.name} has docked at the harbor. ${boat.max_shipments - (boat.current_shipments || 0)} cargo slots remain for ${boat.the_life_items?.name || 'contraband'}. She departs in ${minutesLeft} minutes - act fast.`
              : `Spotters report the ${boat.name} approaching our waters. Prepare your shipments for ${boat.the_life_items?.name || 'goods'}.`,
            icon: '🚢',
            priority: isArrived ? 3 : 2,
            created_at: boat.arrival_time,
          });
        });
      }
    } catch (err) {}

    // Brothel Empire
    try {
      const { data: brothelData } = await supabase
        .from('the_life_brothels')
        .select(`
          id, workers, income_per_hour, player_id,
          the_life_players!inner (se_username, twitch_username)
        `)
        .gt('workers', 0)
        .order('income_per_hour', { ascending: false })
        .limit(1)
        .single();

      if (brothelData) {
        const name = brothelData.the_life_players?.se_username || brothelData.the_life_players?.twitch_username || 'An entrepreneur';
        dynamicNews.push({
          id: 'brothel-leader',
          news_type: 'brothel',
          category: 'business',
          title: 'EMPIRE OF PLEASURE',
          content: `${name} runs the most profitable establishment in the underworld. With ${brothelData.workers} workers generating $${(brothelData.income_per_hour || 0).toLocaleString()} per hour, this is a business empire built on indulgence.`,
          icon: '🌹',
          player_name: name,
          priority: 2,
          created_at: now.toISOString(),
        });
      }
    } catch (err) {}

    // Crime trending
    try {
      const { data: crimeData } = await supabase
        .from('the_life_robberies')
        .select('id, name, base_reward, max_reward')
        .eq('is_active', true)
        .limit(10);

      if (crimeData && crimeData.length > 0) {
        const randomCrime = crimeData[Math.floor(Math.random() * crimeData.length)];
        dynamicNews.push({
          id: 'crime-trending',
          news_type: 'crime',
          category: 'crime',
          title: 'CRIMINAL OPPORTUNITY',
          content: `Intelligence reports indicate that "${randomCrime.name}" has become a lucrative venture. Rewards range from $${randomCrime.base_reward?.toLocaleString()} to $${randomCrime.max_reward?.toLocaleString()}. Proceed with caution.`,
          icon: '🔫',
          priority: 1,
          created_at: now.toISOString(),
        });
      }
    } catch (err) {}

    // Stock Market
    const stockMovers = [
      { name: 'ShadowCorp Industries', change: '+12.5%', direction: 'up' },
      { name: 'Underground Logistics', change: '-8.3%', direction: 'down' },
      { name: 'Dark Market Holdings', change: '+5.2%', direction: 'up' }
    ];
    const randomStock = stockMovers[Math.floor(Math.random() * stockMovers.length)];
    dynamicNews.push({
      id: 'stock-mover',
      news_type: 'stock',
      category: 'markets',
      title: randomStock.direction === 'up' ? 'MARKET SURGE' : 'MARKET DECLINE',
      content: `${randomStock.name} ${randomStock.direction === 'up' ? 'surged' : 'dropped'} ${randomStock.change} in today's trading. ${randomStock.direction === 'up' ? 'Insiders are buying heavily.' : 'Smart money is moving elsewhere.'}`,
      icon: randomStock.direction === 'up' ? '📈' : '📉',
      priority: 1,
      created_at: now.toISOString(),
    });

    // Weather/Atmosphere
    const weatherReports = [
      { title: 'FOG ADVISORY', content: 'Heavy fog expected tonight. Perfect conditions for those who prefer to work unseen.' },
      { title: 'CLEAR SKIES', content: 'Visibility is high today. Plan your operations accordingly.' },
      { title: 'RAIN INCOMING', content: 'Storm clouds gathering. The wet streets will muffle footsteps tonight.' }
    ];
    const weather = weatherReports[Math.floor(Math.random() * weatherReports.length)];
    dynamicNews.push({
      id: 'weather',
      news_type: 'general',
      category: 'weather',
      title: weather.title,
      content: weather.content,
      icon: '🌙',
      priority: 1,
      created_at: now.toISOString(),
    });

    return dynamicNews;
  };

  useEffect(() => {
    fetchNewsData();
    const interval = setInterval(fetchNewsData, 60000);
    return () => clearInterval(interval);
  }, [fetchNewsData]);

  const filteredNews = activeFilter === 'all' 
    ? news 
    : news.filter(n => n.news_type === activeFilter);

  const filters = [
    { key: 'all', label: t(T.NEWS_ALL, 'All Stories') },
    { key: 'leaderboard', label: t(T.NEWS_RANKINGS, 'Power Rankings') },
    { key: 'pvp', label: t(T.NEWS_FIGHTCLUB, 'Fight Club') },
    { key: 'crime', label: t(T.NEWS_CRIMEBEAT, 'Crime Beat') },
    { key: 'dock', label: t(T.NEWS_HARBOR, 'Harbor News') },
    { key: 'brothel', label: t(T.NEWS_VICE, 'Vice') },
    { key: 'stock', label: t(T.NEWS_MARKETS, 'Markets') },
    { key: 'kingpin', label: t(T.NEWS_RISINGSTARS, 'Rising Stars') },
  ];

  const getArticleClass = (item) => {
    if (item.category === 'headline') return 'article-headline';
    if (item.category === 'breaking' || item.category === 'urgent') return 'article-breaking';
    if (item.category === 'featured') return 'article-featured';
    return 'article-standard';
  };

  const formatDate = (date) => {
    const locale = language === 'pt' ? 'pt-BR' : 'en-US';
    return new Date(date).toLocaleDateString(locale, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="journal-page">
      <div className="journal-container">
        {/* Newspaper Header */}
        <header className="journal-header">
          <div className="header-ornament left">❧</div>
          <div className="header-content">
            <div className="masthead-date">{formatDate(currentDate)}</div>
            <h1 className="masthead-title">{t(T.NEWS_TITLE, 'The Underground Chronicle')}</h1>
            <div className="masthead-subtitle">
              <span className="subtitle-ornament">✦</span>
              <span>{t(T.NEWS_SUBTITLE, 'Your Trusted Source for Street Intelligence')}</span>
              <span className="subtitle-ornament">✦</span>
            </div>
            <div className="masthead-edition">
              <span>Vol. XLII</span>
              <span className="separator">•</span>
              <span>No. {Math.floor(Math.random() * 999) + 1}</span>
              <span className="separator">•</span>
              <span>{language === 'pt' ? 'Preço: Sua Alma' : 'Price: Your Soul'}</span>
            </div>
          </div>
          <div className="header-ornament right">❧</div>
        </header>

        {/* Navigation */}
        <nav className="journal-nav">
          <button className="back-btn" onClick={() => navigate('/games/thelife')}>
            ← {t(T.ACTION_BACK, 'Return to The Life')}
          </button>
          <div className="nav-sections">
            {filters.map(filter => (
              <button
                key={filter.key}
                className={`nav-section ${activeFilter === filter.key ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="nav-actions">
            <LanguageSwitcher variant="compact" />
            <button className="refresh-btn" onClick={fetchNewsData} disabled={loading}>
              {loading ? t(T.LABEL_LOADING, 'Loading...') : `↻ ${t(T.ACTION_REFRESH, 'Refresh')}`}
            </button>
          </div>
        </nav>

        <div className="journal-divider double"></div>

        {/* Main Content */}
        <main className="journal-content">
          {loading ? (
            <div className="journal-loading">
              <div className="loading-text">{language === 'pt' ? 'Reunindo inteligência...' : 'Gathering intelligence...'}</div>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="no-stories">
              <p>{language === 'pt' ? 'Nenhuma história disponível nesta seção.' : 'No stories available in this section.'}</p>
              <p className="subtext">{language === 'pt' ? 'Volte mais tarde para atualizações das ruas.' : 'Check back later for updates from the streets.'}</p>
            </div>
          ) : (
            <div className="articles-grid">
              {filteredNews.map((item, index) => (
                <article 
                  key={item.id || index} 
                  className={`journal-article ${getArticleClass(item)}`}
                >
                  <div className="article-category">{item.news_type.toUpperCase()}</div>
                  <h2 className="article-headline-text">
                    <span className="headline-icon">{item.icon}</span>
                    {item.title}
                  </h2>
                  <div className="article-rule"></div>
                  <p className="article-content">{item.content}</p>
                  <div className="article-footer">
                    {item.player_name && (
                      <span className="article-subject">{language === 'pt' ? 'Referente a' : 'Concerning'}: {item.player_name}</span>
                    )}
                    <span className="article-time">
                      {new Date(item.created_at).toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="journal-footer">
          <div className="journal-divider"></div>
          <div className="footer-content">
            <p className="footer-quote">{language === 'pt' ? '"Nas sombras, informação é moeda."' : '"In the shadows, information is currency."'}</p>
            <p className="footer-disclaimer">
              {language === 'pt' 
                ? 'A Crônica Subterrânea não se responsabiliza por quaisquer ações tomadas com base nesta inteligência.'
                : 'The Underground Chronicle is not responsible for any actions taken based on this intelligence.'}
              <br/>{language === 'pt'
                ? 'Todos os relatórios são coletados de fontes confidenciais no submundo criminoso.'
                : 'All reports are gathered from confidential sources within the criminal underworld.'}
            </p>
            <div className="footer-ornament">⚜</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
