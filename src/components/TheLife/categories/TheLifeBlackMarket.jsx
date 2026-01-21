import '../styles/TheLifeBlackMarket.css';
import { supabase } from '../../../config/supabaseClient';
import { useState, useEffect } from 'react';
import { addSeasonPassXP } from '../hooks/useSeasonPassXP';
import { useLanguage } from '../../../contexts/LanguageContext';

export default function TheLifeBlackMarket({ 
  player,
  setPlayer,
  theLifeInventory,
  marketSubTab,
  setMarketSubTab,
  setMessage,
  loadTheLifeInventory,
  showEventMessage,
  initializePlayer,
  isInHospital,
  user
}) {
  const { language } = useLanguage();
  const isPt = language === 'pt';
  
  const [storeItems, setStoreItems] = useState([]);
  const [storeCategory, setStoreCategory] = useState('all');
  const [loadingStore, setLoadingStore] = useState(false);
  const [quantities, setQuantities] = useState({}); // Track quantity for each item
  const [streetQuantities, setStreetQuantities] = useState({}); // Track quantity for street selling

  // Translations
  const t = {
    // Messages
    notEnoughCash: isPt ? 'Dinheiro insuficiente!' : 'Not enough cash!',
    stockLeft: (qty) => isPt ? `Apenas ${qty} em estoque!` : `Only ${qty} left in stock!`,
    purchased: (qty, name) => isPt ? `Comprou ${qty}x ${name}!` : `Purchased ${qty}x ${name}!`,
    purchaseFailed: isPt ? 'Falha ao comprar item' : 'Failed to purchase item',
    cantSellInHospital: isPt ? 'Você não pode vender drogas no hospital!' : 'You cannot sell drugs while in hospital!',
    notEnoughItems: isPt ? 'Você não tem tantos itens!' : "You don't have that many items!",
    busted: (qty, jailTime) => isPt 
      ? `Preso! Policiais confiscaram ${qty} item(s). ${jailTime} min na cadeia, perdeu 15 HP!` 
      : `Busted! Cops confiscated ${qty} item(s). ${jailTime} min in jail, lost 15 HP!`,
    soldFor: (qty, price, xp) => isPt 
      ? `Vendeu ${qty}x por $${price.toLocaleString()} e ${xp} XP!` 
      : `Sold ${qty}x for $${price.toLocaleString()} and ${xp} XP!`,
    
    // UI Labels
    highRiskWarning: isPt 
      ? '⚠️ Alto risco! Venda drogas uma por uma para lucro máximo, mas arrisque ir para a cadeia' 
      : '⚠️ High risk! Sell drugs one by one for maximum profit, but risk jail time',
    noStreetItems: isPt ? 'Você não tem itens para vender nas ruas' : 'You have no items to sell on the streets',
    available: isPt ? 'Disponível' : 'Available',
    quantityToSell: isPt ? 'Quantidade para Vender:' : 'Quantity to Sell:',
    jailRisk: isPt ? 'Risco de Cadeia' : 'Jail Risk',
    sellOnStreets: (qty) => isPt 
      ? `Vender ${qty > 1 ? `(${qty})` : ''} nas Ruas` 
      : `Sell ${qty > 1 ? `(${qty})` : ''} on Streets`,
    
    // Categories
    allItems: isPt ? '🛒 Todos os Itens' : '🛒 All Items',
    weapons: isPt ? '⚔️ Armas' : '⚔️ Weapons',
    gear: isPt ? '🛡️ Equipamento' : '🛡️ Gear',
    healing: isPt ? '💊 Cura' : '💊 Healing',
    valuable: isPt ? '💎 Valiosos' : '💎 Valuable',
    limitedTime: isPt ? '⏰ Tempo Limitado' : '⏰ Limited Time',
    all: isPt ? 'Todos' : 'All',
    
    // Store
    loadingStore: isPt ? 'Carregando loja...' : 'Loading store...',
    noItemsInCategory: isPt ? 'Nenhum item disponível nesta categoria' : 'No items available in this category',
    quantity: isPt ? 'Quantidade:' : 'Quantity:',
    each: isPt ? 'cada' : 'each',
    outOfStock: isPt ? 'Esgotado' : 'Out of Stock',
    buy: (qty) => isPt ? `Comprar ${qty > 1 ? `(${qty})` : ''}` : `Buy ${qty > 1 ? `(${qty})` : ''}`,
    stock: isPt ? 'Estoque' : 'Stock',
    noDescription: isPt ? 'Sem descrição' : 'No description',
    
    // Sub-tabs
    theStreets: isPt ? 'As Ruas' : 'The Streets',
    monheStore: isPt ? 'Loja Monhe' : 'Monhe Store',
  };

  // Load store items
  useEffect(() => {
    if (marketSubTab === 'store') {
      loadStoreItems();
    }
  }, [marketSubTab, storeCategory]);

  const loadStoreItems = async () => {
    setLoadingStore(true);
    try {
      // Filter out expired limited time items first
      const now = new Date().toISOString();
      
      let query = supabase
        .from('the_life_store_items')
        .select(`
          *,
          item:the_life_items(id, name, icon, description)
        `)
        .eq('is_active', true)
        .or(`limited_time_until.is.null,limited_time_until.gte.${now}`)
        .order('display_order', { ascending: true })
        .limit(50); // Limit to 50 items max

      // Filter by category if not 'all'
      if (storeCategory !== 'all') {
        query = query.eq('category', storeCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStoreItems(data || []);
    } catch (err) {
      console.error('Error loading store items:', err);
    } finally {
      setLoadingStore(false);
    }
  };

  const buyStoreItem = async (storeItem, quantity = 1) => {
    const totalCost = storeItem.price * quantity;
    
    if (player.cash < totalCost) {
      setMessage({ type: 'error', text: t.notEnoughCash });
      return;
    }

    // Check stock
    if (storeItem.stock_quantity !== null && storeItem.stock_quantity < quantity) {
      setMessage({ type: 'error', text: t.stockLeft(storeItem.stock_quantity) });
      return;
    }

    try {
      // Update player cash
      const { error: playerError } = await supabase
        .from('the_life_players')
        .update({ cash: player.cash - totalCost })
        .eq('user_id', user.id);

      if (playerError) throw playerError;

      // Add item to inventory
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (playerData) {
        // Check if item exists in inventory
        const { data: existing } = await supabase
          .from('the_life_player_inventory')
          .select('*')
          .eq('player_id', playerData.id)
          .eq('item_id', storeItem.item_id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('the_life_player_inventory')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('the_life_player_inventory')
            .insert({
              player_id: playerData.id,
              item_id: storeItem.item_id,
              quantity: quantity
            });
        }
      }

      // Update stock if limited
      if (storeItem.stock_quantity !== null) {
        await supabase
          .from('the_life_store_items')
          .update({ stock_quantity: storeItem.stock_quantity - quantity })
          .eq('id', storeItem.id);
      }

      setMessage({ type: 'success', text: t.purchased(quantity, storeItem.item.name) });
      setQuantities({ ...quantities, [storeItem.id]: 1 }); // Reset quantity to 1
      initializePlayer();
      loadTheLifeInventory();
      loadStoreItems();
    } catch (err) {
      console.error('Error buying item:', err);
      setMessage({ type: 'error', text: t.purchaseFailed });
    }
  };

  const sellOnStreet = async (inv, quantity = 1) => {
    if (isInHospital) {
      setMessage({ type: 'error', text: t.cantSellInHospital });
      return;
    }

    if (quantity > inv.quantity) {
      setMessage({ type: 'error', text: t.notEnoughItems });
      return;
    }
    
    const streetPrice = Math.floor(quantity * (inv.item.resell_price || 150));
    const xpReward = Math.floor(quantity * 10);
    const jailRisk = 35;
    const roll = Math.random() * 100;
    const caught = roll < jailRisk;
    
    if (caught) {
      const jailTime = 45;
      const jailUntil = new Date();
      jailUntil.setMinutes(jailUntil.getMinutes() + jailTime);
      
      const { error } = await supabase
        .from('the_life_players')
        .update({
          jail_until: jailUntil.toISOString(),
          hp: Math.max(0, player.hp - 15)
        })
        .eq('user_id', user.id);
      
      if (!error) {
        // Update or delete inventory
        const newQuantity = inv.quantity - quantity;
        if (newQuantity <= 0) {
          await supabase
            .from('the_life_player_inventory')
            .delete()
            .eq('id', inv.id);
        } else {
          await supabase
            .from('the_life_player_inventory')
            .update({ quantity: newQuantity })
            .eq('id', inv.id);
        }
        
        showEventMessage('jail_street');
        setMessage({ type: 'error', text: t.busted(quantity, jailTime) });
        setStreetQuantities({ ...streetQuantities, [inv.id]: 1 }); // Reset quantity
        initializePlayer();
        loadTheLifeInventory();
      }
    } else {
      const { error } = await supabase
        .from('the_life_players')
        .update({ 
          cash: player.cash + streetPrice,
          xp: player.xp + xpReward
        })
        .eq('user_id', user.id);
      
      if (!error) {
        // Update or delete inventory
        const newQuantity = inv.quantity - quantity;
        if (newQuantity <= 0) {
          await supabase
            .from('the_life_player_inventory')
            .delete()
            .eq('id', inv.id);
        } else {
          await supabase
            .from('the_life_player_inventory')
            .update({ quantity: newQuantity })
            .eq('id', inv.id);
        }
        
        // Add XP to Season Pass
        await addSeasonPassXP(user.id, xpReward, 'street_sale', inv.item_id?.toString());
        
        setMessage({ type: 'success', text: t.soldFor(quantity, streetPrice, xpReward) });
        setStreetQuantities({ ...streetQuantities, [inv.id]: 1 }); // Reset quantity
        initializePlayer();
        loadTheLifeInventory();
      }
    }
  };

  const streetItems = theLifeInventory.filter(inv => inv.item.sellable_on_streets);

  return (
    <div className="market-section">
      <div className="market-sub-tabs">
        <button 
          className={`market-sub-tab ${marketSubTab === 'resell' ? 'active' : ''}`}
          onClick={() => setMarketSubTab('resell')}
          title={t.theStreets}
        >
          <img src="/thelife/subcategories/Streets.png" alt={t.theStreets} className="tab-image" />
        </button>
        <button 
          className={`market-sub-tab ${marketSubTab === 'store' ? 'active' : ''}`}
          onClick={() => setMarketSubTab('store')}
          title={t.monheStore}
        >
          <img src="/thelife/subcategories/Monhe.png" alt={t.monheStore} className="tab-image" />
        </button>
      </div>

      {marketSubTab === 'resell' && (
        <div className="market-content">
          <p className="market-warning">{t.highRiskWarning}</p>
          {streetItems.length === 0 ? (
            <p className="no-items">{t.noStreetItems}</p>
          ) : (
            <div className="market-items-grid">
              {streetItems.map(inv => {
                const quantity = streetQuantities[inv.id] || 1;
                const streetPrice = Math.floor(quantity * (inv.item.resell_price || 150));
                const xpReward = Math.floor(quantity * 10);
                const jailRisk = 35;
                
                return (
                  <div key={inv.id} className={`market-item resell-item item-rarity-${inv.item.rarity}`}>
                    <img 
                      src={inv.item.icon} 
                      alt={inv.item.name} 
                      className="item-image"
                      loading="lazy"
                      decoding="async"
                    />
                    <h4>{inv.item.name}</h4>
                    <p>{t.available}: {inv.quantity}</p>

                    <div className="quantity-selector">
                      <label>{t.quantityToSell}</label>
                      <div className="quantity-controls">
                        <button 
                          className="qty-btn"
                          onClick={() => setStreetQuantities({ ...streetQuantities, [inv.id]: Math.max(1, quantity - 1) })}
                          disabled={quantity <= 1}
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          min="1"
                          max={inv.quantity}
                          value={quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setStreetQuantities({ ...streetQuantities, [inv.id]: Math.min(Math.max(1, val), inv.quantity) });
                          }}
                          className="qty-input"
                        />
                        <button 
                          className="qty-btn"
                          onClick={() => setStreetQuantities({ ...streetQuantities, [inv.id]: Math.min(inv.quantity, quantity + 1) })}
                          disabled={quantity >= inv.quantity}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="resell-stats">
                      <div className="stat">💵 ${streetPrice.toLocaleString()}</div>
                      <div className="stat">⭐ +{xpReward} XP</div>
                      <div className="stat risk">⚠️ {jailRisk}% {t.jailRisk}</div>
                    </div>
                    <button 
                      className="market-sell-btn resell-btn"
                      onClick={() => sellOnStreet(inv, quantity)}
                    >
                      {t.sellOnStreets(quantity)}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {marketSubTab === 'store' && (
        <div className="market-content">
          {/* Mobile Dropdown Filter */}
          <div className="store-category-dropdown-mobile">
            <select 
              value={storeCategory} 
              onChange={(e) => setStoreCategory(e.target.value)}
              className="category-dropdown"
            >
              <option value="all">{t.allItems}</option>
              <option value="weapons">{t.weapons}</option>
              <option value="gear">{t.gear}</option>
              <option value="healing">{t.healing}</option>
              <option value="valuable">{t.valuable}</option>
              <option value="limited_time">{t.limitedTime}</option>
            </select>
          </div>

          {/* Desktop Button Filters */}
          <div className="store-category-filters">
            <button 
              className={`category-filter-btn ${storeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setStoreCategory('all')}
            >
              {t.all}
            </button>
            <button 
              className={`category-filter-btn ${storeCategory === 'weapons' ? 'active' : ''}`}
              onClick={() => setStoreCategory('weapons')}
            >
              {t.weapons}
            </button>
            <button 
              className={`category-filter-btn ${storeCategory === 'gear' ? 'active' : ''}`}
              onClick={() => setStoreCategory('gear')}
            >
              {t.gear}
            </button>
            <button 
              className={`category-filter-btn ${storeCategory === 'healing' ? 'active' : ''}`}
              onClick={() => setStoreCategory('healing')}
            >
              {t.healing}
            </button>
            <button 
              className={`category-filter-btn ${storeCategory === 'valuable' ? 'active' : ''}`}
              onClick={() => setStoreCategory('valuable')}
            >
              {t.valuable}
            </button>
            <button 
              className={`category-filter-btn ${storeCategory === 'limited_time' ? 'active' : ''}`}
              onClick={() => setStoreCategory('limited_time')}
            >
              {t.limitedTime}
            </button>
          </div>

          {loadingStore ? (
            <div className="loading">{t.loadingStore}</div>
          ) : storeItems.length === 0 ? (
            <p className="no-items">{t.noItemsInCategory}</p>
          ) : (
            <div className="market-items-grid">
              {storeItems.map(storeItem => {
                const quantity = quantities[storeItem.id] || 1;
                const totalCost = storeItem.price * quantity;
                const maxQuantity = storeItem.stock_quantity !== null 
                  ? Math.min(storeItem.stock_quantity, Math.floor(player.cash / storeItem.price))
                  : Math.floor(player.cash / storeItem.price);
                
                return (
                  <div key={storeItem.id} className={`market-item store-card item-rarity-${storeItem.item.rarity}`}>
                    {storeItem.limited_time_until && (
                      <div className="limited-time-badge">
                        {t.limitedTime}
                      </div>
                    )}
                    <div className="store-item-image-container">
                      <img 
                        src={storeItem.item.icon} 
                        alt={storeItem.item.name} 
                        className="store-item-image"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="store-item-info">
                      <h4 className="store-item-name">{storeItem.item.name}</h4>
                      <p className="store-item-desc">{storeItem.item.description || t.noDescription}</p>
                      {storeItem.stock_quantity !== null && (
                        <div className="stock-info">
                          {t.stock}: {storeItem.stock_quantity}
                        </div>
                      )}
                    </div>
                    
                    <div className="quantity-selector">
                      <label>{t.quantity}</label>
                      <div className="quantity-controls">
                        <button 
                          className="qty-btn"
                          onClick={() => setQuantities({ ...quantities, [storeItem.id]: Math.max(1, quantity - 1) })}
                          disabled={quantity <= 1}
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          min="1"
                          max={maxQuantity}
                          value={quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setQuantities({ ...quantities, [storeItem.id]: Math.min(Math.max(1, val), maxQuantity) });
                          }}
                          className="qty-input"
                        />
                        <button 
                          className="qty-btn"
                          onClick={() => setQuantities({ ...quantities, [storeItem.id]: Math.min(maxQuantity, quantity + 1) })}
                          disabled={quantity >= maxQuantity}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    <div className="item-price">
                      ${totalCost.toLocaleString()} 
                      {quantity > 1 && <span className="unit-price">(${storeItem.price.toLocaleString()} {t.each})</span>}
                    </div>
                    <button 
                      className="market-buy-btn"
                      onClick={() => buyStoreItem(storeItem, quantity)}
                      disabled={player.cash < totalCost || (storeItem.stock_quantity !== null && storeItem.stock_quantity <= 0)}
                    >
                      {storeItem.stock_quantity !== null && storeItem.stock_quantity <= 0 ? t.outOfStock : t.buy(quantity)}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
