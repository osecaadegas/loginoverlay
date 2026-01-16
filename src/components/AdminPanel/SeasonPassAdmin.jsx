import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';
import './SeasonPassAdmin.css';

/**
 * Season Pass Admin Component
 * Battlepass-style UI with + buttons on each tier card to manage rewards
 */
export default function SeasonPassAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Season data
  const [season, setSeason] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [items, setItems] = useState([]);
  
  // Modal states
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [editingTrack, setEditingTrack] = useState(null); // 'budget' or 'premium'
  
  // Reward form
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    type: 'currency',
    icon: 'fa-gift',
    rarity: 'common',
    quantity: 1,
    item_id: '',
    cash_amount: 0,
    xp_amount: 0,
    se_points_amount: 0
  });

  const trackRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get active season
      let { data: seasonData } = await supabase
        .from('season_pass_seasons')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!seasonData) {
        // Create default season
        const { data: newSeason } = await supabase
          .from('season_pass_seasons')
          .insert({
            season_number: 1,
            name: 'Underground Empire',
            is_active: true
          })
          .select()
          .single();
        seasonData = newSeason;
      }
      setSeason(seasonData);

      // Get all tiers
      const { data: tiersData } = await supabase
        .from('season_pass_tiers')
        .select(`
          *,
          budget_reward:season_pass_rewards!season_pass_tiers_budget_reward_id_fkey(*),
          premium_reward:season_pass_rewards!season_pass_tiers_premium_reward_id_fkey(*)
        `)
        .eq('season_id', seasonData?.id)
        .order('tier_number', { ascending: true });

      // Generate 70 tiers with any existing data
      const allTiers = generateTiers(tiersData || [], 70, seasonData?.id);
      setTiers(allTiers);

      // Get all rewards for reference
      const { data: rewardsData } = await supabase
        .from('season_pass_rewards')
        .select('*')
        .order('name');
      setRewards(rewardsData || []);

      // Get items for dropdown (with image_url)
      console.log('Fetching items from the_life_items...');
      const { data: itemsData, error: itemsError } = await supabase
        .from('the_life_items')
        .select('*');
      
      console.log('Items query result:', { itemsData, itemsError });
      
      if (itemsError) {
        console.error('Error fetching items:', itemsError);
        console.error('Error details:', JSON.stringify(itemsError, null, 2));
      } else {
        console.log('Items loaded successfully:', itemsData?.length || 0, 'items');
        if (itemsData?.length > 0) {
          console.log('First item sample:', itemsData[0]);
        }
      }
      setItems(itemsData || []);

    } catch (error) {
      console.error('Error loading season pass data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  // Generate 70 tier placeholders
  const generateTiers = (existingTiers, total, seasonId) => {
    const tierMap = {};
    existingTiers.forEach(t => {
      tierMap[t.tier_number] = t;
    });

    const allTiers = [];
    for (let i = 1; i <= total; i++) {
      if (tierMap[i]) {
        allTiers.push(tierMap[i]);
      } else {
        allTiers.push({
          tier_number: i,
          season_id: seasonId,
          xp_required: 500 + (i - 1) * 100,
          budget_reward: null,
          premium_reward: null,
          budget_reward_id: null,
          premium_reward_id: null
        });
      }
    }
    return allTiers;
  };

  // Open modal to add/edit reward for a tier
  const openRewardModal = (tier, track) => {
    console.log('Opening reward modal, items in state:', items?.length || 0);
    setEditingTier(tier);
    setEditingTrack(track);
    
    const existingReward = track === 'budget' ? tier.budget_reward : tier.premium_reward;
    
    if (existingReward) {
      setRewardForm({
        name: existingReward.name || '',
        description: existingReward.description || '',
        type: existingReward.type || 'currency',
        icon: existingReward.icon || 'fa-gift',
        rarity: existingReward.rarity || 'common',
        quantity: existingReward.quantity || 1,
        item_id: existingReward.item_id || '',
        cash_amount: existingReward.cash_amount || 0,
        xp_amount: existingReward.xp_amount || 0,
        se_points_amount: existingReward.se_points_amount || 0
      });
    } else {
      // Default values based on tier and track
      const defaultRarity = tier.tier_number % 10 === 0 ? 'legendary' :
                           tier.tier_number % 5 === 0 ? 'epic' :
                           tier.tier_number % 3 === 0 ? 'rare' :
                           tier.tier_number % 2 === 0 ? 'uncommon' : 'common';
      
      setRewardForm({
        name: `Tier ${tier.tier_number} ${track === 'premium' ? 'Premium' : 'Budget'} Reward`,
        description: '',
        type: 'currency',
        icon: 'fa-gift',
        rarity: track === 'premium' ? defaultRarity : (defaultRarity === 'legendary' ? 'rare' : defaultRarity === 'epic' ? 'uncommon' : 'common'),
        quantity: track === 'premium' ? 1 : 1000 * tier.tier_number,
        item_id: '',
        cash_amount: track === 'budget' ? 1000 * tier.tier_number : 0,
        xp_amount: 0,
        se_points_amount: 0
      });
    }
    
    setShowRewardModal(true);
  };

  // Save reward
  const saveReward = async () => {
    if (!editingTier || !editingTrack) return;

    try {
      setSaving(true);

      // Get item image if item type
      let imageUrl = null;
      if (rewardForm.type === 'item' && rewardForm.item_id) {
        const selectedItem = items.find(i => i.id === rewardForm.item_id);
        imageUrl = selectedItem?.image_url || null;
      }

      // Create or update the reward
      const rewardData = {
        name: rewardForm.name,
        description: rewardForm.description,
        type: rewardForm.type,
        icon: rewardForm.icon,
        rarity: rewardForm.rarity,
        quantity: parseInt(rewardForm.quantity) || 1,
        item_id: rewardForm.item_id || null,
        cash_amount: parseInt(rewardForm.cash_amount) || 0,
        xp_amount: parseInt(rewardForm.xp_amount) || 0,
        se_points_amount: parseInt(rewardForm.se_points_amount) || 0,
        image_url: imageUrl
      };

      let rewardId;
      const existingRewardId = editingTrack === 'budget' 
        ? editingTier.budget_reward_id 
        : editingTier.premium_reward_id;

      if (existingRewardId) {
        // Update existing reward
        await supabase
          .from('season_pass_rewards')
          .update(rewardData)
          .eq('id', existingRewardId);
        rewardId = existingRewardId;
      } else {
        // Create new reward
        const { data: newReward } = await supabase
          .from('season_pass_rewards')
          .insert(rewardData)
          .select()
          .single();
        rewardId = newReward.id;
      }

      // Create or update the tier
      const tierUpdateField = editingTrack === 'budget' 
        ? { budget_reward_id: rewardId }
        : { premium_reward_id: rewardId };

      if (editingTier.id) {
        // Update existing tier
        await supabase
          .from('season_pass_tiers')
          .update(tierUpdateField)
          .eq('id', editingTier.id);
      } else {
        // Create new tier
        await supabase
          .from('season_pass_tiers')
          .insert({
            season_id: season.id,
            tier_number: editingTier.tier_number,
            xp_required: editingTier.xp_required,
            ...tierUpdateField
          });
      }

      setMessage({ type: 'success', text: 'Reward saved successfully!' });
      setShowRewardModal(false);
      loadData(); // Refresh data

    } catch (error) {
      console.error('Error saving reward:', error);
      setMessage({ type: 'error', text: 'Failed to save reward' });
    } finally {
      setSaving(false);
    }
  };

  // Delete reward from tier
  const removeReward = async () => {
    if (!editingTier || !editingTrack) return;

    const rewardId = editingTrack === 'budget' 
      ? editingTier.budget_reward_id 
      : editingTier.premium_reward_id;

    if (!rewardId) return;

    try {
      setSaving(true);

      // Remove reward reference from tier
      const tierUpdateField = editingTrack === 'budget' 
        ? { budget_reward_id: null }
        : { premium_reward_id: null };

      if (editingTier.id) {
        await supabase
          .from('season_pass_tiers')
          .update(tierUpdateField)
          .eq('id', editingTier.id);
      }

      // Delete the reward
      await supabase
        .from('season_pass_rewards')
        .delete()
        .eq('id', rewardId);

      setMessage({ type: 'success', text: 'Reward removed!' });
      setShowRewardModal(false);
      loadData();

    } catch (error) {
      console.error('Error removing reward:', error);
      setMessage({ type: 'error', text: 'Failed to remove reward' });
    } finally {
      setSaving(false);
    }
  };

  // Update season settings
  const updateSeason = async () => {
    if (!season) return;

    try {
      setSaving(true);
      await supabase
        .from('season_pass_seasons')
        .update({
          name: season.name,
          premium_price_cents: season.premium_price_cents,
          stripe_price_id: season.stripe_price_id,
          budget_price_points: season.budget_price_points
        })
        .eq('id', season.id);

      setMessage({ type: 'success', text: 'Season settings saved!' });
    } catch (error) {
      console.error('Error updating season:', error);
      setMessage({ type: 'error', text: 'Failed to save season settings' });
    } finally {
      setSaving(false);
    }
  };

  // Get rarity color
  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return '#fbbf24';
      case 'epic': return '#a855f7';
      case 'rare': return '#3b82f6';
      case 'uncommon': return '#22c55e';
      default: return '#94a3b8';
    }
  };

  // Icon options
  const iconOptions = [
    'fa-gift', 'fa-money-bill-wave', 'fa-gem', 'fa-box', 'fa-bolt', 'fa-star',
    'fa-gun', 'fa-vest', 'fa-briefcase-medical', 'fa-truck-pickup', 'fa-key',
    'fa-glasses', 'fa-tools', 'fa-suitcase', 'fa-crosshairs', 'fa-tshirt',
    'fa-fire', 'fa-laptop-code', 'fa-walkie-talkie', 'fa-building', 'fa-rocket',
    'fa-globe-americas', 'fa-clock', 'fa-dog', 'fa-shield-alt', 'fa-user-tie',
    'fa-crown', 'fa-coins', 'fa-dice', 'fa-trophy', 'fa-skull'
  ];

  if (loading) {
    return (
      <div className="sp-admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading Season Pass Admin...</p>
      </div>
    );
  }

  return (
    <div className="sp-admin-container">
      {/* Season Settings */}
      <div className="sp-admin-settings">
        <h3>👑 Season {season?.season_number} Settings</h3>
        <div className="settings-row">
          <div className="setting-group">
            <label>Season Name</label>
            <input
              type="text"
              value={season?.name || ''}
              onChange={(e) => setSeason({ ...season, name: e.target.value })}
              placeholder="Underground Empire"
            />
          </div>
          <div className="setting-group">
            <label>Budget Price (SE Points)</label>
            <input
              type="number"
              value={season?.budget_price_points || 5000}
              onChange={(e) => setSeason({ ...season, budget_price_points: parseInt(e.target.value) || 5000 })}
              placeholder="5000"
            />
            <small>{(season?.budget_price_points || 5000).toLocaleString()} SE Points</small>
          </div>
          <div className="setting-group">
            <label>Premium Price (cents)</label>
            <input
              type="number"
              value={season?.premium_price_cents || 999}
              onChange={(e) => setSeason({ ...season, premium_price_cents: parseInt(e.target.value) || 999 })}
              placeholder="999"
            />
            <small>${((season?.premium_price_cents || 999) / 100).toFixed(2)}</small>
          </div>
          <div className="setting-group">
            <label>Stripe Price ID</label>
            <input
              type="text"
              value={season?.stripe_price_id || ''}
              onChange={(e) => setSeason({ ...season, stripe_price_id: e.target.value })}
              placeholder="price_..."
            />
          </div>
          <button className="btn-save" onClick={updateSeason} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
        <p className="settings-note">
          ℹ️ Season end date syncs automatically with the Server Wipe timer.
          {season?.end_date && ` Current end: ${new Date(season.end_date).toLocaleString()}`}
        </p>
      </div>

      {/* Tier Track */}
      <div className="sp-admin-track-section">
        <h3>📜 Tier Rewards (70 Tiers)</h3>
        <p className="track-instructions">
          Click the <strong>+</strong> button on any card to add or edit rewards. 
          Premium (top, gold) and Budget (bottom, silver) tracks.
        </p>

        <div className="sp-admin-track-labels">
          <div className="track-label premium">PREMIUM (Stripe)</div>
          <div className="track-label budget">BUDGET (SE Points)</div>
        </div>

        <div className="sp-admin-track-wrapper" ref={trackRef}>
          {tiers.map((tier) => (
            <div key={tier.tier_number} className="sp-admin-segment">
              {/* Premium Card */}
              <div 
                className={`sp-admin-card premium ${tier.premium_reward ? 'has-reward' : 'empty'}`}
                style={{ borderColor: tier.premium_reward ? getRarityColor(tier.premium_reward.rarity) : '#333' }}
              >
                {tier.premium_reward ? (
                  <>
                    {tier.premium_reward.image_url ? (
                      <img 
                        src={tier.premium_reward.image_url} 
                        alt={tier.premium_reward.name} 
                        className="card-image"
                      />
                    ) : (
                      <i 
                        className={`fas ${tier.premium_reward.icon}`} 
                        style={{ color: getRarityColor(tier.premium_reward.rarity) }}
                      ></i>
                    )}
                    <div className="card-name">{tier.premium_reward.name}</div>
                    <div className="card-type">{tier.premium_reward.type}</div>
                  </>
                ) : (
                  <div className="empty-slot">No Reward</div>
                )}
                <button 
                  className="add-btn"
                  onClick={() => openRewardModal(tier, 'premium')}
                >
                  {tier.premium_reward ? '✏️' : '+'}
                </button>
              </div>

              {/* Level Badge */}
              <div className="sp-admin-badge">{tier.tier_number}</div>

              {/* Budget Card */}
              <div 
                className={`sp-admin-card budget ${tier.budget_reward ? 'has-reward' : 'empty'}`}
                style={{ borderColor: tier.budget_reward ? getRarityColor(tier.budget_reward.rarity) : '#333' }}
              >
                {tier.budget_reward ? (
                  <>
                    {tier.budget_reward.image_url ? (
                      <img 
                        src={tier.budget_reward.image_url} 
                        alt={tier.budget_reward.name} 
                        className="card-image"
                      />
                    ) : (
                      <i 
                        className={`fas ${tier.budget_reward.icon}`} 
                        style={{ color: getRarityColor(tier.budget_reward.rarity) }}
                      ></i>
                    )}
                    <div className="card-name">{tier.budget_reward.name}</div>
                    <div className="card-type">{tier.budget_reward.type}</div>
                  </>
                ) : (
                  <div className="empty-slot">No Reward</div>
                )}
                <button 
                  className="add-btn"
                  onClick={() => openRewardModal(tier, 'budget')}
                >
                  {tier.budget_reward ? '✏️' : '+'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reward Modal */}
      {showRewardModal && (
        <div className="sp-modal-overlay" onClick={() => setShowRewardModal(false)}>
          <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h3>
                {editingTrack === 'premium' ? '👑 Premium' : '💰 Budget'} Reward - Tier {editingTier?.tier_number}
              </h3>
              <button className="close-btn" onClick={() => setShowRewardModal(false)}>×</button>
            </div>

            <div className="sp-modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Reward Name</label>
                  <input
                    type="text"
                    value={rewardForm.name}
                    onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                    placeholder="e.g., Golden Eagle"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={rewardForm.type}
                    onChange={(e) => setRewardForm({ ...rewardForm, type: e.target.value })}
                  >
                    <option value="currency">Currency (Cash)</option>
                    <option value="item">Item (From Inventory)</option>
                    <option value="xp">XP Boost</option>
                    <option value="se_points">SE Points</option>
                    <option value="weapon">Weapon</option>
                    <option value="gear">Gear</option>
                    <option value="cosmetic">Cosmetic</option>
                    <option value="boost">Boost/Multiplier</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="property">Property</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Rarity</label>
                  <select
                    value={rewardForm.rarity}
                    onChange={(e) => setRewardForm({ ...rewardForm, rarity: e.target.value })}
                  >
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Icon</label>
                  <select
                    value={rewardForm.icon}
                    onChange={(e) => setRewardForm({ ...rewardForm, icon: e.target.value })}
                  >
                    {iconOptions.map(icon => (
                      <option key={icon} value={icon}>{icon.replace('fa-', '')}</option>
                    ))}
                  </select>
                  <div className="icon-preview">
                    <i className={`fas ${rewardForm.icon}`} style={{ color: getRarityColor(rewardForm.rarity) }}></i>
                  </div>
                </div>

                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={rewardForm.quantity}
                    onChange={(e) => setRewardForm({ ...rewardForm, quantity: e.target.value })}
                    min="1"
                  />
                </div>
              </div>

              {/* Conditional fields based on type */}
              {rewardForm.type === 'currency' && (
                <div className="form-row">
                  <div className="form-group full">
                    <label>Cash Amount ($)</label>
                    <input
                      type="number"
                      value={rewardForm.cash_amount}
                      onChange={(e) => setRewardForm({ ...rewardForm, cash_amount: e.target.value })}
                      placeholder="1000"
                    />
                  </div>
                </div>
              )}

              {rewardForm.type === 'item' && (
                <div className="form-row">
                  <div className="form-group full">
                    <label>Select Item from The Life</label>
                    <select
                      value={rewardForm.item_id}
                      onChange={(e) => {
                        const selectedItem = items.find(i => i.id === e.target.value);
                        setRewardForm({ 
                          ...rewardForm, 
                          item_id: e.target.value,
                          // Auto-fill name and rarity from item
                          name: selectedItem ? selectedItem.name : rewardForm.name,
                          rarity: selectedItem?.rarity || rewardForm.rarity
                        });
                      }}
                    >
                      <option value="">-- Select an item --</option>
                      {items.length === 0 && (
                        <option value="" disabled>No items found - check RLS policies</option>
                      )}
                      {items.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.type})
                        </option>
                      ))}
                    </select>
                    {items.length === 0 && (
                      <div style={{ color: '#f59e0b', fontSize: '12px', marginTop: '8px' }}>
                        ⚠️ No items loaded. Run: <code style={{ background: '#222', padding: '2px 6px', borderRadius: '3px' }}>
                          CREATE POLICY "Anyone can view items" ON the_life_items FOR SELECT USING (true);
                        </code>
                      </div>
                    )}
                    {/* Item Preview */}
                    {rewardForm.item_id && (() => {
                      const selectedItem = items.find(i => i.id === rewardForm.item_id);
                      return selectedItem ? (
                        <div className="item-preview" style={{ borderColor: getRarityColor(selectedItem.rarity || 'common') }}>
                          {selectedItem.image_url ? (
                            <img src={selectedItem.image_url} alt={selectedItem.name} />
                          ) : (
                            <i className={`fas ${selectedItem.icon || 'fa-box'}`} style={{ color: getRarityColor(selectedItem.rarity || 'common') }}></i>
                          )}
                          <div className="item-preview-info">
                            <strong>{selectedItem.name}</strong>
                            <span className="item-type">{selectedItem.type}</span>
                            <span className="item-rarity" style={{ color: getRarityColor(selectedItem.rarity || 'common') }}>
                              {selectedItem.rarity || 'common'}
                            </span>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}

              {rewardForm.type === 'xp' && (
                <div className="form-row">
                  <div className="form-group full">
                    <label>XP Amount</label>
                    <input
                      type="number"
                      value={rewardForm.xp_amount}
                      onChange={(e) => setRewardForm({ ...rewardForm, xp_amount: e.target.value })}
                      placeholder="500"
                    />
                  </div>
                </div>
              )}

              {rewardForm.type === 'se_points' && (
                <div className="form-row">
                  <div className="form-group full">
                    <label>SE Points Amount</label>
                    <input
                      type="number"
                      value={rewardForm.se_points_amount}
                      onChange={(e) => setRewardForm({ ...rewardForm, se_points_amount: e.target.value })}
                      placeholder="1000"
                    />
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group full">
                  <label>Description (Optional)</label>
                  <textarea
                    value={rewardForm.description}
                    onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                    placeholder="Reward description..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="sp-modal-footer">
              {(editingTrack === 'budget' ? editingTier?.budget_reward_id : editingTier?.premium_reward_id) && (
                <button className="btn-delete" onClick={removeReward} disabled={saving}>
                  🗑️ Remove Reward
                </button>
              )}
              <button className="btn-cancel" onClick={() => setShowRewardModal(false)}>
                Cancel
              </button>
              <button className="btn-save" onClick={saveReward} disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Reward'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Message */}
      {message && (
        <div className={`sp-toast ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}
    </div>
  );
}
