# Slot Database Migration to Supabase

This guide walks you through migrating your slot database from the local `slotDatabase.js` file to Supabase.

## ✅ Completed Steps

All code changes have been implemented:
- ✅ Created Supabase migration file for slots table
- ✅ Created upload script to populate Supabase
- ✅ Created utility functions for slot data access
- ✅ Updated all components to use Supabase

## 📋 Steps to Complete the Migration

### Step 1: Run the SQL Migration

1. Open your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `migrations/create_slots_table.sql`
6. Paste into the SQL Editor
7. Click **Run** to execute the migration

This will create the `slots` table with the following structure:
- `id` (UUID, primary key)
- `name` (TEXT, unique)
- `provider` (TEXT)
- `image` (TEXT)
- `created_at` (TIMESTAMP)

### Step 2: Install dotenv Package

The upload script requires the `dotenv` package to read environment variables:

```powershell
npm install dotenv
```

### Step 3: Create .env File

Create a `.env` file in the root of your project with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Replace the values with your actual Supabase URL and anon key from your Supabase dashboard.

### Step 4: Upload Slot Data to Supabase

Run the upload script to populate your Supabase database with all slots:

```powershell
node scripts/uploadSlots.js
```

This will:
- Read all slots from `src/data/slotDatabase.js`
- Upload them in batches to Supabase
- Display progress and summary
- Verify the data was uploaded correctly

Expected output:
```
🚀 Starting upload of [number] slots to Supabase...
📦 Processing batch 1/X...
✅ Batch 1 uploaded successfully
...
✅ Total slots in database: [number]
🎉 Upload complete!
```

### Step 5: Test Your Application

Start your development server and test that everything works:

```powershell
npm run dev
```

Test these features:
1. **Random Slot Picker** - Should load slots from Supabase
2. **Bonus Hunt** - Should find slot images from Supabase
3. **Tournament Panel** - Should suggest slots from Supabase
4. **Overlay Layouts** - Should display slot images and provider logos

### Step 6: Monitor Performance

The slot utilities include a 5-minute cache to improve performance. You can check the cache status in the browser console.

## 🔧 Key Changes Made

### New Files Created:
- `migrations/create_slots_table.sql` - Database schema
- `scripts/uploadSlots.js` - Data upload script
- `src/utils/slotUtils.js` - Supabase access utilities

### Components Updated:
- `RandomSlotPicker` - Now fetches slots from Supabase with loading state
- `BonusHuntContext` - Uses async slot lookups
- `TournamentPanel` - Fetches slots and uses async search
- `ModernSidebarLayout` - Async provider logo loading
- `ModernCardLayout` - Prefetches slot data for all bonuses

## 🎯 Benefits

1. **Centralized Data** - Slots stored in Supabase, accessible from anywhere
2. **Easy Updates** - Update slots via Supabase dashboard without code changes
3. **Caching** - 5-minute cache reduces API calls and improves performance
4. **Scalability** - Can easily add new fields (RTP, volatility, etc.) to slots table
5. **Real-time** - Could enable real-time updates in the future

## 🔄 Future Enhancements

Consider these improvements:
- Add admin panel to manage slots (add/edit/delete)
- Add more fields: RTP, volatility, min/max bet, release date
- Enable real-time subscriptions for slot updates
- Add slot categories/tags for better filtering
- Create slot favorites system per user

## 🐛 Troubleshooting

### Upload Script Fails
- Verify `.env` file exists with correct credentials
- Check Supabase dashboard that the table was created
- Ensure `dotenv` package is installed

### Slots Not Loading in App
- Check browser console for errors
- Verify Supabase RLS policies allow authenticated reads
- Check network tab to see if Supabase requests are succeeding

### Performance Issues
- The cache should prevent excessive API calls
- Consider increasing cache duration in `slotUtils.js`
- Use `prefetchSlots()` on app initialization

## 📚 API Reference

### slotUtils Functions

```javascript
// Fetch all slots (cached)
const slots = await getAllSlots();

// Find specific slot by name
const slot = await findSlotByName('Wanted Dead or Wild');

// Get all providers
const providers = await getAllProviders();

// Filter by providers
const slots = await getSlotsByProviders(['Hacksaw', 'Pragmatic Play']);

// Get random slots
const randomSlots = await getRandomSlots(10, ['Hacksaw']);

// Search slots
const results = await searchSlotsByName('dead');

// Clear cache
invalidateCache();

// Prefetch for initialization
await prefetchSlots();
```

## ✅ Verification Checklist

- [ ] SQL migration executed successfully
- [ ] dotenv package installed
- [ ] .env file created with Supabase credentials
- [ ] Upload script completed without errors
- [ ] Random Slot Picker loads and works
- [ ] Bonus Hunt displays slot images correctly
- [ ] Tournament Panel slot suggestions work
- [ ] Overlay layouts display correctly

## 🎉 You're Done!

Your slot database is now powered by Supabase! All slot data is centrally managed and accessible across your application.
