import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [idCopied, setIdCopied] = useState(false);
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

      // Update user metadata (this is what the Sidebar reads!)
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      // Update user profile table
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          avatar_url: publicUrl,
          twitch_username: user?.user_metadata?.twitch_username,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setSelectedAvatar(publicUrl);
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
            <p className="profile-id">
              User ID: {user?.id.substring(0, 8)}...
              <button
                className="copy-id-btn"
                onClick={() => {
                  navigator.clipboard.writeText(user?.id || '').then(() => {
                    setIdCopied(true);
                    setTimeout(() => setIdCopied(false), 2000);
                  });
                }}
              >{idCopied ? '✅ Copied!' : '📋 Copy Full ID'}</button>
            </p>
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

          {/* ── Slot Auto-Tracker Setup Guide ── */}
          <div className="settings-card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a1040 100%)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <h3>🔗 Slot Auto-Tracker</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
              Automatically detect which slot you're playing and sync it with your Bonus Hunt overlay — no manual input needed.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 10 }}>Setup Guide</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</span>
                  <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                    <strong style={{ color: '#e2e8f0' }}>Download the extension</strong><br />
                    Find the <code style={{ background: 'rgba(99,102,241,0.2)', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>browser-extension</code> folder in the project files.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</span>
                  <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                    <strong style={{ color: '#e2e8f0' }}>Install in Chrome / Edge</strong><br />
                    Go to <code style={{ background: 'rgba(99,102,241,0.2)', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>chrome://extensions</code> → Enable <strong>Developer Mode</strong> (top right) → Click <strong>"Load unpacked"</strong> → Select the <code style={{ background: 'rgba(99,102,241,0.2)', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>browser-extension</code> folder.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>3</span>
                  <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                    <strong style={{ color: '#e2e8f0' }}>Configure the extension</strong><br />
                    Click the extension icon in your toolbar and enter:<br />
                    • <strong>Supabase URL</strong> — your project URL<br />
                    • <strong>Supabase Anon Key</strong> — your anon/public key<br />
                    • <strong>User ID</strong> — copy it using the button above ☝️
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>4</span>
                  <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                    <strong style={{ color: '#e2e8f0' }}>Enable in Bonus Hunt</strong><br />
                    In the Overlay Center → Bonus Hunt → Content tab, turn on <strong>"🔗 Auto-Tracker"</strong>.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ background: '#4ade80', color: '#000', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
                    <strong style={{ color: '#4ade80' }}>Play!</strong><br />
                    When you open a slot on Stake, Roobet, Duelbits, etc., the extension detects it and your overlay highlights the matching bonus automatically.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 8, padding: 10, fontSize: 11, color: '#fbbf24' }}>
              💡 <strong>Supported casinos:</strong> Stake, Roobet, Duelbits, Gamdom, Rollbit, BC.Game, Metaspins, Shuffle, Cloudbet, and more. The extension only reads tab URLs — it cannot see your balance or bets.
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
