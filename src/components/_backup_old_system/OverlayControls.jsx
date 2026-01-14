import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePremium } from '../../hooks/usePremium';
import { useNavigate } from 'react-router-dom';
import supabase from '../../config/supabaseClient';
import { getAllSlots } from '../../utils/slotUtils';
import BonusHuntWidget from './widgets/BonusHuntWidget/BonusHuntWidget';
import SessionStatsWidget from './widgets/SessionStatsWidget/SessionStatsWidget';
import RecentWinsWidget from './widgets/RecentWinsWidget/RecentWinsWidget';
import TournamentsWidget from './widgets/TournamentsWidget/TournamentsWidget';
import CoinFlipWidget from './widgets/CoinFlipWidget/CoinFlipWidget';
import SlotmachineWidget from './widgets/SlotmachineWidget/SlotmachineWidget';
import RandomSlotPickerWidget from './widgets/RandomSlotPickerWidget/RandomSlotPickerWidget';
import WheelOfNamesWidget from './widgets/WheelOfNamesWidget/WheelOfNamesWidget';
import NavbarWidget from './widgets/NavbarWidget/NavbarWidget';
import ChatWidget from './widgets/ChatWidget/ChatWidget';
import CustomizationWidget from './widgets/CustomizationWidget/CustomizationWidget';
import WidgetSettingsTab from './tabs/WidgetSettingsTab';
import PositioningTab from './tabs/PositioningTab';
import LayoutTab from './tabs/LayoutTab';
import StylesTab from './tabs/StylesTab';
import './OverlayControls.css';

export default function OverlayControls() {
  const { user } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const navigate = useNavigate();
  
  const [overlay, setOverlay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slots, setSlots] = useState([]);
  const [activeTab, setActiveTab] = useState('widgets');

  const overlayUrl = overlay ? `${window.location.origin}/premium/overlay?id=${overlay.public_id}` : '';

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    if (!premiumLoading && !isPremium) {
      setLoading(false);
      return;
    }

    if (isPremium) {
      loadOverlay();
    }
  }, [user, isPremium, premiumLoading, navigate]);

  const loadOverlay = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch('/api/overlay/get', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 404) {
        // No overlay exists yet
        setOverlay(null);
      } else if (response.ok) {
        const data = await response.json();
        setOverlay(data);
      } else {
        console.error('Failed to load overlay');
      }
    } catch (error) {
      console.error('Error loading overlay:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOverlay = async () => {
    setSaving(true);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch('/api/overlay/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOverlay(data);
      } else {
        console.error('Failed to create overlay');
      }
    } catch (error) {
      console.error('Error creating overlay:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch('/api/overlay/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: newSettings })
      });

      if (response.ok) {
        const data = await response.json();
        setOverlay(data);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  useEffect(() => {
    const loadSlots = async () => {
      console.log('Loading slots from database...');
      try {
        const data = await getAllSlots();
        console.log('Slots loaded successfully:', data?.length, 'slots');
        console.log('First few slots:', data?.slice(0, 3));
        setSlots(data || []);
      } catch (error) {
        console.error('Error loading slots:', error);
        setSlots([]);
      }
    };
    loadSlots();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || premiumLoading) {
    return (
      <div className="overlay-controls-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="overlay-controls-page">
        <div className="premium-required">
          <h1>🔒 Premium Access Required</h1>
          <p>The overlay system is only available for premium members.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay-controls-page">
      <div className="overlay-controls-container">
        <header className="controls-header">
          <h1>🎨 Overlay Controls</h1>
          <p>Manage your stream overlay settings and widgets</p>
        </header>

        {!overlay ? (
          <div className="no-overlay">
            <div className="no-overlay-content">
              <h2>Create Your Overlay</h2>
              <p>You haven't created an overlay yet. Click below to get started!</p>
              <button 
                className="create-btn" 
                onClick={createOverlay}
                disabled={saving}
              >
                {saving ? 'Creating...' : '✨ Create Overlay'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overlay-url-section">
              <h2>📺 OBS Browser Source URL</h2>
              <div className="url-box">
                <input 
                  type="text" 
                  value={overlayUrl} 
                  readOnly 
                  className="url-input"
                />
                <button 
                  className="copy-btn" 
                  onClick={copyToClipboard}
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
              <p className="url-instructions">
                Copy this URL and add it as a Browser Source in OBS
              </p>
              <a 
                href={`/premium/overlay?id=${overlay.public_id}&preview=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="preview-link-btn"
              >
                👁️ Open Live Preview
              </a>
            </div>

            <div className="settings-section">
              {/* Tab Navigation */}
              <div className="tab-navigation">
                <button 
                  className={`tab-button ${activeTab === 'widgets' ? 'active' : ''}`}
                  onClick={() => setActiveTab('widgets')}
                >
                  <span className="tab-icon">⚙️</span>
                  Widget Settings
                </button>
                <button 
                  className={`tab-button ${activeTab === 'positioning' ? 'active' : ''}`}
                  onClick={() => setActiveTab('positioning')}
                >
                  <span className="tab-icon">🎯</span>
                  Positioning & Layout
                </button>
                <button 
                  className={`tab-button ${activeTab === 'styles' ? 'active' : ''}`}
                  onClick={() => setActiveTab('styles')}
                >
                  <span className="tab-icon">🎨</span>
                  Styles
                </button>
              </div>

              {/* Widget Settings Tab */}
              {activeTab === 'widgets' && (
                <WidgetSettingsTab overlay={overlay} updateSettings={updateSettings} slots={slots} />
              )}

              {/* Positioning Tab */}
              {activeTab === 'positioning' && (
                <PositioningTab overlay={overlay} updateSettings={updateSettings} />
              )}

              {/* Styles Tab */}
              {activeTab === 'styles' && (
                <StylesTab overlay={overlay} updateSettings={updateSettings} />
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
