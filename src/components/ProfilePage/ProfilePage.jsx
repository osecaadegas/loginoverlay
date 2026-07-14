import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Copy,
  ImagePlus,
  LockKeyhole,
  Mail,
  PackageOpen,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import './ProfilePage.css';

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=7',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=8',
];

function providerLabel(provider) {
  if (provider === 'twitch') return 'Twitch';
  if (provider === 'google') return 'Google';
  if (provider === 'discord') return 'Discord';
  return 'Email';
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [idCopied, setIdCopied] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [inventory, setInventory] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('profileNotifications') !== 'off');
  const [passwordSending, setPasswordSending] = useState(false);

  const authProvider = user?.app_metadata?.provider || 'email';
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.preferred_username || user?.email || 'Your account';
  const shortUserId = user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}` : '';
  const activeAvatar = avatarUrl || selectedAvatar;
  const hasEmailPassword = authProvider === 'email';

  const inventoryStats = useMemo(() => {
    const total = inventory.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    const equipped = inventory.filter((item) => item.equipped).length;
    return { total, equipped };
  }, [inventory]);

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

      const twitchUsername = user?.user_metadata?.twitch_username;
      if (twitchUsername) {
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            twitch_username: twitchUsername,
            avatar_url: data?.avatar_url || user?.user_metadata?.avatar_url,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });
      }

      const nextAvatar = data?.avatar_url || user?.user_metadata?.avatar_url || AVATAR_OPTIONS[0];
      setAvatarUrl(nextAvatar);
      setSelectedAvatar(nextAvatar);
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

      const formattedInventory = data?.map((item) => ({
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
        acquiredAt: item.acquired_at,
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

    try {
      await supabase.auth.updateUser({
        data: { avatar_url: avatar },
      });

      await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          avatar_url: avatar,
          twitch_username: user?.user_metadata?.twitch_username,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      setMessage({ type: 'success', text: 'Avatar updated.' });
      setShowAvatarPicker(false);
    } catch (error) {
      console.error('Error updating avatar:', error);
      setMessage({ type: 'error', text: 'Failed to update avatar.' });
    }
  };

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      setMessage({ type: '', text: '' });

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          avatar_url: publicUrl,
          twitch_username: user?.user_metadata?.twitch_username,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setSelectedAvatar(publicUrl);
      setMessage({ type: 'success', text: 'Avatar updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(user?.id || '').then(() => {
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 1800);
    });
  };

  const sendPasswordReset = async () => {
    if (!user?.email || !hasEmailPassword) return;
    setPasswordSending(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/profile`,
      });
      if (error) throw error;
      setMessage({ type: 'success', text: 'Password reset email sent.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not send password reset email.' });
    } finally {
      setPasswordSending(false);
    }
  };

  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    localStorage.setItem('profileNotifications', next ? 'on' : 'off');
    setMessage({ type: 'success', text: `Notifications ${next ? 'enabled' : 'disabled'} on this device.` });
  };

  return (
    <main className="profile-page">
      <div className="profile-container">
        <header className="profile-hero">
          <span className="profile-eyebrow">Account</span>
          <h1>Profile settings</h1>
          <p>Manage your avatar, login details and personal account preferences.</p>
        </header>

        {message.text && (
          <div className={`profile-message ${message.type}`} role="status">
            {message.text}
          </div>
        )}

        <section className="profile-shell">
          <article className="profile-card profile-card--identity">
            <div className="profile-avatar-wrap">
              {activeAvatar ? (
                <img src={activeAvatar} alt="Account avatar" className="profile-avatar-large" />
              ) : (
                <div className="profile-avatar-large profile-avatar-placeholder">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="profile-identity-copy">
              <span className="profile-pill"><ShieldCheck size={14} /> {providerLabel(authProvider)} login</span>
              <h2>{displayName}</h2>
              <p>{user?.email}</p>
            </div>
            <div className="profile-avatar-actions">
              <button className="profile-avatar-btn" type="button" onClick={() => setShowAvatarPicker(true)}>
                <ImagePlus size={16} /> Choose avatar
              </button>
              <label
                className="profile-avatar-upload"
                htmlFor="avatar-upload"
                role="button"
                tabIndex={0}
                aria-disabled={uploading}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    document.getElementById('avatar-upload')?.click();
                  }
                }}
              >
                <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload image'}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                disabled={uploading}
              />
            </div>
          </article>

          <article className="settings-card">
            <div className="profile-card-head">
              <div>
                <span className="profile-eyebrow">Security</span>
                <h3>Account details</h3>
              </div>
            </div>

            <div className="profile-settings-list">
              <div className="setting-item">
                <div className="setting-label">
                  <Mail size={17} />
                  <span>Email</span>
                </div>
                <input type="email" value={user?.email || ''} disabled />
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <UserRound size={17} />
                  <span>User ID</span>
                </div>
                <button type="button" className="copy-id-btn" onClick={copyUserId}>
                  {idCopied ? <Check size={15} /> : <Copy size={15} />}
                  {idCopied ? 'Copied' : shortUserId}
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <LockKeyhole size={17} />
                  <span>Password</span>
                </div>
                <button
                  type="button"
                  className="change-btn"
                  onClick={sendPasswordReset}
                  disabled={!hasEmailPassword || passwordSending}
                >
                  {passwordSending ? 'Sending...' : hasEmailPassword ? 'Send reset email' : 'Managed by provider'}
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <Bell size={17} />
                  <span>Notifications</span>
                </div>
                <button
                  type="button"
                  className={`profile-switch ${notificationsEnabled ? 'profile-switch--on' : ''}`}
                  onClick={toggleNotifications}
                  aria-pressed={notificationsEnabled}
                >
                  <span>{notificationsEnabled ? 'On' : 'Off'}</span>
                </button>
              </div>
            </div>
          </article>

          <article className="inventory-card">
            <div className="profile-card-head">
              <div>
                <span className="profile-eyebrow">Collection</span>
                <h3>Inventory</h3>
              </div>
              <div className="profile-inventory-stats">
                <span>{inventoryStats.total} items</span>
                <span>{inventoryStats.equipped} equipped</span>
              </div>
            </div>

            <div className="inventory-grid">
              {inventory.length > 0 ? (
                inventory.map((item) => (
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
                  <PackageOpen size={34} />
                  <p>Your inventory is empty</p>
                  <span>Items and achievements you collect will appear here.</span>
                </div>
              )}
            </div>
          </article>
        </section>

        {showAvatarPicker && (
          <div className="avatar-picker-overlay" onClick={() => setShowAvatarPicker(false)}>
            <div className="avatar-picker-card" onClick={(event) => event.stopPropagation()}>
              <div className="avatar-picker-head">
                <div>
                  <span className="profile-eyebrow">Avatar</span>
                  <h3 className="avatar-picker-title">Choose avatar</h3>
                </div>
                <button className="avatar-picker-close-icon" type="button" onClick={() => setShowAvatarPicker(false)} aria-label="Close avatar picker">
                  <X size={18} />
                </button>
              </div>
              <div className="avatar-grid">
                {AVATAR_OPTIONS.map((avatar, index) => (
                  <button
                    key={avatar}
                    type="button"
                    className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                    onClick={() => handleAvatarSelect(avatar)}
                    aria-label={`Choose avatar ${index + 1}`}
                  >
                    <img src={avatar} alt="" />
                  </button>
                ))}
              </div>
              <button className="avatar-picker-close" type="button" onClick={() => setShowAvatarPicker(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
