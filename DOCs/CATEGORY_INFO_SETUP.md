# Category Info Setup Guide

## Overview
The category info system displays dynamic images and descriptions on the right side of the stats bar in The Life game. Each category (crimes, pvp, businesses, etc.) can have its own custom image and text that helps players understand what the category offers.

## Database Setup

### 1. Run the Migration
Execute the migration file in your Supabase SQL Editor:
```sql
-- Run: migrations/create_thelife_category_info.sql
```

This creates the `the_life_category_info` table with:
- `id`: Primary key
- `category_key`: Unique identifier (e.g., 'crimes', 'pvp', 'businesses')
- `category_name`: Display name (e.g., 'Crimes', 'PvP Combat')
- `description`: Text description shown to players
- `image_url`: URL of the category image
- `created_at` / `updated_at`: Timestamps

The migration also includes default data for all categories with placeholder images from Unsplash.

### 2. Verify RLS Policies
The table has Row Level Security enabled with these policies:
- Public read access (anyone can view category info)
- Service role has full access for admin operations

## Admin Panel Management

### Accessing Category Info
1. Navigate to the Admin Panel
2. Click on "🔫 The Life Game Management" tab
3. Select "📚 Category Info" sub-tab

### Managing Categories

#### Add New Category
1. Click "➕ Add New Category"
2. Fill in the form:
   - **Category Key**: Unique identifier matching the tab name (e.g., 'crimes', 'pvp')
   - **Category Name**: Display name (e.g., 'Crimes', 'PvP Combat')
   - **Description**: Help text explaining what this category offers
   - **Image URL**: Direct URL to an image (recommended size: 400x180px or similar aspect ratio)
3. Click "Create Category"

#### Edit Existing Category
1. Find the category card in the grid
2. Click "✏️ Edit"
3. Modify the fields (note: category_key cannot be changed)
4. Click "Update Category"

#### Delete Category
1. Find the category card in the grid
2. Click "🗑️ Delete"
3. Confirm deletion

### Image Recommendations
- **Dimensions**: 400x300px to 600x400px works well
- **Format**: JPG, PNG, or WebP
- **Sources**: 
  - Unsplash: https://unsplash.com/
  - Pexels: https://www.pexels.com/
  - Your own uploaded images
- **Hosting**: Images must be publicly accessible via URL

## Available Categories

The system supports these default categories:
- `crimes` - Crime activities and heists
- `pvp` - Player vs Player combat
- `businesses` - Business ownership and management
- `brothel` - Brothel worker management
- `inventory` - Item storage and management
- `jail` - Jail system information
- `hospital` - HP recovery services
- `market` - Black market operations
- `bank` - Cash storage and protection
- `stats` - Player statistics tracking
- `leaderboard` - Rankings and competition

## Frontend Display

The category info appears automatically in the stats bar:
- **Location**: Right side of the player stats card
- **Image**: Displays with hover effect (brightness increase, scale)
- **Text**: Shows category name (gold header) and description
- **Updates**: Changes instantly when switching between categories

### CSS Classes
- `.category-info-display` - Container
- `.category-info-image` - Image wrapper
- `.category-info-text` - Text content
- `.category-info-text h3` - Category title
- `.category-info-text p` - Description

## Troubleshooting

### Category not showing
- Verify the `category_key` matches exactly with the tab name
- Check that the category exists in the database
- Confirm the image URL is valid and accessible

### Image not loading
- Test the image URL directly in a browser
- Ensure CORS allows the image to be displayed
- Try a different image hosting service

### Description too long
- Keep descriptions concise (1-3 sentences)
- Text wraps automatically but very long text may look cluttered
- Edit in admin panel to adjust

## Example URLs

Good image sources for The Life categories:
- Crime: `https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?w=400`
- Combat: `https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400`
- Business: `https://images.unsplash.com/photo-1556155092-490a1ba16284?w=400`
- Money: `https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=400`

## Notes
- All category info is cached on frontend load for performance
- Changes in admin panel update immediately after save
- The system is fully dynamic - add/edit/remove categories without code changes
