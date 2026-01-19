import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import '../styles/TheLifeNewsFeed.css';

/**
 * The Life News Feed Component
 * Displays automated live news about game events to engage players
 */
export default function TheLifeNewsFeed({ 
  player, 
  leaderboard, 
  isOpen, 
  onClose,
  user 
}) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [stockNews, setStockNews] = useState([]);
  const [dockNews, setDockNews] = useState([]);
  const [brothelStats, setBrothelStats] = useState(null);
  const [crimeStats, setCrimeStats] = useState(null);
  const [pvpChampion, setPvpChampion] = useState(null);
  const [risingKingpin, setRisingKingpin] = useState(null);

  // Fetch all news data
  const fetchNewsData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stored news
      const { data: storedNews, error: newsError } = await supabase
        .from('the_life_news_feed')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (newsError) console.error('Error fetching news:', newsError);
      
      // Generate dynamic news from current game state
      const dynamicNews = await generateDynamicNews();
      
      // Combine and sort all news
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
  }, [player, leaderboard]);

  // Generate dynamic news from current game state
  const generateDynamicNews = async () => {
    const dynamicNews = [];
    const now = new Date();

    // 1. Leaderboard Top 3 News
    if (leaderboard && leaderboard.length > 0) {
      const medals = ['🥇', '🥈', '🥉'];
      const titles = ['TOP DOG', 'RUNNER UP', 'THIRD PLACE'];
      
      leaderboard.slice(0, 3).forEach((p, index) => {
        dynamicNews.push({
          id: `leaderboard-${index}`,
          news_type: 'leaderboard',
          category: ['gold', 'silver', 'bronze'][index],
          title: `${medals[index]} ${titles[index]}`,
          content: `${p.username || 'Anonymous'} holds position #${index + 1} with $${(p.net_worth || 0).toLocaleString()} net worth!`,
          icon: medals[index],
          player_name: p.username,
          priority: 3,
          created_at: now.toISOString(),
          related_data: { rank: index + 1, net_worth: p.net_worth, level: p.level }
        });
      });
    }

    // 2. PVP Champion - Player with least defeats
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
        setPvpChampion(pvpData);
        dynamicNews.push({
          id: 'pvp-champion',
          news_type: 'pvp',
          category: 'champion',
          title: '⚔️ PVP DESTROYER',
          content: `${name} is dominating with only ${pvpData.pvp_losses} defeats and ${pvpData.pvp_wins} victories!`,
          icon: '🏆',
          player_name: name,
          priority: 2,
          created_at: now.toISOString(),
          related_data: { wins: pvpData.pvp_wins, losses: pvpData.pvp_losses }
        });
      }
    } catch (err) {
      console.log('No PVP data available');
    }

    // 3. Rising Kingpin - Fast climber
    try {
      const { data: kingpinData } = await supabase
        .from('the_life_players')
        .select('id, se_username, twitch_username, level, total_robberies, successful_robberies')
        .gte('level', 3)
        .gt('total_robberies', 5)
        .order('level', { ascending: false })
        .limit(3);

      if (kingpinData && kingpinData.length > 0) {
        // Find the one with best success rate
        const kingpin = kingpinData.reduce((best, curr) => {
          const currRate = curr.successful_robberies / (curr.total_robberies || 1);
          const bestRate = best.successful_robberies / (best.total_robberies || 1);
          return currRate > bestRate ? curr : best;
        });
        
        const name = kingpin.se_username || kingpin.twitch_username || 'Someone';
        setRisingKingpin(kingpin);
        dynamicNews.push({
          id: 'rising-kingpin',
          news_type: 'kingpin',
          category: 'rising',
          title: '👑 RISING KINGPIN',
          content: `${name} is making moves! Level ${kingpin.level} with ${kingpin.successful_robberies} successful heists. Watch out!`,
          icon: '🚀',
          player_name: name,
          priority: 3,
          created_at: now.toISOString(),
          related_data: { level: kingpin.level, heists: kingpin.successful_robberies }
        });
      }
    } catch (err) {
      console.log('No kingpin data available');
    }

    // 4. Active Dock Boats
    try {
      const { data: boatData } = await supabase
        .from('the_life_dock_boats')
        .select(`
          id,
          name,
          arrival_time,
          departure_time,
          max_shipments,
          current_shipments,
          the_life_items!the_life_dock_boats_item_id_fkey (name)
        `)
        .eq('is_active', true)
        .gte('departure_time', now.toISOString())
        .order('departure_time', { ascending: true })
        .limit(3);

      if (boatData && boatData.length > 0) {
        boatData.forEach((boat, index) => {
          const arrivalTime = new Date(boat.arrival_time);
          const departureTime = new Date(boat.departure_time);
          const isArrived = arrivalTime <= now;
          const minutesLeft = Math.floor((departureTime - now) / (1000 * 60));
          
          dynamicNews.push({
            id: `dock-${boat.id}`,
            news_type: 'dock',
            category: isArrived ? 'active' : 'incoming',
            title: isArrived ? '🚢 BOAT DOCKED' : '⚓ INCOMING SHIPMENT',
            content: isArrived 
              ? `The ${boat.name} is at the docks! ${boat.max_shipments - (boat.current_shipments || 0)} slots left for ${boat.the_life_items?.name || 'goods'}. Departing in ${minutesLeft} minutes!`
              : `The ${boat.name} arriving soon with capacity for ${boat.the_life_items?.name || 'goods'}. Get your product ready!`,
            icon: '🚢',
            priority: isArrived ? 3 : 2,
            created_at: boat.arrival_time,
            related_data: { 
              boat_name: boat.name, 
              slots_left: boat.max_shipments - (boat.current_shipments || 0),
              minutes_left: minutesLeft 
            }
          });
        });
        setDockNews(boatData);
      }
    } catch (err) {
      console.log('No dock data available');
    }

    // 5. Brothel Empire Leader
    try {
      const { data: brothelData } = await supabase
        .from('the_life_brothels')
        .select(`
          id,
          workers,
          income_per_hour,
          player_id,
          the_life_players!inner (
            se_username,
            twitch_username
          )
        `)
        .gt('workers', 0)
        .order('income_per_hour', { ascending: false })
        .limit(1)
        .single();

      if (brothelData) {
        const name = brothelData.the_life_players?.se_username || brothelData.the_life_players?.twitch_username || 'An entrepreneur';
        setBrothelStats(brothelData);
        dynamicNews.push({
          id: 'brothel-leader',
          news_type: 'brothel',
          category: 'empire',
          title: '💋 PIMP OF THE YEAR',
          content: `${name} runs the biggest operation with ${brothelData.workers} workers earning $${(brothelData.income_per_hour || 0).toLocaleString()}/hour!`,
          icon: '🌹',
          player_name: name,
          priority: 2,
          created_at: now.toISOString(),
          related_data: { workers: brothelData.workers, income: brothelData.income_per_hour }
        });
      }
    } catch (err) {
      console.log('No brothel data available');
    }

    // 6. Crime Statistics
    try {
      const { data: crimeData } = await supabase
        .from('the_life_robberies')
        .select('id, name')
        .eq('is_active', true)
        .limit(10);

      if (crimeData && crimeData.length > 0) {
        // Pick a random crime as "trending"
        const randomCrime = crimeData[Math.floor(Math.random() * crimeData.length)];
        setCrimeStats({ trending: randomCrime });
        dynamicNews.push({
          id: 'crime-trending',
          news_type: 'crime',
          category: 'trending',
          title: '🔥 HOT CRIME',
          content: `"${randomCrime.name}" is trending on the streets! High risk, high reward opportunities await the bold.`,
          icon: '🚨',
          priority: 1,
          created_at: now.toISOString(),
          related_data: { crime_name: randomCrime.name }
        });
      }
    } catch (err) {
      console.log('No crime data available');
    }

    // 7. Stock Market Movers (if available)
    try {
      // Generate fake stock news since stocks are client-side
      const stockMovers = [
        { name: 'ShadowCorp', symbol: 'SHDC', change: '+12.5%', type: 'bull' },
        { name: 'Underground Inc', symbol: 'UNDG', change: '-8.3%', type: 'bear' },
        { name: 'Dark Markets Ltd', symbol: 'DRKM', change: '+5.2%', type: 'bull' }
      ];
      
      const randomStock = stockMovers[Math.floor(Math.random() * stockMovers.length)];
      setStockNews([randomStock]);
      dynamicNews.push({
        id: 'stock-mover',
        news_type: 'stock',
        category: randomStock.type,
        title: randomStock.type === 'bull' ? '📈 STOCK SURGE' : '📉 MARKET DIP',
        content: `${randomStock.name} (${randomStock.symbol}) ${randomStock.type === 'bull' ? 'surging' : 'falling'} ${randomStock.change}! ${randomStock.type === 'bull' ? 'Smart money is buying.' : 'Paper hands are selling.'}`,
        icon: randomStock.type === 'bull' ? '📈' : '📉',
        priority: 1,
        created_at: now.toISOString(),
        related_data: { stock: randomStock }
      });
    } catch (err) {
      console.log('No stock data available');
    }

    // 8. Player's own stats if they're doing well
    if (player) {
      if (player.pvp_wins > 5) {
        dynamicNews.push({
          id: 'player-pvp',
          news_type: 'personal',
          category: 'achievement',
          title: '⚔️ YOUR REPUTATION',
          content: `You have ${player.pvp_wins} PVP victories! The streets know your name.`,
          icon: '💪',
          priority: 1,
          created_at: now.toISOString(),
          related_data: { wins: player.pvp_wins }
        });
      }
      
      if (player.level >= 5) {
        dynamicNews.push({
          id: 'player-level',
          news_type: 'personal',
          category: 'status',
          title: '📊 YOUR STATUS',
          content: `Level ${player.level} gangster with $${((player.cash || 0) + (player.bank_balance || 0)).toLocaleString()} total wealth. Keep grinding!`,
          icon: '👤',
          priority: 1,
          created_at: now.toISOString(),
          related_data: { level: player.level }
        });
      }
    }

    return dynamicNews;
  };

  // Initial load and refresh
  useEffect(() => {
    if (isOpen) {
      fetchNewsData();
      
      // Refresh news every 30 seconds
      const interval = setInterval(fetchNewsData, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchNewsData]);

  // Filter news by type
  const filteredNews = activeFilter === 'all' 
    ? news 
    : news.filter(n => n.news_type === activeFilter);

  const filters = [
    { key: 'all', label: 'All', icon: '📰' },
    { key: 'leaderboard', label: 'Rankings', icon: '🏆' },
    { key: 'pvp', label: 'PVP', icon: '⚔️' },
    { key: 'crime', label: 'Crimes', icon: '🚨' },
    { key: 'dock', label: 'Docks', icon: '🚢' },
    { key: 'brothel', label: 'Brothel', icon: '💋' },
    { key: 'stock', label: 'Stocks', icon: '📈' },
    { key: 'kingpin', label: 'Kingpins', icon: '👑' },
  ];

  const getNewsTypeClass = (type) => {
    const classes = {
      leaderboard: 'news-gold',
      pvp: 'news-red',
      crime: 'news-orange',
      dock: 'news-blue',
      brothel: 'news-pink',
      stock: 'news-green',
      kingpin: 'news-purple',
      personal: 'news-cyan',
      general: 'news-gray'
    };
    return classes[type] || 'news-gray';
  };

  const getPriorityBadge = (priority) => {
    if (priority >= 3) return <span className="priority-badge hot">🔥 HOT</span>;
    if (priority >= 2) return <span className="priority-badge trending">📢 TRENDING</span>;
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="news-feed-overlay">
      <div className="news-feed-modal">
        <div className="news-feed-header">
          <div className="news-title">
            <span className="news-icon">📰</span>
            <h2>UNDERGROUND NEWS</h2>
            <span className="live-badge">
              <span className="live-dot"></span>
              LIVE
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="news-filters">
          {filters.map(filter => (
            <button
              key={filter.key}
              className={`filter-btn ${activeFilter === filter.key ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.key)}
            >
              <span className="filter-icon">{filter.icon}</span>
              <span className="filter-label">{filter.label}</span>
            </button>
          ))}
        </div>

        <div className="news-feed-content">
          {loading ? (
            <div className="news-loading">
              <div className="loading-spinner"></div>
              <p>Loading news feed...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="no-news">
              <span className="no-news-icon">📭</span>
              <p>No news available for this category</p>
            </div>
          ) : (
            <div className="news-list">
              {filteredNews.map((item, index) => (
                <div 
                  key={item.id || index} 
                  className={`news-item ${getNewsTypeClass(item.news_type)}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="news-item-icon">
                    {item.icon || '📰'}
                  </div>
                  <div className="news-item-content">
                    <div className="news-item-header">
                      <h3>{item.title}</h3>
                      {getPriorityBadge(item.priority)}
                    </div>
                    <p>{item.content}</p>
                    <div className="news-item-meta">
                      <span className="news-type-tag">{item.news_type}</span>
                      {item.player_name && (
                        <span className="news-player">👤 {item.player_name}</span>
                      )}
                      <span className="news-time">
                        {new Date(item.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="news-feed-footer">
          <button className="refresh-btn" onClick={fetchNewsData} disabled={loading}>
            🔄 Refresh News
          </button>
          <p className="news-disclaimer">News updates every 30 seconds</p>
        </div>
      </div>
    </div>
  );
}
