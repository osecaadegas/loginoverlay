import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { SidePanel, PanelSection, PanelButton, PanelButtonGroup } from '../components/SidePanel';
import './TheLifeStockMarket.css';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  transactionFeePercent: 0.5,
  priceUpdateInterval: 30000, // 30 seconds - real crypto API refresh
  newsInterval: 60000, // 1 minute
  eventInterval: 300000, // 5 minutes
  chartHistoryLength: 50,
  minStockPrice: 0.01,
  maxStockPrice: 100000
};

// ============================================
// CRYPTO MAPPING - Maps game stocks to real cryptocurrencies
// Using CoinGecko API IDs
// ============================================
const CRYPTO_MAPPING = {
  'SHAD': { cryptoId: 'bitcoin', priceMultiplier: 0.0015 }, // BTC ~$100k -> ~$150
  'GHOST': { cryptoId: 'ethereum', priceMultiplier: 0.025 }, // ETH ~$3.5k -> ~$87
  'VNDR': { cryptoId: 'solana', priceMultiplier: 1.0 }, // SOL ~$230 -> ~$230
  'CRYPT': { cryptoId: 'ripple', priceMultiplier: 180 }, // XRP ~$2.5 -> ~$450
  'NITE': { cryptoId: 'dogecoin', priceMultiplier: 200 }, // DOGE ~$0.35 -> ~$70
  'SYNTH': { cryptoId: 'cardano', priceMultiplier: 300 }, // ADA ~$1 -> ~$300
  'SMUGL': { cryptoId: 'polkadot', priceMultiplier: 15 }, // DOT ~$8 -> ~$120
  'HIEST': { cryptoId: 'avalanche-2', priceMultiplier: 2 }, // AVAX ~$40 -> ~$80
  'FORGE': { cryptoId: 'chainlink', priceMultiplier: 4 }, // LINK ~$25 -> ~$100
  'BYTE': { cryptoId: 'litecoin', priceMultiplier: 2.5 }, // LTC ~$110 -> ~$275
  'CARTEL': { cryptoId: 'binancecoin', priceMultiplier: 0.75 } // BNB ~$700 -> ~$525
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

  // Generate initial price history based on current price
  const generateInitialHistory = (currentPrice) => {
    const history = [];
    let price = currentPrice;
    
    // Generate backward from current price with small variations
    for (let i = 0; i < CONFIG.chartHistoryLength; i++) {
      history.unshift({
        price,
        time: Date.now() - i * CONFIG.priceUpdateInterval
      });
      // Small random walk backward
      price = price * (1 + (Math.random() - 0.5) * 0.01);
    }
    
    return history;
  };

  // Fetch real crypto prices from CoinGecko API
  const fetchCryptoPrices = async () => {
    try {
      const cryptoIds = Object.values(CRYPTO_MAPPING).map(m => m.cryptoId).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch crypto prices');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      return null;
    }
  };

  // Initialize stocks with real crypto data
  const initializeStocks = useCallback(async () => {
    const cryptoData = await fetchCryptoPrices();
    
    const initialStocks = STOCKS_DATA.map(stock => {
      const mapping = CRYPTO_MAPPING[stock.symbol];
      let price = stock.basePrice;
      let changePercent = 0;
      let volume = Math.floor(Math.random() * 1000000) + 100000;
      
      // Use real crypto data if available
      if (cryptoData && mapping && cryptoData[mapping.cryptoId]) {
        const cryptoInfo = cryptoData[mapping.cryptoId];
        price = cryptoInfo.usd * mapping.priceMultiplier;
        changePercent = cryptoInfo.usd_24h_change || 0;
        volume = Math.floor((cryptoInfo.usd_24h_vol || 1000000) / 10000);
      }
      
      return {
        ...stock,
        price: Math.round(price * 100) / 100,
        previousPrice: price,
        dayOpen: price,
        dayHigh: price,
        dayLow: price,
        change: 0,
        changePercent: Math.round(changePercent * 100) / 100,
        volume,
        priceHistory: generateInitialHistory(price)
      };
    });
    
    setStocks(initialStocks);
  }, []);

  // Update prices from real crypto API
  const updatePrices = useCallback(async () => {
    const cryptoData = await fetchCryptoPrices();
    if (!cryptoData) return;
    
    setStocks(prevStocks => prevStocks.map(stock => {
      const mapping = CRYPTO_MAPPING[stock.symbol];
      if (!mapping || !cryptoData[mapping.cryptoId]) {
        return stock;
      }
      
      const cryptoInfo = cryptoData[mapping.cryptoId];
      const newPrice = Math.round(cryptoInfo.usd * mapping.priceMultiplier * 100) / 100;
      const changePercent = Math.round((cryptoInfo.usd_24h_change || 0) * 100) / 100;
      const volume = Math.floor((cryptoInfo.usd_24h_vol || 1000000) / 10000);
      
      const newStock = {
        ...stock,
        previousPrice: stock.price,
        price: newPrice,
        change: newPrice - stock.price,
        changePercent,
        dayHigh: Math.max(stock.dayHigh, newPrice),
        dayLow: Math.min(stock.dayLow, newPrice),
        volume,
        priceHistory: [...stock.priceHistory.slice(-CONFIG.chartHistoryLength + 1), {
          price: newPrice,
          time: Date.now()
        }]
      };
      
      return newStock;
    }));
  }, []);

  // Generate news
  const generateNews = useCallback(() => {
    setStocks(prevStocks => {
      if (prevStocks.length === 0) return prevStocks;
      
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
    
    // Round to 2 decimal places for numeric column
    const roundedCash = Math.round(newCash * 100) / 100;
    
    try {
      const { data, error } = await supabase
        .from('the_life_players')
        .update({ cash: roundedCash, updated_at: new Date().toISOString() })
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
      
      setPlayer(prev => ({ ...prev, cash: roundedCash }));
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

      {/* Trade Side Panel */}
      <SidePanel
        isOpen={!!selectedStock}
        onClose={() => setSelectedStock(null)}
        title={(() => {
          const stock = stocks.find(s => s.symbol === selectedStock);
          return stock ? stock.symbol : '';
        })()}
        subtitle={(() => {
          const stock = stocks.find(s => s.symbol === selectedStock);
          return stock ? stock.name : '';
        })()}
        width="420px"
        footer={
          <PanelButtonGroup>
            <PanelButton variant="secondary" onClick={() => setSelectedStock(null)}>
              Cancel
            </PanelButton>
            <PanelButton 
              variant={tradeMode === 'buy' ? 'primary' : 'sell'}
              onClick={() => {
                if (tradeMode === 'buy') {
                  executeBuy(selectedStock, tradeShares);
                } else {
                  executeSell(selectedStock, tradeShares);
                }
              }}
              disabled={
                isProcessing ||
                (tradeMode === 'buy' && (() => {
                  const stock = stocks.find(s => s.symbol === selectedStock);
                  if (!stock) return true;
                  const subtotal = stock.price * tradeShares;
                  const fee = calculateFee(subtotal);
                  return subtotal + fee > player.cash;
                })()) ||
                (tradeMode === 'sell' && (() => {
                  const holding = portfolio[selectedStock];
                  return !holding || tradeShares > holding.shares;
                })())
              }
            >
              {tradeMode === 'buy' ? 'Buy' : 'Sell'} {tradeShares} Shares
            </PanelButton>
          </PanelButtonGroup>
        }
      >
        {(() => {
          const stock = stocks.find(s => s.symbol === selectedStock);
          if (!stock) return null;
          
          const holding = portfolio[selectedStock];
          const subtotal = stock.price * tradeShares;
          const fee = calculateFee(subtotal);
          const total = tradeMode === 'buy' ? subtotal + fee : subtotal - fee;
          
          return (
            <>
              <PanelSection title="Current Price">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ffffff' }}>${stock.price.toFixed(2)}</div>
                    <div style={{ fontSize: '0.85rem', color: stock.changePercent >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
                      {stock.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(stock.change).toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', fontSize: '0.8rem', color: '#8a8d96' }}>
                    {stock.sector}
                  </div>
                </div>
              </PanelSection>

              <PanelSection title="Stock Info">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8a8d96', marginBottom: '4px' }}>Day Range</div>
                    <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.9rem' }}>${stock.dayLow.toFixed(2)} - ${stock.dayHigh.toFixed(2)}</div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8a8d96', marginBottom: '4px' }}>Volume</div>
                    <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.9rem' }}>{stock.volume.toLocaleString()}</div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8a8d96', marginBottom: '4px' }}>Risk Level</div>
                    <div style={{ color: stock.riskLevel === 'high' ? '#ef4444' : stock.riskLevel === 'medium' ? '#f59e0b' : '#22c55e', fontWeight: '600', fontSize: '0.9rem', textTransform: 'capitalize' }}>{stock.riskLevel}</div>
                  </div>
                  {holding && (
                    <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8a8d96', marginBottom: '4px' }}>You Own</div>
                      <div style={{ color: '#d4af37', fontWeight: '600', fontSize: '0.9rem' }}>{holding.shares} shares</div>
                    </div>
                  )}
                </div>
              </PanelSection>

              <PanelSection title="Trade">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button 
                    onClick={() => setTradeMode('buy')}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: tradeMode === 'buy' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(0, 0, 0, 0.4)',
                      border: tradeMode === 'buy' ? '2px solid #22c55e' : '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '10px',
                      color: tradeMode === 'buy' ? '#22c55e' : '#8a8d96',
                      fontWeight: '700',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >Buy</button>
                  <button 
                    onClick={() => setTradeMode('sell')}
                    disabled={!holding}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: tradeMode === 'sell' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 0, 0, 0.4)',
                      border: tradeMode === 'sell' ? '2px solid #ef4444' : '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '10px',
                      color: tradeMode === 'sell' ? '#ef4444' : '#8a8d96',
                      fontWeight: '700',
                      fontSize: '1rem',
                      cursor: holding ? 'pointer' : 'not-allowed',
                      opacity: holding ? 1 : 0.5,
                      transition: 'all 0.15s ease'
                    }}
                  >Sell</button>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#8a8d96', fontSize: '0.8rem', marginBottom: '8px' }}>Shares</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '10px', height: '52px' }}>
                    <button
                      onClick={() => setTradeShares(Math.max(1, tradeShares - 1))}
                      style={{ width: '52px', height: '100%', background: 'transparent', border: 'none', color: '#d4af37', fontSize: '1.5rem', cursor: 'pointer' }}
                    >-</button>
                    <input 
                      type="number" 
                      min="1"
                      max={tradeMode === 'sell' && holding ? holding.shares : undefined}
                      value={tradeShares}
                      onChange={e => setTradeShares(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ flex: 1, background: 'transparent', border: 'none', color: '#ffffff', fontSize: '1.3rem', fontWeight: '700', textAlign: 'center', padding: 0 }}
                    />
                    <button
                      onClick={() => setTradeShares(tradeShares + 1)}
                      style={{ width: '52px', height: '100%', background: 'transparent', border: 'none', color: '#d4af37', fontSize: '1.5rem', cursor: 'pointer' }}
                    >+</button>
                  </div>

                  {/* Quick amount buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {[1, 5, 10, 25, 100].map(amount => (
                      <button
                        key={amount}
                        onClick={() => setTradeShares(amount)}
                        style={{
                          flex: 1,
                          padding: '8px 4px',
                          background: tradeShares === amount ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0, 0, 0, 0.4)',
                          border: tradeShares === amount ? '1px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(212, 175, 55, 0.2)',
                          borderRadius: '6px',
                          color: tradeShares === amount ? '#d4af37' : '#8a8d96',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >{amount}</button>
                    ))}
                  </div>
                </div>
              </PanelSection>

              <PanelSection title="Order Summary">
                <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(212, 175, 55, 0.15)' }}>
                    <span style={{ color: '#8a8d96' }}>Subtotal</span>
                    <span style={{ color: '#ffffff' }}>${subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(212, 175, 55, 0.15)' }}>
                    <span style={{ color: '#8a8d96' }}>Fee (0.5%)</span>
                    <span style={{ color: '#f59e0b' }}>-${fee.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(0, 0, 0, 0.3)' }}>
                    <span style={{ color: '#ffffff', fontWeight: '700' }}>Total</span>
                    <span style={{ color: tradeMode === 'buy' ? '#ef4444' : '#22c55e', fontWeight: '700', fontSize: '1.1rem' }}>${total.toFixed(2)}</span>
                  </div>
                </div>

                {tradeMode === 'buy' && total > player.cash && (
                  <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '10px', textAlign: 'center' }}>⚠️ Insufficient funds (Balance: ${player.cash?.toLocaleString()})</p>
                )}
              </PanelSection>
            </>
          );
        })()}
      </SidePanel>

      {/* Toast */}
      {toast && (
        <div className={`sm-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
