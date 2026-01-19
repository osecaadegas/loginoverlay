# The Life News Feed System

## Overview
The Underground News Feed is a dynamic, automated journal system that displays live game events and statistics to engage players. It shows real-time information about:

- 🏆 **Leaderboard Rankings** - Top 3 players by net worth
- ⚔️ **PVP Champions** - Players with the least defeats
- 🔥 **Trending Crimes** - Most popular criminal activities  
- 🚢 **Dock Updates** - Active boats and incoming shipments
- 💋 **Brothel Empires** - Top brothel operators
- 📈 **Stock Market** - Market movers and trends
- 👑 **Rising Kingpins** - Fast-climbing players
- 👤 **Personal Stats** - Your own achievements

## Files Created

### 1. Migration File
`migrations/add_news_feed_system.sql`

Creates the `the_life_news_feed` table with:
- News type categorization
- Priority levels (1=low, 2=medium, 3=high)
- Auto-expiration system
- Player references for personalized news
- JSON storage for related data

### 2. News Feed Component
`src/components/TheLife/components/TheLifeNewsFeed.jsx`

Features:
- Real-time news generation from game state
- Filter by news type
- Auto-refresh every 30 seconds
- Animated news items
- Priority badges (HOT, TRENDING)
- Mobile-responsive design

### 3. CSS Styles
`src/components/TheLife/styles/TheLifeNewsFeed.css`

Includes:
- Dark theme modal design
- Animated news items
- Color-coded news types
- Filter buttons
- Mobile responsiveness

### 4. Modified Files
`src/components/TheLife/TheLifeNew.jsx`
- Added News Feed import
- Added `showNewsFeed` state
- Added News button next to Syndicate button
- Added News Feed modal component

`src/components/TheLife/TheLife.css`
- Added News button styling
- Animated live indicator

## Usage

### Opening the News Feed
Click the "📰 News" button (next to "The Syndicate" button) in the quick access bar.

### Database Setup
Run the migration file to create the news feed table:
```sql
-- In Supabase SQL editor
-- Run: migrations/add_news_feed_system.sql
```

### News Generation
The system generates news dynamically from:
1. **Stored News** - From `the_life_news_feed` table
2. **Dynamic News** - Generated in real-time from current game state

### News Types
| Type | Description | Color |
|------|-------------|-------|
| `leaderboard` | Top players | Gold |
| `pvp` | PVP achievements | Red |
| `crime` | Crime statistics | Orange |
| `dock` | Boat/shipping news | Blue |
| `brothel` | Brothel empire news | Pink |
| `stock` | Stock market updates | Green |
| `kingpin` | Rising players | Purple |
| `personal` | Your achievements | Cyan |
| `general` | General announcements | Gray |

### Priority Levels
- **3 (High)** - Shows "🔥 HOT" badge
- **2 (Medium)** - Shows "📢 TRENDING" badge
- **1 (Low)** - No badge

## Customization

### Adding Custom News
Insert into the database:
```sql
INSERT INTO the_life_news_feed (
  news_type, 
  category, 
  title, 
  content, 
  icon, 
  priority,
  expires_at
) VALUES (
  'general',
  'announcement',
  '🎉 SPECIAL EVENT',
  'Double XP weekend is live!',
  '🎉',
  3,
  NOW() + INTERVAL '2 days'
);
```

### Scheduled News Generation
Set up a cron job to run these functions periodically:
```sql
SELECT generate_leaderboard_news();
SELECT generate_pvp_news();
SELECT generate_kingpin_news();
SELECT cleanup_old_news();
```

## Future Enhancements
- Push notifications for high-priority news
- Player mentions and tagging
- News sharing to social media
- Custom news filters per player
- Weekly/monthly recap reports
