import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StreamElementsProvider } from './context/StreamElementsContext';
import { LanguageProvider } from './contexts/LanguageContext';
import StreamElementsPanel from './components/StreamElements/StreamElementsPanel';
import PointsManager from './components/PointsManager/PointsManager';
import LandingPage from './components/LandingPage/LandingPage';
import AdminPanel from './components/AdminPanel/AdminPanel';
import Sidebar from './components/Sidebar/Sidebar';
import OffersPage from './components/OffersPage/OffersPage';
import AboutPage from './components/AboutPage/AboutPage';
import GamesPage from './components/GamesPage/GamesPage';
import TournamentsPage from './components/TournamentsPage/TournamentsPage';
import GuessBalancePage from './components/GuessBalancePage/GuessBalancePage';
import GiveawaysPage from './components/GiveawaysPage/GiveawaysPage';
import { checkUserAccess } from './utils/adminUtils';
import GiveawayPanel from './components/GiveawayPanel/GiveawayPanel';
import TwitchChat from './components/TwitchChat/TwitchChat';
import BlackjackPremium from './components/Blackjack/BlackjackPremium';
import Mines from './components/Mines/Mines';
import TheLife from './components/TheLife/TheLifeNew';
import TheLifeJournal from './components/TheLife/pages/TheLifeJournal';
import SlotManagerPage from './components/SlotManager/SlotManagerPage';
import GiveawayPage from './components/GiveawayPanel/GiveawayPage';
import { useStreamElements } from './context/StreamElementsContext';
import ProtectedAdminRoute from './components/ProtectedRoute/ProtectedAdminRoute';
import VoucherManager from './components/VoucherManager/VoucherManager';
import VoucherRedeemPage from './components/VoucherRedeemPage/VoucherRedeemPage';
import GiveawayCreator from './components/GiveawayCreator/GiveawayCreator';
import ProfilePage from './components/ProfilePage/ProfilePage';
import DailyWheelPage from './components/DailyWheel/DailyWheelPage';
import SeasonPass from './components/SeasonPass/SeasonPass';

