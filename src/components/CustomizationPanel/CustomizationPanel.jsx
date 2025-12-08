import { useState, useEffect } from 'react';
import './CustomizationPanel.css';
import useDraggable from '../../hooks/useDraggable';
import { useAuth } from '../../context/AuthContext';
import { 
  getUserOverlayState, 
  updateCustomization, 
  subscribeToOverlayState,
  unsubscribe 
} from '../../utils/overlayUtils';

// Theme presets
const THEMES = {
  'cyberpunk': {
    name: 'Cyberpunk Neon',
    colors: {
      primary: '#00ff41',
      secondary: '#ff006e',
      accent: '#00d4ff',
      background: '#0a0e27',
      text: '#00ff41',
      panelBg: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(26, 27, 46, 0.95))',
      border: '#00ff41'
    },
    font: 'Orbitron, monospace',
    style: 'futuristic'
  },
  'minimal': {
    name: 'Minimal White',
    colors: {
      primary: '#000000',
      secondary: '#6b7280',
      accent: '#3b82f6',
      background: '#ffffff',
      text: '#000000',
      panelBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98))',
      border: '#e5e7eb'
    },
    font: 'Inter, sans-serif',
    style: 'clean'
  },
  'royal': {
    name: 'Royal Purple',
    colors: {
      primary: '#7c3aed',
      secondary: '#fbbf24',
      accent: '#ec4899',
      background: '#1e1b4b',
      text: '#fbbf24',
      panelBg: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(88, 28, 135, 0.95))',
      border: '#fbbf24'
    },
    font: 'Playfair Display, serif',
    style: 'elegant'
  },
  'gaming': {
    name: 'Gaming Pro',
    colors: {
      primary: '#10b981',
      secondary: '#ef4444',
      accent: '#f59e0b',
      background: '#111827',
      text: '#10b981',
      panelBg: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))',
      border: '#10b981'
    },
    font: 'Rajdhani, sans-serif',
    style: 'bold'
  },
  'ocean': {
    name: 'Ocean Breeze',
    colors: {
      primary: '#06b6d4',
      secondary: '#0ea5e9',
      accent: '#38bdf8',
      background: '#0c4a6e',
      text: '#e0f2fe',
      panelBg: 'linear-gradient(135deg, rgba(12, 74, 110, 0.95), rgba(7, 89, 133, 0.95))',
      border: '#38bdf8'
    },
    font: 'Nunito, sans-serif',
    style: 'calm'
  },
  'sunset': {
    name: 'Sunset Vibes',
    colors: {
      primary: '#f97316',
      secondary: '#ec4899',
      accent: '#fbbf24',
      background: '#431407',
      text: '#fed7aa',
      panelBg: 'linear-gradient(135deg, rgba(67, 20, 7, 0.95), rgba(124, 45, 18, 0.95))',
      border: '#f97316'
    },
    font: 'Poppins, sans-serif',
    style: 'warm'
  },
  'matrix': {
    name: 'Matrix Code',
    colors: {
      primary: '#00ff00',
      secondary: '#00cc00',
      accent: '#00ff88',
      background: '#000000',
      text: '#00ff00',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 20, 0, 0.98))',
      border: '#00ff00'
    },
    font: 'Courier New, monospace',
    style: 'tech'
  },
  'synthwave': {
    name: 'Synthwave 80s',
    colors: {
      primary: '#ff00ff',
      secondary: '#00ffff',
      accent: '#ffff00',
      background: '#2d0b54',
      text: '#ff00ff',
      panelBg: 'linear-gradient(135deg, rgba(45, 11, 84, 0.95), rgba(88, 24, 69, 0.95))',
      border: '#ff00ff'
    },
    font: 'Audiowide, cursive',
    style: 'retro'
  },
  'forest': {
    name: 'Forest Green',
    colors: {
      primary: '#22c55e',
      secondary: '#84cc16',
      accent: '#a3e635',
      background: '#14532d',
      text: '#dcfce7',
      panelBg: 'linear-gradient(135deg, rgba(20, 83, 45, 0.95), rgba(21, 128, 61, 0.95))',
      border: '#22c55e'
    },
    font: 'Lato, sans-serif',
    style: 'natural'
  },
  'midnight': {
    name: 'Midnight Blue',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      accent: '#06b6d4',
      background: '#0f172a',
      text: '#dbeafe',
      panelBg: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
      border: '#3b82f6'
    },
    font: 'Roboto, sans-serif',
    style: 'professional'
  },
  // Seasonal themes
  'christmas': {
    name: '🎄 Christmas',
    colors: {
      primary: '#dc2626',
      secondary: '#16a34a',
      accent: '#fbbf24',
      background: '#7f1d1d',
      text: '#fef2f2',
      panelBg: 'linear-gradient(135deg, rgba(127, 29, 29, 0.95), rgba(153, 27, 27, 0.95))',
      border: '#fbbf24'
    },
    font: 'Mountains of Christmas, cursive',
    style: 'festive'
  },
  'halloween': {
    name: '🎃 Halloween',
    colors: {
      primary: '#f97316',
      secondary: '#7c2d12',
      accent: '#a855f7',
      background: '#1c1917',
      text: '#fed7aa',
      panelBg: 'linear-gradient(135deg, rgba(28, 25, 23, 0.95), rgba(87, 83, 78, 0.95))',
      border: '#f97316'
    },
    font: 'Creepster, cursive',
    style: 'spooky'
  },
  'summer': {
    name: '☀️ Summer',
    colors: {
      primary: '#fbbf24',
      secondary: '#06b6d4',
      accent: '#fb923c',
      background: '#0c4a6e',
      text: '#fef3c7',
      panelBg: 'linear-gradient(135deg, rgba(12, 74, 110, 0.95), rgba(14, 165, 233, 0.95))',
      border: '#fbbf24'
    },
    font: 'Quicksand, sans-serif',
    style: 'bright'
  },
  'autumn': {
    name: '🍂 Autumn',
    colors: {
      primary: '#d97706',
      secondary: '#dc2626',
      accent: '#ca8a04',
      background: '#78350f',
      text: '#fed7aa',
      panelBg: 'linear-gradient(135deg, rgba(120, 53, 15, 0.95), rgba(146, 64, 14, 0.95))',
      border: '#d97706'
    },
    font: 'Merriweather, serif',
    style: 'cozy'
  },
  // Animated Themes
  'neon-pulse': {
    name: '⚡ Neon Pulse',
    colors: {
      primary: '#ff0080',
      secondary: '#7928ca',
      accent: '#00dfd8',
      background: '#0a0a0f',
      text: '#ff0080',
      panelBg: 'linear-gradient(135deg, rgba(10, 10, 15, 0.95), rgba(121, 40, 202, 0.15))',
      border: '#ff0080'
    },
    font: 'Teko, sans-serif',
    style: 'animated'
  },
  'aurora-wave': {
    name: '🌊 Aurora Wave',
    colors: {
      primary: '#00f5ff',
      secondary: '#9d00ff',
      accent: '#00ff85',
      background: '#001a1f',
      text: '#00f5ff',
      panelBg: 'linear-gradient(135deg, rgba(0, 26, 31, 0.95), rgba(0, 77, 88, 0.95))',
      border: '#00f5ff'
    },
    font: 'Exo 2, sans-serif',
    style: 'animated'
  },
  'fire-storm': {
    name: '🔥 Fire Storm',
    colors: {
      primary: '#ff4500',
      secondary: '#ffd700',
      accent: '#ff6347',
      background: '#1a0000',
      text: '#ffa500',
      panelBg: 'linear-gradient(135deg, rgba(26, 0, 0, 0.95), rgba(139, 0, 0, 0.95))',
      border: '#ff4500'
    },
    font: 'Saira Condensed, sans-serif',
    style: 'animated'
  },
  'electric-blue': {
    name: '⚡ Electric Blue',
    colors: {
      primary: '#00bfff',
      secondary: '#1e90ff',
      accent: '#87ceeb',
      background: '#000814',
      text: '#00bfff',
      panelBg: 'linear-gradient(135deg, rgba(0, 8, 20, 0.95), rgba(0, 33, 71, 0.95))',
      border: '#00bfff'
    },
    font: 'Chakra Petch, sans-serif',
    style: 'animated'
  },
  'plasma-burst': {
    name: '💥 Plasma Burst',
    colors: {
      primary: '#ff00ff',
      secondary: '#ff1493',
      accent: '#da70d6',
      background: '#120012',
      text: '#ff69b4',
      panelBg: 'linear-gradient(135deg, rgba(18, 0, 18, 0.95), rgba(75, 0, 130, 0.95))',
      border: '#ff00ff'
    },
    font: 'Electrolize, sans-serif',
    style: 'animated'
  },
  // Glass Themes
  'frosted-glass': {
    name: '❄️ Frosted Glass',
    colors: {
      primary: '#ffffff',
      secondary: '#e0e7ff',
      accent: '#c7d2fe',
      background: '#f8fafc',
      text: '#1e293b',
      panelBg: 'rgba(255, 255, 255, 0.25)',
      border: 'rgba(255, 255, 255, 0.4)'
    },
    font: 'Space Grotesk, sans-serif',
    style: 'glass'
  },
  'crystal-clear': {
    name: '💎 Crystal Clear',
    colors: {
      primary: '#60a5fa',
      secondary: '#818cf8',
      accent: '#a78bfa',
      background: '#eff6ff',
      text: '#1e40af',
      panelBg: 'rgba(191, 219, 254, 0.3)',
      border: 'rgba(96, 165, 250, 0.5)'
    },
    font: 'Outfit, sans-serif',
    style: 'glass'
  },
  'smoke-glass': {
    name: '🌫️ Smoke Glass',
    colors: {
      primary: '#94a3b8',
      secondary: '#64748b',
      accent: '#cbd5e1',
      background: '#0f172a',
      text: '#f1f5f9',
      panelBg: 'rgba(30, 41, 59, 0.35)',
      border: 'rgba(148, 163, 184, 0.4)'
    },
    font: 'DM Sans, sans-serif',
    style: 'glass'
  },
  'amber-glass': {
    name: '🥃 Amber Glass',
    colors: {
      primary: '#fbbf24',
      secondary: '#f59e0b',
      accent: '#fcd34d',
      background: '#451a03',
      text: '#fef3c7',
      panelBg: 'rgba(217, 119, 6, 0.25)',
      border: 'rgba(251, 191, 36, 0.45)'
    },
    font: 'Sora, sans-serif',
    style: 'glass'
  },
  'rose-glass': {
    name: '🌹 Rose Glass',
    colors: {
      primary: '#f472b6',
      secondary: '#ec4899',
      accent: '#fbcfe8',
      background: '#500724',
      text: '#fce7f3',
      panelBg: 'rgba(219, 39, 119, 0.28)',
      border: 'rgba(244, 114, 182, 0.45)'
    },
    font: 'Plus Jakarta Sans, sans-serif',
    style: 'glass'
  },
  // Premium Themes
  'gold-luxe': {
    name: '👑 Gold Luxe',
    colors: {
      primary: '#ffd700',
      secondary: '#b8860b',
      accent: '#ffec8b',
      background: '#1a1410',
      text: '#fffaf0',
      panelBg: 'linear-gradient(135deg, rgba(26, 20, 16, 0.95), rgba(101, 67, 33, 0.95))',
      border: '#ffd700'
    },
    font: 'Cinzel, serif',
    style: 'premium'
  },
  'platinum-elite': {
    name: '💿 Platinum Elite',
    colors: {
      primary: '#e5e4e2',
      secondary: '#c0c0c0',
      accent: '#f5f5f5',
      background: '#1c1c1e',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(28, 28, 30, 0.95), rgba(58, 58, 60, 0.95))',
      border: '#e5e4e2'
    },
    font: 'Montserrat, sans-serif',
    style: 'premium'
  },
  'emerald-crown': {
    name: '💚 Emerald Crown',
    colors: {
      primary: '#50c878',
      secondary: '#2e8b57',
      accent: '#98fb98',
      background: '#0d1f17',
      text: '#f0fff4',
      panelBg: 'linear-gradient(135deg, rgba(13, 31, 23, 0.95), rgba(46, 139, 87, 0.35))',
      border: '#50c878'
    },
    font: 'Cormorant Garamond, serif',
    style: 'premium'
  },
  'sapphire-royal': {
    name: '💙 Sapphire Royal',
    colors: {
      primary: '#0f52ba',
      secondary: '#082567',
      accent: '#4169e1',
      background: '#020a1a',
      text: '#e6f2ff',
      panelBg: 'linear-gradient(135deg, rgba(2, 10, 26, 0.95), rgba(15, 82, 186, 0.35))',
      border: '#0f52ba'
    },
    font: 'Libre Baskerville, serif',
    style: 'premium'
  },
  'obsidian-prestige': {
    name: '⚫ Obsidian Prestige',
    colors: {
      primary: '#d4af37',
      secondary: '#1c1c1c',
      accent: '#f4e4c1',
      background: '#000000',
      text: '#e8e8e8',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(28, 28, 28, 0.98))',
      border: '#d4af37'
    },
    font: 'Bebas Neue, cursive',
    style: 'premium'
  },
  // Glossy Themes
  'glossy-cherry': {
    name: '🍒 Glossy Cherry',
    colors: {
      primary: '#dc143c',
      secondary: '#ff1744',
      accent: '#ff4569',
      background: '#1a0505',
      text: '#ffebee',
      panelBg: 'linear-gradient(135deg, rgba(26, 5, 5, 0.98), rgba(220, 20, 60, 0.15))',
      border: '#dc143c'
    },
    font: 'Quicksand, sans-serif',
    style: 'glossy'
  },
  'glossy-ocean': {
    name: '🌊 Glossy Ocean',
    colors: {
      primary: '#00acc1',
      secondary: '#00bcd4',
      accent: '#26c6da',
      background: '#0a1a1f',
      text: '#e0f7fa',
      panelBg: 'linear-gradient(135deg, rgba(10, 26, 31, 0.98), rgba(0, 172, 193, 0.15))',
      border: '#00acc1'
    },
    font: 'Varela Round, sans-serif',
    style: 'glossy'
  },
  'glossy-lime': {
    name: '🍋 Glossy Lime',
    colors: {
      primary: '#cddc39',
      secondary: '#d4e157',
      accent: '#dce775',
      background: '#1a1f05',
      text: '#f9fbe7',
      panelBg: 'linear-gradient(135deg, rgba(26, 31, 5, 0.98), rgba(205, 220, 57, 0.15))',
      border: '#cddc39'
    },
    font: 'Nunito, sans-serif',
    style: 'glossy'
  },
  'glossy-grape': {
    name: '🍇 Glossy Grape',
    colors: {
      primary: '#9c27b0',
      secondary: '#ab47bc',
      accent: '#ba68c8',
      background: '#1a051f',
      text: '#f3e5f5',
      panelBg: 'linear-gradient(135deg, rgba(26, 5, 31, 0.98), rgba(156, 39, 176, 0.15))',
      border: '#9c27b0'
    },
    font: 'Comfortaa, cursive',
    style: 'glossy'
  },
  'glossy-tangerine': {
    name: '🍊 Glossy Tangerine',
    colors: {
      primary: '#ff6f00',
      secondary: '#ff8f00',
      accent: '#ffa726',
      background: '#1f0f00',
      text: '#fff3e0',
      panelBg: 'linear-gradient(135deg, rgba(31, 15, 0, 0.98), rgba(255, 111, 0, 0.15))',
      border: '#ff6f00'
    },
    font: 'Poppins, sans-serif',
    style: 'glossy'
  },
  'glossy-mint': {
    name: '🌿 Glossy Mint',
    colors: {
      primary: '#00e676',
      secondary: '#1de9b6',
      accent: '#69f0ae',
      background: '#051f0f',
      text: '#e0f2f1',
      panelBg: 'linear-gradient(135deg, rgba(5, 31, 15, 0.98), rgba(0, 230, 118, 0.15))',
      border: '#00e676'
    },
    font: 'Lato, sans-serif',
    style: 'glossy'
  },
  'glossy-rose': {
    name: '🌹 Glossy Rose',
    colors: {
      primary: '#f50057',
      secondary: '#ff4081',
      accent: '#ff80ab',
      background: '#1f0510',
      text: '#fce4ec',
      panelBg: 'linear-gradient(135deg, rgba(31, 5, 16, 0.98), rgba(245, 0, 87, 0.15))',
      border: '#f50057'
    },
    font: 'Josefin Sans, sans-serif',
    style: 'glossy'
  },
  'glossy-sky': {
    name: '☁️ Glossy Sky',
    colors: {
      primary: '#03a9f4',
      secondary: '#29b6f6',
      accent: '#4fc3f7',
      background: '#050f1f',
      text: '#e1f5fe',
      panelBg: 'linear-gradient(135deg, rgba(5, 15, 31, 0.98), rgba(3, 169, 244, 0.15))',
      border: '#03a9f4'
    },
    font: 'Raleway, sans-serif',
    style: 'glossy'
  },
  'glossy-amber': {
    name: '🔶 Glossy Amber',
    colors: {
      primary: '#ffc107',
      secondary: '#ffca28',
      accent: '#ffd54f',
      background: '#1f1705',
      text: '#fff8e1',
      panelBg: 'linear-gradient(135deg, rgba(31, 23, 5, 0.98), rgba(255, 193, 7, 0.15))',
      border: '#ffc107'
    },
    font: 'Montserrat, sans-serif',
    style: 'glossy'
  },
  'glossy-lavender': {
    name: '💜 Glossy Lavender',
    colors: {
      primary: '#9575cd',
      secondary: '#b39ddb',
      accent: '#d1c4e9',
      background: '#0f051f',
      text: '#ede7f6',
      panelBg: 'linear-gradient(135deg, rgba(15, 5, 31, 0.98), rgba(149, 117, 205, 0.15))',
      border: '#9575cd'
    },
    font: 'Cabin, sans-serif',
    style: 'glossy'
  },
  // Matte Themes
  'matte-charcoal': {
    name: '⚫ Matte Charcoal',
    colors: {
      primary: '#424242',
      secondary: '#616161',
      accent: '#757575',
      background: '#0a0a0a',
      text: '#e0e0e0',
      panelBg: 'rgba(18, 18, 18, 0.95)',
      border: '#424242'
    },
    font: 'Roboto, sans-serif',
    style: 'matte'
  },
  'matte-slate': {
    name: '🪨 Matte Slate',
    colors: {
      primary: '#607d8b',
      secondary: '#78909c',
      accent: '#90a4ae',
      background: '#0f1419',
      text: '#cfd8dc',
      panelBg: 'rgba(23, 30, 36, 0.95)',
      border: '#607d8b'
    },
    font: 'Inter, sans-serif',
    style: 'matte'
  },
  'matte-sage': {
    name: '🌿 Matte Sage',
    colors: {
      primary: '#8d9f87',
      secondary: '#a8b89f',
      accent: '#b8c9af',
      background: '#0f140e',
      text: '#e8f0e5',
      panelBg: 'rgba(25, 31, 23, 0.95)',
      border: '#8d9f87'
    },
    font: 'Quicksand, sans-serif',
    style: 'matte'
  },
  'matte-terracotta': {
    name: '🏺 Matte Terracotta',
    colors: {
      primary: '#a0695f',
      secondary: '#b8877f',
      accent: '#c9a19f',
      background: '#140f0e',
      text: '#f0e5e3',
      panelBg: 'rgba(31, 23, 21, 0.95)',
      border: '#a0695f'
    },
    font: 'Crimson Text, serif',
    style: 'matte'
  },
  'matte-moss': {
    name: '🍃 Matte Moss',
    colors: {
      primary: '#6b7d5c',
      secondary: '#7f9270',
      accent: '#94a684',
      background: '#0e140c',
      text: '#e5ede0',
      panelBg: 'rgba(21, 30, 18, 0.95)',
      border: '#6b7d5c'
    },
    font: 'Merriweather, serif',
    style: 'matte'
  },
  'matte-clay': {
    name: '🪴 Matte Clay',
    colors: {
      primary: '#9c6d5b',
      secondary: '#b08573',
      accent: '#c49e8f',
      background: '#140f0c',
      text: '#f0e8e3',
      panelBg: 'rgba(30, 22, 18, 0.95)',
      border: '#9c6d5b'
    },
    font: 'Lora, serif',
    style: 'matte'
  },
  'matte-concrete': {
    name: '🏗️ Matte Concrete',
    colors: {
      primary: '#808080',
      secondary: '#999999',
      accent: '#b3b3b3',
      background: '#0d0d0d',
      text: '#e6e6e6',
      panelBg: 'rgba(26, 26, 26, 0.95)',
      border: '#808080'
    },
    font: 'Work Sans, sans-serif',
    style: 'matte'
  },
  'matte-sand': {
    name: '🏜️ Matte Sand',
    colors: {
      primary: '#c4a57b',
      secondary: '#d4b896',
      accent: '#e3ccaf',
      background: '#1a1510',
      text: '#f5ede0',
      panelBg: 'rgba(38, 32, 24, 0.95)',
      border: '#c4a57b'
    },
    font: 'Nunito Sans, sans-serif',
    style: 'matte'
  },
  'matte-ash': {
    name: '🌫️ Matte Ash',
    colors: {
      primary: '#696969',
      secondary: '#808080',
      accent: '#979797',
      background: '#0b0b0b',
      text: '#d9d9d9',
      panelBg: 'rgba(20, 20, 20, 0.95)',
      border: '#696969'
    },
    font: 'Open Sans, sans-serif',
    style: 'matte'
  },
  'matte-olive': {
    name: '🫒 Matte Olive',
    colors: {
      primary: '#6b705c',
      secondary: '#7f8570',
      accent: '#939984',
      background: '#0e0f0c',
      text: '#e8ebe5',
      panelBg: 'rgba(22, 24, 19, 0.95)',
      border: '#6b705c'
    },
    font: 'Karla, sans-serif',
    style: 'matte'
  },
  // Anodized Themes
  'anodized-titanium': {
    name: '🔩 Anodized Titanium',
    colors: {
      primary: '#8e9aaf',
      secondary: '#a3b0c7',
      accent: '#b8c6df',
      background: '#0f1318',
      text: '#dde3f0',
      panelBg: 'linear-gradient(135deg, rgba(15, 19, 24, 0.95), rgba(66, 79, 104, 0.25))',
      border: '#8e9aaf'
    },
    font: 'Rajdhani, sans-serif',
    style: 'anodized'
  },
  'anodized-blue': {
    name: '💠 Anodized Blue',
    colors: {
      primary: '#2962ff',
      secondary: '#448aff',
      accent: '#82b1ff',
      background: '#05091a',
      text: '#e3f2fd',
      panelBg: 'linear-gradient(135deg, rgba(5, 9, 26, 0.95), rgba(41, 98, 255, 0.2))',
      border: '#2962ff'
    },
    font: 'Electrolize, sans-serif',
    style: 'anodized'
  },
  'anodized-purple': {
    name: '🔮 Anodized Purple',
    colors: {
      primary: '#7c4dff',
      secondary: '#9d6eff',
      accent: '#b794f6',
      background: '#0f051a',
      text: '#ede7f6',
      panelBg: 'linear-gradient(135deg, rgba(15, 5, 26, 0.95), rgba(124, 77, 255, 0.2))',
      border: '#7c4dff'
    },
    font: 'Orbitron, sans-serif',
    style: 'anodized'
  },
  'anodized-red': {
    name: '🔴 Anodized Red',
    colors: {
      primary: '#ff1744',
      secondary: '#ff4569',
      accent: '#ff6e8e',
      background: '#1a0508',
      text: '#ffebee',
      panelBg: 'linear-gradient(135deg, rgba(26, 5, 8, 0.95), rgba(255, 23, 68, 0.2))',
      border: '#ff1744'
    },
    font: 'Saira, sans-serif',
    style: 'anodized'
  },
  'anodized-green': {
    name: '🟢 Anodized Green',
    colors: {
      primary: '#00e676',
      secondary: '#69f0ae',
      accent: '#b9fbc0',
      background: '#05140a',
      text: '#e8f5e9',
      panelBg: 'linear-gradient(135deg, rgba(5, 20, 10, 0.95), rgba(0, 230, 118, 0.2))',
      border: '#00e676'
    },
    font: 'Exo 2, sans-serif',
    style: 'anodized'
  },
  'anodized-gold': {
    name: '🟡 Anodized Gold',
    colors: {
      primary: '#ffc400',
      secondary: '#ffd740',
      accent: '#ffea00',
      background: '#1a1405',
      text: '#fffde7',
      panelBg: 'linear-gradient(135deg, rgba(26, 20, 5, 0.95), rgba(255, 196, 0, 0.2))',
      border: '#ffc400'
    },
    font: 'Teko, sans-serif',
    style: 'anodized'
  },
  'anodized-cyan': {
    name: '🔷 Anodized Cyan',
    colors: {
      primary: '#00e5ff',
      secondary: '#18ffff',
      accent: '#84ffff',
      background: '#05141a',
      text: '#e0f7fa',
      panelBg: 'linear-gradient(135deg, rgba(5, 20, 26, 0.95), rgba(0, 229, 255, 0.2))',
      border: '#00e5ff'
    },
    font: 'Audiowide, cursive',
    style: 'anodized'
  },
  'anodized-magenta': {
    name: '🟣 Anodized Magenta',
    colors: {
      primary: '#d500f9',
      secondary: '#e040fb',
      accent: '#ea80fc',
      background: '#14051a',
      text: '#f3e5f5',
      panelBg: 'linear-gradient(135deg, rgba(20, 5, 26, 0.95), rgba(213, 0, 249, 0.2))',
      border: '#d500f9'
    },
    font: 'Russo One, sans-serif',
    style: 'anodized'
  },
  'anodized-orange': {
    name: '🟠 Anodized Orange',
    colors: {
      primary: '#ff6d00',
      secondary: '#ff9100',
      accent: '#ffab40',
      background: '#1a0f05',
      text: '#fff3e0',
      panelBg: 'linear-gradient(135deg, rgba(26, 15, 5, 0.95), rgba(255, 109, 0, 0.2))',
      border: '#ff6d00'
    },
    font: 'Play, sans-serif',
    style: 'anodized'
  },
  'anodized-silver': {
    name: '⚪ Anodized Silver',
    colors: {
      primary: '#bdbdbd',
      secondary: '#e0e0e0',
      accent: '#eeeeee',
      background: '#0d0d0d',
      text: '#fafafa',
      panelBg: 'linear-gradient(135deg, rgba(13, 13, 13, 0.95), rgba(189, 189, 189, 0.2))',
      border: '#bdbdbd'
    },
    font: 'Michroma, sans-serif',
    style: 'anodized'
  },
  // Metallic Themes
  'metallic-chrome': {
    name: '✨ Metallic Chrome',
    colors: {
      primary: '#c0c0c0',
      secondary: '#d3d3d3',
      accent: '#e8e8e8',
      background: '#0a0a0a',
      text: '#f5f5f5',
      panelBg: 'linear-gradient(135deg, rgba(10, 10, 10, 0.98), rgba(192, 192, 192, 0.1))',
      border: '#c0c0c0'
    },
    font: 'Orbitron, sans-serif',
    style: 'metallic'
  },
  'metallic-bronze': {
    name: '🥉 Metallic Bronze',
    colors: {
      primary: '#cd7f32',
      secondary: '#e09856',
      accent: '#f0b17a',
      background: '#1a0f05',
      text: '#fff0e0',
      panelBg: 'linear-gradient(135deg, rgba(26, 15, 5, 0.98), rgba(205, 127, 50, 0.15))',
      border: '#cd7f32'
    },
    font: 'Cinzel, serif',
    style: 'metallic'
  },
  'metallic-copper': {
    name: '🟤 Metallic Copper',
    colors: {
      primary: '#b87333',
      secondary: '#d4915e',
      accent: '#e8b088',
      background: '#1a0e05',
      text: '#ffeedd',
      panelBg: 'linear-gradient(135deg, rgba(26, 14, 5, 0.98), rgba(184, 115, 51, 0.15))',
      border: '#b87333'
    },
    font: 'EB Garamond, serif',
    style: 'metallic'
  },
  'metallic-steel': {
    name: '⚙️ Metallic Steel',
    colors: {
      primary: '#71797e',
      secondary: '#8e969c',
      accent: '#abb3ba',
      background: '#0c0d0e',
      text: '#e5e8eb',
      panelBg: 'linear-gradient(135deg, rgba(12, 13, 14, 0.98), rgba(113, 121, 126, 0.15))',
      border: '#71797e'
    },
    font: 'Rajdhani, sans-serif',
    style: 'metallic'
  },
  'metallic-platinum': {
    name: '💎 Metallic Platinum',
    colors: {
      primary: '#e5e4e2',
      secondary: '#f0efed',
      accent: '#fafaf8',
      background: '#0d0d0d',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(13, 13, 13, 0.98), rgba(229, 228, 226, 0.1))',
      border: '#e5e4e2'
    },
    font: 'Playfair Display, serif',
    style: 'metallic'
  },
  'metallic-cobalt': {
    name: '🔵 Metallic Cobalt',
    colors: {
      primary: '#0047ab',
      secondary: '#2563eb',
      accent: '#60a5fa',
      background: '#05091a',
      text: '#dbeafe',
      panelBg: 'linear-gradient(135deg, rgba(5, 9, 26, 0.98), rgba(0, 71, 171, 0.15))',
      border: '#0047ab'
    },
    font: 'Saira Condensed, sans-serif',
    style: 'metallic'
  },
  'metallic-pewter': {
    name: '⚫ Metallic Pewter',
    colors: {
      primary: '#96a8a1',
      secondary: '#adbfb8',
      accent: '#c4d6cf',
      background: '#0e100f',
      text: '#e8f0ed',
      panelBg: 'linear-gradient(135deg, rgba(14, 16, 15, 0.98), rgba(150, 168, 161, 0.15))',
      border: '#96a8a1'
    },
    font: 'Roboto Condensed, sans-serif',
    style: 'metallic'
  },
  'metallic-brass': {
    name: '🔆 Metallic Brass',
    colors: {
      primary: '#b5a642',
      secondary: '#d4c76a',
      accent: '#f0e892',
      background: '#1a1605',
      text: '#fffaed',
      panelBg: 'linear-gradient(135deg, rgba(26, 22, 5, 0.98), rgba(181, 166, 66, 0.15))',
      border: '#b5a642'
    },
    font: 'Libre Baskerville, serif',
    style: 'metallic'
  },
  'metallic-gunmetal': {
    name: '🔫 Metallic Gunmetal',
    colors: {
      primary: '#536872',
      secondary: '#6d808a',
      accent: '#8798a2',
      background: '#0a0c0e',
      text: '#dce3e8',
      panelBg: 'linear-gradient(135deg, rgba(10, 12, 14, 0.98), rgba(83, 104, 114, 0.15))',
      border: '#536872'
    },
    font: 'Barlow, sans-serif',
    style: 'metallic'
  },
  'metallic-mercury': {
    name: '💧 Metallic Mercury',
    colors: {
      primary: '#e1e1e1',
      secondary: '#eeeeee',
      accent: '#fafafa',
      background: '#0e0e0e',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(14, 14, 14, 0.98), rgba(225, 225, 225, 0.08))',
      border: '#e1e1e1'
    },
    font: 'Electrolize, sans-serif',
    style: 'metallic'
  },
  // Vibrant Themes
  'vibrant-red': {
    name: '🔴 Vibrant Red',
    colors: {
      primary: '#ff0000',
      secondary: '#ff3333',
      accent: '#ff6666',
      background: '#1a0000',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(26, 0, 0, 0.95), rgba(100, 0, 0, 0.95))',
      border: '#ff0000'
    },
    font: 'Poppins, sans-serif',
    style: 'vibrant'
  },
  'vibrant-blue': {
    name: '🔵 Vibrant Blue',
    colors: {
      primary: '#0066ff',
      secondary: '#3385ff',
      accent: '#66a3ff',
      background: '#00091a',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 9, 26, 0.95), rgba(0, 40, 100, 0.95))',
      border: '#0066ff'
    },
    font: 'Poppins, sans-serif',
    style: 'vibrant'
  },
  'vibrant-orange': {
    name: '🟠 Vibrant Orange',
    colors: {
      primary: '#ff6600',
      secondary: '#ff8533',
      accent: '#ffa366',
      background: '#1a0a00',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(26, 10, 0, 0.95), rgba(100, 40, 0, 0.95))',
      border: '#ff6600'
    },
    font: 'Poppins, sans-serif',
    style: 'vibrant'
  },
  'vibrant-green': {
    name: '🟢 Vibrant Green',
    colors: {
      primary: '#00ff00',
      secondary: '#33ff33',
      accent: '#66ff66',
      background: '#001a00',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 26, 0, 0.95), rgba(0, 100, 0, 0.95))',
      border: '#00ff00'
    },
    font: 'Poppins, sans-serif',
    style: 'vibrant'
  },
  'vibrant-pink': {
    name: '🩷 Vibrant Pink',
    colors: {
      primary: '#ff1493',
      secondary: '#ff43a6',
      accent: '#ff71b9',
      background: '#1a0010',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(26, 0, 16, 0.95), rgba(100, 0, 60, 0.95))',
      border: '#ff1493'
    },
    font: 'Poppins, sans-serif',
    style: 'vibrant'
  },
  'vibrant-purple': {
    name: '🟣 Vibrant Purple',
    colors: {
      primary: '#9900ff',
      secondary: '#ad33ff',
      accent: '#c266ff',
      background: '#10001a',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(16, 0, 26, 0.95), rgba(60, 0, 100, 0.95))',
      border: '#9900ff'
    },
    font: 'Poppins, sans-serif',
    style: 'vibrant'
  },
  'vibrant-grey': {
    name: '⚫ Vibrant Grey',
    colors: {
      primary: '#666666',
      secondary: '#808080',
      accent: '#999999',
      background: '#0d0d0d',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(13, 13, 13, 0.95), rgba(50, 50, 50, 0.95))',
      border: '#666666'
    },
    font: 'Poppins, sans-serif',
    style: 'vibrant'
  },
  'vibrant-black': {
    name: '⬛ Vibrant Black',
    colors: {
      primary: '#1a1a1a',
      secondary: '#333333',
      accent: '#4d4d4d',
      background: '#000000',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(26, 26, 26, 0.98))',
      border: '#1a1a1a'
    },
    font: 'Poppins, sans-serif',
    style: 'vibrant'
  },
  'vibrant-white': {
    name: '⬜ Vibrant White',
    colors: {
      primary: '#ffffff',
      secondary: '#f2f2f2',
      accent: '#e6e6e6',
      background: '#f5f5f5',
      text: '#000000',
      panelBg: 'linear-gradient(135deg, rgba(245, 245, 245, 0.98), rgba(255, 255, 255, 0.98))',
      border: '#cccccc'
    },
    font: 'Poppins, sans-serif',
    style: 'vibrant'
  },
  'vibrant-cyan': {
    name: '🔷 Vibrant Cyan',
    colors: {
      primary: '#00ffff',
      secondary: '#33ffff',
      accent: '#66ffff',
      background: '#001a1a',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 26, 26, 0.95), rgba(0, 100, 100, 0.95))',
      border: '#00ffff'
    },
    font: 'Poppins, sans-serif',
    style: 'vibrant'
  },
  // Vivid Themes
  'vivid-red': {
    name: '❤️ Vivid Red',
    colors: {
      primary: '#e60000',
      secondary: '#ff1a1a',
      accent: '#ff4d4d',
      background: '#260000',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(38, 0, 0, 0.98), rgba(128, 0, 0, 0.98))',
      border: '#e60000'
    },
    font: 'Montserrat, sans-serif',
    style: 'vivid'
  },
  'vivid-blue': {
    name: '💙 Vivid Blue',
    colors: {
      primary: '#0052cc',
      secondary: '#1a6bff',
      accent: '#4d8fff',
      background: '#000d26',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 13, 38, 0.98), rgba(0, 52, 128, 0.98))',
      border: '#0052cc'
    },
    font: 'Montserrat, sans-serif',
    style: 'vivid'
  },
  'vivid-orange': {
    name: '🧡 Vivid Orange',
    colors: {
      primary: '#ff5500',
      secondary: '#ff7733',
      accent: '#ff9955',
      background: '#260d00',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(38, 13, 0, 0.98), rgba(128, 54, 0, 0.98))',
      border: '#ff5500'
    },
    font: 'Montserrat, sans-serif',
    style: 'vivid'
  },
  'vivid-green': {
    name: '💚 Vivid Green',
    colors: {
      primary: '#00cc00',
      secondary: '#1aff1a',
      accent: '#4dff4d',
      background: '#002600',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 38, 0, 0.98), rgba(0, 128, 0, 0.98))',
      border: '#00cc00'
    },
    font: 'Montserrat, sans-serif',
    style: 'vivid'
  },
  'vivid-pink': {
    name: '💗 Vivid Pink',
    colors: {
      primary: '#ff0080',
      secondary: '#ff339f',
      accent: '#ff66b8',
      background: '#260013',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(38, 0, 19, 0.98), rgba(128, 0, 64, 0.98))',
      border: '#ff0080'
    },
    font: 'Montserrat, sans-serif',
    style: 'vivid'
  },
  'vivid-purple': {
    name: '💜 Vivid Purple',
    colors: {
      primary: '#8800ff',
      secondary: '#9f33ff',
      accent: '#b866ff',
      background: '#130026',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(19, 0, 38, 0.98), rgba(64, 0, 128, 0.98))',
      border: '#8800ff'
    },
    font: 'Montserrat, sans-serif',
    style: 'vivid'
  },
  'vivid-grey': {
    name: '🩶 Vivid Grey',
    colors: {
      primary: '#595959',
      secondary: '#737373',
      accent: '#8c8c8c',
      background: '#121212',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(18, 18, 18, 0.98), rgba(60, 60, 60, 0.98))',
      border: '#595959'
    },
    font: 'Montserrat, sans-serif',
    style: 'vivid'
  },
  'vivid-black': {
    name: '🖤 Vivid Black',
    colors: {
      primary: '#262626',
      secondary: '#404040',
      accent: '#595959',
      background: '#000000',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(38, 38, 38, 0.98))',
      border: '#262626'
    },
    font: 'Montserrat, sans-serif',
    style: 'vivid'
  },
  'vivid-white': {
    name: '🤍 Vivid White',
    colors: {
      primary: '#f2f2f2',
      secondary: '#e6e6e6',
      accent: '#d9d9d9',
      background: '#fafafa',
      text: '#000000',
      panelBg: 'linear-gradient(135deg, rgba(250, 250, 250, 0.98), rgba(242, 242, 242, 0.98))',
      border: '#bfbfbf'
    },
    font: 'Montserrat, sans-serif',
    style: 'vivid'
  },
  'vivid-cyan': {
    name: '🩵 Vivid Cyan',
    colors: {
      primary: '#00e6e6',
      secondary: '#1affff',
      accent: '#4dffff',
      background: '#002626',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 38, 38, 0.98), rgba(0, 128, 128, 0.98))',
      border: '#00e6e6'
    },
    font: 'Montserrat, sans-serif',
    style: 'vivid'
  },
  // Special FX Themes - Part 1: RGB Pulsing (10 themes)
  'fx-rgb-pulse': {
    name: '🌈 RGB Pulse',
    colors: {
      primary: '#ff0080',
      secondary: '#00ff80',
      accent: '#0080ff',
      background: '#0a0a0f',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(10, 10, 15, 0.95), rgba(20, 20, 30, 0.95))',
      border: 'linear-gradient(90deg, #ff0080, #00ff80, #0080ff, #ff0080)',
      borderAnimation: 'rgb-pulse'
    },
    font: 'Orbitron, sans-serif',
    style: 'fx'
  },
  'fx-neon-pulse': {
    name: '💫 Neon Pulse',
    colors: {
      primary: '#00ffff',
      secondary: '#ff00ff',
      accent: '#ffff00',
      background: '#0a0a0f',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(10, 10, 15, 0.95), rgba(20, 20, 30, 0.95))',
      border: 'linear-gradient(90deg, #00ffff, #ff00ff, #ffff00, #00ffff)',
      borderAnimation: 'neon-pulse'
    },
    font: 'Audiowide, cursive',
    style: 'fx'
  },
  'fx-cyber-stripe': {
    name: '⚡ Cyber Stripe',
    colors: {
      primary: '#00ff41',
      secondary: '#00ffff',
      accent: '#ff0080',
      background: '#0a0e27',
      text: '#00ff41',
      panelBg: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95), rgba(26, 27, 46, 0.95))',
      border: 'repeating-linear-gradient(45deg, #00ff41, #00ff41 10px, #00ffff 10px, #00ffff 20px)',
      borderAnimation: 'stripe-scroll'
    },
    font: 'Rajdhani, sans-serif',
    style: 'fx'
  },
  'fx-matrix-flow': {
    name: '🟢 Matrix Flow',
    colors: {
      primary: '#00ff00',
      secondary: '#00cc00',
      accent: '#00ff88',
      background: '#000000',
      text: '#00ff00',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 20, 0, 0.98))',
      border: 'repeating-linear-gradient(0deg, #00ff00, #00ff00 5px, #003300 5px, #003300 10px)',
      borderAnimation: 'matrix-scroll'
    },
    font: 'Courier New, monospace',
    style: 'fx'
  },
  'fx-fire-pulse': {
    name: '🔥 Fire Pulse',
    colors: {
      primary: '#ff4500',
      secondary: '#ffd700',
      accent: '#ff6347',
      background: '#1a0000',
      text: '#ffa500',
      panelBg: 'linear-gradient(135deg, rgba(26, 0, 0, 0.95), rgba(139, 0, 0, 0.95))',
      border: 'linear-gradient(90deg, #ff0000, #ff4500, #ffa500, #ffd700, #ffa500, #ff4500, #ff0000)',
      borderAnimation: 'fire-pulse'
    },
    font: 'Saira Condensed, sans-serif',
    style: 'fx'
  },
  'fx-ice-flow': {
    name: '❄️ Ice Flow',
    colors: {
      primary: '#00bfff',
      secondary: '#1e90ff',
      accent: '#87ceeb',
      background: '#000814',
      text: '#00bfff',
      panelBg: 'linear-gradient(135deg, rgba(0, 8, 20, 0.95), rgba(0, 33, 71, 0.95))',
      border: 'linear-gradient(90deg, #00bfff, #87ceeb, #e0ffff, #87ceeb, #00bfff)',
      borderAnimation: 'ice-pulse'
    },
    font: 'Exo 2, sans-serif',
    style: 'fx'
  },
  'fx-toxic-stripe': {
    name: '☢️ Toxic Stripe',
    colors: {
      primary: '#39ff14',
      secondary: '#ccff00',
      accent: '#7fff00',
      background: '#0a1a00',
      text: '#39ff14',
      panelBg: 'linear-gradient(135deg, rgba(10, 26, 0, 0.95), rgba(20, 40, 0, 0.95))',
      border: 'repeating-linear-gradient(45deg, #39ff14, #39ff14 15px, #000000 15px, #000000 30px)',
      borderAnimation: 'toxic-scroll'
    },
    font: 'Russo One, sans-serif',
    style: 'fx'
  },
  'fx-plasma-wave': {
    name: '🌊 Plasma Wave',
    colors: {
      primary: '#ff00ff',
      secondary: '#ff1493',
      accent: '#da70d6',
      background: '#120012',
      text: '#ff69b4',
      panelBg: 'linear-gradient(135deg, rgba(18, 0, 18, 0.95), rgba(75, 0, 130, 0.95))',
      border: 'linear-gradient(90deg, #ff00ff, #da70d6, #ba55d3, #da70d6, #ff00ff)',
      borderAnimation: 'plasma-pulse'
    },
    font: 'Electrolize, sans-serif',
    style: 'fx'
  },
  'fx-sunset-stripe': {
    name: '🌅 Sunset Stripe',
    colors: {
      primary: '#ff4500',
      secondary: '#ff8c00',
      accent: '#ffd700',
      background: '#1a0500',
      text: '#ffe4b5',
      panelBg: 'linear-gradient(135deg, rgba(26, 5, 0, 0.95), rgba(50, 10, 0, 0.95))',
      border: 'repeating-linear-gradient(90deg, #ff4500, #ff6347 10px, #ff8c00 20px, #ffd700 30px)',
      borderAnimation: 'sunset-scroll'
    },
    font: 'Bebas Neue, cursive',
    style: 'fx'
  },
  'fx-ocean-pulse': {
    name: '🌊 Ocean Pulse',
    colors: {
      primary: '#006994',
      secondary: '#0096c7',
      accent: '#48cae4',
      background: '#03045e',
      text: '#90e0ef',
      panelBg: 'linear-gradient(135deg, rgba(3, 4, 94, 0.95), rgba(0, 105, 148, 0.95))',
      border: 'linear-gradient(90deg, #006994, #0096c7, #00b4d8, #48cae4, #00b4d8, #0096c7, #006994)',
      borderAnimation: 'ocean-pulse'
    },
    font: 'Montserrat, sans-serif',
    style: 'fx'
  },
  // Special FX Themes - Part 2: Diagonal Stripes (10 themes)
  'fx-retro-stripes': {
    name: '📼 Retro Stripes',
    colors: {
      primary: '#ff00ff',
      secondary: '#00ffff',
      accent: '#ffff00',
      background: '#2d0b54',
      text: '#ff00ff',
      panelBg: 'linear-gradient(135deg, rgba(45, 11, 84, 0.95), rgba(88, 24, 69, 0.95))',
      border: 'repeating-linear-gradient(45deg, #ff00ff, #ff00ff 8px, #00ffff 8px, #00ffff 16px, #ffff00 16px, #ffff00 24px)',
      borderAnimation: 'retro-scroll'
    },
    font: 'Audiowide, cursive',
    style: 'fx'
  },
  'fx-danger-zone': {
    name: '⚠️ Danger Zone',
    colors: {
      primary: '#ff0000',
      secondary: '#ffff00',
      accent: '#ff4500',
      background: '#1a0000',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(26, 0, 0, 0.95), rgba(40, 0, 0, 0.95))',
      border: 'repeating-linear-gradient(-45deg, #ff0000, #ff0000 12px, #ffff00 12px, #ffff00 24px)',
      borderAnimation: 'danger-scroll'
    },
    font: 'Teko, sans-serif',
    style: 'fx'
  },
  'fx-electric-stripe': {
    name: '⚡ Electric Stripe',
    colors: {
      primary: '#00ffff',
      secondary: '#0080ff',
      accent: '#00bfff',
      background: '#000814',
      text: '#00ffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 8, 20, 0.95), rgba(0, 20, 40, 0.95))',
      border: 'repeating-linear-gradient(60deg, #00ffff, #00ffff 6px, #0080ff 6px, #0080ff 12px)',
      borderAnimation: 'electric-scroll'
    },
    font: 'Orbitron, sans-serif',
    style: 'fx'
  },
  'fx-cyber-pink': {
    name: '💖 Cyber Pink',
    colors: {
      primary: '#ff0080',
      secondary: '#ff1493',
      accent: '#ff69b4',
      background: '#1a0010',
      text: '#ffb3d9',
      panelBg: 'linear-gradient(135deg, rgba(26, 0, 16, 0.95), rgba(50, 0, 30, 0.95))',
      border: 'linear-gradient(90deg, #ff0080, #ff1493, #ff69b4, #ff1493, #ff0080)',
      borderAnimation: 'cyber-pink-pulse'
    },
    font: 'Comfortaa, cursive',
    style: 'fx'
  },
  'fx-gold-pulse': {
    name: '🏆 Gold Pulse',
    colors: {
      primary: '#ffd700',
      secondary: '#ffed4e',
      accent: '#fff700',
      background: '#1a1400',
      text: '#fffacd',
      panelBg: 'linear-gradient(135deg, rgba(26, 20, 0, 0.95), rgba(50, 40, 0, 0.95))',
      border: 'linear-gradient(90deg, #b8860b, #ffd700, #ffed4e, #fff700, #ffed4e, #ffd700, #b8860b)',
      borderAnimation: 'gold-pulse'
    },
    font: 'Cinzel, serif',
    style: 'fx'
  },
  'fx-emerald-flow': {
    name: '💎 Emerald Flow',
    colors: {
      primary: '#50c878',
      secondary: '#2ecc71',
      accent: '#7fffd4',
      background: '#0d1f17',
      text: '#d0f0c0',
      panelBg: 'linear-gradient(135deg, rgba(13, 31, 23, 0.95), rgba(20, 50, 35, 0.95))',
      border: 'linear-gradient(90deg, #2ecc71, #50c878, #7fffd4, #50c878, #2ecc71)',
      borderAnimation: 'emerald-pulse'
    },
    font: 'Playfair Display, serif',
    style: 'fx'
  },
  'fx-ruby-stripe': {
    name: '💍 Ruby Stripe',
    colors: {
      primary: '#e0115f',
      secondary: '#ff1744',
      accent: '#ff4569',
      background: '#1a0008',
      text: '#ffcce0',
      panelBg: 'linear-gradient(135deg, rgba(26, 0, 8, 0.95), rgba(50, 0, 20, 0.95))',
      border: 'repeating-linear-gradient(45deg, #e0115f, #e0115f 10px, #ff1744 10px, #ff1744 20px)',
      borderAnimation: 'ruby-scroll'
    },
    font: 'Lora, serif',
    style: 'fx'
  },
  'fx-sapphire-pulse': {
    name: '💠 Sapphire Pulse',
    colors: {
      primary: '#0f52ba',
      secondary: '#1e90ff',
      accent: '#4169e1',
      background: '#020a1a',
      text: '#b0d4ff',
      panelBg: 'linear-gradient(135deg, rgba(2, 10, 26, 0.95), rgba(5, 20, 50, 0.95))',
      border: 'linear-gradient(90deg, #082567, #0f52ba, #1e90ff, #4169e1, #1e90ff, #0f52ba, #082567)',
      borderAnimation: 'sapphire-pulse'
    },
    font: 'Libre Baskerville, serif',
    style: 'fx'
  },
  'fx-toxic-warning': {
    name: '☣️ Toxic Warning',
    colors: {
      primary: '#adff2f',
      secondary: '#7fff00',
      accent: '#00ff00',
      background: '#0f1a00',
      text: '#f0fff0',
      panelBg: 'linear-gradient(135deg, rgba(15, 26, 0, 0.95), rgba(30, 50, 0, 0.95))',
      border: 'repeating-linear-gradient(-45deg, #adff2f, #adff2f 10px, #000000 10px, #000000 20px)',
      borderAnimation: 'toxic-warning-scroll'
    },
    font: 'Russo One, sans-serif',
    style: 'fx'
  },
  'fx-midnight-stripe': {
    name: '🌙 Midnight Stripe',
    colors: {
      primary: '#191970',
      secondary: '#4169e1',
      accent: '#6495ed',
      background: '#0a0a1a',
      text: '#e6f0ff',
      panelBg: 'linear-gradient(135deg, rgba(10, 10, 26, 0.95), rgba(20, 20, 40, 0.95))',
      border: 'repeating-linear-gradient(90deg, #191970, #191970 15px, #4169e1 15px, #4169e1 30px)',
      borderAnimation: 'midnight-scroll'
    },
    font: 'Raleway, sans-serif',
    style: 'fx'
  },
  // Special FX Themes - Part 3: Rainbow & Multi-Color (10 themes)
  'fx-rainbow-flash': {
    name: '🌈 Rainbow Flash',
    colors: {
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff',
      background: '#0a0a0a',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95), rgba(20, 20, 20, 0.95))',
      border: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
      borderAnimation: 'rainbow-flash'
    },
    font: 'Poppins, sans-serif',
    style: 'fx'
  },
  'fx-aurora-borealis': {
    name: '🌌 Aurora Borealis',
    colors: {
      primary: '#00ff9f',
      secondary: '#00d4ff',
      accent: '#b19cd9',
      background: '#001a2e',
      text: '#e0ffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 26, 46, 0.95), rgba(0, 40, 70, 0.95))',
      border: 'linear-gradient(90deg, #00ff9f, #00d4ff, #7b68ee, #b19cd9, #7b68ee, #00d4ff, #00ff9f)',
      borderAnimation: 'aurora-pulse'
    },
    font: 'Quicksand, sans-serif',
    style: 'fx'
  },
  'fx-prism-split': {
    name: '🔮 Prism Split',
    colors: {
      primary: '#ff00ff',
      secondary: '#00ffff',
      accent: '#ffff00',
      background: '#1a0a1a',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(26, 10, 26, 0.95), rgba(40, 20, 40, 0.95))',
      border: 'repeating-linear-gradient(120deg, #ff00ff, #ff00ff 8px, #00ffff 8px, #00ffff 16px, #ffff00 16px, #ffff00 24px)',
      borderAnimation: 'prism-scroll'
    },
    font: 'Space Grotesk, sans-serif',
    style: 'fx'
  },
  'fx-laser-grid': {
    name: '🎯 Laser Grid',
    colors: {
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff',
      background: '#000000',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 10, 10, 0.98))',
      border: 'repeating-linear-gradient(0deg, #ff0000 0px, #ff0000 2px, transparent 2px, transparent 4px), repeating-linear-gradient(90deg, #00ff00 0px, #00ff00 2px, transparent 2px, transparent 4px)',
      borderAnimation: 'laser-grid'
    },
    font: 'Orbitron, sans-serif',
    style: 'fx'
  },
  'fx-holographic': {
    name: '💿 Holographic',
    colors: {
      primary: '#c0c0c0',
      secondary: '#ffd700',
      accent: '#ff1493',
      background: '#1a1a2e',
      text: '#f0f0f0',
      panelBg: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(40, 40, 60, 0.95))',
      border: 'linear-gradient(90deg, #ff0080, #ff8c00, #ffd700, #00ff80, #00bfff, #8000ff, #ff0080)',
      borderAnimation: 'holographic-shift'
    },
    font: 'Michroma, sans-serif',
    style: 'fx'
  },
  'fx-chromatic-wave': {
    name: '🎨 Chromatic Wave',
    colors: {
      primary: '#ff6b6b',
      secondary: '#4ecdc4',
      accent: '#ffe66d',
      background: '#2d2d2d',
      text: '#f7fff7',
      panelBg: 'linear-gradient(135deg, rgba(45, 45, 45, 0.95), rgba(60, 60, 60, 0.95))',
      border: 'linear-gradient(90deg, #ff6b6b, #ee5a6f, #c44569, #6c5ce7, #4ecdc4, #44bd32, #ffe66d)',
      borderAnimation: 'chromatic-pulse'
    },
    font: 'Nunito, sans-serif',
    style: 'fx'
  },
  'fx-neon-city': {
    name: '🏙️ Neon City',
    colors: {
      primary: '#ff2a6d',
      secondary: '#05d9e8',
      accent: '#d1f7ff',
      background: '#01012b',
      text: '#d1f7ff',
      panelBg: 'linear-gradient(135deg, rgba(1, 1, 43, 0.95), rgba(10, 10, 60, 0.95))',
      border: 'linear-gradient(90deg, #ff2a6d, #ff6a3d, #f9ca24, #05d9e8, #d1f7ff, #05d9e8, #ff2a6d)',
      borderAnimation: 'neon-city-pulse'
    },
    font: 'Teko, sans-serif',
    style: 'fx'
  },
  'fx-cosmic-rays': {
    name: '✨ Cosmic Rays',
    colors: {
      primary: '#8e44ad',
      secondary: '#3498db',
      accent: '#e74c3c',
      background: '#0c0c1e',
      text: '#ecf0f1',
      panelBg: 'linear-gradient(135deg, rgba(12, 12, 30, 0.95), rgba(20, 20, 40, 0.95))',
      border: 'repeating-linear-gradient(45deg, #8e44ad, #8e44ad 5px, #3498db 5px, #3498db 10px, #e74c3c 10px, #e74c3c 15px)',
      borderAnimation: 'cosmic-scroll'
    },
    font: 'Exo 2, sans-serif',
    style: 'fx'
  },
  'fx-vapor-wave': {
    name: '🌊 Vapor Wave',
    colors: {
      primary: '#ff71ce',
      secondary: '#01cdfe',
      accent: '#05ffa1',
      background: '#2e003e',
      text: '#fffb96',
      panelBg: 'linear-gradient(135deg, rgba(46, 0, 62, 0.95), rgba(70, 0, 95, 0.95))',
      border: 'linear-gradient(90deg, #ff71ce, #b967ff, #01cdfe, #05ffa1, #fffb96, #05ffa1, #01cdfe, #ff71ce)',
      borderAnimation: 'vapor-pulse'
    },
    font: 'Audiowide, cursive',
    style: 'fx'
  },
  'fx-sunset-glow': {
    name: '🌇 Sunset Glow',
    colors: {
      primary: '#ff6348',
      secondary: '#ff9ff3',
      accent: '#feca57',
      background: '#2f3640',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(47, 54, 64, 0.95), rgba(60, 70, 80, 0.95))',
      border: 'linear-gradient(90deg, #ee5a24, #ff6348, #ff9ff3, #feca57, #ff9ff3, #ff6348, #ee5a24)',
      borderAnimation: 'sunset-glow-pulse'
    },
    font: 'Montserrat, sans-serif',
    style: 'fx'
  },
  // Special FX Themes - Part 4: Glitch & Tech (10 themes)
  'fx-glitch-matrix': {
    name: '📟 Glitch Matrix',
    colors: {
      primary: '#00ff00',
      secondary: '#ff00ff',
      accent: '#00ffff',
      background: '#000000',
      text: '#00ff00',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 10, 10, 0.98))',
      border: 'repeating-linear-gradient(90deg, #00ff00 0px, #00ff00 3px, #ff00ff 3px, #ff00ff 6px, #00ffff 6px, #00ffff 9px)',
      borderAnimation: 'glitch-scroll'
    },
    font: 'Courier New, monospace',
    style: 'fx'
  },
  'fx-digital-rain': {
    name: '💻 Digital Rain',
    colors: {
      primary: '#0f0',
      secondary: '#0d0',
      accent: '#0a0',
      background: '#000',
      text: '#0f0',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(0, 10, 0, 0.98))',
      border: 'repeating-linear-gradient(0deg, #0f0, #0f0 4px, #000 4px, #000 8px)',
      borderAnimation: 'digital-rain-fall'
    },
    font: 'Courier New, monospace',
    style: 'fx'
  },
  'fx-circuit-pulse': {
    name: '⚡ Circuit Pulse',
    colors: {
      primary: '#00ff9f',
      secondary: '#00bfff',
      accent: '#7b68ee',
      background: '#0a0a0f',
      text: '#00ffff',
      panelBg: 'linear-gradient(135deg, rgba(10, 10, 15, 0.95), rgba(15, 15, 25, 0.95))',
      border: 'repeating-linear-gradient(45deg, #00ff9f, #00ff9f 6px, #00bfff 6px, #00bfff 12px, #7b68ee 12px, #7b68ee 18px)',
      borderAnimation: 'circuit-pulse'
    },
    font: 'Rajdhani, sans-serif',
    style: 'fx'
  },
  'fx-binary-code': {
    name: '🔢 Binary Code',
    colors: {
      primary: '#00ff00',
      secondary: '#ffffff',
      accent: '#00ff00',
      background: '#000000',
      text: '#00ff00',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(5, 5, 5, 0.98))',
      border: 'repeating-linear-gradient(90deg, #00ff00 0px, #00ff00 2px, #000000 2px, #000000 4px)',
      borderAnimation: 'binary-scroll'
    },
    font: 'Courier New, monospace',
    style: 'fx'
  },
  'fx-data-stream': {
    name: '📊 Data Stream',
    colors: {
      primary: '#00d4ff',
      secondary: '#0080ff',
      accent: '#00ffff',
      background: '#001122',
      text: '#00d4ff',
      panelBg: 'linear-gradient(135deg, rgba(0, 17, 34, 0.95), rgba(0, 30, 50, 0.95))',
      border: 'repeating-linear-gradient(0deg, #00d4ff, #00d4ff 5px, #0080ff 5px, #0080ff 10px)',
      borderAnimation: 'data-flow'
    },
    font: 'Electrolize, sans-serif',
    style: 'fx'
  },
  'fx-quantum-pulse': {
    name: '⚛️ Quantum Pulse',
    colors: {
      primary: '#9d4edd',
      secondary: '#7209b7',
      accent: '#c77dff',
      background: '#10002b',
      text: '#e0aaff',
      panelBg: 'linear-gradient(135deg, rgba(16, 0, 43, 0.95), rgba(30, 0, 70, 0.95))',
      border: 'linear-gradient(90deg, #240046, #9d4edd, #c77dff, #e0aaff, #c77dff, #9d4edd, #240046)',
      borderAnimation: 'quantum-pulse'
    },
    font: 'Orbitron, sans-serif',
    style: 'fx'
  },
  'fx-tech-noir': {
    name: '🎬 Tech Noir',
    colors: {
      primary: '#ff0055',
      secondary: '#00aaff',
      accent: '#ffffff',
      background: '#0a0a0a',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95), rgba(20, 20, 20, 0.95))',
      border: 'repeating-linear-gradient(45deg, #ff0055, #ff0055 10px, #00aaff 10px, #00aaff 20px)',
      borderAnimation: 'tech-noir-scroll'
    },
    font: 'Russo One, sans-serif',
    style: 'fx'
  },
  'fx-neon-grid': {
    name: '🎮 Neon Grid',
    colors: {
      primary: '#ff006e',
      secondary: '#8338ec',
      accent: '#3a86ff',
      background: '#0a0103',
      text: '#fb5607',
      panelBg: 'linear-gradient(135deg, rgba(10, 1, 3, 0.95), rgba(20, 5, 10, 0.95))',
      border: 'repeating-linear-gradient(90deg, #ff006e, #ff006e 8px, #8338ec 8px, #8338ec 16px, #3a86ff 16px, #3a86ff 24px)',
      borderAnimation: 'neon-grid-scroll'
    },
    font: 'Play, sans-serif',
    style: 'fx'
  },
  'fx-cyber-scan': {
    name: '🔍 Cyber Scan',
    colors: {
      primary: '#00ff41',
      secondary: '#00ff88',
      accent: '#00ffcc',
      background: '#001a0a',
      text: '#00ff41',
      panelBg: 'linear-gradient(135deg, rgba(0, 26, 10, 0.95), rgba(0, 40, 20, 0.95))',
      border: 'repeating-linear-gradient(0deg, #00ff41, #00ff41 3px, transparent 3px, transparent 6px)',
      borderAnimation: 'cyber-scan'
    },
    font: 'Saira, sans-serif',
    style: 'fx'
  },
  'fx-retro-computer': {
    name: '💾 Retro Computer',
    colors: {
      primary: '#33ff33',
      secondary: '#00cc00',
      accent: '#99ff99',
      background: '#001100',
      text: '#33ff33',
      panelBg: 'linear-gradient(135deg, rgba(0, 17, 0, 0.95), rgba(0, 30, 0, 0.95))',
      border: 'repeating-linear-gradient(90deg, #33ff33, #33ff33 5px, #001100 5px, #001100 10px)',
      borderAnimation: 'retro-blink'
    },
    font: 'Courier New, monospace',
    style: 'fx'
  },
  // Special FX Themes - Part 5: Extreme Effects (20 themes)
  'fx-disco-fever': {
    name: '🕺 Disco Fever',
    colors: {
      primary: '#ff00ff',
      secondary: '#00ff00',
      accent: '#ffff00',
      background: '#1a001a',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(26, 0, 26, 0.95), rgba(40, 0, 40, 0.95))',
      border: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000)',
      borderAnimation: 'disco-flash'
    },
    font: 'Bebas Neue, cursive',
    style: 'fx'
  },
  'fx-lightning-storm': {
    name: '⚡ Lightning Storm',
    colors: {
      primary: '#ffff00',
      secondary: '#ffffff',
      accent: '#00bfff',
      background: '#0a0a1a',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(10, 10, 26, 0.95), rgba(20, 20, 40, 0.95))',
      border: 'repeating-linear-gradient(120deg, #ffff00, #ffff00 4px, #ffffff 4px, #ffffff 8px)',
      borderAnimation: 'lightning-flash'
    },
    font: 'Teko, sans-serif',
    style: 'fx'
  },
  'fx-bloodmoon': {
    name: '🌕 Bloodmoon',
    colors: {
      primary: '#8b0000',
      secondary: '#ff0000',
      accent: '#ff6347',
      background: '#1a0000',
      text: '#ffcccc',
      panelBg: 'linear-gradient(135deg, rgba(26, 0, 0, 0.95), rgba(50, 0, 0, 0.95))',
      border: 'linear-gradient(90deg, #4a0000, #8b0000, #ff0000, #ff6347, #ff0000, #8b0000, #4a0000)',
      borderAnimation: 'bloodmoon-pulse'
    },
    font: 'Creepster, cursive',
    style: 'fx'
  },
  'fx-cyber-dragon': {
    name: '🐉 Cyber Dragon',
    colors: {
      primary: '#ff0000',
      secondary: '#ff4500',
      accent: '#ffd700',
      background: '#0a0000',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(10, 0, 0, 0.95), rgba(30, 0, 0, 0.95))',
      border: 'repeating-linear-gradient(45deg, #ff0000, #ff0000 8px, #ff4500 8px, #ff4500 16px, #ffd700 16px, #ffd700 24px)',
      borderAnimation: 'dragon-scale'
    },
    font: 'Cinzel, serif',
    style: 'fx'
  },
  'fx-arctic-pulse': {
    name: '🧊 Arctic Pulse',
    colors: {
      primary: '#00ffff',
      secondary: '#87ceeb',
      accent: '#ffffff',
      background: '#001a2e',
      text: '#e0ffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 26, 46, 0.95), rgba(0, 40, 70, 0.95))',
      border: 'linear-gradient(90deg, #00ffff, #40e0d0, #87ceeb, #b0e0e6, #87ceeb, #40e0d0, #00ffff)',
      borderAnimation: 'arctic-pulse'
    },
    font: 'Quicksand, sans-serif',
    style: 'fx'
  },
  'fx-magma-flow': {
    name: '🌋 Magma Flow',
    colors: {
      primary: '#ff4500',
      secondary: '#ff6347',
      accent: '#ff8c00',
      background: '#1a0500',
      text: '#ffe4b5',
      panelBg: 'linear-gradient(135deg, rgba(26, 5, 0, 0.95), rgba(50, 10, 0, 0.95))',
      border: 'linear-gradient(90deg, #8b0000, #ff0000, #ff4500, #ff6347, #ff8c00, #ff6347, #ff4500, #ff0000, #8b0000)',
      borderAnimation: 'magma-pulse'
    },
    font: 'Saira Condensed, sans-serif',
    style: 'fx'
  },
  'fx-radioactive': {
    name: '☢️ Radioactive',
    colors: {
      primary: '#00ff00',
      secondary: '#adff2f',
      accent: '#7fff00',
      background: '#001a00',
      text: '#f0fff0',
      panelBg: 'linear-gradient(135deg, rgba(0, 26, 0, 0.95), rgba(0, 40, 0, 0.95))',
      border: 'repeating-linear-gradient(45deg, #00ff00, #00ff00 12px, #000000 12px, #000000 24px)',
      borderAnimation: 'radioactive-pulse'
    },
    font: 'Russo One, sans-serif',
    style: 'fx'
  },
  'fx-crystal-prism': {
    name: '💎 Crystal Prism',
    colors: {
      primary: '#ffffff',
      secondary: '#e0e0e0',
      accent: '#f5f5f5',
      background: '#1a1a1a',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(40, 40, 40, 0.95))',
      border: 'linear-gradient(90deg, #ff0080, #ff8c00, #ffd700, #00ff80, #00bfff, #8000ff, #ff0080)',
      borderAnimation: 'crystal-shift'
    },
    font: 'Playfair Display, serif',
    style: 'fx'
  },
  'fx-demon-eye': {
    name: '👁️ Demon Eye',
    colors: {
      primary: '#ff0000',
      secondary: '#8b0000',
      accent: '#ff4500',
      background: '#0a0000',
      text: '#ffcccc',
      panelBg: 'linear-gradient(135deg, rgba(10, 0, 0, 0.95), rgba(20, 0, 0, 0.95))',
      border: 'repeating-linear-gradient(0deg, #ff0000, #ff0000 6px, #8b0000 6px, #8b0000 12px)',
      borderAnimation: 'demon-pulse'
    },
    font: 'Creepster, cursive',
    style: 'fx'
  },
  'fx-galaxy-spiral': {
    name: '🌌 Galaxy Spiral',
    colors: {
      primary: '#9d4edd',
      secondary: '#3a0ca3',
      accent: '#f72585',
      background: '#0c0032',
      text: '#e0aaff',
      panelBg: 'linear-gradient(135deg, rgba(12, 0, 50, 0.95), rgba(20, 0, 80, 0.95))',
      border: 'linear-gradient(90deg, #240046, #3c096c, #5a189a, #7209b7, #9d4edd, #c77dff, #e0aaff)',
      borderAnimation: 'galaxy-pulse'
    },
    font: 'Exo 2, sans-serif',
    style: 'fx'
  },
  'fx-thunder-bolt': {
    name: '⚡ Thunder Bolt',
    colors: {
      primary: '#ffd700',
      secondary: '#ffff00',
      accent: '#ffffff',
      background: '#000033',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 51, 0.95), rgba(0, 0, 80, 0.95))',
      border: 'repeating-linear-gradient(45deg, #ffd700, #ffd700 6px, #ffffff 6px, #ffffff 12px)',
      borderAnimation: 'thunder-flash'
    },
    font: 'Teko, sans-serif',
    style: 'fx'
  },
  'fx-inferno-gate': {
    name: '🔥 Inferno Gate',
    colors: {
      primary: '#ff0000',
      secondary: '#ff4500',
      accent: '#ff8c00',
      background: '#1a0000',
      text: '#ffe4b5',
      panelBg: 'linear-gradient(135deg, rgba(26, 0, 0, 0.95), rgba(50, 0, 0, 0.95))',
      border: 'repeating-linear-gradient(90deg, #ff0000, #ff0000 10px, #ff4500 10px, #ff4500 20px, #ff8c00 20px, #ff8c00 30px)',
      borderAnimation: 'inferno-scroll'
    },
    font: 'Saira Condensed, sans-serif',
    style: 'fx'
  },
  'fx-portal-nexus': {
    name: '🌀 Portal Nexus',
    colors: {
      primary: '#00ffff',
      secondary: '#ff00ff',
      accent: '#ffff00',
      background: '#0a0a1a',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(10, 10, 26, 0.95), rgba(20, 20, 40, 0.95))',
      border: 'linear-gradient(90deg, #00ffff, #0080ff, #8000ff, #ff00ff, #ff0080, #ff8000, #ffff00, #00ffff)',
      borderAnimation: 'portal-spin'
    },
    font: 'Orbitron, sans-serif',
    style: 'fx'
  },
  'fx-corrupted-data': {
    name: '🖥️ Corrupted Data',
    colors: {
      primary: '#00ff00',
      secondary: '#ff00ff',
      accent: '#00ffff',
      background: '#000000',
      text: '#00ff00',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 10, 10, 0.98))',
      border: 'repeating-linear-gradient(120deg, #00ff00 0px, #00ff00 2px, #ff00ff 2px, #ff00ff 4px, #00ffff 4px, #00ffff 6px)',
      borderAnimation: 'corrupt-glitch'
    },
    font: 'Courier New, monospace',
    style: 'fx'
  },
  'fx-neon-tokyo': {
    name: '🗼 Neon Tokyo',
    colors: {
      primary: '#ff007f',
      secondary: '#00ffff',
      accent: '#ff00ff',
      background: '#0a0a1a',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(10, 10, 26, 0.95), rgba(20, 20, 40, 0.95))',
      border: 'repeating-linear-gradient(45deg, #ff007f, #ff007f 8px, #00ffff 8px, #00ffff 16px, #ff00ff 16px, #ff00ff 24px)',
      borderAnimation: 'tokyo-scroll'
    },
    font: 'Audiowide, cursive',
    style: 'fx'
  },
  'fx-void-walker': {
    name: '🌑 Void Walker',
    colors: {
      primary: '#9d4edd',
      secondary: '#3c096c',
      accent: '#c77dff',
      background: '#000000',
      text: '#e0aaff',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 0, 20, 0.98))',
      border: 'linear-gradient(90deg, #000000, #3c096c, #9d4edd, #c77dff, #9d4edd, #3c096c, #000000)',
      borderAnimation: 'void-pulse'
    },
    font: 'Cinzel, serif',
    style: 'fx'
  },
  'fx-hyper-speed': {
    name: '💨 Hyper Speed',
    colors: {
      primary: '#00ffff',
      secondary: '#00bfff',
      accent: '#ffffff',
      background: '#000033',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 51, 0.95), rgba(0, 0, 80, 0.95))',
      border: 'repeating-linear-gradient(90deg, #00ffff, #00ffff 4px, #00bfff 4px, #00bfff 8px, #ffffff 8px, #ffffff 12px)',
      borderAnimation: 'hyper-scroll'
    },
    font: 'Rajdhani, sans-serif',
    style: 'fx'
  },
  'fx-royal-crown': {
    name: '👑 Royal Crown',
    colors: {
      primary: '#ffd700',
      secondary: '#9d4edd',
      accent: '#ffffff',
      background: '#1a0a2e',
      text: '#ffffff',
      panelBg: 'linear-gradient(135deg, rgba(26, 10, 46, 0.95), rgba(40, 20, 70, 0.95))',
      border: 'linear-gradient(90deg, #ffd700, #ffed4e, #ffd700, #9d4edd, #c77dff, #9d4edd, #ffd700)',
      borderAnimation: 'crown-pulse'
    },
    font: 'Playfair Display, serif',
    style: 'fx'
  },
  'fx-aurora-storm': {
    name: '🌩️ Aurora Storm',
    colors: {
      primary: '#00ff9f',
      secondary: '#00d4ff',
      accent: '#ff00ff',
      background: '#001a2e',
      text: '#e0ffff',
      panelBg: 'linear-gradient(135deg, rgba(0, 26, 46, 0.95), rgba(0, 40, 70, 0.95))',
      border: 'linear-gradient(90deg, #00ff9f, #00d4ff, #7b68ee, #ff00ff, #7b68ee, #00d4ff, #00ff9f)',
      borderAnimation: 'aurora-storm'
    },
    font: 'Quicksand, sans-serif',
    style: 'fx'
  },
  'fx-pixel-surge': {
    name: '🎮 Pixel Surge',
    colors: {
      primary: '#ff006e',
      secondary: '#8338ec',
      accent: '#3a86ff',
      background: '#000000',
      text: '#fb5607',
      panelBg: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98), rgba(10, 0, 5, 0.98))',
      border: 'repeating-linear-gradient(90deg, #ff006e 0px, #ff006e 6px, #8338ec 6px, #8338ec 12px, #3a86ff 12px, #3a86ff 18px)',
      borderAnimation: 'pixel-scroll'
    },
    font: 'Press Start 2P, cursive',
    style: 'fx'
  }
};

