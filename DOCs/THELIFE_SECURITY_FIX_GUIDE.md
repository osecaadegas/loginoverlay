# TheLife Game Security Fix - Complete Step-by-Step Guide

## 🔒 Overview

This guide walks you through implementing **ALL** security fixes for TheLife game. The fixes move sensitive game logic from client-side JavaScript to server-side PostgreSQL functions, preventing cheating.

---

## ⚠️ Vulnerabilities Fixed

| Severity | Component | Issue | Fix |
|----------|-----------|-------|-----|
| 🔴 CRITICAL | Crimes | Client-side `Math.random()` | `execute_crime_rate_limited()` RPC |
| 🔴 CRITICAL | Banking | Direct DB manipulation | `execute_bank_transfer()` RPC |
| 🔴 CRITICAL | Street Selling | Client-side jail roll | `execute_street_sell()` RPC |
| 🔴 CRITICAL | Brothel | Client clock manipulation | `collect_brothel_income()` RPC |
| 🟠 HIGH | Jail Bribe | Client-side calculation | `execute_jail_bribe()` RPC |
| 🟠 HIGH | No rate limiting | Spam clicking | `the_life_action_cooldowns` table |
| 🟡 MEDIUM | Negative balances | Exploit | Database CHECK constraints |

---

## 📋 STEP 1: Run the SQL Migration in Supabase

### 1.1 Open Supabase SQL Editor
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### 1.2 Copy and Run the Migration
1. Open the file: `migrations/add_thelife_security_fixes.sql`
2. Copy the **ENTIRE** contents (all 800+ lines)
3. Paste into the SQL Editor
4. Click **Run** (or press F5)

### 1.3 Expected Output
You should see multiple success messages:
```
DO
DO
DO
CREATE FUNCTION (execute_crime)
CREATE FUNCTION (execute_bank_transfer)
CREATE FUNCTION (collect_business_production)
CREATE FUNCTION (execute_market_purchase)
CREATE FUNCTION (execute_jail_bribe)
GRANT
GRANT
GRANT
GRANT
GRANT
CREATE TABLE (the_life_action_cooldowns)
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE FUNCTION (execute_crime_rate_limited)
GRANT
CREATE FUNCTION (execute_street_sell)
GRANT
CREATE FUNCTION (collect_brothel_income)
GRANT
```

### 1.4 Troubleshooting

**Error: constraint already exists**
```sql
-- Run this first, then re-run the migration:
ALTER TABLE the_life_players DROP CONSTRAINT IF EXISTS the_life_players_cash_non_negative;
ALTER TABLE the_life_players DROP CONSTRAINT IF EXISTS the_life_players_bank_non_negative;
ALTER TABLE the_life_players DROP CONSTRAINT IF EXISTS the_life_players_stamina_non_negative;
```

**Error: function already exists with different signature**
```sql
-- Drop existing functions first:
DROP FUNCTION IF EXISTS execute_crime(UUID, INTEGER);
DROP FUNCTION IF EXISTS execute_bank_transfer(INTEGER, TEXT);
DROP FUNCTION IF EXISTS execute_jail_bribe();
DROP FUNCTION IF EXISTS execute_street_sell(UUID, INTEGER);
DROP FUNCTION IF EXISTS collect_brothel_income();
```

---

## 📋 STEP 2: Verify Functions Were Created

Run this query in SQL Editor to confirm all functions exist:

```sql
SELECT proname as function_name, pronargs as num_args
FROM pg_proc 
WHERE proname IN (
  'execute_crime',
  'execute_crime_rate_limited',
  'execute_bank_transfer',
  'execute_jail_bribe',
  'execute_street_sell',
  'collect_brothel_income',
  'collect_business_production',
  'execute_market_purchase'
)
ORDER BY proname;
```

**Expected result:** 8 rows

---

## 📋 STEP 3: Deploy Frontend Changes

The frontend components have been updated to use secure RPCs:

### Components Updated:
| File | Secure Function Used |
|------|---------------------|
| `TheLifeBank.jsx` | `execute_bank_transfer()` |
| `TheLifeCrimes.jsx` | `execute_crime_rate_limited()` |
| `TheLifeJail.jsx` | `execute_jail_bribe()` |
| `TheLifeBlackMarket.jsx` | `execute_street_sell()` |
| `TheLifeBrothel.jsx` | `collect_brothel_income()` |

