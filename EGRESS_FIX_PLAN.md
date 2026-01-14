# 🚨 URGENT: Egress Usage Fix Plan

## Problem Identified

**You've used 37.9 GB of 5 GB (758%)** from a 30 MB database!

**Root cause:** Supabase Realtime subscriptions + no caching

### Where the egress is coming from:

1. **Realtime Subscriptions** (biggest culprit):
   - `pvp_chat` channel - broadcasts to ALL users
   - `pvp_logs` channel - broadcasts to ALL users  
   - `player-attacks-${user_id}` - one per player
   - `thelife-updates-${user.id}` - one per player
   - `overlay_state_${userId}` - overlay updates
   - `tournament_${userId}` - tournament updates
   - `giveaway_${userId}` - giveaway updates
   - `random_slot_${userId}` - random slot updates
   - `highlights-changes` - highlights updates
   - `subscription_${user.id}` - subscription updates

2. **No client-side caching** - every page refresh = full data reload

3. **tables_life_items** (22 MB) - probably fetched repeatedly

## 🎯 Immediate Actions (Do NOW)

### 1. Disable Non-Essential Realtime (URGENT)

Go to Supabase Dashboard → Database → Replication → Turn OFF Realtime for these tables:
- ✅ Keep: `the_life_pvp_presence` (only presence needed)
- ❌ Disable: `the_life_pvp_chat` (use polling instead)
- ❌ Disable: `the_life_pvp_logs` (use polling)
- ❌ Disable: `stream_highlights`
- ❌ Disable: `overlay_events`
- ❌ Disable: `user_giveaways`
- ❌ Disable: `user_tournaments`
- ❌ Disable: `subscriptions`

### 2. Add Client-Side Caching (Today)

Install React Query:
```bash
npm install @tanstack/react-query
```

### 3. Check Active Connections

Run in Supabase SQL Editor:
```sql
SELECT 
  COUNT(*) as total_realtime_channels,
  array_agg(DISTINCT channel) as channels
FROM pg_stat_activity
WHERE application_name LIKE '%realtime%';
```

## 🔧 Code Fixes Required

### Fix 1: Replace Realtime with Polling for PVP Chat

**File:** `src/components/TheLife/categories/TheLifePVP_NEW.jsx`

```javascript
// ❌ REMOVE THIS (lines 234-239):
const chatChannel = supabase
  .channel('pvp_chat')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'the_life_pvp_chat' }, ...)
  .subscribe();

// ✅ REPLACE WITH POLLING:
useEffect(() => {
  const fetchChat = async () => {
    const { data } = await supabase
      .from('the_life_pvp_chat')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50); // Only last 50 messages!
    
    if (data) setChatMessages(data);
  };

  fetchChat();
  const interval = setInterval(fetchChat, 5000); // Poll every 5 seconds
  
  return () => clearInterval(interval);
}, []);
```

### Fix 2: Add React Query for Caching

**Create:** `src/config/queryClient.js`

```javascript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
      cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1,
    },
  },
});
```

**Update:** `src/main.jsx` or `src/App.jsx`

```javascript
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/queryClient';

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### Fix 3: Cache the_life_items Queries

**File:** `src/components/TheLife/hooks/useTheLifeData.js`

```javascript
import { useQuery } from '@tanstack/react-query';

// Wrap expensive queries:
const { data: theLifeItems } = useQuery({
  queryKey: ['theLifeItems'],
  queryFn: async () => {
    const { data } = await supabase
      .from('the_life_items')
      .select('*');
    return data;
  },
  staleTime: 30 * 60 * 1000, // 30 minutes - items rarely change
});
```

### Fix 4: Limit PVP Logs Query

**File:** `src/components/TheLife/categories/TheLifePVP_NEW.jsx`

```javascript
// ❌ REMOVE:
const logsChannel = supabase
  .channel('pvp_logs')
  .on('postgres_changes', ...)
  .subscribe();

// ✅ REPLACE WITH LIMITED QUERY:
const { data: pvpLogs } = useQuery({
  queryKey: ['pvpLogs', user.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('the_life_pvp_logs')
      .select('*')
      .or(`attacker_id.eq.${playerId},victim_id.eq.${playerId}`)
      .order('created_at', { ascending: false })
      .limit(20); // ONLY 20 MOST RECENT!
    return data;
  },
  refetchInterval: 10000, // Refetch every 10 seconds
});
```

## 📊 Expected Savings

| Change | Egress Reduction |
|--------|------------------|
| Disable 8 Realtime channels | -80% |
| Add React Query caching | -50% of remaining |
| Limit PVP logs to 20 rows | -90% |
| Poll instead of stream | -60% |

**Total expected reduction: ~95%** (from 37.9 GB → ~2 GB/month)

## ⚡ Quick Wins (Do First)

1. **Disable Realtime** on non-essential tables (5 minutes)
2. **Add `.limit(50)`** to ALL pvp_chat queries (2 minutes)
3. **Add `.limit(20)`** to ALL pvp_logs queries (2 minutes)
4. **Install React Query** and wrap 3-4 most common queries (30 minutes)

## 🔍 Monitor After Changes

Run this query daily to track egress:

```sql
-- Check most queried tables
SELECT 
  schemaname,
  tablename,
  seq_scan + idx_scan as total_scans,
  n_tup_ins + n_tup_upd + n_tup_del as total_changes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan + idx_scan DESC
LIMIT 10;
```

Dashboard → Settings → Usage → Check egress trend

## 🚀 Long-term Solutions

1. **Upgrade to Pro** ($25/month = 250 GB egress)
2. **Use Edge Functions** for aggregations (reduce queries)
3. **Implement Redis caching** layer
4. **Move static data to CDN** (slot images, etc.)
5. **Add service worker caching** for PWA offline support

## ❌ What NOT to Do

- Don't remove pagination (you don't have it - ADD IT!)
- Don't disable all Realtime (keep presence for PVP)
- Don't cache user-specific data too long (<1 min)
- Don't fetch entire tables in components

## ✅ Priority Order

1. Disable Realtime on 8 tables (now)
2. Add limits to pvp queries (now)
3. Install React Query (today)
4. Cache the_life_items (today)
5. Replace remaining Realtime with polling (this week)
6. Apply database migrations for performance (this week)
