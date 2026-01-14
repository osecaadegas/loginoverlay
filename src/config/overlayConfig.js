// Overlay configuration - Complete settings matching original design

const overlayConfig = {
  // Twitch settings
  twitch: {
    channelName: 'CHANNEL', // Replace with your Twitch channel name
    showChat: false, // Set to true to show chat iframe
    chatParent: 'localhost', // Update this for production (e.g., 'yourdomain.com')
    chatTheme: 'dark' // 'dark' or 'light'
  },

  // Display settings
  display: {
    headerTitle: 'Bonus Hunt Tracker',
    showFooter: false,
    currency: '€', // Currency symbol to display
    decimals: 2, // Number of decimal places for currency
    streamerName: 'Streamer',
    websiteUrl: 'https://your-website.com',
    websiteText: 'Your Website'
  },

  // Layout settings
  layout: {
    mode: 'classic', // 'classic' | 'modern-card' | 'modern-sidebar'
    maxBonusListHeight: '500px',
    statsPosition: 'right',
    infoPanelPosition: 'upper-right', // 'upper-right' | 'lower-right' | 'upper-left' | 'lower-left' | 'center-right'
    sidebarPosition: 'left'
  },

  // Theme colors (can be modified to match your stream aesthetic)
  theme: {
    primary: '#9346ff', // Purple
    accent: '#00e1ff', // Cyan
    background: '#1a1b2e', // Dark blue
    cardBackground: '#2a2b3d',
    text: '#ffffff',
    textSecondary: '#b0b3b8',
    success: '#00ff88',
    danger: '#ff6b6b',
    warning: '#ffaa00',
    slotGradientStart: '#9346ff',
    slotGradientEnd: '#00e1ff',
    buttonGradientStart: '#9346ff',
    buttonGradientEnd: '#7c3aed',
    gradientDirection: '135deg'
  },

  // Visual effects
  effects: {
    glassEffect: true,
    glassOpacity: 0.3,
    glassBlur: 10,
    animatedGradients: true,
    glowEffects: true,
    sidebarBackgrounds: false // Show/hide sidebar button backgrounds
  },

  // Bonus hunt settings
  bonusHunt: {
    showStatsPanel: true,
    autoSave: true,
    keyboardNavigation: true,
    carouselSpeed: 3000, // milliseconds
    carouselAutoplay: true
  }
};

export default overlayConfig;
