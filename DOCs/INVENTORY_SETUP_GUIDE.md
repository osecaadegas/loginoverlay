# Setting Up the Inventory System

## Step 1: Run the Database Migration

1. Go to your Supabase Dashboard
2. Navigate to the **SQL Editor**
3. Copy and paste the contents of `migrations/create_inventory_system.sql`
4. Click **Run** to execute the migration

This will create:
- `items` table (all available items)
- `user_inventory` table (items owned by users)
- Row Level Security policies
- Default starter items

## Step 2: Verify Tables Were Created

In the Supabase Dashboard:
1. Go to **Table Editor**
2. You should see two new tables:
   - `items` (with 10 default items)
   - `user_inventory` (empty initially)

## Step 3: Test the Profile Page

1. Visit `/profile` on your site
2. You should see:
   - Your avatar (changeable)
   - An empty inventory (initially)

## Step 4: Award Items to Users (Optional Testing)

### Via SQL Editor
```sql
-- Get your user ID first
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Get an item ID
SELECT id FROM items WHERE name = 'Golden Trophy';

-- Award the item to yourself
INSERT INTO user_inventory (user_id, item_id, quantity)
VALUES ('your-user-id', 'item-id', 1);
```

### Via Code (in your games)
```javascript
import { awardItemByName } from '../utils/inventoryUtils';

// Award when user wins
await awardItemByName(user.id, 'Golden Trophy', 1);
```

## Step 5: Integrate with Games

Add item rewards to your games:

### Blackjack Example
```javascript
// In BlackjackPremium.jsx, after a win
import { awardItemByName } from '../../utils/inventoryUtils';

if (playerValue === 21 && playerHand.length === 2) {
  // Blackjack achievement
  await awardItemByName(user.id, 'Golden Trophy', 1);
}
```

### Mines Example
```javascript
// In Mines.jsx, after successful cashout
import { awardItemByName } from '../../utils/inventoryUtils';

if (revealedCells.length >= 20) {
  await awardItemByName(user.id, 'Lucky Charm', 1);
}
```

## Troubleshooting

### Items not showing up?
- Make sure you ran the migration
- Check Supabase Table Editor to verify data exists
- Check browser console for errors

### Can't add items to inventory?
- Verify RLS policies are enabled
- Make sure user is authenticated
- Check user_id matches authenticated user

### Want to add more items?
```sql
INSERT INTO items (name, description, type, icon, rarity, tradeable)
VALUES 
  ('Mega Winner', 'Won over 1000 points in one game', 'achievement', '🎰', 'legendary', false),
  ('High Roller', 'Bet over 500 points', 'badge', '💸', 'epic', false);
```

## Next Steps

The inventory system is ready! You can now:
- Award items based on game achievements
- Display user items on their profile
- Add more items via SQL or admin panel
- Create a trading system (future enhancement)
- Add item effects/boosts in games

For more details, see [INVENTORY_SYSTEM.md](./INVENTORY_SYSTEM.md)
