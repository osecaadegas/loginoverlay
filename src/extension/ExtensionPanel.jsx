/**
 * Twitch Extension Panel — Main App
 * Runs inside Twitch's iframe (Panel or Video Overlay)
 * 
 * Tabs: Predictions | Slots | Bets | Giveaway | Stats | Games
 */
import React, { useState, useEffect, useCallback } from 'react';
import { setTwitchAuth, getPoints, getConfig } from './extApi';
import PredictionsPanel from './panels/PredictionsPanel';
import SlotPickerPanel from './panels/SlotPickerPanel';
import BetsPanel from './panels/BetsPanel';
import GiveawayPanel from './panels/GiveawayPanel';
import StatsPanel from './panels/StatsPanel';
import GamesPanel from './panels/GamesPanel';
import './ExtensionPanel.css';

const TABS = [
  { id: 'predictions', label: '🎯 Predict', icon: '🎯' },
  { id: 'slots',       label: '🎰 Slots',   icon: '🎰' },
  { id: 'bets',        label: '💰 Bets',     icon: '💰' },
  { id: 'giveaway',    label: '🎁 Giveaway', icon: '🎁' },
  { id: 'stats',       label: '📊 Stats',    icon: '📊' },
  { id: 'games',       label: '🎮 Games',    icon: '🎮' },
];

export default function ExtensionPanel() {
  const [auth, setAuth] = useState(null);
  const [tab, setTab] = useState('predictions');
  const [points, setPoints] = useState(0);
  const [config, setConfig] = useState({});
  const [error, setError] = useState(null);

  // Initialize Twitch auth
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Twitch?.ext) {
      window.Twitch.ext.onAuthorized((twitchAuth) => {
        setTwitchAuth(twitchAuth);
        setAuth(twitchAuth);
      });

      window.Twitch.ext.onError((err) => {
        console.error('Twitch Extension Error:', err);
        setError(err);
      });
    }
  }, []);

  // Fetch points & config when auth ready
  useEffect(() => {
    if (!auth) return;
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [auth]);

  const loadData = useCallback(async () => {
    try {
      const [ptsRes, cfgRes] = await Promise.all([getPoints(), getConfig()]);
      setPoints(ptsRes.points || 0);
      setConfig(cfgRes.config || {});
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, []);

  const refreshPoints = useCallback(async () => {
    try {
      const res = await getPoints();
      setPoints(res.points || 0);
    } catch {}
  }, []);

  if (error) {
    return (
      <div className="ext-panel ext-error">
        <p>⚠️ Extension Error</p>
        <small>{String(error)}</small>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="ext-panel ext-loading">
        <div className="ext-spinner" />
        <p>Connecting...</p>
      </div>
    );
  }

  // Filter tabs based on config
  const visibleTabs = TABS.filter(t => {
    if (t.id === 'predictions' && config.predictions_enabled === false) return false;
    if (t.id === 'slots' && config.slot_vote_enabled === false) return false;
    if (t.id === 'bets' && config.bets_enabled === false) return false;
    if (t.id === 'giveaway' && config.giveaway_enabled === false) return false;
    if (t.id === 'games' && config.games_enabled === false) return false;
    return true;
  });

  const theme = {
    primary: config.theme_primary || '#9146FF',
    bg: config.theme_bg || '#0e0e10',
    card: config.theme_card || '#18181b',
    text: config.theme_text || '#efeff1',
    accent: config.theme_accent || '#bf94ff',
  };

  return (
    <div className="ext-panel" style={{
      '--ext-primary': theme.primary,
      '--ext-bg': theme.bg,
      '--ext-card': theme.card,
      '--ext-text': theme.text,
      '--ext-accent': theme.accent,
    }}>
      {/* Points bar */}
      <div className="ext-points-bar">
        <span className="ext-points-label">💎 {points.toLocaleString()}</span>
        <span className="ext-points-tag">Points</span>
      </div>

      {/* Tab bar */}
      <div className="ext-tabs">
        {visibleTabs.map(t => (
          <button
            key={t.id}
            className={`ext-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="ext-content">
        {tab === 'predictions' && <PredictionsPanel points={points} onPointsChange={refreshPoints} />}
        {tab === 'slots' && <SlotPickerPanel points={points} onPointsChange={refreshPoints} config={config} />}
        {tab === 'bets' && <BetsPanel points={points} onPointsChange={refreshPoints} />}
        {tab === 'giveaway' && <GiveawayPanel points={points} onPointsChange={refreshPoints} />}
        {tab === 'stats' && <StatsPanel />}
        {tab === 'games' && <GamesPanel points={points} onPointsChange={refreshPoints} />}
      </div>
    </div>
  );
}
