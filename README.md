# Bonus Hunt Tracker - Streaming Overlay

A complete React-based streaming overlay for tracking bonus hunts in slot games. Perfect for OBS integration with a transparent background and real-time statistics.

## 📚 Documentation

Complete documentation is available in the [DOCs folder](./DOCs/):
- [Admin Setup Guide](./DOCs/ADMIN_SETUP_GUIDE.md)
- [Authentication Setup](./DOCs/AUTHENTICATION_SETUP_GUIDE.md)
- [Deployment Checklist](./DOCs/DEPLOYMENT_CHECKLIST.md)
- [OAuth Setup Guide](./DOCs/OAUTH_SETUP_GUIDE.md)
- [Role System Guide](./DOCs/ROLE_SYSTEM_GUIDE.md)
- [Reorganization Details](./DOCs/REORGANIZATION_COMPLETE.md)
- [And more...](./DOCs/)

## 🎯 Features

- **Real-time Bonus Tracking**: Track multiple bonuses with slot names, bet sizes, RTP, and multipliers
- **Dynamic Statistics**: Automatically calculated stats including average multiplier, required multiplier, profit/loss
- **Responsive Design**: Fully responsive layout that adapts to different screen sizes
- **Twitch Chat Integration**: Optional embedded Twitch chat iframe
- **OBS Ready**: Transparent background for seamless overlay integration
- **Customizable**: Easy configuration through central config file

## 📁 Project Structure

```
src/
  components/
    Header/
      Header.jsx          # Top bar with session stats
      Header.css
    BonusList/
      BonusList.jsx       # Scrollable list of bonuses
      BonusList.css
    BonusItem/
      BonusItem.jsx       # Individual bonus row
      BonusItem.css
    StatsPanel/
      StatsPanel.jsx      # Statistics panel
      StatsPanel.css
    Footer/
      Footer.jsx          # Twitch chat integration
      Footer.css
  config/
    overlayConfig.js      # Central configuration file
  data/
    mockBonuses.js        # Sample bonus data for testing
  utils/
    calculations.js       # Calculation utilities
  App.jsx                 # Main application component
  App.css
  main.jsx                # React entry point
  index.css               # Global styles
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure the overlay**
   
   Edit `src/config/overlayConfig.js` to customize:
   - Twitch channel name
   - Display settings (currency, decimals)
   - Theme colors
   - Layout options

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   
   The app will open automatically at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## 🎨 Customization

### Changing Theme Colors

Edit `src/config/overlayConfig.js`:

```javascript
theme: {
  primary: '#6441a5',      // Main accent color
  success: '#00ff00',      // Positive values
  danger: '#ff0000',       // Negative values
  warning: '#ffaa00',      // Warning states
  background: 'rgba(0, 0, 0, 0.8)',
  text: '#ffffff'
}
```

### Modifying Display Settings

```javascript
display: {
  headerTitle: 'Bonus Hunt Tracker',
  showFooter: true,
  currency: '$',
  decimals: 2
}
```

### Twitch Chat Configuration

```javascript
twitch: {
  channelName: 'YOUR_CHANNEL',  // Your Twitch username
  showChat: true,
  chatParent: 'localhost'       // Change to your domain for production
}
```

## 🎬 OBS Setup

1. **Add Browser Source**
   - In OBS, add a new "Browser" source
   - Set URL to: `http://localhost:3000`
   - Set Width: 1920, Height: 1080 (or your stream resolution)
   - Check "Shutdown source when not visible"
   - Check "Refresh browser when scene becomes active"

2. **Make Background Transparent**
   - In the Browser source properties, add Custom CSS:
     ```css
     body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }
     ```

3. **Position the Overlay**
   - Drag and resize the source to fit your stream layout
   - Lock the source to prevent accidental movement

## 📊 Using the Overlay

### Mock Data

The app comes with sample data in `src/data/mockBonuses.js` for testing. You can modify this file to test different scenarios.

### Adding Bonuses Programmatically

The `App.jsx` component provides these functions:

```javascript
// Add a new bonus
addBonus({
  slotName: 'Book of Dead',
  betSize: 100,
  expectedRTP: 96.21
});

// Update bonus result when opened
updateBonusResult(bonusId, 45.5);

// Delete a bonus
deleteBonus(bonusId);

// Clear all bonuses
clearAllBonuses();
```

### Calculations

All calculations are in `src/utils/calculations.js`:

- **Average Multiplier**: `totalReturn / totalCost`
- **Required Multiplier**: `totalCost / totalBetsSum` (break-even point)
- **Profit/Loss**: `totalReturn - totalCost`

## 🔧 Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **JavaScript** - No TypeScript
- **CSS3** - Modular component styles
- **No external UI libraries** - Pure custom components

## 📝 Component Overview

### Header
Displays the title and key session statistics (balance, bonuses collected, total cost, P/L)

### BonusList
Scrollable container for all bonus items with custom scrollbar styling

### BonusItem
Individual bonus row showing slot name, RTP, bet size, and multiplier (when opened)

### StatsPanel
Statistics panel with total bonuses, cost, return, average and required multipliers

### Footer
Optional Twitch chat integration iframe

## 🐛 Troubleshooting

### Port Already in Use

If port 3000 is already taken, Vite will automatically use the next available port.

### Twitch Chat Not Loading

Make sure to update the `chatParent` in `overlayConfig.js` to match your domain:
- Development: `localhost`
- Production: `yourdomain.com`

### Transparent Background Not Working in OBS

Ensure you've added the custom CSS to the Browser source properties in OBS.

## 🎯 Future Enhancements

Potential features to add:
- Backend integration for persistent data
- Real-time updates via WebSocket
- Export/import bonus hunt data
- Sound effects for big wins
- Animated transitions
- Multi-language support

## 📄 License

This project is open source and available for personal and commercial use.

## 🤝 Contributing

Feel free to fork this project and customize it for your needs!

---

**Happy Hunting! 🎰**
