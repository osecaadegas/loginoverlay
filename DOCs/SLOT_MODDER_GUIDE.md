# SlotModder Role Setup Guide

This guide explains how to set up and use the SlotModder role for managing slots in your overlay.

## 🎯 What is SlotModder?

**SlotModder** is a special role that allows users to add, edit, and delete slots in the Supabase database **without** having access to other admin or moderator features. This is perfect for dedicated team members who manage your slot library.

## 📋 Setup Steps

### Step 1: Run the Migration

1. Open your Supabase dashboard
2. Go to **SQL Editor** → **New Query**
3. Copy the contents of `migrations/add_slot_modder_role.sql`
4. Paste and click **Run**

This will:
- Add the `slot_modder` role to your database
- Update RLS policies to allow slot management for admins and slot_modders

### Step 2: Assign SlotModder Role to Users

Go to Supabase dashboard → **Table Editor** → `user_profiles` table:

1. Find the user you want to make a SlotModder
2. Edit their row
3. Set the `role` column to `slot_modder`
4. Save

### Step 3: Test It Out

1. Log in with the SlotModder user
2. Open the Bonus Hunt panel
3. Click **"🎰 Manage Slots"** button (only visible to SlotModders and Admins)

## 🎰 Slot Manager Features

### Add New Slots
- Click "Add New Slot"
- Enter slot name, provider, and image URL
- Provider autocomplete from existing providers
- Live image preview
- Validates all required fields

### Edit Existing Slots
- Click the ✏️ edit button on any slot
- Modify name, provider, or image URL
- Same validation as adding

### Delete Slots
- Click the 🗑️ delete button
- Confirms before deletion
- Cannot be undone!

### Search & Filter
- Search by slot name
- Filter by provider
- Shows count of filtered/total slots

## 🔒 Permissions

**SlotModder Can:**
- ✅ Add new slots
- ✅ Edit existing slots
- ✅ Delete slots
- ✅ View all slots
- ✅ Use all normal user features

**SlotModder Cannot:**
- ❌ Access Admin Panel
- ❌ Manage user roles
- ❌ Access Moderator features
- ❌ View admin-only sections

**Admins:**
- Have all SlotModder permissions
- Plus all admin permissions

## 💡 Best Practices

### Finding Slot Images
Good sources for slot images:
- Casino game aggregators (like Stake, Kick)
- Provider websites
- Use consistent dimensions (usually 180x236)

### Image URL Format
```
https://mediumrare.imgix.net/[hash]?w=180&h=236&fit=min&auto=format
```

### Naming Conventions
- Use official slot names
- Capitalize properly: "Wanted Dead or Wild"
- Match provider names exactly: "Hacksaw" not "Hacksaw Gaming"

### Provider Names
Keep provider names consistent:
- "Pragmatic Play" (not "Pragmatic" or "PP")
- "Hacksaw" (not "Hacksaw Gaming")
- "No Limit City" (not "NoLimit")

## 🛠️ Troubleshooting

### Button Not Showing
- Verify the SQL migration ran successfully
- Check user has `slot_modder` role in `user_profiles` table
- Clear cache and refresh page
- Check browser console for errors

### Cannot Add/Edit Slots
- Verify RLS policies were created correctly
- Check user is authenticated
- Verify role is set in database, not just locally

### Images Not Loading
- Verify image URL is accessible
- Check for HTTPS (not HTTP)
- Test URL in browser first
- Use fallback image if needed

## 📊 Database Schema

```sql
-- Slots Table
CREATE TABLE slots (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  image TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE
);

-- User Roles Enum
CREATE TYPE user_roles AS ENUM (
  'user',
  'moderator',
  'admin',
  'slot_modder'  -- New!
);
```

## 🎉 That's It!

Your SlotModder role is now set up! Users with this role can manage your slot library independently without needing full admin access.

## 🔄 Cache Note

The slot data is cached for 5 minutes. After adding/editing/deleting a slot, the cache is automatically invalidated and refreshed.
