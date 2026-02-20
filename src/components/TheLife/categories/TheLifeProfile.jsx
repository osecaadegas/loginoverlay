import '../styles/TheLifeProfile.css';
import { supabase } from '../../../config/supabaseClient';
import { useState, useEffect, useRef } from 'react';
import { addSeasonPassXP } from '../hooks/useSeasonPassXP';

export default function TheLifeProfile({ 
  player,
  setPlayer,
  theLifeInventory,
  setMessage,
  loadTheLifeInventory,
  initializePlayer,
  user
}) {
  const [avatars, setAvatars] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [profileTab, setProfileTab] = useState('avatar'); // 'avatar', 'equipment', 'consumables'
  const avatarsScrollRef = useRef(null);

  const scrollAvatars = (direction) => {
    if (avatarsScrollRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = avatarsScrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      avatarsScrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    loadAvatars();
  }, []);

  const loadAvatars = async () => {
    setLoadingAvatars(true);
    try {
      const { data, error } = await supabase
        .from('the_life_avatars')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setAvatars(data || []);
    } catch (err) {
      console.error('Error loading avatars:', err);
    } finally {
      setLoadingAvatars(false);
    }
  };

  const selectAvatar = async (avatarUrl) => {
    try {
      // Update the_life_players avatar
      const { error } = await supabase
        .from('the_life_players')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (error) throw error;

      // Also update user metadata so sidebar avatar syncs
      await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
      });

      setMessage({ type: 'success', text: 'Avatar updated!' });
      initializePlayer();
    } catch (err) {
      console.error('Error updating avatar:', err);
      setMessage({ type: 'error', text: 'Failed to update avatar' });
    }
  };

  const equipItem = async (item) => {
    if (!item.boost_type) {
      setMessage({ type: 'error', text: 'This item cannot be equipped!' });
      return;
    }

    const equipSlot = item.boost_type === 'power' ? 'equipped_weapon_id' : 
                      item.boost_type === 'defense' ? 'equipped_gear_id' : null;

    if (!equipSlot) {
      setMessage({ type: 'error', text: 'Invalid equipment type!' });
      return;
    }

    try {
      const { error } = await supabase
        .from('the_life_players')
        .update({ [equipSlot]: item.id })
        .eq('user_id', user.id);

      if (error) throw error;
      setMessage({ type: 'success', text: `Equipped ${item.name}!` });
      initializePlayer();
    } catch (err) {
      console.error('Error equipping item:', err);
      setMessage({ type: 'error', text: 'Failed to equip item' });
    }
  };

  const unequipItem = async (slot) => {
    try {
      const { error } = await supabase
        .from('the_life_players')
        .update({ [slot]: null })
        .eq('user_id', user.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Item unequipped!' });
      initializePlayer();
    } catch (err) {
      console.error('Error unequipping item:', err);
      setMessage({ type: 'error', text: 'Failed to unequip item' });
    }
  };

  const useConsumable = async (invItem) => {
    if (!invItem.item.effect) {
      setMessage({ type: 'error', text: 'This item has no effect!' });
      return;
    }

    try {
      const effect = JSON.parse(invItem.item.effect);
      let updateData = {};

      switch (effect.type) {
        case 'heal':
          updateData.hp = Math.min(player.max_hp, player.hp + effect.value);
          break;
        case 'stamina':
          updateData.stamina = Math.min(player.max_stamina, player.stamina + effect.value);
          // Add addiction if the item has it
          if (effect.addiction) {
            const newAddiction = Math.min(player.max_addiction || 100, (player.addiction || 0) + effect.addiction);
            updateData.addiction = newAddiction;
            // Check for overdose at 100 addiction
            if (newAddiction >= 100) {
              updateData.hp = 0;
              updateData.hospital_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
              setMessage({ type: 'error', text: '💀 OVERDOSE! Your addiction hit 100! You collapsed and were rushed to the hospital!' });
            }
          }
          break;
        case 'xp_boost':
          updateData.xp = player.xp + effect.value;
          // Add XP to Season Pass for XP boost items
          await addSeasonPassXP(user.id, effect.value, 'item_use', invItem.item.id?.toString());
          break;
        case 'cash':
          updateData.cash = player.cash + effect.value;
          break;
        case 'jail_free':
          if (!player.jail_until) {
            setMessage({ type: 'error', text: 'You are not in jail!' });
            return;
          }
          updateData.jail_until = null;
          break;
        default:
          setMessage({ type: 'error', text: 'Unknown effect type!' });
          return;
      }

      // Update player
      const { error: playerError } = await supabase
        .from('the_life_players')
        .update(updateData)
        .eq('user_id', user.id);

      if (playerError) throw playerError;

      // Remove one from inventory
      if (invItem.quantity > 1) {
        await supabase
          .from('the_life_player_inventory')
          .update({ quantity: invItem.quantity - 1 })
          .eq('id', invItem.id);
      } else {
        await supabase
          .from('the_life_player_inventory')
          .delete()
          .eq('id', invItem.id);
      }

      setMessage({ type: 'success', text: `Used ${invItem.item.name}!` });
      initializePlayer();
      loadTheLifeInventory();
    } catch (err) {
      console.error('Error using item:', err);
      setMessage({ type: 'error', text: 'Failed to use item' });
    }
  };

  // Get equipped items
  const equippedWeapon = theLifeInventory.find(inv => inv.item.id === player.equipped_weapon_id);
  const equippedGear = theLifeInventory.find(inv => inv.item.id === player.equipped_gear_id);

  // Filter inventory by type
  const weaponItems = theLifeInventory.filter(inv => inv.item.boost_type === 'power');
  const gearItems = theLifeInventory.filter(inv => inv.item.boost_type === 'defense');
  const consumableItems = theLifeInventory.filter(inv => inv.item.usable && inv.item.effect);

  return (
    <div className="profile-section">
      <div className="profile-header">
        <img src={player.avatar_url} alt="Avatar" className="profile-avatar-large" />
        <div className="profile-info">
          <h2>{player.se_username || player.twitch_username || user?.user_metadata?.preferred_username || 'Player'}</h2>
          <div className="profile-stats">
            <div className="stat-item">
              <span className="label">Level {player.level}</span>
            </div>
            <div className="stat-item">
              <span className="label">💰 ${player.cash?.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="label">⭐ {player.xp?.toLocaleString()} XP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button 
          className={`profile-tab ${profileTab === 'avatar' ? 'active' : ''}`}
          onClick={() => setProfileTab('avatar')}
        >
          👤 Avatar
        </button>
        <button 
          className={`profile-tab ${profileTab === 'equipment' ? 'active' : ''}`}
          onClick={() => setProfileTab('equipment')}
        >
          ⚔️ Equipment
        </button>
        <button 
          className={`profile-tab ${profileTab === 'consumables' ? 'active' : ''}`}
          onClick={() => setProfileTab('consumables')}
        >
          💊 Items
        </button>
        <button 
          className={`profile-tab ${profileTab === 'stats' ? 'active' : ''}`}
          onClick={() => setProfileTab('stats')}
        >
          📊 Stats
        </button>
      </div>

      {/* Avatar Selection */}
      {profileTab === 'avatar' && (
        <div className="profile-content">
          {loadingAvatars ? (
            <div className="loading">Loading avatars...</div>
          ) : (
            <div className="avatars-scroll-container">
              <div className="avatars-scroll" ref={avatarsScrollRef}>
                {avatars.map(avatar => (
                  <div 
                    key={avatar.id} 
                    className={`avatar-option ${player.avatar_url === avatar.image_url ? 'selected' : ''}`}
                    onClick={() => selectAvatar(avatar.image_url)}
                  >
                    <img src={avatar.image_url} alt={avatar.name} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Equipment */}
      {profileTab === 'equipment' && (
        <div className="profile-content">
          {/* Currently Equipped */}
          <div className="equipped-slots-container">
            <div className="equipped-slot-simple weapon-slot">
              <div className="slot-header">
                <h5>⚔️ Weapon</h5>
                <span className="slot-boost">Power Boost</span>
              </div>
              {equippedWeapon ? (
                <div className="equipped-item-simple">
                  <img src={equippedWeapon.item.icon} alt={equippedWeapon.item.name} />
                  <div className="item-info-simple">
                    <p className="item-name">{equippedWeapon.item.name}</p>
                    <p className="boost-value">+{equippedWeapon.item.boost_amount} Power</p>
                  </div>
                  <button 
                    className="unequip-btn-simple"
                    onClick={() => unequipItem('equipped_weapon_id')}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <p className="empty-slot">None equipped</p>
              )}
            </div>

            <div className="equipped-slot-simple gear-slot">
              <div className="slot-header">
                <h5>🛡️ Gear</h5>
                <span className="slot-boost">Defense Boost</span>
              </div>
              {equippedGear ? (
                <div className="equipped-item-simple">
                  <img src={equippedGear.item.icon} alt={equippedGear.item.name} />
                  <div className="item-info-simple">
                    <p className="item-name">{equippedGear.item.name}</p>
                    <p className="boost-value">+{equippedGear.item.boost_amount} Defense</p>
                  </div>
                  <button 
                    className="unequip-btn-simple"
                    onClick={() => unequipItem('equipped_gear_id')}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <p className="empty-slot">None equipped</p>
              )}
            </div>
          </div>

          {/* Available Weapons */}
          {weaponItems.length > 0 && (
            <div className="inventory-simple-section">
              <h4>⚔️ Available Weapons</h4>
              <div className="inventory-simple-grid">
                {weaponItems.map(inv => (
                  <div key={inv.id} className="inventory-simple-card">
                    <img src={inv.item.icon} alt={inv.item.name} />
                    <div className="item-simple-info">
                      <h5>{inv.item.name}</h5>
                      <p className="boost">+{inv.item.boost_amount} Power</p>
                    </div>
                    <button 
                      className="equip-btn-simple"
                      onClick={() => equipItem(inv.item)}
                      disabled={player.equipped_weapon_id === inv.item.id}
                    >
                      {player.equipped_weapon_id === inv.item.id ? '✓' : 'Equip'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Gear */}
          {gearItems.length > 0 && (
            <div className="inventory-simple-section">
              <h4>🛡️ Available Gear</h4>
              <div className="inventory-simple-grid">
                {gearItems.map(inv => (
                  <div key={inv.id} className="inventory-simple-card">
                    <img src={inv.item.icon} alt={inv.item.name} />
                    <div className="item-simple-info">
                      <h5>{inv.item.name}</h5>
                      <p className="boost">+{inv.item.boost_amount} Defense</p>
                    </div>
                    <button 
                      className="equip-btn-simple"
                      onClick={() => equipItem(inv.item)}
                      disabled={player.equipped_gear_id === inv.item.id}
                    >
                      {player.equipped_gear_id === inv.item.id ? '✓' : 'Equip'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {weaponItems.length === 0 && gearItems.length === 0 && (
            <p className="no-items">No equipment in inventory. Purchase items from the Monhe Store!</p>
          )}
        </div>
      )}

      {/* Consumables */}
      {profileTab === 'consumables' && (
        <div className="profile-content">
          {consumableItems.length === 0 ? (
            <p className="no-items">No consumable items in inventory</p>
          ) : (
            <div className="consumables-list">
              {consumableItems.map(inv => {
                let effectText = '';
                let addictionText = '';
                try {
                  const effect = JSON.parse(inv.item.effect);
                  switch (effect.type) {
                    case 'heal':
                      effectText = `+${effect.value} HP`;
                      break;
                    case 'stamina':
                      effectText = `+${effect.value} Stamina`;
                      if (effect.addiction) {
                        addictionText = `+${effect.addiction} Addiction`;
                      }
                      break;
                    case 'xp_boost':
                      effectText = `+${effect.value} XP`;
                      break;
                    case 'cash':
                      effectText = `+$${effect.value}`;
                      break;
                    case 'jail_free':
                      effectText = 'Get Out of Jail';
                      break;
                    default:
                      effectText = 'Unknown effect';
                  }
                } catch {
                  effectText = 'Invalid effect';
                }

                return (
                  <div key={inv.id} className="consumable-list-item">
                    <img src={inv.item.icon} alt={inv.item.name} />
                    <div className="consumable-info">
                      <h5>{inv.item.name}</h5>
                      <p className="effect">{effectText}</p>
                      {addictionText && <p className="effect addiction-warning">⚠️ {addictionText}</p>}
                      {inv.item.description && <p className="description">{inv.item.description}</p>}
                    </div>
                    <div className="consumable-actions">
                      <span className="quantity">x{inv.quantity}</span>
                      <button 
                        className="use-btn-simple"
                        onClick={() => useConsumable(inv)}
                      >
                        Use
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {profileTab === 'stats' && (
        <div className="profile-content">
          <div className="profile-stats-grid">
            <div className="stat-card">
              <span className="stat-icon">⭐</span>
              <span className="stat-value">{player?.level}</span>
              <span className="stat-label">Level</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🎯</span>
              <span className="stat-value">{player?.total_robberies || 0}</span>
              <span className="stat-label">Total Crimes</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">✅</span>
              <span className="stat-value">{player?.successful_robberies || 0}</span>
              <span className="stat-label">Successful</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📈</span>
              <span className="stat-value">
                {player?.total_robberies 
                  ? ((player.successful_robberies / player.total_robberies) * 100).toFixed(1)
                  : 0}%
              </span>
              <span className="stat-label">Success Rate</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">⚔️</span>
              <span className="stat-value">{player?.pvp_wins || 0}</span>
              <span className="stat-label">PvP Wins</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">🔥</span>
              <span className="stat-value">{player?.consecutive_logins || 0}</span>
              <span className="stat-label">Login Streak</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
