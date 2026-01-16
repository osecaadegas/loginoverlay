# Project Tracking Document
> Last Updated: January 16, 2026

## Project Overview
- **Name:** TheLife RPG Game (part of streaming overlay platform)
- **GitHub Repo:** https://github.com/osecaadegas/loginoverlay
- **Branch:** main
- **Deployed URL:** https://loginoverlay.vercel.app
- **Local Path:** `c:\Users\miguel\Downloads\NEWWEBSITE-master\NEWWEBSITE-master`

## Tech Stack
- **Frontend:** React + Vite
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Styling:** Tailwind CSS + Custom CSS

## TheLife Game Structure

### Core Files
| File | Purpose |
|------|---------|
| `src/components/TheLife/TheLife.jsx` | Main game component |
| `src/components/TheLife/TheLife.css` | Main game styles |
| `src/components/TheLife/categories/` | Category components |
| `src/components/TheLife/games/` | Individual game components |
| `src/components/TheLife/hooks/` | Custom hooks (useDragScroll, etc.) |

### Categories
TheLife has crime categories. The **High-Stakes** category was added with subcategories:
- `TheLifeHighStakes.jsx` - High-Stakes category with subcategory tabs

### Games (in `src/components/TheLife/games/`)
| Game | File | Status | Notes |
|------|------|--------|-------|
| Blackjack | `TheLifeBlackjack.jsx` + `.css` | ✅ Complete | Uses player.cash, 6-deck shoe |
| Stock Market | `TheLifeStockMarket.jsx` + `.css` | ✅ Complete | Uses Supabase for portfolio storage |
| Mines | - | ❌ Placeholder | Not yet implemented |
| Slots | - | ❌ Placeholder | Not yet implemented |
| Roulette | - | ❌ Placeholder | Not yet implemented |

## Database Tables

### Existing Tables Used
- `the_life_players` - Main player data (cash, bank, health, etc.)
  - Uses `cash` column for game transactions (NOT bank)
  - `user_id` references `auth.users`

### Tables Added for Stock Market
```sql
-- Stock portfolio storage per player
CREATE TABLE the_life_stock_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  shares INTEGER NOT NULL DEFAULT 0,
  avg_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Transaction history
CREATE TABLE the_life_stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'buy' or 'sell'
  symbol TEXT NOT NULL,
  shares INTEGER NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  fee DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Recent Changes (Jan 16, 2026)

### High-Stakes Category
1. Created High-Stakes category with 2 subcategory tabs (Casino, Stock Market)
2. Subcategory tabs show images only (no text, no padding, full image)
3. Casino subcategory shows game cards grid
4. Clicking a game card opens the game component

### Blackjack Game
- Created `TheLifeBlackjack.jsx` and `TheLifeBlackjack.css`
- Uses player.cash only (not bank)
- Updates Supabase `the_life_players.cash` on win/loss
- Features: 6-deck shoe, double down, split (future), insurance (future)

### Stock Market Game
- Created `TheLifeStockMarket.jsx` and `TheLifeStockMarket.css`
- 11 fictional stocks (SHAD, GHOST, VNDR, CRYPT, NITE, SYNTH, SMUGL, HIEST, FORGE, BYTE, CARTEL)
- Real-time price simulation (updates every 3 seconds)
- Market events (Police Crackdown, Gang War, Big Score, Market Boom/Crash)
- Dynamic news feed affecting stock prices
- 0.5% transaction fee on all trades
- Portfolio stored in Supabase (per player)
- Transaction history stored in Supabase

## Key Patterns

### Cash Updates
All games should use this pattern to update player cash:
```javascript
const updatePlayerCash = async (newCash) => {
  try {
    const { error } = await supabase
      .from('the_life_players')
      .update({ cash: newCash, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) throw error;
    setPlayer(prev => ({ ...prev, cash: newCash }));
    return true;
  } catch (error) {
    console.error('Error updating cash:', error);
    return false;
  }
};
```

### Game Component Props
All game components receive these standard props:
```javascript
{
  player,        // Player data object (includes cash, bank, etc.)
  setPlayer,     // Function to update player state
  setMessage,    // Function to show messages
  user,          // Auth user object (user.id for database queries)
  onBack         // Function to go back to game selection
}
```

## Pending Tasks

### High Priority
- [ ] Implement Mines game
- [ ] Implement Slots game
- [ ] Implement Roulette game

### Future Enhancements
- [ ] Add sound effects to games
- [ ] Add animations for wins/losses
- [ ] Add leaderboard for stock market
- [ ] Add achievements system
- [ ] Split and Insurance for Blackjack

## Commands

### Development
```bash
cd "c:\Users\miguel\Downloads\NEWWEBSITE-master\NEWWEBSITE-master"
npm run dev        # Start dev server (localhost:3000)
npm run build      # Build for production
```

### Git
```bash
git add -A
git commit -m "message"
git push
```

## Notes
- Vercel auto-deploys on push to main
- May hit deploy rate limits on free tier - just wait and redeploy
- All games use CASH only, never player.bank
- Stock market prices reset on page refresh (simulated, not persistent)
- Player portfolios and transactions are persistent in Supabase
