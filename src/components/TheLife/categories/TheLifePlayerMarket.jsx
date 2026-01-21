import '../styles/TheLifePlayerMarket.css';
import { supabase } from '../../../config/supabaseClient';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

/**
 * Player Market / Trading Hub
 * A peer-to-peer marketplace for players to buy, sell, and trade items
 */
export default function TheLifePlayerMarket({ 
  player,
  setPlayer,
  theLifeInventory,
  setMessage,
  loadTheLifeInventory,
  showEventMessage,
  user
}) {
  const { language } = useLanguage();
  const isPt = language === 'pt';
  
  // Tab state
  const [activeTab, setActiveTab] = useState('buy');
  
  // Listings state
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [tradeOffers, setTradeOffers] = useState([]);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  
  // Modal state
  const [showListModal, setShowListModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  
  // Listing form state
  const [listPrice, setListPrice] = useState('');
  const [listQuantity, setListQuantity] = useState(1);
  const [listDuration, setListDuration] = useState('24');
  
  // Trade form state
  const [tradeItems, setTradeItems] = useState([]);
  const [tradeCash, setTradeCash] = useState('');
  const [tradeMessage, setTradeMessage] = useState('');

  // Categories for filtering
  const categories = [
    { key: 'all', label: isPt ? 'Todos' : 'All' },
    { key: 'weapons', label: isPt ? 'Armas' : 'Weapons' },
    { key: 'tools', label: isPt ? 'Ferramentas' : 'Tools' },
    { key: 'consumables', label: isPt ? 'Consumíveis' : 'Consumables' },
    { key: 'materials', label: isPt ? 'Materiais' : 'Materials' },
    { key: 'special', label: isPt ? 'Especiais' : 'Special' },
  ];

  // Rarities
  const rarities = [
    { key: 'all', label: isPt ? 'Todas' : 'All', color: '#8a8d96' },
    { key: 'common', label: isPt ? 'Comum' : 'Common', color: '#9ca3af' },
    { key: 'uncommon', label: isPt ? 'Incomum' : 'Uncommon', color: '#22c55e' },
    { key: 'rare', label: isPt ? 'Raro' : 'Rare', color: '#3b82f6' },
    { key: 'epic', label: isPt ? 'Épico' : 'Epic', color: '#a855f7' },
    { key: 'legendary', label: isPt ? 'Lendário' : 'Legendary', color: '#f59e0b' },
  ];

  // Load listings
  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('the_life_market_listings')
        .select(`
          *,
          item:the_life_items(*),
          seller:the_life_players(id, se_username, twitch_username, level, last_active)
        `)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: sortBy !== 'newest' });

      // Price filters on main table
      if (priceMin) {
        query = query.gte('price', parseInt(priceMin));
      }
      if (priceMax) {
        query = query.lte('price', parseInt(priceMax));
      }

      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      console.log('Raw listings data:', data);
      
      // Filter out listings where item is null (foreign key issue)
      let filteredData = (data || []).filter(l => l.item !== null);
      
      console.log('After item null filter:', filteredData.length);
      
      // Client-side category filter
      if (categoryFilter !== 'all') {
        filteredData = filteredData.filter(l => l.item?.category === categoryFilter);
      }
      
      // Client-side rarity filter
      if (rarityFilter !== 'all') {
        filteredData = filteredData.filter(l => l.item?.rarity === rarityFilter);
      }
      
      // Client-side search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        filteredData = filteredData.filter(l => 
          l.item?.name?.toLowerCase().includes(search) ||
          l.seller?.se_username?.toLowerCase().includes(search) ||
          l.seller?.twitch_username?.toLowerCase().includes(search)
        );
      }
      
      // Online only filter (last active within 5 minutes)
      if (onlineOnly) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        filteredData = filteredData.filter(l => l.seller?.last_active >= fiveMinutesAgo);
      }
      
      // Sort
      if (sortBy === 'price-low') {
        filteredData.sort((a, b) => a.price - b.price);
      } else if (sortBy === 'price-high') {
        filteredData.sort((a, b) => b.price - a.price);
      }
      
      setListings(filteredData);
    } catch (err) {
      console.error('Error loading listings:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, rarityFilter, priceMin, priceMax, onlineOnly, sortBy]);

  // Load my listings
  const loadMyListings = useCallback(async () => {
    if (!player?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('the_life_market_listings')
        .select(`
          *,
          item:the_life_items(*)
        `)
        .eq('seller_id', player.id)
        .in('status', ['active', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyListings(data || []);
    } catch (err) {
      console.error('Error loading my listings:', err);
    }
  }, [player?.id]);

  // Load trade offers
  const loadTradeOffers = useCallback(async () => {
    if (!player?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('the_life_trade_offers')
        .select(`
          *,
          listing:the_life_market_listings(*, item:the_life_items(*)),
          sender:the_life_players!sender_id(id, se_username, twitch_username, level),
          receiver:the_life_players!receiver_id(id, se_username, twitch_username, level)
        `)
        .or(`sender_id.eq.${player.id},receiver_id.eq.${player.id}`)
        .in('status', ['pending', 'countered'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTradeOffers(data || []);
    } catch (err) {
      console.error('Error loading trade offers:', err);
    }
  }, [player?.id]);

  // Load transaction history
  const loadTransactionHistory = useCallback(async () => {
    if (!player?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('the_life_market_transactions')
        .select(`
          *,
          item:the_life_items(*),
          buyer:the_life_players!buyer_id(se_username, twitch_username),
          seller:the_life_players!seller_id(se_username, twitch_username)
        `)
        .or(`buyer_id.eq.${player.id},seller_id.eq.${player.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactionHistory(data || []);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  }, [player?.id]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'buy') {
      loadListings();
    } else if (activeTab === 'sell') {
      loadTheLifeInventory?.();
    } else if (activeTab === 'mylistings') {
      loadMyListings();
    } else if (activeTab === 'trades') {
      loadTradeOffers();
      loadTransactionHistory();
    }
  }, [activeTab, loadListings, loadMyListings, loadTradeOffers, loadTransactionHistory]);

  // Buy item from listing
  const buyItem = async (listing) => {
    if (!player || !listing) return;
    
    const totalCost = listing.price * listing.quantity;
    
    if (player.cash < totalCost) {
      setMessage({ type: 'error', text: isPt ? 'Dinheiro insuficiente!' : 'Not enough cash!' });
      return;
    }

    try {
      // Start transaction
      const { error: buyerError } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - totalCost })
        .eq('id', player.id);

      if (buyerError) throw buyerError;

      // Add cash to seller
      const { error: sellerError } = await supabase.rpc('add_player_cash', {
        p_player_id: listing.seller_id,
        p_amount: totalCost
      });

      if (sellerError) throw sellerError;

      // Add item to buyer inventory
      const { data: existingItem } = await supabase
        .from('the_life_player_inventory')
        .select('*')
        .eq('player_id', player.id)
        .eq('item_id', listing.item_id)
        .single();

      if (existingItem) {
        await supabase
          .from('the_life_player_inventory')
          .update({ quantity: existingItem.quantity + listing.quantity })
          .eq('id', existingItem.id);
      } else {
        await supabase
          .from('the_life_player_inventory')
          .insert({
            player_id: player.id,
            item_id: listing.item_id,
            quantity: listing.quantity
          });
      }

      // Update listing status
      await supabase
        .from('the_life_market_listings')
        .update({ status: 'sold', sold_at: new Date().toISOString() })
        .eq('id', listing.id);

      // Record transaction
      await supabase
        .from('the_life_market_transactions')
        .insert({
          listing_id: listing.id,
          item_id: listing.item_id,
          buyer_id: player.id,
          seller_id: listing.seller_id,
          price: listing.price,
          quantity: listing.quantity,
          total_amount: totalCost
        });

      // Update local state
      setPlayer(prev => ({ ...prev, cash: prev.cash - totalCost }));
      showEventMessage?.(isPt ? `Comprou ${listing.item?.name} por $${totalCost.toLocaleString()}!` : `Bought ${listing.item?.name} for $${totalCost.toLocaleString()}!`, 'success');
      loadListings();
      loadTheLifeInventory?.();
    } catch (err) {
      console.error('Error buying item:', err);
      setMessage({ type: 'error', text: isPt ? 'Erro ao comprar item!' : 'Error buying item!' });
    }
  };

  // List item for sale
  const listItem = async () => {
    if (!selectedItem || !listPrice || listQuantity < 1) {
      setMessage({ type: 'error', text: isPt ? 'Preencha todos os campos!' : 'Fill in all fields!' });
      return;
    }

    const price = parseInt(listPrice);
    if (price < 1) {
      setMessage({ type: 'error', text: isPt ? 'Preço deve ser maior que 0!' : 'Price must be greater than 0!' });
      return;
    }

    if (listQuantity > selectedItem.quantity) {
      setMessage({ type: 'error', text: isPt ? 'Quantidade insuficiente!' : 'Insufficient quantity!' });
      return;
    }

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(listDuration));

      // Create listing
      const { error: listingError } = await supabase
        .from('the_life_market_listings')
        .insert({
          seller_id: player.id,
          item_id: selectedItem.item_id,
          price: price,
          quantity: listQuantity,
          expires_at: expiresAt.toISOString(),
          status: 'active'
        });

      if (listingError) throw listingError;

      // Remove from inventory
      if (listQuantity >= selectedItem.quantity) {
        await supabase
          .from('the_life_player_inventory')
          .delete()
          .eq('id', selectedItem.id);
      } else {
        await supabase
          .from('the_life_player_inventory')
          .update({ quantity: selectedItem.quantity - listQuantity })
          .eq('id', selectedItem.id);
      }

      showEventMessage?.(isPt ? `${selectedItem.item?.name} listado por $${price.toLocaleString()}!` : `Listed ${selectedItem.item?.name} for $${price.toLocaleString()}!`, 'success');
      setShowListModal(false);
      setSelectedItem(null);
      setListPrice('');
      setListQuantity(1);
      loadTheLifeInventory?.();
      loadMyListings();
    } catch (err) {
      console.error('Error listing item:', err);
      setMessage({ type: 'error', text: isPt ? 'Erro ao listar item!' : 'Error listing item!' });
    }
  };

  // Cancel listing
  const cancelListing = async (listing) => {
    try {
      // Return item to inventory
      const { data: existingItem } = await supabase
        .from('the_life_player_inventory')
        .select('*')
        .eq('player_id', player.id)
        .eq('item_id', listing.item_id)
        .single();

      if (existingItem) {
        await supabase
          .from('the_life_player_inventory')
          .update({ quantity: existingItem.quantity + listing.quantity })
          .eq('id', existingItem.id);
      } else {
        await supabase
          .from('the_life_player_inventory')
          .insert({
            player_id: player.id,
            item_id: listing.item_id,
            quantity: listing.quantity
          });
      }

      // Update listing status
      await supabase
        .from('the_life_market_listings')
        .update({ status: 'cancelled' })
        .eq('id', listing.id);

      showEventMessage?.(isPt ? 'Listagem cancelada!' : 'Listing cancelled!', 'info');
      loadMyListings();
      loadTheLifeInventory?.();
    } catch (err) {
      console.error('Error cancelling listing:', err);
      setMessage({ type: 'error', text: isPt ? 'Erro ao cancelar!' : 'Error cancelling!' });
    }
  };

  // Send trade offer
  const sendTradeOffer = async () => {
    if (!selectedListing) return;

    const cashOffer = parseInt(tradeCash) || 0;
    
    if (cashOffer > player.cash) {
      setMessage({ type: 'error', text: isPt ? 'Dinheiro insuficiente!' : 'Not enough cash!' });
      return;
    }

    try {
      const { error } = await supabase
        .from('the_life_trade_offers')
        .insert({
          listing_id: selectedListing.id,
          sender_id: player.id,
          receiver_id: selectedListing.seller_id,
          offered_items: tradeItems.map(i => ({ item_id: i.item_id, quantity: i.quantity })),
          offered_cash: cashOffer,
          message: tradeMessage,
          status: 'pending'
        });

      if (error) throw error;

      showEventMessage?.(isPt ? 'Oferta enviada!' : 'Offer sent!', 'success');
      setShowTradeModal(false);
      setSelectedListing(null);
      setTradeItems([]);
      setTradeCash('');
      setTradeMessage('');
    } catch (err) {
      console.error('Error sending trade offer:', err);
      setMessage({ type: 'error', text: isPt ? 'Erro ao enviar oferta!' : 'Error sending offer!' });
    }
  };

  // Accept trade offer
  const acceptTradeOffer = async (offer) => {
    try {
      // Complex trade logic would go here
      // For now, just update the status
      await supabase
        .from('the_life_trade_offers')
        .update({ status: 'accepted' })
        .eq('id', offer.id);

      showEventMessage?.(isPt ? 'Oferta aceita!' : 'Offer accepted!', 'success');
      loadTradeOffers();
    } catch (err) {
      console.error('Error accepting offer:', err);
    }
  };

  // Decline trade offer
  const declineTradeOffer = async (offer) => {
    try {
      await supabase
        .from('the_life_trade_offers')
        .update({ status: 'declined' })
        .eq('id', offer.id);

      showEventMessage?.(isPt ? 'Oferta recusada!' : 'Offer declined!', 'info');
      loadTradeOffers();
    } catch (err) {
      console.error('Error declining offer:', err);
    }
  };

  // Get rarity color
  const getRarityColor = (rarity) => {
    const found = rarities.find(r => r.key === rarity);
    return found?.color || '#9ca3af';
  };

  // Helper function to render item icon (handles both emoji and base64 images)
  const renderItemIcon = (icon, name = 'Item', size = 'medium') => {
    if (!icon) return <span className="fallback-icon">📦</span>;
    
    // Check if it's a base64 image
    if (icon.startsWith('data:image') || icon.length > 50) {
      const src = icon.startsWith('data:image') ? icon : `data:image/png;base64,${icon}`;
      const sizeClass = size === 'large' ? 'icon-large' : size === 'small' ? 'icon-small' : 'icon-medium';
      return <img src={src} alt={name} className={`item-icon-img ${sizeClass}`} />;
    }
    
    // It's an emoji or short text
    return <span className="emoji-icon">{icon}</span>;
  };

  // Get seller name
  const getSellerName = (seller) => {
    return seller?.se_username || seller?.twitch_username || (isPt ? 'Anônimo' : 'Anonymous');
  };

  // Format time remaining
  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    
    if (diff <= 0) return isPt ? 'Expirado' : 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}${isPt ? 'd' : 'd'}`;
    }
    return `${hours}h ${minutes}m`;
  };

  // Render tabs
  const tabs = [
    { key: 'buy', label: isPt ? 'Comprar' : 'Buy', icon: '🛒' },
    { key: 'sell', label: isPt ? 'Vender' : 'Sell', icon: '💰' },
    { key: 'mylistings', label: isPt ? 'Minhas Listagens' : 'My Listings', icon: '📋' },
    { key: 'trades', label: isPt ? 'Ofertas' : 'Trade Offers', icon: '🤝' },
  ];

  return (
    <div className="player-market">
      {/* Header with balance */}
      <div className="market-header">
        <div className="market-title">
          <span className="market-icon">🏪</span>
          <h2>{isPt ? 'Mercado de Jogadores' : 'Player Market'}</h2>
        </div>
        <div className="market-balance">
          <span className="balance-label">{isPt ? 'Saldo' : 'Balance'}</span>
          <span className="balance-amount">${player?.cash?.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="market-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`market-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.key === 'trades' && tradeOffers.length > 0 && (
              <span className="tab-badge">{tradeOffers.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Buy Tab */}
      {activeTab === 'buy' && (
        <div className="market-buy-section">
          {/* Search and filters */}
          <div className="market-filters">
            <div className="filter-row">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder={isPt ? 'Buscar itens ou vendedores...' : 'Search items or sellers...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="filter-refresh" onClick={loadListings} disabled={loading}>
                {loading ? '⏳' : '🔄'}
              </button>
            </div>
            
            <div className="filter-row filters-grid">
              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="filter-select"
              >
                {categories.map(cat => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
              
              <select 
                value={rarityFilter} 
                onChange={(e) => setRarityFilter(e.target.value)}
                className="filter-select"
              >
                {rarities.map(rar => (
                  <option key={rar.key} value={rar.key}>{rar.label}</option>
                ))}
              </select>
              
              <div className="price-range">
                <input
                  type="number"
                  placeholder={isPt ? 'Mín' : 'Min'}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder={isPt ? 'Máx' : 'Max'}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
              
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="newest">{isPt ? 'Mais Recentes' : 'Newest'}</option>
                <option value="price-low">{isPt ? 'Menor Preço' : 'Price: Low'}</option>
                <option value="price-high">{isPt ? 'Maior Preço' : 'Price: High'}</option>
              </select>
              
              <label className="online-toggle">
                <input
                  type="checkbox"
                  checked={onlineOnly}
                  onChange={(e) => setOnlineOnly(e.target.checked)}
                />
                <span>{isPt ? 'Online' : 'Online Only'}</span>
              </label>
            </div>
          </div>

          {/* Listings grid */}
          <div className="listings-grid">
            {loading ? (
              <div className="market-loading">
                <div className="loading-spinner"></div>
                <p>{isPt ? 'Carregando...' : 'Loading...'}</p>
              </div>
            ) : listings.length === 0 ? (
              <div className="market-empty">
                <span className="empty-icon">📦</span>
                <p>{isPt ? 'Nenhum item encontrado' : 'No items found'}</p>
              </div>
            ) : (
              listings.map(listing => (
                <div 
                  key={listing.id} 
                  className="listing-card"
                  style={{ '--rarity-color': getRarityColor(listing.item?.rarity) }}
                >
                  <div className="listing-header">
                    <span className="listing-rarity" style={{ color: getRarityColor(listing.item?.rarity) }}>
                      {listing.item?.rarity?.toUpperCase()}
                    </span>
                    <span className="listing-time">{formatTimeRemaining(listing.expires_at)}</span>
                  </div>
                  
                  <div className="listing-icon">
                    {renderItemIcon(listing.item?.icon, listing.item?.name, 'large')}
                    {listing.quantity > 1 && (
                      <span className="listing-quantity">x{listing.quantity}</span>
                    )}
                  </div>
                  
                  <div className="listing-info">
                    <h4 className="listing-name">{listing.item?.name}</h4>
                    <p className="listing-seller">
                      <span className="seller-icon">👤</span>
                      {getSellerName(listing.seller)}
                      {listing.seller?.last_active && new Date(listing.seller.last_active) > new Date(Date.now() - 5 * 60 * 1000) && (
                        <span className="online-dot" title={isPt ? 'Online' : 'Online'}></span>
                      )}
                    </p>
                  </div>
                  
                  <div className="listing-price">
                    <span className="price-amount">${listing.price.toLocaleString()}</span>
                    {listing.quantity > 1 && (
                      <span className="price-each">${Math.round(listing.price / listing.quantity).toLocaleString()}/{isPt ? 'un' : 'ea'}</span>
                    )}
                  </div>
                  
                  <div className="listing-actions">
                    <button 
                      className="btn-buy"
                      onClick={() => buyItem(listing)}
                      disabled={player?.cash < listing.price || listing.seller_id === player?.id}
                    >
                      {listing.seller_id === player?.id ? (isPt ? 'Seu Item' : 'Your Item') : (isPt ? 'Comprar' : 'Buy')}
                    </button>
                    <button 
                      className="btn-trade"
                      onClick={() => {
                        setSelectedListing(listing);
                        setShowTradeModal(true);
                      }}
                      disabled={listing.seller_id === player?.id}
                      title={isPt ? 'Fazer Oferta' : 'Make Offer'}
                    >
                      🤝
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sell Tab */}
      {activeTab === 'sell' && (
        <div className="market-sell-section">
          <div className="sell-header">
            <h3>{isPt ? 'Selecione um Item para Vender' : 'Select an Item to Sell'}</h3>
            <p>{isPt ? 'Arraste ou clique em um item do seu inventário' : 'Drag or click an item from your inventory'}</p>
          </div>
          
          <div className="inventory-grid">
            {theLifeInventory?.length === 0 ? (
              <div className="market-empty">
                <span className="empty-icon">🎒</span>
                <p>{isPt ? 'Inventário vazio' : 'Inventory empty'}</p>
              </div>
            ) : (
              theLifeInventory?.map(invItem => (
                <div
                  key={invItem.id}
                  className="inventory-item"
                  style={{ '--rarity-color': getRarityColor(invItem.item?.rarity) }}
                  onClick={() => {
                    setSelectedItem(invItem);
                    setShowListModal(true);
                  }}
                >
                  <div className="inv-item-icon">
                    {renderItemIcon(invItem.item?.icon, invItem.item?.name, 'medium')}
                    {invItem.quantity > 1 && (
                      <span className="inv-item-qty">x{invItem.quantity}</span>
                    )}
                  </div>
                  <p className="inv-item-name">{invItem.item?.name}</p>
                  <span className="inv-item-rarity" style={{ color: getRarityColor(invItem.item?.rarity) }}>
                    {invItem.item?.rarity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* My Listings Tab */}
      {activeTab === 'mylistings' && (
        <div className="market-mylistings-section">
          <div className="mylistings-header">
            <h3>{isPt ? 'Seus Itens à Venda' : 'Your Items for Sale'}</h3>
            <span className="listings-count">{myListings.length} {isPt ? 'ativos' : 'active'}</span>
          </div>
          
          {myListings.length === 0 ? (
            <div className="market-empty">
              <span className="empty-icon">📋</span>
              <p>{isPt ? 'Nenhuma listagem ativa' : 'No active listings'}</p>
              <button className="btn-primary" onClick={() => setActiveTab('sell')}>
                {isPt ? 'Listar Item' : 'List an Item'}
              </button>
            </div>
          ) : (
            <div className="mylistings-list">
              {myListings.map(listing => (
                <div key={listing.id} className="mylisting-card">
                  <div className="mylisting-item">
                    <span className="mylisting-icon">{renderItemIcon(listing.item?.icon, listing.item?.name, 'medium')}</span>
                    <div className="mylisting-details">
                      <h4>{listing.item?.name}</h4>
                      <p>x{listing.quantity}</p>
                    </div>
                  </div>
                  <div className="mylisting-price">
                    <span className="price-label">{isPt ? 'Preço' : 'Price'}</span>
                    <span className="price-value">${listing.price.toLocaleString()}</span>
                  </div>
                  <div className="mylisting-expires">
                    <span className="expires-label">{isPt ? 'Expira' : 'Expires'}</span>
                    <span className="expires-value">{formatTimeRemaining(listing.expires_at)}</span>
                  </div>
                  <button 
                    className="btn-cancel"
                    onClick={() => cancelListing(listing)}
                  >
                    {isPt ? 'Cancelar' : 'Cancel'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trade Offers Tab */}
      {activeTab === 'trades' && (
        <div className="market-trades-section">
          <div className="trades-tabs">
            <div className="trades-section">
              <h3>
                <span className="section-icon">📨</span>
                {isPt ? 'Ofertas Recebidas' : 'Received Offers'}
              </h3>
              {tradeOffers.filter(o => o.receiver_id === player?.id).length === 0 ? (
                <p className="no-trades">{isPt ? 'Nenhuma oferta recebida' : 'No offers received'}</p>
              ) : (
                tradeOffers.filter(o => o.receiver_id === player?.id).map(offer => (
                  <div key={offer.id} className="trade-offer-card">
                    <div className="offer-header">
                      <span className="offer-from">
                        {isPt ? 'De' : 'From'}: {getSellerName(offer.sender)}
                      </span>
                      <span className={`offer-status status-${offer.status}`}>{offer.status}</span>
                    </div>
                    <div className="offer-content">
                      <div className="offer-item">
                        {renderItemIcon(offer.listing?.item?.icon, offer.listing?.item?.name, 'small')}
                        <span>{offer.listing?.item?.name}</span>
                      </div>
                      <div className="offer-value">
                        {offer.offered_cash > 0 && <span className="offer-cash">${offer.offered_cash.toLocaleString()}</span>}
                        {offer.offered_items?.length > 0 && <span className="offer-items">+{offer.offered_items.length} {isPt ? 'itens' : 'items'}</span>}
                      </div>
                    </div>
                    {offer.message && <p className="offer-message">"{offer.message}"</p>}
                    <div className="offer-actions">
                      <button className="btn-accept" onClick={() => acceptTradeOffer(offer)}>
                        {isPt ? 'Aceitar' : 'Accept'}
                      </button>
                      <button className="btn-counter">
                        {isPt ? 'Contra-oferta' : 'Counter'}
                      </button>
                      <button className="btn-decline" onClick={() => declineTradeOffer(offer)}>
                        {isPt ? 'Recusar' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="trades-section">
              <h3>
                <span className="section-icon">📤</span>
                {isPt ? 'Ofertas Enviadas' : 'Sent Offers'}
              </h3>
              {tradeOffers.filter(o => o.sender_id === player?.id).length === 0 ? (
                <p className="no-trades">{isPt ? 'Nenhuma oferta enviada' : 'No offers sent'}</p>
              ) : (
                tradeOffers.filter(o => o.sender_id === player?.id).map(offer => (
                  <div key={offer.id} className="trade-offer-card sent">
                    <div className="offer-header">
                      <span className="offer-to">
                        {isPt ? 'Para' : 'To'}: {getSellerName(offer.receiver)}
                      </span>
                      <span className={`offer-status status-${offer.status}`}>{offer.status}</span>
                    </div>
                    <div className="offer-content">
                      <div className="offer-item">
                        {renderItemIcon(offer.listing?.item?.icon, offer.listing?.item?.name, 'small')}
                        <span>{offer.listing?.item?.name}</span>
                      </div>
                      <div className="offer-value">
                        {offer.offered_cash > 0 && <span className="offer-cash">${offer.offered_cash.toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Transaction History */}
          <div className="transaction-history">
            <h3>
              <span className="section-icon">📜</span>
              {isPt ? 'Histórico de Transações' : 'Transaction History'}
            </h3>
            {transactionHistory.length === 0 ? (
              <p className="no-history">{isPt ? 'Nenhuma transação ainda' : 'No transactions yet'}</p>
            ) : (
              <div className="history-list">
                {transactionHistory.map(tx => (
                  <div key={tx.id} className={`history-item ${tx.buyer_id === player?.id ? 'bought' : 'sold'}`}>
                    <span className="history-icon">{tx.buyer_id === player?.id ? '📥' : '📤'}</span>
                    <div className="history-details">
                      <span className="history-item-name">{tx.item?.name}</span>
                      <span className="history-with">
                        {tx.buyer_id === player?.id 
                          ? `${isPt ? 'de' : 'from'} ${getSellerName(tx.seller)}`
                          : `${isPt ? 'para' : 'to'} ${getSellerName(tx.buyer)}`
                        }
                      </span>
                    </div>
                    <span className={`history-amount ${tx.buyer_id === player?.id ? 'spent' : 'earned'}`}>
                      {tx.buyer_id === player?.id ? '-' : '+'}${tx.total_amount.toLocaleString()}
                    </span>
                    <span className="history-time">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* List Item Modal */}
      {showListModal && selectedItem && (
        <div className="market-modal-overlay" onClick={() => setShowListModal(false)}>
          <div className="market-modal list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isPt ? 'Listar Item' : 'List Item'}</h3>
              <button className="modal-close" onClick={() => setShowListModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="list-item-preview">
                <div className="preview-icon" style={{ '--rarity-color': getRarityColor(selectedItem.item?.rarity) }}>
                  {renderItemIcon(selectedItem.item?.icon, selectedItem.item?.name, 'large')}
                </div>
                <div className="preview-info">
                  <h4>{selectedItem.item?.name}</h4>
                  <p style={{ color: getRarityColor(selectedItem.item?.rarity) }}>
                    {selectedItem.item?.rarity}
                  </p>
                  <p className="preview-owned">{isPt ? 'Você tem' : 'You have'}: {selectedItem.quantity}</p>
                </div>
              </div>
              
              <div className="list-form">
                <div className="form-group">
                  <label>{isPt ? 'Quantidade' : 'Quantity'}</label>
                  <div className="quantity-input">
                    <button onClick={() => setListQuantity(Math.max(1, listQuantity - 1))}>-</button>
                    <input
                      type="number"
                      value={listQuantity}
                      onChange={(e) => setListQuantity(Math.min(selectedItem.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                      min="1"
                      max={selectedItem.quantity}
                    />
                    <button onClick={() => setListQuantity(Math.min(selectedItem.quantity, listQuantity + 1))}>+</button>
                    <button className="qty-max" onClick={() => setListQuantity(selectedItem.quantity)}>MAX</button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>{isPt ? 'Preço Total' : 'Total Price'} ($)</label>
                  <input
                    type="number"
                    value={listPrice}
                    onChange={(e) => setListPrice(e.target.value)}
                    placeholder={isPt ? 'Digite o preço...' : 'Enter price...'}
                    className="price-input"
                  />
                  {listPrice && listQuantity > 1 && (
                    <p className="price-per-item">
                      ${Math.round(parseInt(listPrice) / listQuantity).toLocaleString()} {isPt ? 'por unidade' : 'per item'}
                    </p>
                  )}
                </div>
                
                <div className="form-group">
                  <label>{isPt ? 'Duração' : 'Duration'}</label>
                  <select value={listDuration} onChange={(e) => setListDuration(e.target.value)}>
                    <option value="6">6 {isPt ? 'horas' : 'hours'}</option>
                    <option value="12">12 {isPt ? 'horas' : 'hours'}</option>
                    <option value="24">24 {isPt ? 'horas' : 'hours'}</option>
                    <option value="48">48 {isPt ? 'horas' : 'hours'}</option>
                    <option value="72">72 {isPt ? 'horas' : 'hours'}</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowListModal(false)}>
                {isPt ? 'Cancelar' : 'Cancel'}
              </button>
              <button className="btn-confirm" onClick={listItem} disabled={!listPrice || listQuantity < 1}>
                {isPt ? 'Listar por' : 'List for'} ${parseInt(listPrice || 0).toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Offer Modal */}
      {showTradeModal && selectedListing && (
        <div className="market-modal-overlay" onClick={() => setShowTradeModal(false)}>
          <div className="market-modal trade-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isPt ? 'Fazer Oferta' : 'Make Trade Offer'}</h3>
              <button className="modal-close" onClick={() => setShowTradeModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="trade-target">
                <h4>{isPt ? 'Item Desejado' : 'Wanted Item'}</h4>
                <div className="target-item">
                  <div className="target-icon">{renderItemIcon(selectedListing.item?.icon, selectedListing.item?.name, 'large')}</div>
                  <div>
                    <p className="target-name">{selectedListing.item?.name}</p>
                    <p className="target-price">{isPt ? 'Preço pedido' : 'Asking price'}: ${selectedListing.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="trade-offer-form">
                <h4>{isPt ? 'Sua Oferta' : 'Your Offer'}</h4>
                
                <div className="form-group">
                  <label>{isPt ? 'Oferecer Dinheiro' : 'Offer Cash'} ($)</label>
                  <input
                    type="number"
                    value={tradeCash}
                    onChange={(e) => setTradeCash(e.target.value)}
                    placeholder="0"
                    max={player?.cash || 0}
                  />
                  <p className="cash-available">{isPt ? 'Disponível' : 'Available'}: ${player?.cash?.toLocaleString()}</p>
                </div>
                
                <div className="form-group">
                  <label>{isPt ? 'Mensagem (opcional)' : 'Message (optional)'}</label>
                  <textarea
                    value={tradeMessage}
                    onChange={(e) => setTradeMessage(e.target.value)}
                    placeholder={isPt ? 'Adicione uma mensagem...' : 'Add a message...'}
                    maxLength={200}
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowTradeModal(false)}>
                {isPt ? 'Cancelar' : 'Cancel'}
              </button>
              <button className="btn-confirm" onClick={sendTradeOffer} disabled={!tradeCash && tradeItems.length === 0}>
                {isPt ? 'Enviar Oferta' : 'Send Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
