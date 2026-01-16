import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import './TheLifeStockMarket.css';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  transactionFeePercent: 0.5,
  priceUpdateInterval: 3000,
  newsInterval: 20000,
  eventInterval: 90000,
  baseVolatility: 0.02,
  chartHistoryLength: 50,
  minStockPrice: 0.01,
  maxStockPrice: 100000
};

// ============================================
// STOCK DATA
// ============================================
const STOCKS_DATA = [
  {
    symbol: 'SHAD',
    name: 'Shadow Corp',
    sector: 'Underground Banking',
    basePrice: 156.80,
    volatility: 0.015,
    riskLevel: 'low',
    type: 'safe',
    description: 'The backbone of underground finance.',
    sharesOutstanding: 50000000
  },
  {
    symbol: 'GHOST',
    name: 'Ghost Networks',
    sector: 'Dark Web Services',
    basePrice: 89.45,
    volatility: 0.025,
    riskLevel: 'medium',
    type: 'moderate',
    description: 'Anonymous communication infrastructure.',
    sharesOutstanding: 75000000
  },
  {
    symbol: 'VNDR',
    name: 'Vendetta Arms',
    sector: 'Weapons & Defense',
    basePrice: 234.20,
    volatility: 0.035,
    riskLevel: 'high',
    type: 'volatile',
    description: 'Black market weapons manufacturer.',
    sharesOutstanding: 25000000
  },
  {
    symbol: 'CRYPT',
    name: 'CryptVault Inc',
    sector: 'Money Laundering',
    basePrice: 445.00,
    volatility: 0.018,
    riskLevel: 'low',
    type: 'safe',
    description: 'Premium money cleaning services.',
    sharesOutstanding: 15000000
  },
  {
    symbol: 'NITE',
    name: 'Nightclub Empire',
    sector: 'Entertainment',
    basePrice: 67.30,
    volatility: 0.022,
    riskLevel: 'medium',
    type: 'moderate',
    description: 'Chain of fronts disguised as nightclubs.',
    sharesOutstanding: 100000000
  },
  {
    symbol: 'SYNTH',
    name: 'Synthesis Labs',
    sector: 'Pharmaceuticals',
    basePrice: 312.50,
    volatility: 0.045,
    riskLevel: 'high',
    type: 'volatile',
    description: 'Underground drug manufacturing.',
    sharesOutstanding: 20000000
  },
  {
    symbol: 'SMUGL',
    name: "Smuggler's Route",
    sector: 'Logistics',
    basePrice: 128.75,
    volatility: 0.028,
    riskLevel: 'medium',
    type: 'moderate',
    description: 'International smuggling network.',
    sharesOutstanding: 60000000
  },
  {
    symbol: 'HIEST',
    name: 'Heist Collective',
    sector: 'Theft Services',
    basePrice: 78.90,
    volatility: 0.055,
    riskLevel: 'extreme',
    type: 'manipulated',
    description: 'Professional heist planning.',
    sharesOutstanding: 80000000
  },
  {
    symbol: 'FORGE',
    name: 'Forge Documents',
    sector: 'Identity Services',
    basePrice: 95.40,
    volatility: 0.02,
    riskLevel: 'low',
    type: 'safe',
    description: 'Premium forged documents.',
    sharesOutstanding: 45000000
  },
  {
    symbol: 'BYTE',
    name: 'ByteThief Tech',
    sector: 'Cyber Crime',
    basePrice: 267.80,
    volatility: 0.04,
    riskLevel: 'high',
    type: 'volatile',
    description: 'Ransomware and data theft.',
    sharesOutstanding: 30000000
  },
  {
    symbol: 'CARTEL',
    name: 'Cartel United',
    sector: 'Criminal Syndicate',
    basePrice: 523.40,
    volatility: 0.06,
    riskLevel: 'extreme',
    type: 'manipulated',
    description: 'Multi-national criminal org.',
    sharesOutstanding: 10000000
  }
];