### Deploy:
```bash
git add .
git commit -m "Security: Complete server-side RPC migration for TheLife game"
git push
```

Wait for Vercel to deploy (check vercel.com dashboard).

---

## 📋 STEP 4: Test Each Feature

### Test 1: Banking ✅
1. Go to TheLife → Bank
2. Deposit some cash
3. Withdraw some cash
4. Both should work normally

### Test 2: Crimes ✅
1. Go to TheLife → Crimes
2. Commit a crime
3. Check the success/failure is random
4. Try clicking rapidly - you should see "Too fast!" message

### Test 3: Jail Bribe ✅
1. Get sent to jail (fail a crime)
2. Click "Pay Bribe"
3. Bribe amount calculated by server, not client

### Test 4: Street Selling ✅
1. Go to Black Market → Street
2. Sell an item
3. Jail risk is now server-side (can't cheat)

### Test 5: Brothel Income ✅
1. Go to Brothel
2. Wait 1+ hour (or have workers already)
3. Click Collect Income
4. Uses server time, not client clock

---

## 📋 STEP 5: Verify Security (Optional)

Open browser DevTools (F12) and try these exploits - they should ALL FAIL:

### Exploit Test 1: Direct Database Manipulation
```javascript
// This should fail due to RLS
await supabase
  .from('the_life_players')
  .update({ cash: 999999999 })
  .eq('user_id', 'your-id');
```

### Exploit Test 2: Negative Balance
The database constraint will block this at the DB level:
```sql
-- This will fail with: CHECK constraint violated
UPDATE the_life_players SET cash = -1000 WHERE id = '...';
```

### Exploit Test 3: Math.random() Override
Even if someone overrides `Math.random()` in the browser, the actual roll happens server-side in PostgreSQL!

---

## 🔧 What's Still Vulnerable (Lower Priority)

These are more complex and can be addressed later:

| Component | Issue | Difficulty |
|-----------|-------|------------|
| **Blackjack** | Deck shuffle is client-side | HIGH (needs game rewrite) |
| **Stocks** | Prices editable in memory | MEDIUM |
| **Player Market** | Race conditions possible | LOW (RPC exists) |
| **Businesses** | Reward calculation | LOW (RPC exists) |

---

## 📊 Security Summary

### Before Fixes:
- ❌ Crime success = `Math.random()` in browser
- ❌ Banking = Direct Supabase updates
- ❌ Jail bribe = Client calculates cost
- ❌ Street selling = Client decides if caught
- ❌ Brothel = Uses client system clock
- ❌ No rate limiting = Spam click exploits

### After Fixes:
- ✅ Crime success = `random()` in PostgreSQL
- ✅ Banking = `execute_bank_transfer()` RPC
- ✅ Jail bribe = `execute_jail_bribe()` RPC
- ✅ Street selling = `execute_street_sell()` RPC
- ✅ Brothel = `collect_brothel_income()` RPC (server time)
- ✅ Rate limiting = 3-second cooldown on crimes
- ✅ Database constraints = Negative balance impossible

---

## 🎉 Success Checklist

After completing all steps:

- [ ] SQL migration ran successfully
- [ ] All 8 functions exist in database
- [ ] Frontend deployed to Vercel
- [ ] Banking works (deposit/withdraw)
- [ ] Crimes work with rate limiting
- [ ] Jail bribe calculated server-side
- [ ] Street selling uses server-side jail roll
- [ ] Brothel income uses server time

---

## 📞 Troubleshooting

### "Function not found" error
The RPC function doesn't exist. Re-run the SQL migration.

### "Permission denied" error
The GRANT statements didn't run. Execute:
```sql
GRANT EXECUTE ON FUNCTION execute_crime_rate_limited(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_bank_transfer(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_jail_bribe() TO authenticated;
GRANT EXECUTE ON FUNCTION execute_street_sell(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION collect_brothel_income() TO authenticated;
```

### Banking shows "Player not found"
User isn't logged in or `auth.uid()` is null. Check authentication.

### Crime always fails
The `the_life_robberies` table might have wrong column names. Check that `success_rate`, `base_reward`, `max_reward`, `stamina_cost`, `min_level_required`, `jail_time_minutes`, `hp_loss_on_fail`, `xp_reward` columns exist.
