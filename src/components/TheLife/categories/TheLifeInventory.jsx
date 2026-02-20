import { useState } from 'react';
import { supabase } from '../../../config/supabaseClient';
import '../styles/TheLifeInventory.css';

export default function TheLifeInventory({ 
  theLifeInventory,
  player,
  setPlayer,
  setMessage,
  loadTheLifeInventory,
  initializePlayer,
  user
}) {
  const [filterType, setFilterType] = useState('all');
  const [filterRarity, setFilterRarity] = useState('all');

  const useJailFreeCard = async () => {
    const jailCard = theLifeInventory.find(inv => inv.item?.name === 'Jail Free Card' && inv.quantity > 0);
    if (!jailCard) {
      setMessage({ type: 'error', text: 'No Jail Free Card available!' });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('use_consumable_item', {
        p_inventory_id: jailCard.id
      });

      if (error) throw error;
      if (!data?.success) {
        setMessage({ type: 'error', text: data?.error || 'Failed to use card!' });
        return;
      }

      initializePlayer?.();
      loadTheLifeInventory();
      setMessage({ type: 'success', text: 'Used Jail Free Card! You\'re free!' });
    } catch (err) {
      console.error('Error using jail card:', err);
      setMessage({ type: 'error', text: 'Failed to use card!' });
    }
  };

  const useConsumable = async (invItem) => {
    if (!invItem.item.effect) {
      setMessage({ type: 'error', text: 'This item has no effect!' });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('use_consumable_item', {
        p_inventory_id: invItem.id
      });

      if (error) throw error;
      if (!data?.success) {
        setMessage({ type: 'error', text: data?.error || 'Failed to use item' });
        return;
      }

      if (data.overdose) {
        setMessage({ type: 'error', text: '💀 OVERDOSE! Your addiction hit 100! You collapsed and were rushed to the hospital!' });
      } else {
        setMessage({ type: 'success', text: data.message || `Used ${invItem.item.name}!` });
      }

      if (initializePlayer) initializePlayer();
      loadTheLifeInventory();
    } catch (err) {
      console.error('Error using item:', err);
      setMessage({ type: 'error', text: 'Failed to use item' });
    }
  };

  // Filter inventory
  const filteredInventory = theLifeInventory.filter(inv => {
    const typeMatch = filterType === 'all' || inv.item.type === filterType;
    const rarityMatch = filterRarity === 'all' || inv.item.rarity === filterRarity;
    return typeMatch && rarityMatch;
  });

  return (
    <div className="inventory-section">
      <h2>🎒 Your Inventory</h2>

      {/* Filter Controls */}
      <div className="inventory-filters">
        <div className="filter-group">
          <label>Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="consumable">Consumable</option>
            <option value="equipment">Equipment</option>
            <option value="special">Special</option>
            <option value="collectible">Collectible</option>
            <option value="business_reward">Business Reward</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Rarity:</label>
          <select value={filterRarity} onChange={(e) => setFilterRarity(e.target.value)}>
            <option value="all">All Rarities</option>
            <option value="common">Common</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </select>
        </div>

        <div className="filter-count">
          Showing {filteredInventory.length} of {theLifeInventory.length} items
        </div>
      </div>

      {theLifeInventory.length === 0 ? (
        <p className="no-items">No items yet. Start businesses to earn items!</p>
      ) : filteredInventory.length === 0 ? (
        <p className="no-items">No items match your filters</p>
      ) : (
        <div className="equipment-grid compact">
          {filteredInventory.map(inv => (
            <div key={inv.id} className={`equipment-card compact item-rarity-${inv.item.rarity}`}>
              <div className="item-image-container">
                <img 
                  src={inv.item.icon || 'https://images.unsplash.com/photo-1606400082777-ef05f3c5cde9?w=400'} 
                  alt={inv.item.name}
                  className="item-image"
                />
              </div>
              <h4>{inv.item.name}</h4>
              <p className="item-description">{inv.item.description}</p>
              <p className="item-quantity">Quantity: {inv.quantity}</p>
              {inv.item.type === 'special' && inv.item.usable && (
                <button 
                  onClick={() => {
                    if (inv.item.name === 'Jail Free Card') {
                      useJailFreeCard();
                    }
                  }}
                  className="use-item-btn"
                >
                  Use Item
                </button>
              )}
              {inv.item.usable && inv.item.effect && inv.item.type !== 'special' && (
                <button 
                  onClick={() => useConsumable(inv)}
                  className="use-item-btn"
                >
                  Use
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
