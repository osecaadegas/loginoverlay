import '../styles/TheLifeDocks.css';
import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';

/**
 * Docks Category - Ship drugs safely via boats
 */
export default function TheLifeDocks({ player, setPlayer, setPlayerFromAction, theLifeInventory, setMessage, user, loadTheLifeInventory }) {
  const [activeBoats, setActiveBoats] = useState([]);
  const [upcomingBoats, setUpcomingBoats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadAmounts, setLoadAmounts] = useState({}); // Store input amounts per boat

  // Load boats on mount
  useEffect(() => {
    loadBoats();
  }, []);

  async function loadBoats() {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      // Get active boats - boats that have arrived and haven't departed yet
      const { data: activeData, error: activeError } = await supabase
        .from('the_life_dock_boats')
        .select(`
          id,
          name,
          image_url,
          item_id,
          arrival_time,
          departure_time,
          max_shipments,
          current_shipments,
          is_active,
          the_life_items!the_life_dock_boats_item_id_fkey (
            name,
            icon
          )
        `)
        .eq('is_active', true)
        .lte('arrival_time', now)
        .gte('departure_time', now)
        .order('departure_time', { ascending: true });

      if (activeError) {
        console.error('Error loading active boats:', activeError);
      }

      // Format active boats data
      const formattedActive = (activeData || []).map(boat => {
        const departureTime = new Date(boat.departure_time);
        const timeRemainingMs = departureTime - new Date();
        const timeRemainingMinutes = Math.max(0, Math.floor(timeRemainingMs / (1000 * 60)));
        
        return {
          id: boat.id,
          name: boat.name,
          image_url: boat.image_url,
          item_id: boat.item_id,
          item_name: boat.the_life_items?.name || 'Unknown',
          item_icon: boat.the_life_items?.icon || '',
          arrival_time: boat.arrival_time,
          departure_time: boat.departure_time,
          max_shipments: boat.max_shipments,
          current_shipments: boat.current_shipments || 0,
          time_remaining_minutes: timeRemainingMinutes
        };
      });

      console.log('Active boats from DB:', formattedActive);
      setActiveBoats(formattedActive);

      // Get upcoming boats - boats that haven't arrived yet
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('the_life_dock_boats')
        .select(`
          id,
          name,
          image_url,
          item_id,
          arrival_time,
          departure_time,
          the_life_items!the_life_dock_boats_item_id_fkey (
            name,
            icon
          )
        `)
        .eq('is_active', true)
        .gt('arrival_time', now)
        .order('arrival_time', { ascending: true })
        .limit(5);

      if (upcomingError) {
        console.error('Error loading upcoming boats:', upcomingError);
      }

      // Format upcoming boats data
      const formattedUpcoming = (upcomingData || []).map(boat => {
        const arrivalTime = new Date(boat.arrival_time);
        const hoursUntilArrival = Math.max(0, (arrivalTime - new Date()) / (1000 * 60 * 60));
        
        return {
          id: boat.id,
          name: boat.name,
          image_url: boat.image_url,
          item_id: boat.item_id,
          item_name: boat.the_life_items?.name || 'Unknown',
          item_icon: boat.the_life_items?.icon || '',
          arrival_time: boat.arrival_time,
          departure_time: boat.departure_time,
          hours_until_arrival: hoursUntilArrival
        };
      });

      console.log('Upcoming boats from DB:', formattedUpcoming);
      setUpcomingBoats(formattedUpcoming);
    } catch (err) {
      console.error('Error loading boats:', err);
      setMessage({ type: 'error', text: 'Failed to load dock boats' });
    } finally {
      setLoading(false);
    }
  }

  // Ship drugs on a boat
  async function loadCargo(boat) {
    const quantity = parseInt(loadAmounts[boat.id] || 0);
    
    if (!quantity || quantity <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid quantity' });
      return;
    }

    // Find the item in inventory
    const inventoryItem = theLifeInventory.find(inv => inv.item_id === boat.item_id);
    
    if (!inventoryItem) {
      setMessage({ type: 'error', text: `You don't have any ${boat.item_name}` });
      return;
    }

    if (quantity > inventoryItem.quantity) {
      setMessage({ type: 'error', text: `You only have ${inventoryItem.quantity}x ${boat.item_name}` });
      return;
    }

    if (boat.current_shipments >= boat.max_shipments) {
      setMessage({ type: 'error', text: 'Boat is full!' });
      return;
    }

    try {
      const streetPrice = inventoryItem.item.resell_price || 150;
      const dockPrice = Math.floor(quantity * streetPrice * 0.8);
      const newQuantity = inventoryItem.quantity - quantity;
      
      // Update player cash via secure RPC
      const { data: cashResult, error: cashError } = await supabase.rpc('adjust_player_cash', { p_amount: dockPrice });
      if (cashError) throw cashError;
      if (!cashResult.success) throw new Error(cashResult.error);

      // Log the shipment
      await supabase
        .from('the_life_dock_shipments')
        .insert({
          user_id: user.id,
          boat_id: boat.id,
          item_id: boat.item_id,
          quantity: quantity,
          payout: dockPrice
        });

      // Update boat capacity
      const { error: boatError } = await supabase
        .from('the_life_dock_boats')
        .update({ current_shipments: boat.current_shipments + 1 })
        .eq('id', boat.id);

      if (boatError) throw boatError;

      // Update or delete from inventory
      if (newQuantity > 0) {
        await supabase
          .from('the_life_player_inventory')
          .update({ quantity: newQuantity })
          .eq('id', inventoryItem.id);
      } else {
        await supabase
          .from('the_life_player_inventory')
          .delete()
          .eq('id', inventoryItem.id);
      }

      setMessage({ type: 'success', text: `Loaded ${quantity}x ${boat.item_name} for $${dockPrice.toLocaleString()}! Safe delivery confirmed.` });
      setPlayerFromAction(cashResult.player);
      setLoadAmounts(prev => ({ ...prev, [boat.id]: '' })); // Clear input
      
      // Reload data
      loadBoats();
      if (loadTheLifeInventory) loadTheLifeInventory();
      
    } catch (err) {
      console.error('Error loading cargo:', err);
      setMessage({ type: 'error', text: 'Failed to load cargo' });
    }
  }

  if (loading) {
    return <div className="category-container"><div className="loading">Loading docks...</div></div>;
  }

  return (
    <div className="category-container">
      <div className="category-content">
        {/* Active and Upcoming Boats Row */}
        <div className="docks-row-layout">
          {/* Active Boats */}
          {activeBoats.length > 0 && (
            <div className="docks-section active-boats-section">
              <h3 className="section-title active">🟢 Boats Currently At Dock</h3>
              <div className="dock-boats-grid">
              {activeBoats.map(boat => {
                const inventoryItem = theLifeInventory.find(inv => inv.item_id === boat.item_id);
                const timeRemaining = Math.floor(boat.time_remaining_minutes);
                const isFull = boat.current_shipments >= boat.max_shipments;
                const inputAmount = parseInt(loadAmounts[boat.id] || 0);
                const streetPrice = inventoryItem?.item?.resell_price || 150;
                const estimatedPayout = inputAmount > 0 ? Math.floor(inputAmount * streetPrice * 0.8) : 0;
                
                return (
                  <div key={boat.id} className="modern-dock-card">
                    {boat.image_url && (
                      <div className="dock-card-image">
                        <img src={boat.image_url} alt={boat.name} />
                        <div className="dock-card-badge">
                          <span className="capacity-badge" style={{background: isFull ? '#ef4444' : '#22c55e'}}>
                            {boat.current_shipments}/{boat.max_shipments}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="dock-card-content">
                      <div className="dock-card-header">
                        <h4>{boat.name}</h4>
                        <div className="timer-badge">
                          ⏱️ {timeRemaining}m
                        </div>
                      </div>

                      <div className="accepting-item">
                        <img src={boat.item_icon} alt={boat.item_name} />
                        <div className="accepting-info">
                          <span className="label">Accepting</span>
                          <span className="item-name">{boat.item_name}</span>
                        </div>
                      </div>

                      {inventoryItem && (
                        <div className="inventory-display">
                          📦 You have: <strong>{inventoryItem.quantity}x</strong>
                        </div>
                      )}

                      {!isFull ? (
                        <div className="load-form">
                          <div className="input-wrapper">
                            <input
                              type="number"
                              min="1"
                              max={inventoryItem?.quantity || 0}
                              value={loadAmounts[boat.id] || ''}
                              onChange={(e) => setLoadAmounts(prev => ({ ...prev, [boat.id]: e.target.value }))}
                              placeholder={inventoryItem ? `Max: ${inventoryItem.quantity}` : 'No items'}
                              className="modern-input"
                              disabled={!inventoryItem}
                            />
                            {estimatedPayout > 0 && (
                              <div className="payout-preview">
                                💰 ${estimatedPayout.toLocaleString()}
                              </div>
                            )}
                          </div>
                          <button 
                            className="load-cargo-btn"
                            onClick={() => loadCargo(boat)}
                            disabled={!inventoryItem || !inputAmount}
                          >
                            Load Cargo
                          </button>
                        </div>
                      ) : (
                        <div className="boat-full-badge">
                          🚢 Boat is Full
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

          {/* Upcoming Boats */}
          {upcomingBoats.length > 0 && (
            <div className="docks-section upcoming-boats-section">
              <h3 className="section-title upcoming">🟡 Upcoming Arrivals</h3>
            <div className="upcoming-boats-grid">
              {upcomingBoats.map(boat => {
                const hoursUntil = Math.floor(boat.hours_until_arrival);
                const minutesUntil = Math.floor((boat.hours_until_arrival - hoursUntil) * 60);
                
                return (
                  <div key={boat.id} className="upcoming-boat-card">
                    {boat.image_url && (
                      <img src={boat.image_url} alt={boat.name} className="upcoming-boat-img" />
                    )}
                    <div className="upcoming-boat-info">
                      <h5>{boat.name}</h5>
                      <div className="upcoming-accepting">
                        <img src={boat.item_icon} alt={boat.item_name} />
                        <span>{boat.item_name}</span>
                      </div>
                      <div className="upcoming-eta">
                        ⏰ Arrives in {hoursUntil}h {minutesUntil}m
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>

        {activeBoats.length === 0 && upcomingBoats.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🚢</div>
            <h4>No Boats Scheduled</h4>
            <p>Check back later for available boats</p>
          </div>
        )}

        {activeBoats.length === 0 && upcomingBoats.length > 0 && (
          <div className="info-message">
            <span className="info-icon">ℹ️</span>
            No boats currently at dock. See upcoming arrivals below.
          </div>
        )}
      </div>
    </div>
  );
}