// ============================================
// NEWS TEMPLATES
// ============================================
const NEWS_TEMPLATES = {
  positive: [
    { headline: '{stock} secures major underground contract', impact: 0.08 },
    { headline: 'Insider tip: {stock} expansion imminent', impact: 0.12 },
    { headline: '{stock} CEO evades arrest, business continues', impact: 0.05 },
    { headline: 'New territory acquired by {stock}', impact: 0.1 }
  ],
  negative: [
    { headline: 'Police raid {stock} headquarters', impact: -0.15 },
    { headline: '{stock} executive arrested', impact: -0.12 },
    { headline: 'Rival gang attacks {stock} operations', impact: -0.08 },
    { headline: 'Internal leak exposes {stock}', impact: -0.1 }
  ],
  neutral: [
    { headline: 'Analysts watching {stock} closely', impact: 0 },
    { headline: '{stock} announces restructuring', impact: 0.02 },
    { headline: '{stock} maintains steady operations', impact: 0.01 }
  ]
};

const MARKET_EVENTS = [
  {
    name: 'Police Crackdown',
    icon: '🚔',
    type: 'negative',
    description: 'Federal investigation targets underground',
    affectedSectors: ['Weapons & Defense', 'Pharmaceuticals', 'Theft Services'],
    impact: -0.2,
    duration: 30000
  },
  {
    name: 'Gang War',
    icon: '💀',
    type: 'volatile',
    description: 'Territorial dispute causes instability',
    affectedSectors: ['all'],
    impact: 0,
    volatilityMultiplier: 2,
    duration: 45000
  },
  {
    name: 'Big Score',
    icon: '💰',
    type: 'positive',
    description: 'Major heist brings windfall',
    affectedSectors: ['Theft Services', 'Money Laundering', 'Underground Banking'],
    impact: 0.15,
    duration: 30000
  },
  {
    name: 'Market Boom',
    icon: '📈',
    type: 'positive',
    description: 'Economic conditions favor underground',
    affectedSectors: ['all'],
    impact: 0.1,
    duration: 60000
  },
  {
    name: 'Market Crash',
    icon: '📉',
    type: 'negative',
    description: 'Panic selling grips the market',
    affectedSectors: ['all'],
    impact: -0.15,
    duration: 45000
  }
];