const CustomizationPanel = ({ onClose }) => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');
  const [themeCategory, setThemeCategory] = useState('all');
  const [currentTheme, setCurrentTheme] = useState('cyberpunk');
  const [settings, setSettings] = useState({
      // General
      streamerName: localStorage.getItem('streamerName') || 'Your Name',
      websiteUrl: '',
      logoUrl: '',
      backgroundType: 'stars',
      backgroundStyle: 'animated-stars',
      customBackgroundUrl: '',
      panelPosition: 'right',
      carouselSpeed: 3,
      dragResize: true,
      
      // Colors
      primaryColor: '#9147ff',
      secondaryColor: '#00e1ff',
      accentColor: '#667eea',
      backgroundColor: '#0f0f23',
      textColor: '#ffffff',
      
      // Gradients
      gradient1: '#667eea',
      gradient2: '#764ba2',
      gradientAngle: 135,
      
      // Effects
      animations: true,
      particles: true,
      blur: true,
      shadows: true,
      glow: true,
      
      // Chat
      twitchChannel: '',
      showChat: false,
      chatPosition: 'bottom-left',
      chatWidth: 350,
      chatHeight: 500,
      
      // Spotify
      showSpotify: false
    });

  // Load user's customization from database on mount
  useEffect(() => {
    if (!user) {
      setIsInitialized(false);
      return;
    }

    const loadCustomization = async () => {
      try {
        const state = await getUserOverlayState(user.id);
        if (state) {
          setCurrentTheme(state.theme || 'cyberpunk');
          if (state.theme && THEMES[state.theme]) {
            applyTheme(state.theme);
          }
          // Load other settings if saved in the database
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading customization:', error);
        setIsInitialized(true);
      }
    };

    loadCustomization();
  }, [user]);

  // Subscribe to real-time customization updates
  useEffect(() => {
    if (!user || !isInitialized) return;

    const subscription = subscribeToOverlayState(user.id, (payload) => {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const state = payload.new;
        if (state.theme && state.theme !== currentTheme) {
          setCurrentTheme(state.theme);
          applyTheme(state.theme);
        }
      }
    });

    return () => {
      unsubscribe(subscription);
    };
  }, [user, isInitialized, currentTheme]);

  // Apply saved theme and background on mount
  useEffect(() => {
    if (currentTheme && THEMES[currentTheme]) {
      applyTheme(currentTheme);
    }
    
    // Restore background
    const savedSettings = localStorage.getItem('overlaySettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.backgroundStyle && parsed.backgroundStyle.startsWith('bg-video-')) {
        // Restore video background
        const existingVideo = document.getElementById('video-background');
        if (existingVideo) existingVideo.remove();
        const video = document.createElement('video');
        video.id = 'video-background';
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1;';
        video.src = parsed.customBackgroundUrl;
        document.body.insertBefore(video, document.body.firstChild);
        document.body.style.background = 'transparent';
      } else if (parsed.customBackgroundUrl && parsed.backgroundStyle && parsed.backgroundStyle.startsWith('bg-image-')) {
        // Restore image background
        document.body.style.background = `url(${parsed.customBackgroundUrl}) center/cover fixed`;
        document.body.className = '';
      } else if (parsed.backgroundStyle) {
        // Restore other backgrounds
        document.body.className = parsed.backgroundStyle;
      }
    }
  }, []);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('overlaySettings', JSON.stringify(settings));
    
    onClose();
  };

  const handleReset = () => {
    localStorage.removeItem('overlaySettings');
    window.location.reload();
  };

  const renderBrandingTab = () => (
    <div className="tab-panel">
      <div className="section">
        <h3>🏷️ Branding</h3>
        <div className="setting-row">
          <label>Streamer Name:</label>
          <input 
            type="text" 
            id="custom-streamer-name" 
            placeholder="Enter streamer name"
            defaultValue={settings.streamerName}
            onChange={(e) => {
              const newName = e.target.value;
              const newSettings = { ...settings, streamerName: newName };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              localStorage.setItem('streamerName', newName);
              localStorage.setItem('twitchChannel', newName);
              window.dispatchEvent(new CustomEvent('streamerNameChanged', { detail: { name: newName } }));
            }}
          />
        </div>
        <div className="setting-row">
          <label>Default Slot Image:</label>
          <select 
            value={localStorage.getItem('defaultSlotImage') || 'zilhas.png'}
            onChange={(e) => {
              const selectedImage = e.target.value;
              localStorage.setItem('defaultSlotImage', selectedImage);
              window.dispatchEvent(new CustomEvent('defaultSlotImageChanged'));
              
              // Auto-update streamer name based on profile
              let streamerName = '';
              if (selectedImage === 'zilhas.png') {
                streamerName = 'zilhasrcz';
              } else if (selectedImage === 'seca.png') {
                streamerName = 'osecaadegas95';
              } else if (selectedImage === 'TnT.png') {
                streamerName = 'Torra_e_Tilta';
              }
              
              if (streamerName) {
                const newSettings = { ...settings, streamerName };
                setSettings(newSettings);
                localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
                localStorage.setItem('streamerName', streamerName);
                window.dispatchEvent(new CustomEvent('streamerNameChanged', { detail: { name: streamerName } }));
              }
            }}
          >
            <option value="zilhas.png">Zilhas</option>
            <option value="seca.png">Seca</option>
            <option value="TnT.png">TnT</option>
          </select>
        </div>
      </div>
    </div>
  );



  const applyTheme = async (themeKey) => {
    const theme = THEMES[themeKey];
    if (!theme) return;

    // Apply CSS variables
    document.documentElement.style.setProperty('--theme-primary', theme.colors.primary);
    document.documentElement.style.setProperty('--theme-secondary', theme.colors.secondary);
    document.documentElement.style.setProperty('--theme-accent', theme.colors.accent);
    document.documentElement.style.setProperty('--theme-background', theme.colors.background);
    document.documentElement.style.setProperty('--theme-text', theme.colors.text);
    document.documentElement.style.setProperty('--theme-panel-bg', theme.colors.panelBg);
    document.documentElement.style.setProperty('--theme-border', theme.colors.border);
    document.documentElement.style.setProperty('--theme-font', theme.font);

    // Apply border animation for FX themes
    if (theme.colors.borderAnimation) {
      document.documentElement.style.setProperty('--theme-border-animation', theme.colors.borderAnimation);
      document.body.classList.add('fx-theme-active');
    } else {
      document.documentElement.style.setProperty('--theme-border-animation', 'none');
      document.body.classList.remove('fx-theme-active');
    }

    // Save theme selection locally and to database
    localStorage.setItem('selectedTheme', themeKey);
    setCurrentTheme(themeKey);
    
    if (user && isInitialized) {
      try {
        await updateCustomization(user.id, { theme: themeKey });
      } catch (error) {
        console.error('Error saving theme to database:', error);
      }
    }
    
    // Apply background based on theme
    document.body.style.background = theme.colors.background;
    
    // Dispatch event to update components
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeKey, colors: theme.colors } }));
  };

  const renderThemesTab = () => {
    const currentTheme = localStorage.getItem('selectedTheme') || 'cyberpunk';
    
    const modernThemes = ['cyberpunk', 'minimal', 'royal', 'gaming', 'ocean', 'sunset', 'matrix', 'synthwave', 'forest', 'midnight'];
    const seasonalThemes = ['christmas', 'halloween', 'summer', 'autumn'];
    const animatedThemes = ['neon-pulse', 'aurora-wave', 'fire-storm', 'electric-blue', 'plasma-burst'];
    const glassThemes = ['frosted-glass', 'crystal-clear', 'smoke-glass', 'amber-glass', 'rose-glass'];
    const premiumThemes = ['gold-luxe', 'platinum-elite', 'emerald-crown', 'sapphire-royal', 'obsidian-prestige'];
    const glossyThemes = ['glossy-cherry', 'glossy-ocean', 'glossy-lime', 'glossy-grape', 'glossy-tangerine', 'glossy-mint', 'glossy-rose', 'glossy-sky', 'glossy-amber', 'glossy-lavender'];
    const matteThemes = ['matte-charcoal', 'matte-slate', 'matte-sage', 'matte-terracotta', 'matte-moss', 'matte-clay', 'matte-concrete', 'matte-sand', 'matte-ash', 'matte-olive'];
    const anodizedThemes = ['anodized-titanium', 'anodized-blue', 'anodized-purple', 'anodized-red', 'anodized-green', 'anodized-gold', 'anodized-cyan', 'anodized-magenta', 'anodized-orange', 'anodized-silver'];
    const metallicThemes = ['metallic-chrome', 'metallic-bronze', 'metallic-copper', 'metallic-steel', 'metallic-platinum', 'metallic-cobalt', 'metallic-pewter', 'metallic-brass', 'metallic-gunmetal', 'metallic-mercury'];
    const vibrantThemes = ['vibrant-red', 'vibrant-blue', 'vibrant-orange', 'vibrant-green', 'vibrant-pink', 'vibrant-purple', 'vibrant-grey', 'vibrant-black', 'vibrant-white', 'vibrant-cyan'];
    const vividThemes = ['vivid-red', 'vivid-blue', 'vivid-orange', 'vivid-green', 'vivid-pink', 'vivid-purple', 'vivid-grey', 'vivid-black', 'vivid-white', 'vivid-cyan'];
    const fxThemes = ['fx-rgb-pulse', 'fx-neon-pulse', 'fx-cyber-stripe', 'fx-matrix-flow', 'fx-fire-pulse', 'fx-ice-flow', 'fx-toxic-stripe', 'fx-plasma-wave', 'fx-sunset-stripe', 'fx-ocean-pulse', 'fx-retro-stripes', 'fx-danger-zone', 'fx-electric-stripe', 'fx-cyber-pink', 'fx-gold-pulse', 'fx-emerald-flow', 'fx-ruby-stripe', 'fx-sapphire-pulse', 'fx-toxic-warning', 'fx-midnight-stripe', 'fx-rainbow-flash', 'fx-aurora-borealis', 'fx-prism-split', 'fx-laser-grid', 'fx-holographic', 'fx-chromatic-wave', 'fx-neon-city', 'fx-cosmic-rays', 'fx-vapor-wave', 'fx-sunset-glow', 'fx-glitch-matrix', 'fx-digital-rain', 'fx-circuit-pulse', 'fx-binary-code', 'fx-data-stream', 'fx-quantum-pulse', 'fx-tech-noir', 'fx-neon-grid', 'fx-cyber-scan', 'fx-retro-computer', 'fx-disco-fever', 'fx-lightning-storm', 'fx-bloodmoon', 'fx-cyber-dragon', 'fx-arctic-pulse', 'fx-magma-flow', 'fx-radioactive', 'fx-crystal-prism', 'fx-demon-eye', 'fx-galaxy-spiral', 'fx-thunder-bolt', 'fx-inferno-gate', 'fx-portal-nexus', 'fx-corrupted-data', 'fx-neon-tokyo', 'fx-void-walker', 'fx-hyper-speed', 'fx-royal-crown', 'fx-aurora-storm', 'fx-pixel-surge'];
    
    const getFilteredThemes = () => {
      switch(themeCategory) {
        case 'modern': return modernThemes;
        case 'animated': return animatedThemes;
        case 'glass': return glassThemes;
        case 'premium': return premiumThemes;
        case 'seasonal': return seasonalThemes;
        case 'glossy': return glossyThemes;
        case 'matte': return matteThemes;
        case 'anodized': return anodizedThemes;
        case 'metallic': return metallicThemes;
        case 'vibrant': return vibrantThemes;
        case 'vivid': return vividThemes;
        case 'fx': return fxThemes;
        case 'all':
        default:
          return [...modernThemes, ...animatedThemes, ...glassThemes, ...premiumThemes, ...seasonalThemes, ...glossyThemes, ...matteThemes, ...anodizedThemes, ...metallicThemes, ...vibrantThemes, ...vividThemes, ...fxThemes];
      }
    };

    const filteredThemeKeys = getFilteredThemes();

    return (
      <div className="tab-panel">
        <div className="theme-category-tabs">
          <button 
            className={`theme-category-btn ${themeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setThemeCategory('all')}
          >
            All
          </button>
          <button 
            className={`theme-category-btn ${themeCategory === 'modern' ? 'active' : ''}`}
            onClick={() => setThemeCategory('modern')}
          >
            🎨 Modern
          </button>
          <button 
            className={`theme-category-btn ${themeCategory === 'animated' ? 'active' : ''}`}
            onClick={() => setThemeCategory('animated')}
          >
            ⚡ Animated
          </button>
          <button 
            className={`theme-category-btn ${themeCategory === 'glass' ? 'active' : ''}`}
            onClick={() => setThemeCategory('glass')}
          >
            💎 Glass
          </button>
          <button 
            className={`theme-category-btn ${themeCategory === 'premium' ? 'active' : ''}`}
            onClick={() => setThemeCategory('premium')}
          >
            👑 Premium
          </button>
          <button 
            className={`theme-category-btn ${themeCategory === 'seasonal' ? 'active' : ''}`}
            onClick={() => setThemeCategory('seasonal')}
          >
            🎉 Seasonal
          </button>
          <button 
            className={`theme-category-btn ${themeCategory === 'glossy' ? 'active' : ''}`}
            onClick={() => setThemeCategory('glossy')}
          >
            ✨ Glossy
          </button>
          <button 
            className={`theme-category-btn ${themeCategory === 'matte' ? 'active' : ''}`}
            onClick={() => setThemeCategory('matte')}
          >
            🎯 Matte
          </button>
          <button 
            className={`theme-category-btn ${themeCategory === 'anodized' ? 'active' : ''}`}
            onClick={() => setThemeCategory('anodized')}
          >
            🔧 Anodized
          </button>
          <button 
            className={`theme-category-btn ${themeCategory === 'metallic' ? 'active' : ''}`}
            onClick={() => setThemeCategory('metallic')}
          >
            ⚙️ Metallic
          </button>
          <button 
            className={`theme-category-btn ${themeCategory === 'vibrant' ? 'active' : ''}`}
            onClick={() => setThemeCategory('vibrant')}
          >
            🌈 Vibrant
          </button>
          <button 
            className={`theme-category-btn ${themeCategory === 'vivid' ? 'active' : ''}`}
            onClick={() => setThemeCategory('vivid')}
          >
            💥 Vivid
          </button>
          <button 
            className={`theme-category-btn ${themeCategory === 'fx' ? 'active' : ''}`}
            onClick={() => setThemeCategory('fx')}
          >
            🎆 FX
          </button>
        </div>

        <div className="section">
          <div className="themes-grid">
            {Object.entries(THEMES).filter(([key]) => filteredThemeKeys.includes(key)).map(([key, theme]) => (
              <div 
                key={key}
                className={`theme-option ${currentTheme === key ? 'active' : ''} ${theme.style === 'fx' ? 'fx-theme' : ''}`}
                onClick={() => applyTheme(key)}
              >
                <div className="theme-preview" style={{
                  background: theme.colors.panelBg,
                  border: `2px solid ${theme.colors.border}`
                }}>
                  <div className="theme-preview-header" style={{ 
                    background: theme.colors.primary,
                    fontFamily: theme.font
                  }}></div>
                  <div className="theme-preview-body">
                    <div className="theme-preview-bar" style={{ background: theme.colors.secondary }}></div>
                    <div className="theme-preview-bar" style={{ background: theme.colors.accent }}></div>
                  </div>
                </div>
                <span style={{ fontFamily: theme.font }}>{theme.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderBackgroundTab = () => (
    <div className="tab-panel">
      <div className="section">
        <h3>🎨 Background Style</h3>
        
        <div className="background-grid">
          {/* Animated Backgrounds */}
          <div 
            className={`background-option ${settings.backgroundStyle === 'animated-stars' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'animated-stars' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.className = 'animated-stars';
            }}
          >
            <div className="bg-preview animated-stars-preview"></div>
            <span>Animated Stars</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'particles' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'particles' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.className = 'particles';
            }}
          >
            <div className="bg-preview particles-preview"></div>
            <span>Particles</span>
          </div>

          {/* Solid Colors */}
          <div 
            className={`background-option ${settings.backgroundStyle === 'dark' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'dark' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.className = 'dark';
            }}
          >
            <div className="bg-preview" style={{ background: '#0f0f23' }}></div>
            <span>Dark Blue</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'black' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'black' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.className = 'black';
            }}
          >
            <div className="bg-preview" style={{ background: '#000000' }}></div>
            <span>Pure Black</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'purple' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'purple' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.className = 'purple';
            }}
          >
            <div className="bg-preview" style={{ background: '#1a0f2e' }}></div>
            <span>Deep Purple</span>
          </div>

          {/* Gradients */}
          <div 
            className={`background-option ${settings.backgroundStyle === 'gradient-purple' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'gradient-purple' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.className = 'gradient-purple';
            }}
          >
            <div className="bg-preview" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></div>
            <span>Purple Gradient</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'gradient-blue' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'gradient-blue' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.className = 'gradient-blue';
            }}
          >
            <div className="bg-preview" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }}></div>
            <span>Ocean Gradient</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'gradient-sunset' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'gradient-sunset' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.className = 'gradient-sunset';
            }}
          >
            <div className="bg-preview" style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%)' }}></div>
            <span>Sunset Gradient</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'gradient-neon' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'gradient-neon' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.className = 'gradient-neon';
            }}
          >
            <div className="bg-preview" style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #9147ff 50%, #ff006e 100%)' }}></div>
            <span>Neon Gradient</span>
          </div>

          {/* Image Backgrounds */}
          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-image-1' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-image-1', customBackgroundUrl: '/backgrounds/background1.jpg' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.style.background = `url(/backgrounds/background1.jpg) center/cover fixed`;
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/background1.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <span>Background 1</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-image-2' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-image-2', customBackgroundUrl: '/backgrounds/background2.png' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.style.background = `url(/backgrounds/background2.png) center/cover fixed`;
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/background2.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <span>Background 2</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-image-3' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-image-3', customBackgroundUrl: '/backgrounds/background3.png' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.style.background = `url(/backgrounds/background3.png) center/cover fixed`;
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/background3.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <span>Background 3</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-image-4' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-image-4', customBackgroundUrl: '/backgrounds/background4.jpg' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.style.background = `url(/backgrounds/background4.jpg) center/cover fixed`;
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/background4.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <span>Background 4</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-image-5' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-image-5', customBackgroundUrl: '/backgrounds/background5.jpg' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.style.background = `url(/backgrounds/background5.jpg) center/cover fixed`;
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/background5.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <span>Background 5</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-image-6' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-image-6', customBackgroundUrl: '/backgrounds/background6.jpg' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.style.background = `url(/backgrounds/background6.jpg) center/cover fixed`;
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/background6.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <span>Background 6</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-image-rain' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-image-rain', customBackgroundUrl: '/backgrounds/rain-5841181.jpg' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.style.background = `url(/backgrounds/rain-5841181.jpg) center/cover fixed`;
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/rain-5841181.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <span>Rain</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-image-room' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-image-room', customBackgroundUrl: '/backgrounds/room-8456857.jpg' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.style.background = `url(/backgrounds/room-8456857.jpg) center/cover fixed`;
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/room-8456857.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <span>Room</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-image-4k' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-image-4k', customBackgroundUrl: '/backgrounds/4k-streaming-5333-x-3000-wallpaper-kaqyxb14tslzrgh3.jpg' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.style.background = `url(/backgrounds/4k-streaming-5333-x-3000-wallpaper-kaqyxb14tslzrgh3.jpg) center/cover fixed`;
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/4k-streaming-5333-x-3000-wallpaper-kaqyxb14tslzrgh3.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <span>4K Streaming</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-image-photoshop' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-image-photoshop', customBackgroundUrl: '/backgrounds/PhotoshopExtension_Image.png' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              document.body.style.background = `url(/backgrounds/PhotoshopExtension_Image.png) center/cover fixed`;
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/PhotoshopExtension_Image.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <span>Photoshop</span>
          </div>

          {/* Video Backgrounds */}
          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-video-1' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-video-1', customBackgroundUrl: '/backgrounds/10755266-hd_3840_2160_30fps.mp4' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              // Remove existing video background if any
              const existingVideo = document.getElementById('video-background');
              if (existingVideo) existingVideo.remove();
              // Create video background
              const video = document.createElement('video');
              video.id = 'video-background';
              video.autoplay = true;
              video.loop = true;
              video.muted = true;
              video.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1;';
              video.src = '/backgrounds/10755266-hd_3840_2160_30fps.mp4';
              document.body.insertBefore(video, document.body.firstChild);
              document.body.style.background = 'transparent';
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/10755266-hd_3840_2160_30fps.mp4)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
              <span style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', padding: '2px 5px', borderRadius: '3px', fontSize: '10px' }}>▶️</span>
            </div>
            <span>Video 1</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-video-2' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-video-2', customBackgroundUrl: '/backgrounds/14478854_1920_1080_30fps.mp4' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              const existingVideo = document.getElementById('video-background');
              if (existingVideo) existingVideo.remove();
              const video = document.createElement('video');
              video.id = 'video-background';
              video.autoplay = true;
              video.loop = true;
              video.muted = true;
              video.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1;';
              video.src = '/backgrounds/14478854_1920_1080_30fps.mp4';
              document.body.insertBefore(video, document.body.firstChild);
              document.body.style.background = 'transparent';
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/14478854_1920_1080_30fps.mp4)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
              <span style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', padding: '2px 5px', borderRadius: '3px', fontSize: '10px' }}>▶️</span>
            </div>
            <span>Video 2</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-video-3' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-video-3', customBackgroundUrl: '/backgrounds/8733055-uhd_3840_2160_30fps.mp4' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              const existingVideo = document.getElementById('video-background');
              if (existingVideo) existingVideo.remove();
              const video = document.createElement('video');
              video.id = 'video-background';
              video.autoplay = true;
              video.loop = true;
              video.muted = true;
              video.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1;';
              video.src = '/backgrounds/8733055-uhd_3840_2160_30fps.mp4';
              document.body.insertBefore(video, document.body.firstChild);
              document.body.style.background = 'transparent';
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/8733055-uhd_3840_2160_30fps.mp4)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
              <span style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', padding: '2px 5px', borderRadius: '3px', fontSize: '10px' }}>▶️</span>
            </div>
            <span>Video 3</span>
          </div>

          <div 
            className={`background-option ${settings.backgroundStyle === 'bg-video-4' ? 'active' : ''}`}
            onClick={() => {
              const newSettings = { ...settings, backgroundStyle: 'bg-video-4', customBackgroundUrl: '/backgrounds/9909477-uhd_3840_2160_30fps.mp4' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              const existingVideo = document.getElementById('video-background');
              if (existingVideo) existingVideo.remove();
              const video = document.createElement('video');
              video.id = 'video-background';
              video.autoplay = true;
              video.loop = true;
              video.muted = true;
              video.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1;';
              video.src = '/backgrounds/9909477-uhd_3840_2160_30fps.mp4';
              document.body.insertBefore(video, document.body.firstChild);
              document.body.style.background = 'transparent';
              document.body.className = '';
            }}
          >
            <div className="bg-preview" style={{ backgroundImage: 'url(/backgrounds/9909477-uhd_3840_2160_30fps.mp4)', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
              <span style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', padding: '2px 5px', borderRadius: '3px', fontSize: '10px' }}>▶️</span>
            </div>
            <span>Video 4</span>
          </div>
        </div>

        <div className="setting-row">
          <label>Custom Background URL:</label>
          <input 
            type="text" 
            placeholder="Enter image URL or upload below"
            value={settings.customBackgroundUrl || ''}
            onChange={(e) => {
              const url = e.target.value;
              const newSettings = { ...settings, customBackgroundUrl: url, backgroundStyle: 'custom' };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              if (url) {
                document.body.style.background = `url(${url}) center/cover fixed`;
              }
            }}
          />
        </div>

        <div className="setting-row">
          <label>Or Upload Background:</label>
          <input 
            type="file" 
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const url = event.target.result;
                  const newSettings = { ...settings, customBackgroundUrl: url, backgroundStyle: 'custom' };
                  setSettings(newSettings);
                  localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
                  document.body.style.background = `url(${url}) center/cover fixed`;
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderWidgetsTab = () => (
    <div className="tab-panel">
      <div className="section">
        <h3>🎵 Spotify Widget</h3>
        <div className="setting-row">
          <label>Enable Spotify Widget:</label>
          <input 
            type="checkbox" 
            id="enable-spotify"
            defaultChecked={localStorage.getItem('showSpotify') === 'true'}
            onChange={(e) => {
              const showSpotify = e.target.checked;
              localStorage.setItem('showSpotify', showSpotify);
              window.dispatchEvent(new CustomEvent('toggleSpotify', { detail: { show: showSpotify } }));
            }}
          />
        </div>
      </div>

      <div className="section">
        <h3>💬 Twitch Chat</h3>
        <div className="setting-row">
          <label>Enable Twitch Chat:</label>
          <input 
            type="checkbox" 
            id="enable-twitch-chat"
            defaultChecked={localStorage.getItem('showTwitchChat') === 'true'}
            onChange={(e) => {
              const showChat = e.target.checked;
              localStorage.setItem('showTwitchChat', showChat);
              window.dispatchEvent(new CustomEvent('toggleTwitchChat', { detail: { show: showChat } }));
            }}
          />
        </div>
        <div className="setting-row">
          <label>Twitch Channel:</label>
          <input 
            type="text" 
            id="twitch-channel" 
            placeholder="Enter channel name"
            defaultValue={localStorage.getItem('twitchChannel') || ''}
            onChange={(e) => {
              const newChannel = e.target.value;
              localStorage.setItem('twitchChannel', newChannel);
              localStorage.setItem('streamerName', newChannel);
              window.dispatchEvent(new CustomEvent('streamerNameChanged', { detail: { name: newChannel } }));
            }}
          />
        </div>
        <div className="setting-row">
          <label>Chat Position:</label>
          <select 
            id="chat-position"
            defaultValue={settings.chatPosition || 'bottom-left'}
            onChange={(e) => {
              const newSettings = { ...settings, chatPosition: e.target.value };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              window.dispatchEvent(new CustomEvent('chatSettingsUpdated'));
            }}
          >
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
        <div className="setting-row">
          <label>Chat Width:</label>
          <input 
            type="range" 
            id="chat-width" 
            min="200" 
            max="500" 
            defaultValue={settings.chatWidth || 350}
            onChange={(e) => {
              const width = parseInt(e.target.value);
              document.getElementById('chat-width-value').textContent = `${width}px`;
              const newSettings = { ...settings, chatWidth: width };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              window.dispatchEvent(new CustomEvent('chatSettingsUpdated'));
            }}
          />
          <span id="chat-width-value">{settings.chatWidth || 350}px</span>
        </div>
        <div className="setting-row">
          <label>Chat Height:</label>
          <input 
            type="range" 
            id="chat-height" 
            min="300" 
            max="800" 
            defaultValue={settings.chatHeight || 500}
            onChange={(e) => {
              const height = parseInt(e.target.value);
              document.getElementById('chat-height-value').textContent = `${height}px`;
              const newSettings = { ...settings, chatHeight: height };
              setSettings(newSettings);
              localStorage.setItem('overlaySettings', JSON.stringify(newSettings));
              window.dispatchEvent(new CustomEvent('chatSettingsUpdated'));
            }}
          />
          <span id="chat-height-value">{settings.chatHeight || 500}px</span>
        </div>
      </div>
    </div>
  );



  const draggableRef = useDraggable(true, 'customization');

  return (
    <div className="customization-overlay">
      <div className="customization-panel" ref={draggableRef}>
        <div className="customization-header drag-handle">
          <h2>🎨 Customization Panel</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="customization-tabs">
          <button 
            className={`tab-btn ${activeTab === 'branding' ? 'active' : ''}`}
            onClick={() => setActiveTab('branding')}
          >
            🏷️ Brand
          </button>
          <button 
            className={`tab-btn ${activeTab === 'themes' ? 'active' : ''}`}
            onClick={() => setActiveTab('themes')}
          >
            🎨 Themes
          </button>
          <button 
            className={`tab-btn ${activeTab === 'background' ? 'active' : ''}`}
            onClick={() => setActiveTab('background')}
          >
            🖼️ Background
          </button>
          <button 
            className={`tab-btn ${activeTab === 'widgets' ? 'active' : ''}`}
            onClick={() => setActiveTab('widgets')}
          >
            🔌 Widgets
          </button>
        </div>

        <div className="customization-body">
          {activeTab === 'branding' && renderBrandingTab()}
          {activeTab === 'themes' && renderThemesTab()}
          {activeTab === 'background' && renderBackgroundTab()}
          {activeTab === 'widgets' && renderWidgetsTab()}
        </div>

        <div className="customization-footer">
          <button className="action-btn reset-btn" onClick={handleReset}>Reset All</button>
          <button className="action-btn save-btn" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
};

export default CustomizationPanel;
