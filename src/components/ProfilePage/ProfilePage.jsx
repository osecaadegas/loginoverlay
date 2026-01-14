import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [inventory, setInventory] = useState([]);

  const avatarOptions = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=7',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=8',
  ];

  useEffect(() => {
    if (user) {
      loadAvatar();
      loadInventory();
    }
  }, [user]);

  const loadAvatar = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Ensure user_profiles has twitch_username stored
      const twitchUsername = user?.user_metadata?.twitch_username;
      if (twitchUsername) {
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            twitch_username: twitchUsername,
            avatar_url: data?.avatar_url || user?.user_metadata?.avatar_url,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      }

      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
        setSelectedAvatar(data.avatar_url);
      } else if (user?.user_metadata?.avatar_url) {
        setAvatarUrl(user.user_metadata.avatar_url);
        setSelectedAvatar(user.user_metadata.avatar_url);
      } else {
        setSelectedAvatar(avatarOptions[0]);
      }
    } catch (err) {
      console.error('Error loading avatar:', err);
    }
  };

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('user_inventory')
        .select(`
          id,
          quantity,
          acquired_at,
          equipped,
          items (
            id,
            name,
            description,
            type,
            icon,
            rarity,
            tradeable
          )
        `)
        .eq('user_id', user.id)
        .order('acquired_at', { ascending: false });

      if (error) throw error;

      // Transform data to flat structure
      const formattedInventory = data?.map(item => ({
        inventoryId: item.id,
        id: item.items.id,
        name: item.items.name,
        description: item.items.description,
        type: item.items.type,
        icon: item.items.icon,
        rarity: item.items.rarity,
        tradeable: item.items.tradeable,
        quantity: item.quantity,
        equipped: item.equipped,
        acquiredAt: item.acquired_at
      })) || [];

      setInventory(formattedInventory);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setInventory([]);
    }
  };

  const handleAvatarSelect = async (avatar) => {
    setSelectedAvatar(avatar);
    setAvatarUrl(avatar);
    
    // Update user metadata and profile
    try {
      await supabase.auth.updateUser({
        data: { avatar_url: avatar }
      });

      await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          avatar_url: avatar,
          twitch_username: user?.user_metadata?.twitch_username,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      setMessage({ type: 'success', text: 'Avatar updated successfully!' });
      setShowAvatarPicker(false);
    } catch (error) {
      console.error('Error updating avatar:', error);
      setMessage({ type: 'error', text: 'Failed to update avatar' });
    }
  };

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      setMessage({ type: '', text: '' });

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      // Update user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setMessage({ type: 'success', text: 'Avatar updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1>👤 Profile & Settings</h1>
        
        {message.text && (
          <div className={`profile-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="profile-content">
          <div className="profile-card">
            <div className="profile-avatar-container">
              {(avatarUrl || selectedAvatar) ? (
                <img src={avatarUrl || selectedAvatar} alt="Avatar" className="profile-avatar-large" />
              ) : (
                <div className="profile-avatar-large profile-avatar-placeholder">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="profile-avatar-actions">
                <button 
                  className="profile-avatar-btn" 
                  onClick={() => setShowAvatarPicker(true)}
                >
                  🎨 Choose Avatar
                </button>
                <label className="profile-avatar-upload" htmlFor="avatar-upload">
                  📷 Upload Custom
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
            <h2>{user?.email}</h2>
            <p className="profile-id">User ID: {user?.id.substring(0, 8)}...</p>
          </div>

          <div className="settings-card">
            <h3>Account Settings</h3>
            <div className="setting-item">
              <label>Email</label>
              <input type="email" value={user?.email || ''} disabled />
            </div>
            <div className="setting-item">
              <label>Password</label>
              <button className="change-btn">Change Password</button>
            </div>
            <div className="setting-item">
              <label>Notifications</label>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="inventory-card">
            <h3>🎒 Inventory</h3>
            <p className="inventory-subtitle">Your collected items and achievements</p>
            <div className="inventory-grid">
              {inventory.length > 0 ? (
                inventory.map(item => (
                  <div key={item.inventoryId} className={`inventory-item rarity-${item.rarity}`}>
                    <div className="item-icon">{item.icon}</div>
                    <div className="item-info">
                      <div className="item-name">{item.name}</div>
                      <div className="item-type">{item.type}</div>
                      {item.quantity > 1 && (
                        <div className="item-quantity">x{item.quantity}</div>
                      )}
                    </div>
                    <div className={`item-rarity ${item.rarity}`}>
                      {item.rarity}
                    </div>
                  </div>
                ))
              ) : (
                <div className="inventory-empty">
                  <p>📦 Your inventory is empty</p>
                  <p className="inventory-empty-subtitle">Earn items and achievements by participating in events!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Avatar Picker Modal */}
        {showAvatarPicker && (
          <div className="avatar-picker-overlay" onClick={() => setShowAvatarPicker(false)}>
            <div className="avatar-picker-card" onClick={(e) => e.stopPropagation()}>
              <h3 className="avatar-picker-title">Choose Your Avatar</h3>
              <div className="avatar-grid">
                {avatarOptions.map((avatar, index) => (
                  <img
                    key={index}
                    src={avatar}
                    alt={`Avatar ${index + 1}`}
                    className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                    onClick={() => handleAvatarSelect(avatar)}
                  />
                ))}
              </div>
              <button 
                className="avatar-picker-close" 
                onClick={() => setShowAvatarPicker(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
