# TheLife Game Security Fix - Step-by-Step Guide

## 🔒 Overview

This guide will walk you through implementing the security fixes for TheLife game. The fixes move sensitive game logic from client-side JavaScript to server-side PostgreSQL functions, preventing cheating.

## ⚠️ Vulnerabilities Fixed

| Severity | Issue | Fix |
|----------|-------|-----|
| 🔴 CRITICAL | Client-side RNG for crimes | Server-side `execute_crime()` RPC |
| 🔴 CRITICAL | Banking manipulation | Server-side `execute_bank_transfer()` RPC |
| 🟠 HIGH | No rate limiting | `the_life_action_cooldowns` table |
| 🟠 HIGH | Negative balance exploits | Database CHECK constraints |
| 🟡 MEDIUM | Race conditions | Row locking with `FOR UPDATE` |

---

## 📋 Step 1: Run the SQL Migration

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `/migrations/add_thelife_security_fixes.sql`
5. Click **Run** (or press F5)

### Expected Output:
- Several "CREATE FUNCTION" success messages
- "CREATE TABLE" for cooldowns table
- "ALTER TABLE" for constraints
- "GRANT" permissions applied

### ⚠️ Troubleshooting:

If you see errors about existing constraints:
```sql
-- Run this to drop existing constraint first:
ALTER TABLE the_life_players DROP CONSTRAINT IF EXISTS the_life_players_cash_non_negative;
-- Then run the migration again
```

---

## 📋 Step 2: Verify Functions Were Created

Run this query in Supabase SQL Editor:

```sql
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname IN (
  'execute_crime',
  'execute_bank_transfer',
  'execute_crime_rate_limited',
  'collect_business_production',
  'execute_market_purchase',
  'execute_jail_bribe'
);
```

You should see 6 rows returned.

---

## 📋 Step 3: Test the Secure Functions

### Test Bank Transfer:
```sql
-- This should fail if you have no cash
SELECT execute_bank_transfer(1000, 'deposit');

-- Check the error message
SELECT execute_bank_transfer(-100, 'deposit'); -- Should error: "Amount must be positive"
```

### Test Crime Execution:
```sql
-- Get a crime ID first
SELECT id, name FROM the_life_robberies LIMIT 1;

-- Test the crime (replace with actual UUID)
SELECT execute_crime_rate_limited('your-crime-uuid-here');
```

---

## 📋 Step 4: Deploy Frontend Changes

The frontend has already been updated in these files:

### Updated Components:

| File | Changes |
|------|---------|
| `src/components/TheLife/categories/TheLifeBank.jsx` | Uses `execute_bank_transfer()` RPC |
| `src/components/TheLife/categories/TheLifeCrimes.jsx` | Uses `execute_crime_rate_limited()` RPC |

### Deploy to Vercel:
```bash
git add .
git commit -m "Security: Move game logic to server-side RPCs"
git push
```

---

## 📋 Step 5: Verify Security After Deploy

### Test 1: Check Bank Transfer Security
1. Open browser DevTools (F12)
2. Go to Console
3. Try this exploit (should FAIL):
```javascript
// Old exploit attempt - this should now fail
await supabase
  .from('the_life_players')
  .update({ cash: 999999999, bank_balance: 999999999 })
  .eq('user_id', 'your-id');
// This will be blocked by RLS
```

### Test 2: Check Crime RNG is Server-Side
1. In DevTools Network tab, filter by "rpc"
2. Commit a crime in the game
3. You should see `execute_crime_rate_limited` call
4. The response contains the result - NO client-side `Math.random()` used

### Test 3: Rate Limiting Works
1. Try committing crimes rapidly (click fast)
2. You should see "Too fast! Wait 3 seconds between crimes"

---

## 🔧 Additional Security Recommendations

### Future Enhancements (Not Yet Implemented):

1. **Business Collection** - Needs `collect_business_production()` integration
2. **Market Purchases** - Needs `execute_market_purchase()` integration  
3. **Jail Bribes** - Needs `execute_jail_bribe()` integration
4. **Blackjack** - Keep deck server-side (complex rewrite needed)
5. **Audit Logging** - Add admin audit trail table

### Quick Security Checklist:

- [x] Database constraints prevent negative balances
- [x] Banking uses server-side RPC
- [x] Crimes use server-side RPC with rate limiting
- [x] Row locking prevents race conditions
- [ ] Business collection needs update (TODO)
- [ ] Market purchases needs update (TODO)
- [ ] Jail bribes needs update (TODO)

---

## 🐛 Known Issues

### Issue 1: Old Column Names
The migration uses the correct column names for your database:
- `success_rate` (not `success_chance`)
- `base_reward`, `max_reward` (not `reward_cash_min/max`)
- `min_level_required` (not `level_required`)
- `jail_time_minutes` (not `jail_time`)
- `hp_loss_on_fail` for HP damage

### Issue 2: Missing Tables
If you get errors about missing tables, run these first:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'the_life%';
```

---

## 📞 Support

If you encounter issues:

1. Check Supabase logs: Dashboard → Logs → Edge Functions
2. Check browser console for errors
3. Verify RLS policies allow the RPC calls
4. Ensure the user is authenticated before calling RPCs

---

## 🎉 Success Criteria

After completing all steps, you should:

1. ✅ See 6 security functions in your database
2. ✅ Bank deposits/withdrawals work through secure RPC
3. ✅ Crimes execute through secure RPC with rate limiting
4. ✅ No way to manipulate values via DevTools
5. ✅ Database constraints prevent negative balances
