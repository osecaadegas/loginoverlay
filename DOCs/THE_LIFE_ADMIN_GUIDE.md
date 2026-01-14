# The Life Game - Admin Management Guide

## Overview
The Life RPG game now has a comprehensive admin management system in the Admin Panel where you can create, edit, and customize all game content including crimes, items, drugs, and more.

## Accessing The Admin Panel

1. Navigate to the Admin Panel (requires admin role)
2. Click on the **🔫 The Life Management** tab
3. You'll see sub-tabs for different content types

## Managing Crimes

### Adding a New Crime
1. Go to **💰 Crimes** sub-tab
2. Click **➕ Add New Crime**
3. Fill in the form:
   - **Crime Name*** (required): e.g., "Street Fight", "Carjacking"
   - **Description**: What happens during this crime
   - **Image URL**: Direct link to an image (Unsplash, Imgur, etc.)
   - **Min Level Required**: What level players need to attempt this
   - **Ticket Cost**: How many tickets it costs to attempt
   - **Base Reward ($)**: Minimum cash reward
   - **Max Reward ($)**: Maximum cash reward
   - **Success Rate (%)**: 0-100, higher = easier
   - **Jail Time (minutes)**: How long player is jailed if caught
   - **HP Loss on Fail**: Damage taken when crime fails
   - **XP Reward**: Experience points gained on success

### Editing Existing Crimes
1. Find the crime card in the grid
2. Click **✏️ Edit**
3. Modify any fields
4. Click **Update Crime**

### Deleting Crimes
1. Click **🗑️ Delete** on any crime card
2. Confirm the deletion

### Image Sources
Good image sources for crimes:
- Unsplash: https://unsplash.com/ (search: "crime", "robbery", "heist", "urban", "night city")
- Use format: `https://images.unsplash.com/photo-XXXXXXXX?w=500`

Example searches:
- Bank heist: https://unsplash.com/s/photos/bank-vault
- Car theft: https://unsplash.com/s/photos/sports-car
- Street crime: https://unsplash.com/s/photos/dark-alley

## Managing Items

### Adding a New Item
1. Go to **🎒 Items** sub-tab
2. Click **➕ Add New Item**
3. Fill in the form:
   - **Item Name*** (required): e.g., "Diamond Ring", "Golden Gun"
   - **Description**: What this item does/represents
   - **Icon*** (required): An emoji representing the item (🏆, 💎, 🔫, etc.)
   - **Type**: Item, Achievement, Badge, Skin, Weapon, Armor
   - **Rarity**: Common, Rare, Epic, Legendary
   - **Tradeable**: Can players trade this item?

### Editing/Deleting Items
Same process as crimes - use the **✏️ Edit** or **🗑️ Delete** buttons

## Coming Soon Features

### Drug Operations (Planned)
- Add custom drug types beyond Weed/Meth/Cocaine
- Set production times and costs
- Custom drug images

### Brothel Management (Planned)
- Customize worker types
- Set income rates
- Upload custom brothel images

## Database Migration

**IMPORTANT**: Before using the admin panel, run this migration in your Supabase SQL editor:

```sql
-- Run this in Supabase SQL Editor
-- This adds the image_url column to crimes table

ALTER TABLE the_life_robberies 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update existing crimes with default images
UPDATE the_life_robberies 
SET image_url = CASE name
  WHEN 'Pickpocket' THEN 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=500'
  WHEN 'Car Theft' THEN 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500'
  WHEN 'House Burglary' THEN 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=500'
  WHEN 'Convenience Store' THEN 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=500'
  WHEN 'Bank Heist' THEN 'https://images.unsplash.com/photo-1551135049-8a33b5883817?w=500'
  WHEN 'Casino Vault' THEN 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=500'
  ELSE NULL
END
WHERE image_url IS NULL;
```

## Tips & Best Practices

### Crime Balancing
- **Early Game (Level 1-5)**: 
  - High success rates (70-85%)
  - Low rewards ($50-500)
  - Short jail times (10-20 min)
  
- **Mid Game (Level 6-15)**:
  - Medium success (50-70%)
  - Medium rewards ($500-5,000)
  - Medium jail times (30-60 min)
  
- **End Game (Level 15+)**:
  - Low success (20-40%)
  - High rewards ($5,000-50,000+)
  - Long jail times (90-180 min)

### Image Guidelines
- Use high-quality images (minimum 500px wide)
- Keep images consistent in style/tone
- Avoid images with text overlays
- Test on both desktop and mobile

### Item Rarity Guidelines
- **Common**: Starter items, easily obtainable
- **Rare**: Moderate challenge to obtain
- **Epic**: Significant achievement required
- **Legendary**: Ultra rare, prestigious items

## Troubleshooting

### Images Not Loading
- Check the URL is publicly accessible
- Use HTTPS links only
- Verify the image format (JPG, PNG, WebP)

### Changes Not Appearing
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Check browser console for errors

### Permission Issues
- Verify you have admin role in Supabase
- Check RLS policies are properly configured

## Future Enhancements

Coming in future updates:
- Bulk import/export crimes via CSV
- Image upload directly to Supabase Storage
- Crime category grouping
- Drug operation customization
- Brothel worker customization
- PvP arena settings
- Leaderboard configuration

---

**Need Help?** Check the main README or contact the development team.