// ============================================
// STOCK MARKET COMPONENT
// ============================================
export default function TheLifeStockMarket({
  player,
  setPlayer,
  setMessage,
  user,
  onBack
}) {
  // State
  const [stocks, setStocks] = useState([]);
  const [portfolio, setPortfolio] = useState({}); // { symbol: { shares, avgCost, totalCost } }
  const [transactions, setTransactions] = useState([]);
  const [news, setNews] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('market');
  const [selectedStock, setSelectedStock] = useState(null);
  const [tradeMode, setTradeMode] = useState('buy');
  const [tradeShares, setTradeShares] = useState(1);
  const [sortBy, setSortBy] = useState('symbol');
  const [filterBy, setFilterBy] = useState('all');
  const [toast, setToast] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Refs for intervals
  const priceIntervalRef = useRef(null);
  const newsIntervalRef = useRef(null);
  const eventIntervalRef = useRef(null);

  // Load portfolio and transactions from Supabase
  useEffect(() => {
    const loadPortfolioData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Load portfolio
        const { data: portfolioData, error: portfolioError } = await supabase
          .from('the_life_stock_portfolios')
          .select('*')
          .eq('user_id', user.id);

        if (portfolioError) throw portfolioError;

        if (portfolioData && portfolioData.length > 0) {
          const portfolioMap = {};
          portfolioData.forEach(item => {
            portfolioMap[item.symbol] = {
              shares: item.shares,
              avgCost: parseFloat(item.avg_cost),
              totalCost: parseFloat(item.total_cost)
            };
          });
          setPortfolio(portfolioMap);
        }

        // Load transactions (last 100)
        const { data: txData, error: txError } = await supabase
          .from('the_life_stock_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (txError) throw txError;

        if (txData && txData.length > 0) {
          setTransactions(txData.map(tx => ({
            action: tx.action,
            symbol: tx.symbol,
            shares: tx.shares,
            price: parseFloat(tx.price),
            fee: parseFloat(tx.fee),
            total: parseFloat(tx.total),
            time: new Date(tx.created_at).getTime()
          })));
        }
      } catch (error) {
        console.error('Failed to load portfolio data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolioData();
  }, [user?.id]);

  // Save portfolio holding to Supabase
  const savePortfolioToSupabase = async (symbol, holding) => {
    if (!user?.id) return;
    
    try {
      if (holding.shares === 0) {
        // Delete if no shares
        await supabase
          .from('the_life_stock_portfolios')
          .delete()
          .eq('user_id', user.id)
          .eq('symbol', symbol);
      } else {
        // Upsert the holding
        await supabase
          .from('the_life_stock_portfolios')
          .upsert({
            user_id: user.id,
            symbol: symbol,
            shares: holding.shares,
            avg_cost: holding.avgCost,
            total_cost: holding.totalCost,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,symbol' });
      }
    } catch (error) {
      console.error('Failed to save portfolio:', error);
    }
  };

  // Save transaction to Supabase
  const saveTransactionToSupabase = async (transaction) => {
    if (!user?.id) return;
    
    try {
      await supabase
        .from('the_life_stock_transactions')
        .insert({
          user_id: user.id,
          action: transaction.action,
          symbol: transaction.symbol,
          shares: transaction.shares,
          price: transaction.price,
          fee: transaction.fee,
          total: transaction.total
        });
    } catch (error) {
      console.error('Failed to save transaction:', error);
    }
  };

  // Generate initial price history - must be defined before initializeStocks
  const generateInitialHistory = (basePrice, volatility) => {
    const history = [];
    let price = basePrice * (0.8 + Math.random() * 0.4);
    
    for (let i = 0; i < CONFIG.chartHistoryLength; i++) {
      const change = (Math.random() - 0.5) * volatility * price * 2;
      price = Math.max(CONFIG.minStockPrice, price + change);
      history.push({
        price,
        time: Date.now() - (CONFIG.chartHistoryLength - i) * CONFIG.priceUpdateInterval
      });
    }
    
    return history;
  };

  // Initialize stocks
  const initializeStocks = useCallback(() => {
    const initialStocks = STOCKS_DATA.map(stock => ({
      ...stock,
      price: stock.basePrice,
      previousPrice: stock.basePrice,
      dayOpen: stock.basePrice,
      dayHigh: stock.basePrice,
      dayLow: stock.basePrice,
      change: 0,
      changePercent: 0,
      volume: Math.floor(Math.random() * 1000000) + 100000,
      priceHistory: generateInitialHistory(stock.basePrice, stock.volatility),
      trend: (Math.random() - 0.5) * 0.02,
      trendDuration: Math.floor(Math.random() * 20) + 10
    }));
    setStocks(initialStocks);
  }, []);

  // Update prices
  const updatePrices = useCallback(() => {
    setStocks(prevStocks => prevStocks.map(stock => {
      const newStock = { ...stock };
      newStock.previousPrice = stock.price;
      
      let change = 0;
      
      // Base random movement
      change += (Math.random() - 0.5) * stock.volatility * stock.price * 2;
      
      // Trend influence
      change += stock.trend * stock.price * 0.3;
      
      // Event influence
      if (currentEvent) {
        if (currentEvent.affectedSectors.includes('all') || 
            currentEvent.affectedSectors.includes(stock.sector)) {
          change += currentEvent.impact * stock.price * 0.1;
          if (currentEvent.volatilityMultiplier) {
            change *= currentEvent.volatilityMultiplier;
          }
        }
      }
      
      // Mean reversion
      const priceRatio = stock.price / stock.basePrice;
      if (priceRatio > 2) change -= stock.price * 0.01;
      else if (priceRatio < 0.5) change += stock.price * 0.01;
      
      // Manipulated stocks
      if (stock.type === 'manipulated' && Math.random() < 0.1) {
        change += (Math.random() - 0.5) * stock.price * 0.1;
      }
      
      newStock.price = Math.max(CONFIG.minStockPrice, 
        Math.min(CONFIG.maxStockPrice, stock.price + change));
      
      newStock.change = newStock.price - newStock.previousPrice;
      newStock.changePercent = (newStock.change / newStock.previousPrice) * 100;
      newStock.dayHigh = Math.max(stock.dayHigh, newStock.price);
      newStock.dayLow = Math.min(stock.dayLow, newStock.price);
      newStock.volume += Math.floor(Math.random() * 10000);
      
      // Update trend
      newStock.trendDuration = stock.trendDuration - 1;
      if (newStock.trendDuration <= 0) {
        newStock.trend = (Math.random() - 0.5) * 0.02;
        newStock.trendDuration = Math.floor(Math.random() * 20) + 10;
      }
      
      // Update history
      newStock.priceHistory = [...stock.priceHistory.slice(-CONFIG.chartHistoryLength + 1), {
        price: newStock.price,
        time: Date.now()
      }];
      
      return newStock;
    }));
  }, [currentEvent]);

  // Generate news
  const generateNews = useCallback(() => {
    setStocks(prevStocks => {
      const stock = prevStocks[Math.floor(Math.random() * prevStocks.length)];
      const types = ['positive', 'negative', 'neutral'];
      const type = types[Math.floor(Math.random() * types.length)];
      const templates = NEWS_TEMPLATES[type];
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      const newsItem = {
        headline: template.headline.replace('{stock}', stock.name),
        stock: stock.symbol,
        type,
        impact: template.impact,
        time: Date.now()
      };
      
      setNews(prev => [newsItem, ...prev.slice(0, 19)]);
      
      // Apply trend impact
      return prevStocks.map(s => 
        s.symbol === stock.symbol 
          ? { ...s, trend: s.trend + template.impact * 0.5 }
          : s
      );
    });
  }, []);

  // Trigger random event
  const triggerEvent = useCallback(() => {
    if (currentEvent) return;
    
    if (Math.random() < 0.25) {
      const event = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
      setCurrentEvent({ ...event, endTime: Date.now() + event.duration });
      
      setNews(prev => [{
        headline: `BREAKING: ${event.description}`,
        stock: null,
        type: event.type,
        impact: event.impact,
        time: Date.now(),
        isEvent: true
      }, ...prev.slice(0, 19)]);
      
      showToast(`Market Event: ${event.name}`, event.type === 'positive' ? 'success' : 'warning');
    }
  }, [currentEvent]);

  // Check event end
  useEffect(() => {
    if (currentEvent && Date.now() >= currentEvent.endTime) {
      setCurrentEvent(null);
    }
  }, [currentEvent, stocks]);

  // Initialize stocks only once on mount
  useEffect(() => {
    initializeStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start price update loop (separate from initialization)
  useEffect(() => {
    // Only start intervals once stocks are initialized
    if (stocks.length === 0) return;
    
    priceIntervalRef.current = setInterval(updatePrices, CONFIG.priceUpdateInterval);
    newsIntervalRef.current = setInterval(generateNews, CONFIG.newsInterval);
    eventIntervalRef.current = setInterval(triggerEvent, CONFIG.eventInterval);
    
    return () => {
      clearInterval(priceIntervalRef.current);
      clearInterval(newsIntervalRef.current);
      clearInterval(eventIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks.length > 0]);

  // Update player cash in database
  const updatePlayerCash = async (newCash) => {
    if (!user?.id) {
      console.error('No user ID available');
      setMessage({ type: 'error', text: 'Not authenticated!' });
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: newCash, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error.message, error.code, error.details);
        throw error;
      }
      
      if (!data) {
        console.error('No data returned from update');
        throw new Error('Update returned no data');
      }
      
      setPlayer(prev => ({ ...prev, cash: newCash }));
      return true;
    } catch (error) {
      console.error('Error updating cash:', error);
      setMessage({ type: 'error', text: `Failed to update cash: ${error.message}` });
      return false;
    }
  };

  // Calculate fee
  const calculateFee = (amount) => amount * (CONFIG.transactionFeePercent / 100);

  // Format market cap
  const formatMarketCap = (value) => {
    if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
    return '$' + value.toLocaleString();
  };

  // Show toast
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Execute buy
  const executeBuy = async (symbol, shares) => {
    if (isProcessing) return;
    
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) {
      showToast('Stock not found', 'error');
      return false;
    }

    const subtotal = stock.price * shares;
    const fee = calculateFee(subtotal);
    const total = subtotal + fee;

    if (total > player.cash) {
      showToast('Insufficient cash', 'error');
      return false;
    }

    setIsProcessing(true);

    // Update player cash
    const newCash = player.cash - total;
    const success = await updatePlayerCash(newCash);
    
    if (!success) {
      setIsProcessing(false);
      return false;
    }

    // Update portfolio
    const holding = portfolio[symbol] || { shares: 0, avgCost: 0, totalCost: 0 };
    const newTotalCost = holding.totalCost + subtotal;
    const newShares = holding.shares + shares;
    const newHolding = {
      shares: newShares,
      avgCost: newTotalCost / newShares,
      totalCost: newTotalCost
    };

    setPortfolio(prev => ({
      ...prev,
      [symbol]: newHolding
    }));

    // Save portfolio to Supabase
    await savePortfolioToSupabase(symbol, newHolding);

    // Record transaction
    const transaction = {
      action: 'buy',
      symbol,
      shares,
      price: stock.price,
      fee,
      total,
      time: Date.now()
    };
    setTransactions(prev => [transaction, ...prev.slice(0, 99)]);
    
    // Save transaction to Supabase
    await saveTransactionToSupabase(transaction);

    showToast(`Bought ${shares} ${symbol} @ $${stock.price.toFixed(2)}`, 'success');
    setIsProcessing(false);
    setSelectedStock(null);
    return true;
  };

  // Execute sell
  const executeSell = async (symbol, shares) => {
    if (isProcessing) return;
    
    const stock = stocks.find(s => s.symbol === symbol);
    const holding = portfolio[symbol];
    
    if (!stock) {
      showToast('Stock not found', 'error');
      return false;
    }

    if (!holding || holding.shares < shares) {
      showToast('Insufficient shares', 'error');
      return false;
    }

    setIsProcessing(true);

    const subtotal = stock.price * shares;
    const fee = calculateFee(subtotal);
    const total = subtotal - fee;
    
    const costBasis = holding.avgCost * shares;
    const realizedPL = subtotal - costBasis - fee;

    // Update player cash
    const newCash = player.cash + total;
    const success = await updatePlayerCash(newCash);
    
    if (!success) {
      setIsProcessing(false);
      return false;
    }

    // Update portfolio
    const newShares = holding.shares - shares;
    const newHolding = newShares === 0 
      ? { shares: 0, avgCost: 0, totalCost: 0 }
      : {
          shares: newShares,
          avgCost: holding.avgCost,
          totalCost: holding.avgCost * newShares
        };

    setPortfolio(prev => {
      if (newShares === 0) {
        const { [symbol]: removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [symbol]: newHolding
      };
    });

    // Save portfolio to Supabase (will delete if 0 shares)
    await savePortfolioToSupabase(symbol, newHolding);

    // Record transaction
    const transaction = {
      action: 'sell',
      symbol,
      shares,
      price: stock.price,
      fee,
      total,
      realizedPL,
      time: Date.now()
    };
    setTransactions(prev => [transaction, ...prev.slice(0, 99)]);

    // Save transaction to Supabase
    await saveTransactionToSupabase(transaction);

    const plText = realizedPL >= 0 ? `+$${realizedPL.toFixed(2)}` : `-$${Math.abs(realizedPL).toFixed(2)}`;
    showToast(`Sold ${shares} ${symbol} @ $${stock.price.toFixed(2)} (${plText})`, realizedPL >= 0 ? 'success' : 'warning');
    
    setIsProcessing(false);
    setSelectedStock(null);
    return true;
  };

  // Get portfolio value
  const getPortfolioValue = () => {
    let value = 0;
    for (const symbol in portfolio) {
      const holding = portfolio[symbol];
      const stock = stocks.find(s => s.symbol === symbol);
      if (stock) {
        value += holding.shares * stock.price;
      }
    }
    return value;
  };

  // Get sorted and filtered stocks
  const getSortedStocks = () => {
    let filtered = [...stocks];
    
    if (filterBy === 'gainers') {
      filtered = filtered.filter(s => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent);
    } else if (filterBy === 'losers') {
      filtered = filtered.filter(s => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent);
    } else if (filterBy === 'safe') {
      filtered = filtered.filter(s => s.type === 'safe');
    } else if (filterBy === 'risky') {
      filtered = filtered.filter(s => s.type === 'volatile' || s.type === 'manipulated');
    }
    
    filtered.sort((a, b) => {
      if (sortBy === 'price') return b.price - a.price;
      if (sortBy === 'change') return b.changePercent - a.changePercent;
      if (sortBy === 'volume') return b.volume - a.volume;
      return a.symbol.localeCompare(b.symbol);
    });
    
    return filtered;
  };

  // Render mini chart
  const renderMiniChart = (stock) => {
    const history = stock.priceHistory.slice(-20);
    if (history.length < 2) return null;
    
    const prices = history.map(h => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    
    const points = history.map((h, i) => {
      const x = (i / (history.length - 1)) * 70;
      const y = 25 - ((h.price - min) / range) * 25;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg width="70" height="25" className="sm-mini-chart">
        <polyline
          points={points}
          fill="none"
          stroke={stock.changePercent >= 0 ? '#00ff88' : '#ff3366'}
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="sm-container">
        <div className="sm-header">
          <button className="sm-back-btn" onClick={onBack}>← Back</button>
          <div className="sm-title">
            <h1>SHADOW<span>EXCHANGE</span></h1>
          </div>
        </div>
        <div className="sm-loading">
          <div className="sm-loading-spinner"></div>
          <p>Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sm-container">
      {/* Header */}
      <div className="sm-header">
        <button className="sm-back-btn" onClick={onBack}>
          ← Back
        </button>
        <div className="sm-title">
          <h1>SHADOW<span>EXCHANGE</span></h1>
          <div className="sm-market-status">
            <span className="sm-status-dot"></span>
            <span>Market Open</span>
          </div>
        </div>
        <div className="sm-balance">
          <span className="sm-balance-label">CASH</span>
          <span className="sm-balance-amount">${player.cash?.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* Event Banner */}
      {currentEvent && (
        <div className={`sm-event-banner ${currentEvent.type}`}>
          <span className="sm-event-icon">{currentEvent.icon}</span>
          <div>
            <div className="sm-event-name">{currentEvent.name}</div>
            <div className="sm-event-desc">{currentEvent.description}</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="sm-nav">
        <button 
          className={`sm-nav-tab ${activeTab === 'market' ? 'active' : ''}`}
          onClick={() => setActiveTab('market')}
        >
          Market
        </button>
        <button 
          className={`sm-nav-tab ${activeTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setActiveTab('portfolio')}
        >
          Portfolio
        </button>
        <button 
          className={`sm-nav-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button 
          className={`sm-nav-tab ${activeTab === 'news' ? 'active' : ''}`}
          onClick={() => setActiveTab('news')}
        >
          News
        </button>
      </div>

      {/* Market Tab */}
      {activeTab === 'market' && (
        <div className="sm-market-tab">
          <div className="sm-filters">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sm-select">
              <option value="symbol">Sort: Symbol</option>
              <option value="price">Sort: Price</option>
              <option value="change">Sort: Change</option>
              <option value="volume">Sort: Volume</option>
            </select>
            <select value={filterBy} onChange={e => setFilterBy(e.target.value)} className="sm-select">
              <option value="all">All Stocks</option>
              <option value="gainers">Top Gainers</option>
              <option value="losers">Top Losers</option>
              <option value="safe">Safe Stocks</option>
              <option value="risky">High Risk</option>
            </select>
          </div>

          <div className="sm-stock-list">
            <div className="sm-stock-row header">
              <div>Stock</div>
              <div>Price</div>
              <div>Change</div>
              <div className="hide-mobile">Volume</div>
              <div className="hide-mobile">Trend</div>
            </div>
            
            {getSortedStocks().map(stock => (
              <div 
                key={stock.symbol}
                className="sm-stock-row"
                onClick={() => setSelectedStock(stock.symbol)}
              >
                <div className="sm-stock-info">
                  <span className="sm-stock-symbol">{stock.symbol}</span>
                  <span className="sm-stock-name">{stock.name}</span>
                </div>
                <div className="sm-stock-price">${stock.price.toFixed(2)}</div>
                <div className={`sm-stock-change ${stock.changePercent >= 0 ? 'up' : 'down'}`}>
                  {stock.changePercent >= 0 ? '▲' : '▼'} {Math.abs(stock.changePercent).toFixed(2)}%
                </div>
                <div className="sm-stock-volume hide-mobile">{(stock.volume / 1000).toFixed(0)}K</div>
                <div className="sm-stock-chart hide-mobile">{renderMiniChart(stock)}</div>
              </div>
            ))}
          </div>

          {/* Holdings Sidebar */}
          <div className="sm-holdings-sidebar">
            <h3>Your Holdings</h3>
            {Object.keys(portfolio).length === 0 ? (
              <p className="sm-empty">No holdings yet</p>
            ) : (
              Object.entries(portfolio).map(([symbol, holding]) => {
                const stock = stocks.find(s => s.symbol === symbol);
                if (!stock) return null;
                
                const currentValue = holding.shares * stock.price;
                const profitLoss = currentValue - holding.totalCost;
                const plPercent = (profitLoss / holding.totalCost) * 100;
                
                return (
                  <div 
                    key={symbol} 
                    className="sm-holding-card"
                    onClick={() => setSelectedStock(symbol)}
                  >
                    <div className="sm-holding-header">
                      <span className="sm-holding-symbol">{symbol}</span>
                      <span className="sm-holding-shares">{holding.shares} shares</span>
                    </div>
                    <div className="sm-holding-details">
                      <span>${stock.price.toFixed(2)}</span>
                      <span className={profitLoss >= 0 ? 'profit' : 'loss'}>
                        {profitLoss >= 0 ? '+' : ''}{plPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Portfolio Tab */}
      {activeTab === 'portfolio' && (
        <div className="sm-portfolio-tab">
          <div className="sm-portfolio-stats">
            <div className="sm-stat-card">
              <div className="sm-stat-value">${(getPortfolioValue() + player.cash).toLocaleString()}</div>
              <div className="sm-stat-label">Total Value</div>
            </div>
            <div className="sm-stat-card">
              <div className="sm-stat-value">${getPortfolioValue().toLocaleString()}</div>
              <div className="sm-stat-label">Portfolio Value</div>
            </div>
            <div className="sm-stat-card">
              <div className="sm-stat-value">${player.cash?.toLocaleString() || 0}</div>
              <div className="sm-stat-label">Cash Available</div>
            </div>
          </div>

          <div className="sm-holdings-detail">
            <h3>Holdings Detail</h3>
            {Object.keys(portfolio).length === 0 ? (
              <p className="sm-empty">No holdings in portfolio</p>
            ) : (
              Object.entries(portfolio).map(([symbol, holding]) => {
                const stock = stocks.find(s => s.symbol === symbol);
                if (!stock) return null;
                
                const currentValue = holding.shares * stock.price;
                const profitLoss = currentValue - holding.totalCost;
                const plPercent = (profitLoss / holding.totalCost) * 100;
                
                return (
                  <div key={symbol} className="sm-holding-detail-card">
                    <div className="sm-holding-detail-header">
                      <div>
                        <span className="sm-holding-symbol">{symbol}</span>
                        <span className="sm-holding-name">{stock.name}</span>
                      </div>
                      <button 
                        className="sm-trade-btn"
                        onClick={() => {
                          setSelectedStock(symbol);
                          setTradeMode('sell');
                        }}
                      >
                        Trade
                      </button>
                    </div>
                    <div className="sm-holding-detail-grid">
                      <div>
                        <span className="label">Shares</span>
                        <span className="value">{holding.shares}</span>
                      </div>
                      <div>
                        <span className="label">Avg Cost</span>
                        <span className="value">${holding.avgCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="label">Current Value</span>
                        <span className="value">${currentValue.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="label">Profit/Loss</span>
                        <span className={`value ${profitLoss >= 0 ? 'profit' : 'loss'}`}>
                          {profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)} ({plPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="sm-history-tab">
          <h3>Transaction History</h3>
          {transactions.length === 0 ? (
            <p className="sm-empty">No transactions yet</p>
          ) : (
            <div className="sm-transaction-list">
              {transactions.map((tx, i) => (
                <div key={i} className="sm-transaction-row">
                  <div className="sm-tx-time">{new Date(tx.time).toLocaleTimeString()}</div>
                  <div className={`sm-tx-action ${tx.action}`}>{tx.action.toUpperCase()}</div>
                  <div className="sm-tx-symbol">{tx.symbol}</div>
                  <div className="sm-tx-details">{tx.shares} @ ${tx.price.toFixed(2)}</div>
                  <div className="sm-tx-total">${tx.total.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* News Tab */}
      {activeTab === 'news' && (
        <div className="sm-news-tab">
          <h3>Market News & Events</h3>
          {news.length === 0 ? (
            <p className="sm-empty">No news yet...</p>
          ) : (
            <div className="sm-news-list">
              {news.map((item, i) => (
                <div key={i} className={`sm-news-item ${item.type}`}>
                  <div className="sm-news-time">
                    {new Date(item.time).toLocaleTimeString()}
                    {item.stock && ` • ${item.stock}`}
                  </div>
                  <div className="sm-news-headline">{item.headline}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trade Modal */}
      {selectedStock && (
        <div className="sm-modal-overlay" onClick={() => setSelectedStock(null)}>
          <div className="sm-modal" onClick={e => e.stopPropagation()}>
            {(() => {
              const stock = stocks.find(s => s.symbol === selectedStock);
              if (!stock) return null;
              
              const holding = portfolio[selectedStock];
              const subtotal = stock.price * tradeShares;
              const fee = calculateFee(subtotal);
              const total = tradeMode === 'buy' ? subtotal + fee : subtotal - fee;
              
              return (
                <>
                  <div className="sm-modal-header">
                    <div>
                      <h2>
                        <span className="symbol">{stock.symbol}</span>
                        <span className="name">{stock.name}</span>
                      </h2>
                      <div className="sector">{stock.sector}</div>
                    </div>
                    <button className="sm-close-btn" onClick={() => setSelectedStock(null)}>×</button>
                  </div>

                  <div className="sm-modal-price">
                    <div className="price">${stock.price.toFixed(2)}</div>
                    <div className={`change ${stock.changePercent >= 0 ? 'up' : 'down'}`}>
                      {stock.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(stock.change).toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                    </div>
                  </div>

                  <div className="sm-modal-stats">
                    <div>
                      <span className="label">Day Range</span>
                      <span className="value">${stock.dayLow.toFixed(2)} - ${stock.dayHigh.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="label">Volume</span>
                      <span className="value">{stock.volume.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="label">Risk</span>
                      <span className={`value risk-${stock.riskLevel}`}>{stock.riskLevel}</span>
                    </div>
                    {holding && (
                      <div>
                        <span className="label">You Own</span>
                        <span className="value">{holding.shares} shares</span>
                      </div>
                    )}
                  </div>

                  <div className="sm-trade-panel">
                    <div className="sm-trade-tabs">
                      <button 
                        className={`sm-trade-tab ${tradeMode === 'buy' ? 'active-buy' : ''}`}
                        onClick={() => setTradeMode('buy')}
                      >
                        Buy
                      </button>
                      <button 
                        className={`sm-trade-tab ${tradeMode === 'sell' ? 'active-sell' : ''}`}
                        onClick={() => setTradeMode('sell')}
                        disabled={!holding}
                      >
                        Sell
                      </button>
                    </div>

                    <div className="sm-trade-input">
                      <label>Shares</label>
                      <input 
                        type="number" 
                        min="1"
                        max={tradeMode === 'sell' && holding ? holding.shares : undefined}
                        value={tradeShares}
                        onChange={e => setTradeShares(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>

                    <div className="sm-trade-summary">
                      <div className="row">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="row">
                        <span>Fee (0.5%)</span>
                        <span>${fee.toFixed(2)}</span>
                      </div>
                      <div className="row total">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <button 
                      className={`sm-execute-btn ${tradeMode}`}
                      onClick={() => {
                        if (tradeMode === 'buy') {
                          executeBuy(selectedStock, tradeShares);
                        } else {
                          executeSell(selectedStock, tradeShares);
                        }
                      }}
                      disabled={
                        isProcessing ||
                        (tradeMode === 'buy' && total > player.cash) ||
                        (tradeMode === 'sell' && (!holding || tradeShares > holding.shares))
                      }
                    >
                      {tradeMode === 'buy' ? 'Buy' : 'Sell'} {tradeShares} Shares
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`sm-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
