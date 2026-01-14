# Themes System Documentation

## Overview
A comprehensive theming system has been implemented that allows you to completely customize the look and feel of your streaming overlay. The system includes **10 modern themes** and **4 seasonal themes**, each with unique color schemes, fonts, and styling.

## How to Use
1. Click the **⚙️ Settings** button in the navbar
2. Navigate to the **🎨 Themes** tab
3. Click on any theme preview card to apply it
4. Your selected theme is automatically saved and will persist across sessions

## Modern Themes (10)

### 1. 🚀 Cyberpunk Neon
**Style:** Futuristic, high-tech
- **Primary Color:** Neon Green (#00ff41)
- **Secondary Color:** Hot Pink (#ff006e)
- **Accent Color:** Cyan (#00d4ff)
- **Font:** Orbitron (monospace)
- **Best For:** Cyberpunk games, tech streams, futuristic vibes

### 2. ⚪ Minimal White
**Style:** Clean, professional
- **Primary Color:** Black (#000000)
- **Secondary Color:** Gray (#6b7280)
- **Accent Color:** Blue (#3b82f6)
- **Font:** Inter (sans-serif)
- **Best For:** Professional streams, minimal aesthetic, light theme lovers

### 3. 👑 Royal Purple
**Style:** Elegant, luxurious
- **Primary Color:** Violet (#7c3aed)
- **Secondary Color:** Gold (#fbbf24)
- **Accent Color:** Pink (#ec4899)
- **Font:** Playfair Display (serif)
- **Best For:** Elegant streams, royal theme, casino games

### 4. 🎮 Gaming Pro
**Style:** Bold, energetic
- **Primary Color:** Emerald Green (#10b981)
- **Secondary Color:** Red (#ef4444)
- **Accent Color:** Amber (#f59e0b)
- **Font:** Rajdhani (sans-serif)
- **Best For:** Gaming streams, competitive play, esports

### 5. 🌊 Ocean Breeze
**Style:** Calm, soothing
- **Primary Color:** Cyan (#06b6d4)
- **Secondary Color:** Sky Blue (#0ea5e9)
- **Accent Color:** Light Blue (#38bdf8)
- **Font:** Nunito (sans-serif)
- **Best For:** Chill streams, relaxing gameplay, ocean themes

### 6. 🌅 Sunset Vibes
**Style:** Warm, inviting
- **Primary Color:** Orange (#f97316)
- **Secondary Color:** Pink (#ec4899)
- **Accent Color:** Yellow (#fbbf24)
- **Font:** Poppins (sans-serif)
- **Best For:** Evening streams, warm atmosphere, creative content

### 7. 💚 Matrix Code
**Style:** Tech, hacker
- **Primary Color:** Matrix Green (#00ff00)
- **Secondary Color:** Dark Green (#00cc00)
- **Accent Color:** Light Green (#00ff88)
- **Font:** Courier New (monospace)
- **Best For:** Coding streams, hacker aesthetic, Matrix fans

### 8. 🌃 Synthwave 80s
**Style:** Retro, nostalgic
- **Primary Color:** Magenta (#ff00ff)
- **Secondary Color:** Cyan (#00ffff)
- **Accent Color:** Yellow (#ffff00)
- **Font:** Audiowide (cursive)
- **Best For:** Retro games, 80s aesthetic, synthwave music

### 9. 🌲 Forest Green
**Style:** Natural, earthy
- **Primary Color:** Green (#22c55e)
- **Secondary Color:** Lime (#84cc16)
- **Accent Color:** Light Green (#a3e635)
- **Font:** Lato (sans-serif)
- **Best For:** Nature games, outdoor content, green aesthetic

### 10. 🌙 Midnight Blue
**Style:** Professional, sleek
- **Primary Color:** Blue (#3b82f6)
- **Secondary Color:** Purple (#8b5cf6)
- **Accent Color:** Teal (#06b6d4)
- **Font:** Roboto (sans-serif)
- **Best For:** Professional streams, dark theme, midnight sessions

## Seasonal Themes (4)

### 11. 🎄 Christmas
**Style:** Festive, holiday spirit
- **Primary Color:** Red (#dc2626)
- **Secondary Color:** Green (#16a34a)
- **Accent Color:** Gold (#fbbf24)
- **Font:** Mountains of Christmas (cursive)
- **Best For:** December streams, holiday events, festive content

### 12. 🎃 Halloween
**Style:** Spooky, mysterious
- **Primary Color:** Orange (#f97316)
- **Secondary Color:** Dark Brown (#7c2d12)
- **Accent Color:** Purple (#a855f7)
- **Font:** Creepster (cursive)
- **Best For:** October streams, spooky games, horror content

### 13. ☀️ Summer
**Style:** Bright, energetic
- **Primary Color:** Golden Yellow (#fbbf24)
- **Secondary Color:** Sky Blue (#06b6d4)
- **Accent Color:** Orange (#fb923c)
- **Font:** Quicksand (sans-serif)
- **Best For:** Summer streams, beach themes, sunny vibes

### 14. 🍂 Autumn
**Style:** Cozy, warm
- **Primary Color:** Amber (#d97706)
- **Secondary Color:** Red (#dc2626)
- **Accent Color:** Gold (#ca8a04)
- **Font:** Merriweather (serif)
- **Best For:** Fall streams, cozy content, autumn themes

## What Gets Themed?

The theme system applies colors and fonts to:
- ✅ **Navbar** - Logo, streamer name, time display, all buttons
- ✅ **All Panels** - BH Panel, Stats Panel, Customization Panel, etc.
- ✅ **Bonus Hunt Cards** - Borders, backgrounds, text
- ✅ **Tournament Brackets** - Cards, borders, VS indicators
- ✅ **Giveaway Wheel** - Buttons, borders, text
- ✅ **All Buttons** - Primary, secondary, hover states
- ✅ **Text** - Headers, body text, labels
- ✅ **Borders** - All panel borders and dividers
- ✅ **Backgrounds** - Panel backgrounds with gradients

## Technical Details

### CSS Variables Used
```css
--theme-primary      /* Main accent color */
--theme-secondary    /* Secondary accent color */
--theme-accent       /* Tertiary accent color */
--theme-background   /* Background color */
--theme-text         /* Main text color */
--theme-panel-bg     /* Panel background gradient */
--theme-border       /* Border color */
--theme-font         /* Font family */
```

### Persistence
- Theme selection is saved to `localStorage` as `selectedTheme`
- Theme is automatically applied on page load
- No need to manually save after selecting a theme

### How to Add Custom Themes
To add your own theme, edit `CustomizationPanel.jsx` and add a new entry to the `THEMES` object:

```javascript
'mytheme': {
  name: 'My Custom Theme',
  colors: {
    primary: '#HEXCODE',
    secondary: '#HEXCODE',
    accent: '#HEXCODE',
    background: '#HEXCODE',
    text: '#HEXCODE',
    panelBg: 'linear-gradient(...)',
    border: '#HEXCODE'
  },
  font: 'Font Name, fallback',
  style: 'description'
}
```

## Browser Compatibility
- ✅ Chrome/Edge - Full support
- ✅ Firefox - Full support
- ✅ Safari - Full support
- ✅ OBS Browser Source - Full support

## Notes
- Themes work alongside background customization
- Font loading is automatic (using Google Fonts fallbacks)
- Themes update instantly without page reload
- All themes are optimized for OBS streaming
- No performance impact from theme switching
