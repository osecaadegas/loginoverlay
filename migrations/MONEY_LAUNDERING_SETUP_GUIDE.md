# Money Laundering System Setup Guide

## Overview
This system allows players to earn **DirtyCash** from the Punjabi CallCenter and convert it to clean money using the Money Laundering business with a 20% fee.

## How It Works

### 1. Punjabi CallCenter (Income Source)
- **Purchase Price**: $20,000
- **Production Cost**: $500
- **Duration**: 45 minutes
- **Stamina Cost**: 5
- **Reward**: 10 DirtyCash items
- **Min Level**: 5

### 2. Money Laundering Business (Conversion)
- **Purchase Price**: $50,000
- **Production Cost**: $100
- **Duration**: 30 minutes
- **Stamina Cost**: 5
- **Min Level**: 10
- **Conversion**: 1 DirtyCash = $1.00 - 20% fee = **$0.80**

### 3. Conversion Math
- Base value: $1.00 per DirtyCash
- Conversion fee: 20%
- Final payout: $0.80 per DirtyCash
- Max per transaction: $50,000 (capped in code)

**Examples:**
- 10 DirtyCash = $8.00
- 100 DirtyCash = $80.00
- 1,000 DirtyCash = $800.00

## Installation Steps

### Step 1: Run the Migration
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `setup_money_laundering_dirtycash.sql`
4. Paste and click **Run**

The migration will:
- ✅ Create the DirtyCash item
- ✅ Setup Punjabi CallCenter to produce DirtyCash
- ✅ Setup Money Laundering business with 20% fee
- ✅ Link DirtyCash as a required item for Money Laundering

### Step 2: Verify Setup
Run this query in SQL Editor to verify:

```sql
-- Check DirtyCash item
SELECT * FROM the_life_items WHERE name = 'DirtyCash';

-- Check Punjabi CallCenter
SELECT name, reward_type, reward_item_quantity 
FROM the_life_businesses 
WHERE name = 'Punjabi CallCenter';

-- Check Money Laundering setup
SELECT b.name, b.conversion_rate, ri.reward_cash
FROM the_life_businesses b
LEFT JOIN the_life_business_required_items ri ON b.id = ri.business_id
WHERE b.name = 'Money Laundering';
```

**Expected Results:**
- DirtyCash item exists with icon 💵
- Punjabi CallCenter rewards 10 items
- Money Laundering has conversion_rate = 0.20
- Required item mapping shows reward_cash = 1

### Step 3: Test In-Game

1. **Buy Punjabi CallCenter** ($20,000) - requires level 5
2. **Run production** - costs $500 + 5 stamina
3. **Wait 45 minutes** and collect
4. **Receive 10 DirtyCash** in inventory
5. **Buy Money Laundering** ($50,000) - requires level 10
6. **Run Money Laundering** - costs $100 + 5 stamina
7. **Select DirtyCash** from item options
8. **Enter quantity** (e.g., 10 DirtyCash)
9. **Wait 30 minutes** and collect
10. **Receive $8.00** (10 × $0.80)

## Admin Panel Configuration

If you need to adjust settings:

1. Go to Admin Panel → **The Life** tab
2. Click **Businesses** section
3. Find **Money Laundering**
4. Click **Edit**

**Adjustable Settings:**
- **Conversion Fee (%)**: Currently 20% - adjust to increase/decrease fee
- **Production Cost**: Currently $100 - cost to run laundering
- **Duration**: Currently 30 minutes - how long laundering takes
- **Required Items**: Shows DirtyCash → $1.00 mapping

To change fee:
- 10% fee = 0.10 (player gets $0.90 per DirtyCash)
- 20% fee = 0.20 (player gets $0.80 per DirtyCash)
- 30% fee = 0.30 (player gets $0.70 per DirtyCash)

## Business Upgrades

Both businesses are upgradeable:
- Each upgrade level increases production by 50%
- Money Laundering upgrades increase payout by 30% per level

**Example with Level 3 Money Laundering:**
- Base: 10 DirtyCash = $8.00
- Level 3: 10 DirtyCash = $8.00 × 1.60 (30% × 2) = **$12.80**

## Troubleshooting

### DirtyCash not appearing in inventory
- Check if Punjabi CallCenter completed successfully
- Verify reward_type is 'items' in database
- Check the_life_player_inventory table

### Money Laundering not accepting DirtyCash
- Verify required items mapping exists
- Check business_id matches Money Laundering
- Ensure DirtyCash item_id is correct

### Getting wrong amount of money
- Check conversion_rate is set to 0.20
- Verify reward_cash is 1 in required_items
- Formula: `reward_cash × quantity × (1 - conversion_rate)`

### SQL Query to Check Player Inventory
```sql
SELECT 
  i.name,
  inv.quantity
FROM the_life_player_inventory inv
JOIN the_life_items i ON inv.item_id = i.id
JOIN the_life_players p ON inv.player_id = p.id
WHERE p.user_id = 'YOUR_USER_ID'
AND i.name = 'DirtyCash';
```

## Future Enhancements

Possible additions:
- Add more businesses that produce DirtyCash
- Create different tiers of dirty money (Small, Medium, Large bills)
- Add risk factor (chance of losing money or getting caught)
- Multiple laundering methods with different fees/speeds

---

## Summary

✅ **Migration file created**: `setup_money_laundering_dirtycash.sql`  
✅ **System configured**: Punjabi CallCenter → DirtyCash → Money Laundering  
✅ **Conversion rate**: 1 DirtyCash = $0.80 (20% fee)  
✅ **Ready to deploy**: Push to Vercel and run migration in Supabase

**Questions?** Check the AdminPanel to edit business settings or required items.
