# Inventory System Documentation

## Overview
The inventory system allows users to collect items, achievements, badges, and other collectibles. Each item has properties like rarity, type, and can be tradeable.

## Database Tables

### `items` Table
Stores all available items in the system.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique identifier |
| name | TEXT | Item name |
| description | TEXT | Item description |
| type | TEXT | Item type (achievement, item, badge, skin) |
| icon | TEXT | Emoji or URL to icon |
| rarity | TEXT | common, rare, epic, legendary |
| tradeable | BOOLEAN | Can be traded between users |
| created_at | TIMESTAMPTZ | When item was created |

### `user_inventory` Table
Stores items owned by users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique identifier |
| user_id | UUID | Owner's user ID |
| item_id | UUID | Reference to items table |
| quantity | INTEGER | How many of this item |
| acquired_at | TIMESTAMPTZ | When user got the item |
| equipped | BOOLEAN | If item is currently equipped |

## Usage

### Setup Database
Run the migration file to create the tables:
```sql
-- Run in Supabase SQL Editor
\i migrations/create_inventory_system.sql
```

### Award Items to Users

#### Using Utility Functions
```javascript
import { awardItemToUser, awardItemByName } from '../utils/inventoryUtils';

// Award by item ID
await awardItemToUser(userId, itemId, 1);

// Award by item name
await awardItemByName(userId, 'Golden Trophy', 1);
```

#### Directly in Your Code
```javascript
// Example: Award item when user wins a game
const { data: item } = await supabase
  .from('items')
  .select('id')
  .eq('name', 'Golden Trophy')
  .single();

await supabase
  .from('user_inventory')
  .insert({
    user_id: user.id,
    item_id: item.id,
    quantity: 1
  });
```

### View User's Inventory
Users can view their inventory at `/profile` or you can fetch it programmatically:

```javascript
import { getUserInventory } from '../utils/inventoryUtils';

const { data: inventory } = await getUserInventory(userId);
```

## Item Types

- **achievement**: Earned through accomplishments
- **item**: General collectible items
- **badge**: Special badges for milestones
- **skin**: Visual customizations (future use)

## Rarity Levels

- **common**: Gray (Default items)
- **rare**: Blue (Hard to get)
- **epic**: Purple (Very hard to get)
- **legendary**: Gold (Extremely rare)

## Adding New Items

### As Admin
```javascript
await supabase.from('items').insert({
  name: 'New Achievement',
  description: 'Description here',
  type: 'achievement',
  icon: '🎯',
  rarity: 'rare',
  tradeable: false
});
```

### Via SQL
```sql
INSERT INTO items (name, description, type, icon, rarity, tradeable)
VALUES ('New Item', 'Item description', 'item', '⚡', 'epic', true);
```

## Integration Examples

### Award Item on Blackjack Win
```javascript
// In BlackjackPremium.jsx
if (playerWon && currentBet >= 100) {
  await awardItemByName(user.id, 'Golden Trophy', 1);
}
```

### Award Item on Mines Success
```javascript
// In Mines.jsx
if (revealedCells.length >= 20) {
  await awardItemByName(user.id, 'Lucky Charm', 1);
}
```

### Award Daily Login Bonus
```javascript
// In your daily rewards system
await awardItemByName(user.id, 'Star Badge', 1);
```

## Profile Page Features

The profile page (`/profile`) displays:
- User's avatar (changeable)
- Customizable profile picture
- Full inventory with item details
- Rarity-based visual effects
- Item quantities

## Security

All tables use Row Level Security (RLS):
- Users can only view/edit their own inventory
- Only admins can create new items
- All items are publicly viewable (in items table)

## Future Enhancements

Potential features to add:
- Trading system between users
- Item crafting/combining
- Equipped items display on profile
- Achievement progress tracking
- Item shop to purchase with points
- Item effects in games