function AppContent({ isAdminOverlay = false }) {
  const location = useLocation();
  const { user } = useAuth();
  const { latestRedemption, setLatestRedemption } = useStreamElements();
  // Removed overlay-related state

  // Toggle body class based on current route
  useEffect(() => {
    if (location.pathname === '/admin-overlay') {
      document.body.classList.add('no-sidebar');
    } else {
      document.body.classList.remove('no-sidebar');
    }
  }, [location.pathname]);

  // Load and subscribe to theme changes from database
  useEffect(() => {
    if (!user || location.pathname !== '/overlay') return;

    const loadAndSubscribeTheme = async () => {
      try {
        // Subscribe to real-time theme changes
        const subscription = subscribeToOverlayState(user.id, (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newState = payload.new;
            if (newState.theme) {
              // Save to localStorage and dispatch event to trigger theme application
              localStorage.setItem('selectedTheme', newState.theme);
              window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newState.theme } }));
            }
          }
        });

        return () => {
          unsubscribe(subscription);
        };
      } catch (error) {
        console.error('Error loading/subscribing to theme:', error);
      }
    };

    loadAndSubscribeTheme();
  }, [user, location.pathname]);

  // Apply saved theme on startup
  useEffect(() => {
    const applyThemeFromStorage = () => {
      const savedTheme = localStorage.getItem('selectedTheme');
      if (savedTheme) {
        // Define theme colors (same as in CustomizationPanel)
        const THEMES = window.THEME_DEFINITIONS = {
          'cyberpunk': { colors: { primary: '#00ff41', secondary: '#ff006e', accent: '#00d4ff', background: '#0a0e27', text: '#00ff41', panelBg: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(26, 27, 46, 0.95))', border: '#00ff41' }, font: 'Orbitron, monospace' },
          'minimal': { colors: { primary: '#000000', secondary: '#6b7280', accent: '#3b82f6', background: '#ffffff', text: '#000000', panelBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98))', border: '#e5e7eb' }, font: 'Inter, sans-serif' },
          'royal': { colors: { primary: '#7c3aed', secondary: '#fbbf24', accent: '#ec4899', background: '#1e1b4b', text: '#fbbf24', panelBg: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(88, 28, 135, 0.95))', border: '#fbbf24' }, font: 'Playfair Display, serif' },
          'gaming': { colors: { primary: '#10b981', secondary: '#ef4444', accent: '#f59e0b', background: '#111827', text: '#10b981', panelBg: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))', border: '#10b981' }, font: 'Rajdhani, sans-serif' },
          'ocean': { colors: { primary: '#06b6d4', secondary: '#0ea5e9', accent: '#38bdf8', background: '#0c4a6e', text: '#e0f2fe', panelBg: 'linear-gradient(135deg, rgba(12, 74, 110, 0.95), rgba(7, 89, 133, 0.95))', border: '#38bdf8' }, font: 'Nunito, sans-serif' },
          'sunset': { colors: { primary: '#f97316', secondary: '#ec4899', accent: '#fbbf24', background: '#431407', text: '#fed7aa', panelBg: 'linear-gradient(135deg, rgba(67, 20, 7, 0.95), rgba(124, 45, 18, 0.95))', border: '#f97316' }, font: 'Poppins, sans-serif' },
          'matrix': { colors: { primary: '#00ff00', secondary: '#00cc00', accent: '#00ff88', background: '#000000', text: '#00ff00', panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 20, 0, 0.98))', border: '#00ff00' }, font: 'Courier New, monospace' },
          'synthwave': { colors: { primary: '#ff00ff', secondary: '#00ffff', accent: '#ffff00', background: '#2d0b54', text: '#ff00ff', panelBg: 'linear-gradient(135deg, rgba(45, 11, 84, 0.95), rgba(88, 24, 69, 0.95))', border: '#ff00ff' }, font: 'Audiowide, cursive' },
          'forest': { colors: { primary: '#22c55e', secondary: '#84cc16', accent: '#a3e635', background: '#14532d', text: '#dcfce7', panelBg: 'linear-gradient(135deg, rgba(20, 83, 45, 0.95), rgba(21, 128, 61, 0.95))', border: '#22c55e' }, font: 'Lato, sans-serif' },
          'midnight': { colors: { primary: '#3b82f6', secondary: '#8b5cf6', accent: '#06b6d4', background: '#0f172a', text: '#dbeafe', panelBg: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))', border: '#3b82f6' }, font: 'Roboto, sans-serif' },
          'christmas': { colors: { primary: '#dc2626', secondary: '#16a34a', accent: '#fbbf24', background: '#7f1d1d', text: '#fef2f2', panelBg: 'linear-gradient(135deg, rgba(127, 29, 29, 0.95), rgba(153, 27, 27, 0.95))', border: '#fbbf24' }, font: 'Mountains of Christmas, cursive' },
          'halloween': { colors: { primary: '#f97316', secondary: '#7c2d12', accent: '#a855f7', background: '#1c1917', text: '#fed7aa', panelBg: 'linear-gradient(135deg, rgba(28, 25, 23, 0.95), rgba(87, 83, 78, 0.95))', border: '#f97316' }, font: 'Creepster, cursive' },
          'summer': { colors: { primary: '#fbbf24', secondary: '#06b6d4', accent: '#fb923c', background: '#0c4a6e', text: '#fef3c7', panelBg: 'linear-gradient(135deg, rgba(12, 74, 110, 0.95), rgba(14, 165, 233, 0.95))', border: '#fbbf24' }, font: 'Quicksand, sans-serif' },
          'autumn': { colors: { primary: '#d97706', secondary: '#dc2626', accent: '#ca8a04', background: '#78350f', text: '#fed7aa', panelBg: 'linear-gradient(135deg, rgba(120, 53, 15, 0.95), rgba(146, 64, 14, 0.95))', border: '#d97706' }, font: 'Merriweather, serif' },
          'neon-pulse': { colors: { primary: '#ff0080', secondary: '#7928ca', accent: '#00dfd8', background: '#0a0a0f', text: '#ff0080', panelBg: 'linear-gradient(135deg, rgba(10, 10, 15, 0.95), rgba(121, 40, 202, 0.15))', border: '#ff0080' }, font: 'Teko, sans-serif' },
          'aurora-wave': { colors: { primary: '#00f5ff', secondary: '#9d00ff', accent: '#00ff85', background: '#001a1f', text: '#00f5ff', panelBg: 'linear-gradient(135deg, rgba(0, 26, 31, 0.95), rgba(0, 77, 88, 0.95))', border: '#00f5ff' }, font: 'Exo 2, sans-serif' },
          'fire-storm': { colors: { primary: '#ff4500', secondary: '#ffd700', accent: '#ff6347', background: '#1a0000', text: '#ffa500', panelBg: 'linear-gradient(135deg, rgba(26, 0, 0, 0.95), rgba(139, 0, 0, 0.95))', border: '#ff4500' }, font: 'Saira Condensed, sans-serif' },
          'electric-blue': { colors: { primary: '#00bfff', secondary: '#1e90ff', accent: '#87ceeb', background: '#000814', text: '#00bfff', panelBg: 'linear-gradient(135deg, rgba(0, 8, 20, 0.95), rgba(0, 33, 71, 0.95))', border: '#00bfff' }, font: 'Chakra Petch, sans-serif' },
          'plasma-burst': { colors: { primary: '#ff00ff', secondary: '#ff1493', accent: '#da70d6', background: '#120012', text: '#ff69b4', panelBg: 'linear-gradient(135deg, rgba(18, 0, 18, 0.95), rgba(75, 0, 130, 0.95))', border: '#ff00ff' }, font: 'Electrolize, sans-serif' },
          'frosted-glass': { colors: { primary: '#ffffff', secondary: '#e0e7ff', accent: '#c7d2fe', background: '#f8fafc', text: '#1e293b', panelBg: 'rgba(255, 255, 255, 0.25)', border: 'rgba(255, 255, 255, 0.4)' }, font: 'Space Grotesk, sans-serif' },
          'crystal-clear': { colors: { primary: '#60a5fa', secondary: '#818cf8', accent: '#a78bfa', background: '#eff6ff', text: '#1e40af', panelBg: 'rgba(191, 219, 254, 0.3)', border: 'rgba(96, 165, 250, 0.5)' }, font: 'Outfit, sans-serif' },
          'smoke-glass': { colors: { primary: '#94a3b8', secondary: '#64748b', accent: '#cbd5e1', background: '#0f172a', text: '#f1f5f9', panelBg: 'rgba(30, 41, 59, 0.35)', border: 'rgba(148, 163, 184, 0.4)' }, font: 'DM Sans, sans-serif' },
          'amber-glass': { colors: { primary: '#fbbf24', secondary: '#f59e0b', accent: '#fcd34d', background: '#451a03', text: '#fef3c7', panelBg: 'rgba(217, 119, 6, 0.25)', border: 'rgba(251, 191, 36, 0.45)' }, font: 'Sora, sans-serif' },
          'rose-glass': { colors: { primary: '#f472b6', secondary: '#ec4899', accent: '#fbcfe8', background: '#500724', text: '#fce7f3', panelBg: 'rgba(219, 39, 119, 0.28)', border: 'rgba(244, 114, 182, 0.45)' }, font: 'Plus Jakarta Sans, sans-serif' },
          'gold-luxe': { colors: { primary: '#ffd700', secondary: '#b8860b', accent: '#ffec8b', background: '#1a1410', text: '#fffaf0', panelBg: 'linear-gradient(135deg, rgba(26, 20, 16, 0.95), rgba(101, 67, 33, 0.95))', border: '#ffd700' }, font: 'Cinzel, serif' },
          'platinum-elite': { colors: { primary: '#e5e4e2', secondary: '#c0c0c0', accent: '#f5f5f5', background: '#1c1c1e', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(28, 28, 30, 0.95), rgba(58, 58, 60, 0.95))', border: '#e5e4e2' }, font: 'Montserrat, sans-serif' },
          'emerald-crown': { colors: { primary: '#50c878', secondary: '#2e8b57', accent: '#98fb98', background: '#0d1f17', text: '#f0fff4', panelBg: 'linear-gradient(135deg, rgba(13, 31, 23, 0.95), rgba(46, 139, 87, 0.35))', border: '#50c878' }, font: 'Cormorant Garamond, serif' },
          'sapphire-royal': { colors: { primary: '#0f52ba', secondary: '#082567', accent: '#4169e1', background: '#020a1a', text: '#e6f2ff', panelBg: 'linear-gradient(135deg, rgba(2, 10, 26, 0.95), rgba(15, 82, 186, 0.35))', border: '#0f52ba' }, font: 'Libre Baskerville, serif' },
          'obsidian-prestige': { colors: { primary: '#d4af37', secondary: '#1c1c1c', accent: '#f4e4c1', background: '#000000', text: '#e8e8e8', panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(28, 28, 28, 0.98))', border: '#d4af37' }, font: 'Bebas Neue, cursive' },
          // Glossy Themes
          'glossy-cherry': { colors: { primary: '#dc143c', secondary: '#ff1744', accent: '#ff4569', background: '#1a0505', text: '#ffebee', panelBg: 'linear-gradient(135deg, rgba(26, 5, 5, 0.98), rgba(220, 20, 60, 0.15))', border: '#dc143c' }, font: 'Quicksand, sans-serif' },
          'glossy-ocean': { colors: { primary: '#00acc1', secondary: '#00bcd4', accent: '#26c6da', background: '#0a1a1f', text: '#e0f7fa', panelBg: 'linear-gradient(135deg, rgba(10, 26, 31, 0.98), rgba(0, 172, 193, 0.15))', border: '#00acc1' }, font: 'Varela Round, sans-serif' },
          'glossy-lime': { colors: { primary: '#cddc39', secondary: '#d4e157', accent: '#dce775', background: '#1a1f05', text: '#f9fbe7', panelBg: 'linear-gradient(135deg, rgba(26, 31, 5, 0.98), rgba(205, 220, 57, 0.15))', border: '#cddc39' }, font: 'Nunito, sans-serif' },
          'glossy-grape': { colors: { primary: '#9c27b0', secondary: '#ab47bc', accent: '#ba68c8', background: '#1a051f', text: '#f3e5f5', panelBg: 'linear-gradient(135deg, rgba(26, 5, 31, 0.98), rgba(156, 39, 176, 0.15))', border: '#9c27b0' }, font: 'Comfortaa, cursive' },
          'glossy-tangerine': { colors: { primary: '#ff6f00', secondary: '#ff8f00', accent: '#ffa726', background: '#1f0f00', text: '#fff3e0', panelBg: 'linear-gradient(135deg, rgba(31, 15, 0, 0.98), rgba(255, 111, 0, 0.15))', border: '#ff6f00' }, font: 'Poppins, sans-serif' },
          'glossy-mint': { colors: { primary: '#00e676', secondary: '#1de9b6', accent: '#69f0ae', background: '#051f0f', text: '#e0f2f1', panelBg: 'linear-gradient(135deg, rgba(5, 31, 15, 0.98), rgba(0, 230, 118, 0.15))', border: '#00e676' }, font: 'Lato, sans-serif' },
          'glossy-rose': { colors: { primary: '#f50057', secondary: '#ff4081', accent: '#ff80ab', background: '#1f0510', text: '#fce4ec', panelBg: 'linear-gradient(135deg, rgba(31, 5, 16, 0.98), rgba(245, 0, 87, 0.15))', border: '#f50057' }, font: 'Josefin Sans, sans-serif' },
          'glossy-sky': { colors: { primary: '#03a9f4', secondary: '#29b6f6', accent: '#4fc3f7', background: '#050f1f', text: '#e1f5fe', panelBg: 'linear-gradient(135deg, rgba(5, 15, 31, 0.98), rgba(3, 169, 244, 0.15))', border: '#03a9f4' }, font: 'Raleway, sans-serif' },
          'glossy-amber': { colors: { primary: '#ffc107', secondary: '#ffca28', accent: '#ffd54f', background: '#1f1705', text: '#fff8e1', panelBg: 'linear-gradient(135deg, rgba(31, 23, 5, 0.98), rgba(255, 193, 7, 0.15))', border: '#ffc107' }, font: 'Montserrat, sans-serif' },
          'glossy-lavender': { colors: { primary: '#9575cd', secondary: '#b39ddb', accent: '#d1c4e9', background: '#0f051f', text: '#ede7f6', panelBg: 'linear-gradient(135deg, rgba(15, 5, 31, 0.98), rgba(149, 117, 205, 0.15))', border: '#9575cd' }, font: 'Cabin, sans-serif' },
          // Matte Themes
          'matte-charcoal': { colors: { primary: '#424242', secondary: '#616161', accent: '#757575', background: '#0a0a0a', text: '#e0e0e0', panelBg: 'rgba(18, 18, 18, 0.95)', border: '#424242' }, font: 'Roboto, sans-serif' },
          'matte-slate': { colors: { primary: '#607d8b', secondary: '#78909c', accent: '#90a4ae', background: '#0f1419', text: '#cfd8dc', panelBg: 'rgba(23, 30, 36, 0.95)', border: '#607d8b' }, font: 'Inter, sans-serif' },
          'matte-sage': { colors: { primary: '#8d9f87', secondary: '#a8b89f', accent: '#b8c9af', background: '#0f140e', text: '#e8f0e5', panelBg: 'rgba(25, 31, 23, 0.95)', border: '#8d9f87' }, font: 'Quicksand, sans-serif' },
          'matte-terracotta': { colors: { primary: '#a0695f', secondary: '#b8877f', accent: '#c9a19f', background: '#140f0e', text: '#f0e5e3', panelBg: 'rgba(31, 23, 21, 0.95)', border: '#a0695f' }, font: 'Crimson Text, serif' },
          'matte-moss': { colors: { primary: '#6b7d5c', secondary: '#7f9270', accent: '#94a684', background: '#0e140c', text: '#e5ede0', panelBg: 'rgba(21, 30, 18, 0.95)', border: '#6b7d5c' }, font: 'Merriweather, serif' },
          'matte-clay': { colors: { primary: '#9c6d5b', secondary: '#b08573', accent: '#c49e8f', background: '#140f0c', text: '#f0e8e3', panelBg: 'rgba(30, 22, 18, 0.95)', border: '#9c6d5b' }, font: 'Lora, serif' },
          'matte-concrete': { colors: { primary: '#808080', secondary: '#999999', accent: '#b3b3b3', background: '#0d0d0d', text: '#e6e6e6', panelBg: 'rgba(26, 26, 26, 0.95)', border: '#808080' }, font: 'Work Sans, sans-serif' },
          'matte-sand': { colors: { primary: '#c4a57b', secondary: '#d4b896', accent: '#e3ccaf', background: '#1a1510', text: '#f5ede0', panelBg: 'rgba(38, 32, 24, 0.95)', border: '#c4a57b' }, font: 'Nunito Sans, sans-serif' },
          'matte-ash': { colors: { primary: '#696969', secondary: '#808080', accent: '#979797', background: '#0b0b0b', text: '#d9d9d9', panelBg: 'rgba(20, 20, 20, 0.95)', border: '#696969' }, font: 'Open Sans, sans-serif' },
          'matte-olive': { colors: { primary: '#6b705c', secondary: '#7f8570', accent: '#939984', background: '#0e0f0c', text: '#e8ebe5', panelBg: 'rgba(22, 24, 19, 0.95)', border: '#6b705c' }, font: 'Karla, sans-serif' },
          // Anodized Themes
          'anodized-titanium': { colors: { primary: '#8e9aaf', secondary: '#a3b0c7', accent: '#b8c6df', background: '#0f1318', text: '#dde3f0', panelBg: 'linear-gradient(135deg, rgba(15, 19, 24, 0.95), rgba(66, 79, 104, 0.25))', border: '#8e9aaf' }, font: 'Rajdhani, sans-serif' },
          'anodized-blue': { colors: { primary: '#2962ff', secondary: '#448aff', accent: '#82b1ff', background: '#05091a', text: '#e3f2fd', panelBg: 'linear-gradient(135deg, rgba(5, 9, 26, 0.95), rgba(41, 98, 255, 0.2))', border: '#2962ff' }, font: 'Electrolize, sans-serif' },
          'anodized-purple': { colors: { primary: '#7c4dff', secondary: '#9d6eff', accent: '#b794f6', background: '#0f051a', text: '#ede7f6', panelBg: 'linear-gradient(135deg, rgba(15, 5, 26, 0.95), rgba(124, 77, 255, 0.2))', border: '#7c4dff' }, font: 'Orbitron, sans-serif' },
          'anodized-red': { colors: { primary: '#ff1744', secondary: '#ff4569', accent: '#ff6e8e', background: '#1a0508', text: '#ffebee', panelBg: 'linear-gradient(135deg, rgba(26, 5, 8, 0.95), rgba(255, 23, 68, 0.2))', border: '#ff1744' }, font: 'Saira, sans-serif' },
          'anodized-green': { colors: { primary: '#00e676', secondary: '#69f0ae', accent: '#b9fbc0', background: '#05140a', text: '#e8f5e9', panelBg: 'linear-gradient(135deg, rgba(5, 20, 10, 0.95), rgba(0, 230, 118, 0.2))', border: '#00e676' }, font: 'Exo 2, sans-serif' },
          'anodized-gold': { colors: { primary: '#ffc400', secondary: '#ffd740', accent: '#ffea00', background: '#1a1405', text: '#fffde7', panelBg: 'linear-gradient(135deg, rgba(26, 20, 5, 0.95), rgba(255, 196, 0, 0.2))', border: '#ffc400' }, font: 'Teko, sans-serif' },
          'anodized-cyan': { colors: { primary: '#00e5ff', secondary: '#18ffff', accent: '#84ffff', background: '#05141a', text: '#e0f7fa', panelBg: 'linear-gradient(135deg, rgba(5, 20, 26, 0.95), rgba(0, 229, 255, 0.2))', border: '#00e5ff' }, font: 'Audiowide, cursive' },
          'anodized-magenta': { colors: { primary: '#d500f9', secondary: '#e040fb', accent: '#ea80fc', background: '#14051a', text: '#f3e5f5', panelBg: 'linear-gradient(135deg, rgba(20, 5, 26, 0.95), rgba(213, 0, 249, 0.2))', border: '#d500f9' }, font: 'Russo One, sans-serif' },
          'anodized-orange': { colors: { primary: '#ff6d00', secondary: '#ff9100', accent: '#ffab40', background: '#1a0f05', text: '#fff3e0', panelBg: 'linear-gradient(135deg, rgba(26, 15, 5, 0.95), rgba(255, 109, 0, 0.2))', border: '#ff6d00' }, font: 'Play, sans-serif' },
          'anodized-silver': { colors: { primary: '#bdbdbd', secondary: '#e0e0e0', accent: '#eeeeee', background: '#0d0d0d', text: '#fafafa', panelBg: 'linear-gradient(135deg, rgba(13, 13, 13, 0.95), rgba(189, 189, 189, 0.2))', border: '#bdbdbd' }, font: 'Michroma, sans-serif' },
          // Metallic Themes
          'metallic-chrome': { colors: { primary: '#c0c0c0', secondary: '#d3d3d3', accent: '#e8e8e8', background: '#0a0a0a', text: '#f5f5f5', panelBg: 'linear-gradient(135deg, rgba(10, 10, 10, 0.98), rgba(192, 192, 192, 0.1))', border: '#c0c0c0' }, font: 'Orbitron, sans-serif' },
          'metallic-bronze': { colors: { primary: '#cd7f32', secondary: '#e09856', accent: '#f0b17a', background: '#1a0f05', text: '#fff0e0', panelBg: 'linear-gradient(135deg, rgba(26, 15, 5, 0.98), rgba(205, 127, 50, 0.15))', border: '#cd7f32' }, font: 'Cinzel, serif' },
          'metallic-copper': { colors: { primary: '#b87333', secondary: '#d4915e', accent: '#e8b088', background: '#1a0e05', text: '#ffeedd', panelBg: 'linear-gradient(135deg, rgba(26, 14, 5, 0.98), rgba(184, 115, 51, 0.15))', border: '#b87333' }, font: 'EB Garamond, serif' },
          'metallic-steel': { colors: { primary: '#71797e', secondary: '#8e969c', accent: '#abb3ba', background: '#0c0d0e', text: '#e5e8eb', panelBg: 'linear-gradient(135deg, rgba(12, 13, 14, 0.98), rgba(113, 121, 126, 0.15))', border: '#71797e' }, font: 'Rajdhani, sans-serif' },
          'metallic-platinum': { colors: { primary: '#e5e4e2', secondary: '#f0efed', accent: '#fafaf8', background: '#0d0d0d', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(13, 13, 13, 0.98), rgba(229, 228, 226, 0.1))', border: '#e5e4e2' }, font: 'Playfair Display, serif' },
          'metallic-cobalt': { colors: { primary: '#0047ab', secondary: '#2563eb', accent: '#60a5fa', background: '#05091a', text: '#dbeafe', panelBg: 'linear-gradient(135deg, rgba(5, 9, 26, 0.98), rgba(0, 71, 171, 0.15))', border: '#0047ab' }, font: 'Saira Condensed, sans-serif' },
          'metallic-pewter': { colors: { primary: '#96a8a1', secondary: '#adbfb8', accent: '#c4d6cf', background: '#0e100f', text: '#e8f0ed', panelBg: 'linear-gradient(135deg, rgba(14, 16, 15, 0.98), rgba(150, 168, 161, 0.15))', border: '#96a8a1' }, font: 'Roboto Condensed, sans-serif' },
          'metallic-brass': { colors: { primary: '#b5a642', secondary: '#d4c76a', accent: '#f0e892', background: '#1a1605', text: '#fffaed', panelBg: 'linear-gradient(135deg, rgba(26, 22, 5, 0.98), rgba(181, 166, 66, 0.15))', border: '#b5a642' }, font: 'Libre Baskerville, serif' },
          'metallic-gunmetal': { colors: { primary: '#536872', secondary: '#6d808a', accent: '#8798a2', background: '#0a0c0e', text: '#dce3e8', panelBg: 'linear-gradient(135deg, rgba(10, 12, 14, 0.98), rgba(83, 104, 114, 0.15))', border: '#536872' }, font: 'Barlow, sans-serif' },
          'metallic-mercury': { colors: { primary: '#e1e1e1', secondary: '#eeeeee', accent: '#fafafa', background: '#0e0e0e', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(14, 14, 14, 0.98), rgba(225, 225, 225, 0.08))', border: '#e1e1e1' }, font: 'Electrolize, sans-serif' },
          // Vibrant Themes
          'vibrant-red': { colors: { primary: '#ff0000', secondary: '#ff3333', accent: '#ff6666', background: '#1a0000', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(26, 0, 0, 0.95), rgba(100, 0, 0, 0.95))', border: '#ff0000' }, font: 'Poppins, sans-serif' },
          'vibrant-blue': { colors: { primary: '#0066ff', secondary: '#3385ff', accent: '#66a3ff', background: '#00091a', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(0, 9, 26, 0.95), rgba(0, 40, 100, 0.95))', border: '#0066ff' }, font: 'Poppins, sans-serif' },
          'vibrant-orange': { colors: { primary: '#ff6600', secondary: '#ff8533', accent: '#ffa366', background: '#1a0a00', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(26, 10, 0, 0.95), rgba(100, 40, 0, 0.95))', border: '#ff6600' }, font: 'Poppins, sans-serif' },
          'vibrant-green': { colors: { primary: '#00ff00', secondary: '#33ff33', accent: '#66ff66', background: '#001a00', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(0, 26, 0, 0.95), rgba(0, 100, 0, 0.95))', border: '#00ff00' }, font: 'Poppins, sans-serif' },
          'vibrant-pink': { colors: { primary: '#ff1493', secondary: '#ff43a6', accent: '#ff71b9', background: '#1a0010', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(26, 0, 16, 0.95), rgba(100, 0, 60, 0.95))', border: '#ff1493' }, font: 'Poppins, sans-serif' },
          'vibrant-purple': { colors: { primary: '#9900ff', secondary: '#ad33ff', accent: '#c266ff', background: '#10001a', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(16, 0, 26, 0.95), rgba(60, 0, 100, 0.95))', border: '#9900ff' }, font: 'Poppins, sans-serif' },
          'vibrant-grey': { colors: { primary: '#666666', secondary: '#808080', accent: '#999999', background: '#0d0d0d', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(13, 13, 13, 0.95), rgba(50, 50, 50, 0.95))', border: '#666666' }, font: 'Poppins, sans-serif' },
          'vibrant-black': { colors: { primary: '#1a1a1a', secondary: '#333333', accent: '#4d4d4d', background: '#000000', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(26, 26, 26, 0.98))', border: '#1a1a1a' }, font: 'Poppins, sans-serif' },
          'vibrant-white': { colors: { primary: '#ffffff', secondary: '#f2f2f2', accent: '#e6e6e6', background: '#f5f5f5', text: '#000000', panelBg: 'linear-gradient(135deg, rgba(245, 245, 245, 0.98), rgba(255, 255, 255, 0.98))', border: '#cccccc' }, font: 'Poppins, sans-serif' },
          'vibrant-cyan': { colors: { primary: '#00ffff', secondary: '#33ffff', accent: '#66ffff', background: '#001a1a', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(0, 26, 26, 0.95), rgba(0, 100, 100, 0.95))', border: '#00ffff' }, font: 'Poppins, sans-serif' },
          // Vivid Themes
          'vivid-red': { colors: { primary: '#e60000', secondary: '#ff1a1a', accent: '#ff4d4d', background: '#260000', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(38, 0, 0, 0.98), rgba(128, 0, 0, 0.98))', border: '#e60000' }, font: 'Montserrat, sans-serif' },
          'vivid-blue': { colors: { primary: '#0052cc', secondary: '#1a6bff', accent: '#4d8fff', background: '#000d26', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(0, 13, 38, 0.98), rgba(0, 52, 128, 0.98))', border: '#0052cc' }, font: 'Montserrat, sans-serif' },
          'vivid-orange': { colors: { primary: '#ff5500', secondary: '#ff7733', accent: '#ff9955', background: '#260d00', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(38, 13, 0, 0.98), rgba(128, 54, 0, 0.98))', border: '#ff5500' }, font: 'Montserrat, sans-serif' },
          'vivid-green': { colors: { primary: '#00cc00', secondary: '#1aff1a', accent: '#4dff4d', background: '#002600', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(0, 38, 0, 0.98), rgba(0, 128, 0, 0.98))', border: '#00cc00' }, font: 'Montserrat, sans-serif' },
          'vivid-pink': { colors: { primary: '#ff0080', secondary: '#ff339f', accent: '#ff66b8', background: '#260013', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(38, 0, 19, 0.98), rgba(128, 0, 64, 0.98))', border: '#ff0080' }, font: 'Montserrat, sans-serif' },
          'vivid-purple': { colors: { primary: '#8800ff', secondary: '#9f33ff', accent: '#b866ff', background: '#130026', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(19, 0, 38, 0.98), rgba(64, 0, 128, 0.98))', border: '#8800ff' }, font: 'Montserrat, sans-serif' },
          'vivid-grey': { colors: { primary: '#595959', secondary: '#737373', accent: '#8c8c8c', background: '#121212', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(18, 18, 18, 0.98), rgba(60, 60, 60, 0.98))', border: '#595959' }, font: 'Montserrat, sans-serif' },
          'vivid-black': { colors: { primary: '#262626', secondary: '#404040', accent: '#595959', background: '#000000', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(38, 38, 38, 0.98))', border: '#262626' }, font: 'Montserrat, sans-serif' },
          'vivid-white': { colors: { primary: '#f2f2f2', secondary: '#e6e6e6', accent: '#d9d9d9', background: '#fafafa', text: '#000000', panelBg: 'linear-gradient(135deg, rgba(250, 250, 250, 0.98), rgba(242, 242, 242, 0.98))', border: '#bfbfbf' }, font: 'Montserrat, sans-serif' },
          'vivid-cyan': { colors: { primary: '#00e6e6', secondary: '#1affff', accent: '#4dffff', background: '#002626', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(0, 38, 38, 0.98), rgba(0, 128, 128, 0.98))', border: '#00e6e6' }, font: 'Montserrat, sans-serif' },
          // FX Themes (50 themes with animated borders)
          'fx-rgb-pulse': { colors: { primary: '#ff0080', secondary: '#00ff80', accent: '#0080ff', background: '#0a0a0f', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(10, 10, 15, 0.95), rgba(20, 20, 30, 0.95))', border: 'linear-gradient(90deg, #ff0080, #00ff80, #0080ff, #ff0080)' }, font: 'Orbitron, sans-serif' },
          'fx-neon-pulse': { colors: { primary: '#00ffff', secondary: '#ff00ff', accent: '#ffff00', background: '#0a0a0f', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(10, 10, 15, 0.95), rgba(20, 20, 30, 0.95))', border: 'linear-gradient(90deg, #00ffff, #ff00ff, #ffff00, #00ffff)' }, font: 'Audiowide, cursive' },
          'fx-cyber-stripe': { colors: { primary: '#00ff41', secondary: '#00ffff', accent: '#ff0080', background: '#0a0e27', text: '#00ff41', panelBg: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(26, 27, 46, 0.95))', border: '#00ff41' }, font: 'Rajdhani, sans-serif' },
          'fx-matrix-flow': { colors: { primary: '#00ff00', secondary: '#00cc00', accent: '#00ff88', background: '#000000', text: '#00ff00', panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 20, 0, 0.98))', border: '#00ff00' }, font: 'Courier New, monospace' },
          'fx-fire-pulse': { colors: { primary: '#ff4500', secondary: '#ffd700', accent: '#ff6347', background: '#1a0000', text: '#ffa500', panelBg: 'linear-gradient(135deg, rgba(26, 0, 0, 0.95), rgba(139, 0, 0, 0.95))', border: 'linear-gradient(90deg, #ff0000, #ff4500, #ffa500, #ffd700)' }, font: 'Saira Condensed, sans-serif' },
          'fx-ice-flow': { colors: { primary: '#00bfff', secondary: '#1e90ff', accent: '#87ceeb', background: '#000814', text: '#00bfff', panelBg: 'linear-gradient(135deg, rgba(0, 8, 20, 0.95), rgba(0, 33, 71, 0.95))', border: 'linear-gradient(90deg, #00bfff, #87ceeb, #e0ffff, #87ceeb, #00bfff)' }, font: 'Exo 2, sans-serif' },
          'fx-toxic-stripe': { colors: { primary: '#39ff14', secondary: '#ccff00', accent: '#7fff00', background: '#0a1a00', text: '#39ff14', panelBg: 'linear-gradient(135deg, rgba(10, 26, 0, 0.95), rgba(20, 40, 0, 0.95))', border: '#39ff14' }, font: 'Russo One, sans-serif' },
          'fx-plasma-wave': { colors: { primary: '#ff00ff', secondary: '#ff1493', accent: '#da70d6', background: '#120012', text: '#ff69b4', panelBg: 'linear-gradient(135deg, rgba(18, 0, 18, 0.95), rgba(75, 0, 130, 0.95))', border: 'linear-gradient(90deg, #ff00ff, #da70d6, #ba55d3, #da70d6, #ff00ff)' }, font: 'Electrolize, sans-serif' },
          'fx-sunset-stripe': { colors: { primary: '#ff4500', secondary: '#ff8c00', accent: '#ffd700', background: '#1a0500', text: '#ffe4b5', panelBg: 'linear-gradient(135deg, rgba(26, 5, 0, 0.95), rgba(50, 10, 0, 0.95))', border: '#ff4500' }, font: 'Bebas Neue, cursive' },
          'fx-ocean-pulse': { colors: { primary: '#006994', secondary: '#0096c7', accent: '#48cae4', background: '#03045e', text: '#90e0ef', panelBg: 'linear-gradient(135deg, rgba(3, 4, 94, 0.95), rgba(0, 105, 148, 0.95))', border: 'linear-gradient(90deg, #006994, #0096c7, #00b4d8, #48cae4)' }, font: 'Montserrat, sans-serif' },
          'fx-retro-stripes': { colors: { primary: '#ff00ff', secondary: '#00ffff', accent: '#ffff00', background: '#2d0b54', text: '#ff00ff', panelBg: 'linear-gradient(135deg, rgba(45, 11, 84, 0.95), rgba(88, 24, 69, 0.95))', border: '#ff00ff' }, font: 'Audiowide, cursive' },
          'fx-danger-zone': { colors: { primary: '#ff0000', secondary: '#ffff00', accent: '#ff4500', background: '#1a0000', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(26, 0, 0, 0.95), rgba(40, 0, 0, 0.95))', border: '#ff0000' }, font: 'Teko, sans-serif' },
          'fx-electric-stripe': { colors: { primary: '#00ffff', secondary: '#0080ff', accent: '#00bfff', background: '#000814', text: '#00ffff', panelBg: 'linear-gradient(135deg, rgba(0, 8, 20, 0.95), rgba(0, 20, 40, 0.95))', border: '#00ffff' }, font: 'Orbitron, sans-serif' },
          'fx-cyber-pink': { colors: { primary: '#ff0080', secondary: '#ff1493', accent: '#ff69b4', background: '#1a0010', text: '#ffb3d9', panelBg: 'linear-gradient(135deg, rgba(26, 0, 16, 0.95), rgba(50, 0, 30, 0.95))', border: 'linear-gradient(90deg, #ff0080, #ff1493, #ff69b4, #ff1493, #ff0080)' }, font: 'Comfortaa, cursive' },
          'fx-gold-pulse': { colors: { primary: '#ffd700', secondary: '#ffed4e', accent: '#fff700', background: '#1a1400', text: '#fffacd', panelBg: 'linear-gradient(135deg, rgba(26, 20, 0, 0.95), rgba(50, 40, 0, 0.95))', border: 'linear-gradient(90deg, #b8860b, #ffd700, #ffed4e, #fff700)' }, font: 'Cinzel, serif' },
          'fx-emerald-flow': { colors: { primary: '#50c878', secondary: '#2ecc71', accent: '#7fffd4', background: '#0d1f17', text: '#d0f0c0', panelBg: 'linear-gradient(135deg, rgba(13, 31, 23, 0.95), rgba(20, 50, 35, 0.95))', border: 'linear-gradient(90deg, #2ecc71, #50c878, #7fffd4, #50c878, #2ecc71)' }, font: 'Playfair Display, serif' },
          'fx-ruby-stripe': { colors: { primary: '#e0115f', secondary: '#ff1744', accent: '#ff4569', background: '#1a0008', text: '#ffcce0', panelBg: 'linear-gradient(135deg, rgba(26, 0, 8, 0.95), rgba(50, 0, 20, 0.95))', border: '#e0115f' }, font: 'Lora, serif' },
          'fx-sapphire-pulse': { colors: { primary: '#0f52ba', secondary: '#1e90ff', accent: '#4169e1', background: '#020a1a', text: '#b0d4ff', panelBg: 'linear-gradient(135deg, rgba(2, 10, 26, 0.95), rgba(5, 20, 50, 0.95))', border: 'linear-gradient(90deg, #082567, #0f52ba, #1e90ff, #4169e1)' }, font: 'Libre Baskerville, serif' },
          'fx-toxic-warning': { colors: { primary: '#adff2f', secondary: '#7fff00', accent: '#00ff00', background: '#0f1a00', text: '#f0fff0', panelBg: 'linear-gradient(135deg, rgba(15, 26, 0, 0.95), rgba(30, 50, 0, 0.95))', border: '#adff2f' }, font: 'Russo One, sans-serif' },
          'fx-midnight-stripe': { colors: { primary: '#191970', secondary: '#4169e1', accent: '#6495ed', background: '#0a0a1a', text: '#e6f0ff', panelBg: 'linear-gradient(135deg, rgba(10, 10, 26, 0.95), rgba(20, 20, 40, 0.95))', border: '#191970' }, font: 'Raleway, sans-serif' },
          'fx-rainbow-flash': { colors: { primary: '#ff0000', secondary: '#00ff00', accent: '#0000ff', background: '#0a0a0a', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95), rgba(20, 20, 20, 0.95))', border: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)' }, font: 'Poppins, sans-serif' },
          'fx-aurora-borealis': { colors: { primary: '#00ff9f', secondary: '#00d4ff', accent: '#b19cd9', background: '#001a2e', text: '#e0ffff', panelBg: 'linear-gradient(135deg, rgba(0, 26, 46, 0.95), rgba(0, 40, 70, 0.95))', border: 'linear-gradient(90deg, #00ff9f, #00d4ff, #7b68ee, #b19cd9)' }, font: 'Quicksand, sans-serif' },
          'fx-prism-split': { colors: { primary: '#ff00ff', secondary: '#00ffff', accent: '#ffff00', background: '#1a0a1a', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(26, 10, 26, 0.95), rgba(40, 20, 40, 0.95))', border: '#ff00ff' }, font: 'Space Grotesk, sans-serif' },
          'fx-laser-grid': { colors: { primary: '#ff0000', secondary: '#00ff00', accent: '#0000ff', background: '#000000', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 10, 10, 0.98))', border: '#ff0000' }, font: 'Orbitron, sans-serif' },
          'fx-holographic': { colors: { primary: '#c0c0c0', secondary: '#ffd700', accent: '#ff1493', background: '#1a1a2e', text: '#f0f0f0', panelBg: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(40, 40, 60, 0.95))', border: 'linear-gradient(90deg, #ff0080, #ff8c00, #ffd700, #00ff80, #00bfff, #8000ff, #ff0080)' }, font: 'Michroma, sans-serif' },
          'fx-chromatic-wave': { colors: { primary: '#ff6b6b', secondary: '#4ecdc4', accent: '#ffe66d', background: '#2d2d2d', text: '#f7fff7', panelBg: 'linear-gradient(135deg, rgba(45, 45, 45, 0.95), rgba(60, 60, 60, 0.95))', border: 'linear-gradient(90deg, #ff6b6b, #ee5a6f, #c44569, #6c5ce7, #4ecdc4)' }, font: 'Nunito, sans-serif' },
          'fx-neon-city': { colors: { primary: '#ff2a6d', secondary: '#05d9e8', accent: '#d1f7ff', background: '#01012b', text: '#d1f7ff', panelBg: 'linear-gradient(135deg, rgba(1, 1, 43, 0.95), rgba(10, 10, 60, 0.95))', border: 'linear-gradient(90deg, #ff2a6d, #ff6a3d, #f9ca24, #05d9e8, #d1f7ff)' }, font: 'Teko, sans-serif' },
          'fx-cosmic-rays': { colors: { primary: '#8e44ad', secondary: '#3498db', accent: '#e74c3c', background: '#0c0c1e', text: '#ecf0f1', panelBg: 'linear-gradient(135deg, rgba(12, 12, 30, 0.95), rgba(20, 20, 40, 0.95))', border: '#8e44ad' }, font: 'Exo 2, sans-serif' },
          'fx-vapor-wave': { colors: { primary: '#ff71ce', secondary: '#01cdfe', accent: '#05ffa1', background: '#2e003e', text: '#fffb96', panelBg: 'linear-gradient(135deg, rgba(46, 0, 62, 0.95), rgba(70, 0, 95, 0.95))', border: 'linear-gradient(90deg, #ff71ce, #b967ff, #01cdfe, #05ffa1, #fffb96)' }, font: 'Audiowide, cursive' },
          'fx-sunset-glow': { colors: { primary: '#ff6348', secondary: '#ff9ff3', accent: '#feca57', background: '#2f3640', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(47, 54, 64, 0.95), rgba(60, 70, 80, 0.95))', border: 'linear-gradient(90deg, #ee5a24, #ff6348, #ff9ff3, #feca57)' }, font: 'Montserrat, sans-serif' },
          'fx-glitch-matrix': { colors: { primary: '#00ff00', secondary: '#ff00ff', accent: '#00ffff', background: '#000000', text: '#00ff00', panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 10, 10, 0.98))', border: '#00ff00' }, font: 'Courier New, monospace' },
          'fx-digital-rain': { colors: { primary: '#0f0', secondary: '#0d0', accent: '#0a0', background: '#000', text: '#0f0', panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 10, 0, 0.98))', border: '#0f0' }, font: 'Courier New, monospace' },
          'fx-circuit-pulse': { colors: { primary: '#00ff9f', secondary: '#00bfff', accent: '#7b68ee', background: '#0a0a0f', text: '#00ffff', panelBg: 'linear-gradient(135deg, rgba(10, 10, 15, 0.95), rgba(15, 15, 25, 0.95))', border: '#00ff9f' }, font: 'Rajdhani, sans-serif' },
          'fx-binary-code': { colors: { primary: '#00ff00', secondary: '#ffffff', accent: '#00ff00', background: '#000000', text: '#00ff00', panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(5, 5, 5, 0.98))', border: '#00ff00' }, font: 'Courier New, monospace' },
          'fx-data-stream': { colors: { primary: '#00d4ff', secondary: '#0080ff', accent: '#00ffff', background: '#001122', text: '#00d4ff', panelBg: 'linear-gradient(135deg, rgba(0, 17, 34, 0.95), rgba(0, 30, 50, 0.95))', border: '#00d4ff' }, font: 'Electrolize, sans-serif' },
          'fx-quantum-pulse': { colors: { primary: '#9d4edd', secondary: '#7209b7', accent: '#c77dff', background: '#10002b', text: '#e0aaff', panelBg: 'linear-gradient(135deg, rgba(16, 0, 43, 0.95), rgba(30, 0, 70, 0.95))', border: 'linear-gradient(90deg, #240046, #9d4edd, #c77dff, #e0aaff)' }, font: 'Orbitron, sans-serif' },
          'fx-tech-noir': { colors: { primary: '#ff0055', secondary: '#00aaff', accent: '#ffffff', background: '#0a0a0a', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95), rgba(20, 20, 20, 0.95))', border: '#ff0055' }, font: 'Russo One, sans-serif' },
          'fx-neon-grid': { colors: { primary: '#ff006e', secondary: '#8338ec', accent: '#3a86ff', background: '#0a0103', text: '#fb5607', panelBg: 'linear-gradient(135deg, rgba(10, 1, 3, 0.95), rgba(20, 5, 10, 0.95))', border: '#ff006e' }, font: 'Play, sans-serif' },
          'fx-cyber-scan': { colors: { primary: '#00ff41', secondary: '#00ff88', accent: '#00ffcc', background: '#001a0a', text: '#00ff41', panelBg: 'linear-gradient(135deg, rgba(0, 26, 10, 0.95), rgba(0, 40, 20, 0.95))', border: '#00ff41' }, font: 'Saira, sans-serif' },
          'fx-retro-computer': { colors: { primary: '#33ff33', secondary: '#00cc00', accent: '#99ff99', background: '#001100', text: '#33ff33', panelBg: 'linear-gradient(135deg, rgba(0, 17, 0, 0.95), rgba(0, 30, 0, 0.95))', border: '#33ff33' }, font: 'Courier New, monospace' },
          'fx-disco-fever': { colors: { primary: '#ff00ff', secondary: '#00ff00', accent: '#ffff00', background: '#1a001a', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(26, 0, 26, 0.95), rgba(40, 0, 40, 0.95))', border: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000)' }, font: 'Bebas Neue, cursive' },
          'fx-lightning-storm': { colors: { primary: '#ffff00', secondary: '#ffffff', accent: '#00bfff', background: '#0a0a1a', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(10, 10, 26, 0.95), rgba(20, 20, 40, 0.95))', border: '#ffff00' }, font: 'Teko, sans-serif' },
          'fx-bloodmoon': { colors: { primary: '#8b0000', secondary: '#ff0000', accent: '#ff6347', background: '#1a0000', text: '#ffcccc', panelBg: 'linear-gradient(135deg, rgba(26, 0, 0, 0.95), rgba(50, 0, 0, 0.95))', border: 'linear-gradient(90deg, #4a0000, #8b0000, #ff0000, #ff6347)' }, font: 'Creepster, cursive' },
          'fx-cyber-dragon': { colors: { primary: '#ff0000', secondary: '#ff4500', accent: '#ffd700', background: '#0a0000', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(10, 0, 0, 0.95), rgba(30, 0, 0, 0.95))', border: '#ff0000' }, font: 'Cinzel, serif' },
          'fx-arctic-pulse': { colors: { primary: '#00ffff', secondary: '#87ceeb', accent: '#ffffff', background: '#001a2e', text: '#e0ffff', panelBg: 'linear-gradient(135deg, rgba(0, 26, 46, 0.95), rgba(0, 40, 70, 0.95))', border: 'linear-gradient(90deg, #00ffff, #40e0d0, #87ceeb, #b0e0e6)' }, font: 'Quicksand, sans-serif' },
          'fx-magma-flow': { colors: { primary: '#ff4500', secondary: '#ff6347', accent: '#ff8c00', background: '#1a0500', text: '#ffe4b5', panelBg: 'linear-gradient(135deg, rgba(26, 5, 0, 0.95), rgba(50, 10, 0, 0.95))', border: 'linear-gradient(90deg, #8b0000, #ff0000, #ff4500, #ff6347, #ff8c00)' }, font: 'Saira Condensed, sans-serif' },
          'fx-radioactive': { colors: { primary: '#00ff00', secondary: '#adff2f', accent: '#7fff00', background: '#001a00', text: '#f0fff0', panelBg: 'linear-gradient(135deg, rgba(0, 26, 0, 0.95), rgba(0, 40, 0, 0.95))', border: '#00ff00' }, font: 'Russo One, sans-serif' },
          'fx-crystal-prism': { colors: { primary: '#ffffff', secondary: '#e0e0e0', accent: '#f5f5f5', background: '#1a1a1a', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(40, 40, 40, 0.95))', border: 'linear-gradient(90deg, #ff0080, #ff8c00, #ffd700, #00ff80, #00bfff, #8000ff, #ff0080)' }, font: 'Playfair Display, serif' },
          'fx-demon-eye': { colors: { primary: '#ff0000', secondary: '#8b0000', accent: '#ff4500', background: '#0a0000', text: '#ffcccc', panelBg: 'linear-gradient(135deg, rgba(10, 0, 0, 0.95), rgba(20, 0, 0, 0.95))', border: '#ff0000' }, font: 'Creepster, cursive' },
          'fx-galaxy-spiral': { colors: { primary: '#9d4edd', secondary: '#3a0ca3', accent: '#f72585', background: '#0c0032', text: '#e0aaff', panelBg: 'linear-gradient(135deg, rgba(12, 0, 50, 0.95), rgba(20, 0, 80, 0.95))', border: 'linear-gradient(90deg, #240046, #3c096c, #5a189a, #7209b7, #9d4edd, #c77dff, #e0aaff)' }, font: 'Exo 2, sans-serif' },
          'fx-thunder-bolt': { colors: { primary: '#ffd700', secondary: '#ffff00', accent: '#ffffff', background: '#000033', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(0, 0, 51, 0.95), rgba(0, 0, 80, 0.95))', border: '#ffd700' }, font: 'Teko, sans-serif' },
          'fx-inferno-gate': { colors: { primary: '#ff0000', secondary: '#ff4500', accent: '#ff8c00', background: '#1a0000', text: '#ffe4b5', panelBg: 'linear-gradient(135deg, rgba(26, 0, 0, 0.95), rgba(50, 0, 0, 0.95))', border: '#ff0000' }, font: 'Saira Condensed, sans-serif' },
          'fx-portal-nexus': { colors: { primary: '#00ffff', secondary: '#ff00ff', accent: '#ffff00', background: '#0a0a1a', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(10, 10, 26, 0.95), rgba(20, 20, 40, 0.95))', border: 'linear-gradient(90deg, #00ffff, #0080ff, #8000ff, #ff00ff, #ff0080, #ff8000, #ffff00, #00ffff)' }, font: 'Orbitron, sans-serif' },
          'fx-corrupted-data': { colors: { primary: '#00ff00', secondary: '#ff00ff', accent: '#00ffff', background: '#000000', text: '#00ff00', panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 10, 10, 0.98))', border: '#00ff00' }, font: 'Courier New, monospace' },
          'fx-neon-tokyo': { colors: { primary: '#ff007f', secondary: '#00ffff', accent: '#ff00ff', background: '#0a0a1a', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(10, 10, 26, 0.95), rgba(20, 20, 40, 0.95))', border: '#ff007f' }, font: 'Audiowide, cursive' },
          'fx-void-walker': { colors: { primary: '#9d4edd', secondary: '#3c096c', accent: '#c77dff', background: '#000000', text: '#e0aaff', panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 0, 20, 0.98))', border: 'linear-gradient(90deg, #000000, #3c096c, #9d4edd, #c77dff, #9d4edd, #3c096c, #000000)' }, font: 'Cinzel, serif' },
          'fx-hyper-speed': { colors: { primary: '#00ffff', secondary: '#00bfff', accent: '#ffffff', background: '#000033', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(0, 0, 51, 0.95), rgba(0, 0, 80, 0.95))', border: '#00ffff' }, font: 'Rajdhani, sans-serif' },
          'fx-royal-crown': { colors: { primary: '#ffd700', secondary: '#9d4edd', accent: '#ffffff', background: '#1a0a2e', text: '#ffffff', panelBg: 'linear-gradient(135deg, rgba(26, 10, 46, 0.95), rgba(40, 20, 70, 0.95))', border: 'linear-gradient(90deg, #ffd700, #ffed4e, #ffd700, #9d4edd, #c77dff, #9d4edd, #ffd700)' }, font: 'Playfair Display, serif' },
          'fx-aurora-storm': { colors: { primary: '#00ff9f', secondary: '#00d4ff', accent: '#ff00ff', background: '#001a2e', text: '#e0ffff', panelBg: 'linear-gradient(135deg, rgba(0, 26, 46, 0.95), rgba(0, 40, 70, 0.95))', border: 'linear-gradient(90deg, #00ff9f, #00d4ff, #7b68ee, #ff00ff)' }, font: 'Quicksand, sans-serif' },
          'fx-pixel-surge': { colors: { primary: '#ff006e', secondary: '#8338ec', accent: '#3a86ff', background: '#000000', text: '#fb5607', panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 0, 5, 0.98))', border: '#ff006e' }, font: 'Press Start 2P, cursive' }
        };
        
        const theme = THEMES[savedTheme];
        if (theme) {
          document.documentElement.style.setProperty('--theme-primary', theme.colors.primary);
          document.documentElement.style.setProperty('--theme-secondary', theme.colors.secondary);
          document.documentElement.style.setProperty('--theme-accent', theme.colors.accent);
          document.documentElement.style.setProperty('--theme-background', theme.colors.background);
          document.documentElement.style.setProperty('--theme-text', theme.colors.text);
          document.documentElement.style.setProperty('--theme-panel-bg', theme.colors.panelBg);
          document.documentElement.style.setProperty('--theme-border', theme.colors.border);
          document.documentElement.style.setProperty('--theme-font', theme.font);
          
          // Apply FX theme border animations
          if (savedTheme.startsWith('fx-')) {
            // Map FX themes to appropriate animations
            let animation = 'rgb-pulse'; // default
            if (savedTheme.includes('pulse')) animation = 'rgb-pulse';
            else if (savedTheme.includes('neon')) animation = 'neon-pulse';
            else if (savedTheme.includes('fire') || savedTheme.includes('inferno') || savedTheme.includes('magma')) animation = 'fire-pulse';
            else if (savedTheme.includes('rainbow') || savedTheme.includes('disco') || savedTheme.includes('holographic') || savedTheme.includes('prism')) animation = 'rainbow-flash';
            else if (savedTheme.includes('glitch') || savedTheme.includes('corrupted')) animation = 'glitch-scroll';
            else if (savedTheme.includes('lightning') || savedTheme.includes('thunder')) animation = 'lightning-flash';
            else if (savedTheme.includes('stripe') || savedTheme.includes('retro') || savedTheme.includes('danger') || savedTheme.includes('electric')) animation = 'stripe-scroll';
            
            document.documentElement.style.setProperty('--theme-border-animation', animation);
            document.body.classList.add('fx-theme-active');
          } else {
            document.documentElement.style.setProperty('--theme-border-animation', 'none');
            document.body.classList.remove('fx-theme-active');
          }
        }
      }
    };
    
    applyThemeFromStorage();
  }, []);

  // Listen for customization panel toggles
  useEffect(() => {
    const handleToggleSpotify = (e) => setShowSpotify(e.detail.show);
    const handleToggleTwitch = (e) => setShowTwitchChatWidget(e.detail.show);
    const handleToggleBHStats = (e) => {
      setShowBHStats(e.detail.show);
      if (e.detail.show) setShowStatsPanel(true);
    };
    const handleToggleBHCards = (e) => setShowBHCards(e.detail.show);
    const handleChatSettingsUpdate = () => {
      const settings = localStorage.getItem('overlaySettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setChatSettings({
          position: parsed.chatPosition || 'bottom-left',
          width: parsed.chatWidth || 350,
          height: parsed.chatHeight || 500
        });
      }
    };
    const handleThemeChanged = (e) => {
      // Re-apply theme from storage when theme changes
      const savedTheme = e.detail.theme || localStorage.getItem('selectedTheme');
      if (savedTheme && window.THEME_DEFINITIONS) {
        const theme = window.THEME_DEFINITIONS[savedTheme];
        if (theme) {
          document.documentElement.style.setProperty('--theme-primary', theme.colors.primary);
          document.documentElement.style.setProperty('--theme-secondary', theme.colors.secondary);
          document.documentElement.style.setProperty('--theme-accent', theme.colors.accent);
          document.documentElement.style.setProperty('--theme-background', theme.colors.background);
          document.documentElement.style.setProperty('--theme-text', theme.colors.text);
          document.documentElement.style.setProperty('--theme-panel-bg', theme.colors.panelBg);
          document.documentElement.style.setProperty('--theme-border', theme.colors.border);
          document.documentElement.style.setProperty('--theme-font', theme.font);
          
          // Apply FX theme border animations
          if (savedTheme.startsWith('fx-')) {
            let animation = 'rgb-pulse';
            if (savedTheme.includes('pulse')) animation = 'rgb-pulse';
            else if (savedTheme.includes('neon')) animation = 'neon-pulse';
            else if (savedTheme.includes('fire') || savedTheme.includes('inferno') || savedTheme.includes('magma')) animation = 'fire-pulse';
            else if (savedTheme.includes('rainbow') || savedTheme.includes('disco') || savedTheme.includes('holographic') || savedTheme.includes('prism')) animation = 'rainbow-flash';
            else if (savedTheme.includes('glitch') || savedTheme.includes('corrupted')) animation = 'glitch-scroll';
            else if (savedTheme.includes('lightning') || savedTheme.includes('thunder')) animation = 'lightning-flash';
            else if (savedTheme.includes('stripe') || savedTheme.includes('retro') || savedTheme.includes('danger') || savedTheme.includes('electric')) animation = 'stripe-scroll';
            
            document.documentElement.style.setProperty('--theme-border-animation', animation);
            document.body.classList.add('fx-theme-active');
          } else {
            document.documentElement.style.setProperty('--theme-border-animation', 'none');
            document.body.classList.remove('fx-theme-active');
          }
          
          document.body.style.background = theme.colors.background;
        }
      }
    };
    
    window.addEventListener('toggleSpotify', handleToggleSpotify);
    window.addEventListener('toggleTwitchChat', handleToggleTwitch);
    window.addEventListener('toggleBHStats', handleToggleBHStats);
    window.addEventListener('toggleBHCards', handleToggleBHCards);
    window.addEventListener('chatSettingsUpdated', handleChatSettingsUpdate);
    window.addEventListener('themeChanged', handleThemeChanged);
    
    return () => {
      window.removeEventListener('toggleSpotify', handleToggleSpotify);
      window.removeEventListener('toggleTwitchChat', handleToggleTwitch);
      window.removeEventListener('toggleBHStats', handleToggleBHStats);
      window.removeEventListener('toggleBHCards', handleToggleBHCards);
      window.removeEventListener('chatSettingsUpdated', handleChatSettingsUpdate);
      window.removeEventListener('themeChanged', handleThemeChanged);
    };
  }, []);

  const handleBonusClick = (bonusId) => {
    setSelectedBonusId(bonusId);
    setShowBonusOpening(true);
  };

  const handleMenuSelect = (menuId) => {
    console.log('Menu selected:', menuId);
    if (menuId === 'slotMachine') {
      console.log('SLOT MACHINE CLICKED - Current state:', showSlotMachine);
      setShowSlotMachine(!showSlotMachine);
      console.log('SLOT MACHINE NEW STATE:', !showSlotMachine);
      return;
    }
    if (menuId === 'coinFlip') {
      setShowCoinFlip(!showCoinFlip);
      return;
    }
    switch(menuId) {
      case 'customization':
        setShowCustomization(!showCustomization); // Toggle instead of just opening
        break;
      case 'randomSlot':
        setShowRandomSlot(!showRandomSlot); // Toggle instead of just opening
        break;
      case 'tournament':
        setShowTournament(!showTournament); // Toggle instead of just opening
        break;
      case 'giveaway':
        setShowGiveaway(!showGiveaway); // Toggle instead of just opening
        break;
      default:
        break;
    }
  };

  // Only render overlay UI on /overlay and /admin-overlay routes
  if (location.pathname !== '/overlay' && location.pathname !== '/admin-overlay') {
    return null;
  }

  return (
    <div className="overlay-container">
      <Navbar />
      
      <div className="main-layout">
      </div>
      {showBHPanel && <BHPanel onClose={() => setShowBHPanel(false)} onOpenBonusOpening={(bonusId) => {
        setSelectedBonusId(bonusId);
        setShowBonusOpening(true);
      }} />}
      {showTournament && <TournamentPanel onClose={() => setShowTournament(false)} />}
      {showGiveaway && <GiveawayPanel onClose={() => setShowGiveaway(false)} />}
      {showRandomSlot && <RandomSlotPicker onClose={() => setShowRandomSlot(false)} />}
      
      {/* Slot Machine Overlay */}
      {showSlotMachine && <SlotMachineOverlay onClose={() => setShowSlotMachine(false)} />}
      
      {/* Coin Flip */}
      {showCoinFlip && <CoinFlip onClose={() => setShowCoinFlip(false)} />}
      
      {/* Twitch Chat (only show if enabled in customization) */}
      {showTwitchChatWidget && <TwitchChat channel={localStorage.getItem('twitchChannel') || ''} position={chatSettings.position} width={chatSettings.width} height={chatSettings.height} />}
      
      {/* Bonus Opening Panel */}
      {showBonusOpening && (
        <BonusOpening 
          bonusId={selectedBonusId} 
          onClose={() => { 
            setShowBonusOpening(false); 
            setSelectedBonusId(null);
            setShowBHPanel(true);
          }}
          onBonusChange={(bonusId) => setSelectedBonusId(bonusId)}
        />
      )}
      
      {/* StreamElements Redemption Notification - Only for Admin Overlay */}
      {isAdminOverlay && latestRedemption && (
        <RedemptionNotification 
          redemption={latestRedemption} 
          onClose={() => setLatestRedemption(null)} 
        />
      )}
      
      <CircularSidebar onMenuSelect={handleMenuSelect} isLocked={isLocked} onLockToggle={() => setIsLocked(!isLocked)} />
    </div>
  );
}

// Protected Route wrapper
function ProtectedOverlay({ isAdminOverlay = false }) {
  const { user, loading } = useAuth();
  const [accessCheck, setAccessCheck] = useState({ checking: true, hasAccess: false, reason: null });

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setAccessCheck({ checking: false, hasAccess: false, reason: 'Not authenticated' });
        return;
      }

      const result = await checkUserAccess(user.id);
      setAccessCheck({ checking: false, ...result });
    };

    checkAccess();
  }, [user]);

  if (loading || accessCheck.checking) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.5rem'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!accessCheck.hasAccess) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>🚫 Access Denied</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>{accessCheck.reason}</p>
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            padding: '12px 30px',
            background: 'white',
            color: '#667eea',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Return to Home
        </button>
      </div>
    );
  }

  return <AppContent isAdminOverlay={isAdminOverlay} />;
}

// Layout wrapper to show sidebar on all pages except overlay and widget display routes
function LayoutWrapper({ children }) {
  const location = useLocation();
  const isWidgetRoute = location.pathname.startsWith('/widgets/');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const showSidebar = location.pathname !== '/overlay' && 
                      location.pathname !== '/admin-overlay' && 
                      !isWidgetRoute;

  // Detect screen size changes
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      // Auto-close sidebar when switching to desktop
      if (!mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen, isMobile]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="app-layout">
      {showSidebar && (
        <>
          {/* Mobile toggle button */}
          {isMobile && (
            <button 
              className="sidebar-toggle-btn touch-target" 
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
          )}
          
          {/* Sidebar with open state */}
          <Sidebar className={sidebarOpen ? 'open' : ''} onClose={closeSidebar} />
          
          {/* Backdrop overlay - mobile only */}
          {isMobile && sidebarOpen && (
            <div 
              className="sidebar-backdrop visible" 
              onClick={closeSidebar}
              aria-hidden="true"
            />
          )}
        </>
      )}
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <StreamElementsProvider>
        <LanguageProvider>
          <BrowserRouter>
            <LayoutWrapper>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/offers" element={<OffersPage />} />
                <Route path="/tournaments" element={<TournamentsPage />} />
                <Route path="/guess-balance" element={<GuessBalancePage />} />
                <Route path="/giveaways" element={<GiveawaysPage />} />
                <Route path="/vouchers" element={<VoucherRedeemPage />} />
                <Route path="/daily-wheel" element={<DailyWheelPage />} />
                <Route path="/games/dice" element={<GamesPage gameType="dice" />} />
                <Route path="/games/roulette" element={<GamesPage gameType="roulette" />} />
                <Route path="/games/blackjack" element={<BlackjackPremium />} />
                <Route path="/games/mines" element={<Mines />} />
                <Route path="/games/thelife" element={<TheLife />} />
                <Route path="/games/thelife/season-pass" element={<SeasonPass />} />
                <Route path="/games/thelife/news" element={<TheLifeJournal />} />
                <Route path="/points" element={<StreamElementsPanel />} />
                <Route path="/streamelements" element={<StreamElementsPanel />} />
                <Route path="/points-manager" element={<PointsManager />} />
                <Route path="/profile" element={<ProfilePage />} />

                
                {/* WebMod Routes - For admins and slot_modders */}
                <Route path="/webmod/slot-manager" element={<SlotManagerPage />} />
                <Route path="/webmod/points-manager" element={<PointsManager />} />
                <Route path="/webmod/voucher-manager" element={
                  <ProtectedAdminRoute>
                    <VoucherManager />
                  </ProtectedAdminRoute>
                } />
                <Route path="/webmod/giveaway-creator" element={
                  <ProtectedAdminRoute>
                    <GiveawayCreator />
                  </ProtectedAdminRoute>
                } />
                
                <Route path="/admin" element={<AdminPanel />} />
              </Routes>
            </LayoutWrapper>
          </BrowserRouter>
        </LanguageProvider>
      </StreamElementsProvider>
      <SpeedInsights />
    </AuthProvider>
  );
}

export default App;
