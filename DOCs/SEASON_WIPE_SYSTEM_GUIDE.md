# The Life - Season Wipe System Guide

## Overview

This document describes the secure season wipe system for "The Life" game. The system is designed to completely reset all player progression while preserving:
- ✅ User accounts & auth identities
- ✅ Admin roles & permissions
- ✅ Ban history & player flags
- ✅ Security audit logs
- ✅ Game configuration (items, crimes, businesses templates)

---

## Part 1: Data Mapping

### Tables That WILL Be Wiped

| Table | Action | Order | Description |
|-------|--------|-------|-------------|
| `the_life_player_inventory` | DELETE | 1 | All player items |
| `the_life_dock_shipments` | DELETE | 2 | Dock shipment history |
| `the_life_dock_deliveries` | DELETE | 2 | Dock delivery history |
| `the_life_business_productions` | DELETE | 3 | Active production queues |
| `the_life_player_businesses` | DELETE | 4 | Player-owned businesses |
| `the_life_player_brothel_workers` | DELETE | 5 | Hired brothel workers |
| `the_life_player_workers` | DELETE | 5 | Generic workers |
| `the_life_pvp_logs` | DELETE | 6 | PVP battle history |
| `the_life_pvp_chat` | DELETE | 7 | PVP area chat |
| `the_life_pvp_presence` | DELETE | 8 | Online presence data |
| `the_life_robbery_history` | DELETE | 9 | Crime attempt history |
| `the_life_brothels` | DELETE | 10 | Legacy brothel data |
| `the_life_drug_ops` | DELETE | 10 | Legacy drug operations |
| `the_life_market_transactions` | DELETE | 11 | Market history |
| `the_life_market_listings` | DELETE | 12 | Active listings |
| `the_life_stock_transactions` | DELETE | 13 | Stock trade history |
| `the_life_stock_portfolios` | DELETE | 14 | Stock holdings |
| `roulette_*` | DELETE | 15-16 | Casino roulette data |
| `casino_*` | DELETE | 16-18 | Casino tables/seats |
| `the_life_news_feed` | DELETE | 19 | Game news events |
| `the_life_action_cooldowns` | DELETE | 20 | Cooldown timers |
| `the_life_player_metrics` | DELETE | 25 | Daily metrics |
| `the_life_players` | UPDATE | 50 | Reset stats to defaults |

### Tables That Will NOT Be Wiped

| Table | Reason |
|-------|--------|
| `auth.users` | User accounts preserved |
| `user_roles` | Admin permissions preserved |
| `the_life_security_logs` | Audit trail preserved |
| `the_life_player_flags` | Ban history preserved |
| `the_life_items` | Item definitions (config) |
| `the_life_businesses` | Business templates (config) |
| `the_life_robberies` | Crime definitions (config) |
| `the_life_rate_limits` | Rate limit config |
| `streamelements_connections` | SE account links preserved |

### Player Reset Defaults

After wipe, all players reset to:

```json
{
  "xp": 0,
  "level": 1,
  "hp": 100,
  "max_hp": 100,
  "stamina": 100,
  "max_stamina": 100,
  "cash": 500,
  "bank_balance": 0,
  "power": 0,
  "intelligence": 0,
  "defense": 0,
  "addiction": 0,
  "pvp_wins": 0,
  "pvp_losses": 0,
  "total_robberies": 0,
  "successful_robberies": 0,
  "consecutive_logins": 0,
  "jail_until": null,
  "hospital_until": null,
  "equipped_weapon_id": null,
  "equipped_gear_id": null
}
```

---

## Part 2: Wipe Strategy

### Chosen Strategy: Hybrid (Recommended)

We use a **hybrid approach**:
1. **DELETE** child tables (inventory, businesses, history)
2. **UPDATE** parent tables to defaults (the_life_players)
3. **PRESERVE** system tables (config, audit logs, bans)

### Why This Strategy?

| Strategy | Pros | Cons |
|----------|------|------|
| Soft Reset (UPDATE only) | Fast, keeps player records | Can miss orphan data |
| Hard Reset (TRUNCATE) | Clean slate | Loses player records, FK issues |
| **Hybrid (DELETE + UPDATE)** | Clean children, preserve identity | Slightly slower |
| Season Tables | Best long-term | Complex migration |

The hybrid approach:
- ✅ Respects foreign key constraints
- ✅ No orphan data possible
- ✅ Preserves user→player link
- ✅ Preserves ban/flag history
- ✅ Transactionally safe

---

## Part 3: Transactional Safety

### System Lock

Before wipe executes:
1. Acquire exclusive lock on `the_life_system_locks`
2. Set `player_actions` lock = true
3. All player actions check `is_system_locked()` first

```sql
-- Players call this before any action
SELECT is_system_locked();
-- If true, show "Maintenance in progress" message
```

### Backup Before Wipe

The system automatically backs up:
- Player count summary
- Top 100 players (for disputes)
- Total economy stats
- Inventory/business summaries

```sql
-- View backups
SELECT * FROM the_life_wipe_backups 
WHERE wipe_id = '<wipe-uuid>';
```

### Transaction Safety

The entire wipe runs in a single transaction:
- If any table fails, entire wipe rolls back
- Lock is released on failure
- Error is logged to audit trail

---

## Part 4: Admin Security

### Multi-Step Confirmation Flow

```
┌──────────────────────────────────────────────────────┐
│  Step 1: INITIATE                                     │
│  - Admin provides passphrase (16+ chars)              │
│  - System generates confirmation code (e.g., "A7X2F9") │
│  - Valid for 5 minutes                                │
└──────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────┐
│  Step 2: CONFIRM                                      │
│  - Admin enters confirmation code                     │
│  - Admin re-enters passphrase                         │
│  - Must be same admin who initiated                   │
│  - System acquires lock and executes                  │
└──────────────────────────────────────────────────────┘
```

### Security Checks

1. **Admin Role Verification**
   - Checks `user_roles` table
   - Checks `user_metadata.role`
   - Must be: admin, super_admin, or owner

2. **Account Age Check**
   - Admin account must be 7+ days old
   - Prevents compromised new accounts

3. **Rate Limiting**
   - Max 3 wipe attempts per hour per IP
   - Logged to security audit

4. **IP Logging**
   - All wipe attempts logged with IP
   - Alert on suspicious patterns

5. **Same-Admin Verification**
   - Only the admin who initiated can confirm
   - Prevents hijacking of pending wipes

---

## Part 5: Audit & Recovery

### Wipe History Table

```sql
SELECT 
  id,
  season_number,
  season_name,
  status,
  total_players_affected,
  duration_ms,
  created_at,
  completed_at
FROM the_life_wipe_history
ORDER BY created_at DESC;
```

### What's Logged

| Field | Description |
|-------|-------------|
| `admin_user_id` | Who initiated |
| `admin_email` | Admin email |
| `admin_ip` | IP address |
| `season_number` | Auto-incrementing |
| `total_players_affected` | Player count |
| `pre_wipe_snapshot` | Stats before wipe |
| `tables_wiped` | Each table + rows affected |
| `errors_encountered` | Any errors |
| `duration_ms` | How long it took |
| `passphrase_hash` | SHA256 of passphrase |
| `backup_location` | Where backups stored |

### Detecting Partial Wipes

```sql
-- Check for incomplete wipes
SELECT * FROM verify_wipe_completeness();

-- Returns issues like:
-- { "issue": "players_with_xp", "count": 5 }
-- { "issue": "remaining_inventory_items", "count": 100 }
```

### Recovery Options

1. **From Backup Table**
   ```sql
   SELECT * FROM the_life_wipe_backups 
   WHERE wipe_id = '<failed-wipe-id>';
   ```

2. **Manual Restoration**
   - Top 100 players backed up with full stats
   - Can manually restore disputed accounts

3. **Point-in-Time Recovery**
   - Supabase maintains backups
   - Contact support for critical recovery

---

## Part 6: Anti-Abuse

### Preventing Forged Calls

1. **Server-Side Only**
   - All wipe logic in PostgreSQL functions
   - `SECURITY DEFINER` runs as DB owner
   - Frontend cannot bypass

2. **Passphrase Protection**
   - 16+ character passphrase required
   - SHA256 hashed before storage
   - Must match on confirm

3. **Confirmation Code**
   - Random 8-character code
   - Valid only 5 minutes
   - Must enter exactly

### Alert System

All wipe attempts are logged to `the_life_security_logs`:

```sql
-- View all wipe-related events
SELECT * FROM the_life_security_logs
WHERE event_type LIKE '%wipe%'
ORDER BY created_at DESC;
```

Severity levels:
- `info` - Normal operations
- `warning` - Rate limit hit, suspicious activity
- `critical` - Wipe executed, unauthorized attempt
- `exploit` - Potential attack detected

### Testing in Staging

1. **Clone Production Data**
   ```bash
   # Use Supabase CLI to clone
   supabase db dump -f backup.sql
   # Restore to staging project
   psql staging < backup.sql
   ```

2. **Run Test Wipe**
   ```javascript
   // Use staging endpoint
   const result = await fetch('/api/thelife-wipe', {
     method: 'POST',
     headers: { 'Authorization': `Bearer ${adminToken}` },
     body: JSON.stringify({
       action: 'initiate',
       passphrase: 'TestWipeStaging2026!',
       seasonName: 'Test Season'
     })
   });
   ```

3. **Verify Completeness**
   ```sql
   SELECT * FROM verify_wipe_completeness();
   ```

---

## Part 7: Implementation

### Running the Migration

```sql
-- In Supabase SQL Editor
-- Run: migrations/add_season_wipe_system.sql
```

### API Usage

#### Step 1: Initiate Wipe

```javascript
const response = await fetch('/api/thelife-wipe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    action: 'initiate',
    passphrase: 'MySecurePassphrase123!',  // 16+ chars
    seasonName: 'Season 2'  // optional
  })
});

const { wipe_id, confirmation_code, expires_at } = await response.json();
// Save wipe_id and show confirmation_code to admin
```

#### Step 2: Confirm Wipe

```javascript
const response = await fetch('/api/thelife-wipe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    action: 'confirm',
    wipeId: wipe_id,
    confirmationCode: 'A7X2F9',  // From step 1
    passphrase: 'MySecurePassphrase123!'  // Same as step 1
  })
});

const result = await response.json();
// { success: true, tables_wiped: 20, players_reset: 1500 }
```

#### Check System Lock (For Players)

```javascript
// Before any player action
const { data: isLocked } = await supabase.rpc('is_system_locked');
if (isLocked) {
  showMessage('System maintenance in progress. Please wait.');
  return;
}
```

#### Verify Wipe Completeness

```javascript
const response = await fetch('/api/thelife-wipe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({ action: 'verify' })
});

const { clean, issues } = await response.json();
// clean: true = wipe complete
// issues: [] = any remaining data
```

---

## Checklist Before Wipe

- [ ] Announce wipe 24+ hours in advance
- [ ] Verify admin credentials
- [ ] Test in staging first
- [ ] Ensure backup systems working
- [ ] Have rollback plan ready
- [ ] Schedule during low-activity time
- [ ] Monitor security logs during wipe
- [ ] Verify completeness after wipe
- [ ] Announce new season start

---

## Emergency Rollback

If wipe fails mid-execution:

1. **Check Status**
   ```sql
   SELECT * FROM the_life_wipe_history 
   WHERE status = 'in_progress' OR status = 'failed';
   ```

2. **Release Stuck Lock**
   ```sql
   UPDATE the_life_system_locks 
   SET is_locked = false, locked_by = NULL 
   WHERE lock_name IN ('season_wipe', 'player_actions');
   ```

3. **Review Errors**
   ```sql
   SELECT errors_encountered 
   FROM the_life_wipe_history 
   WHERE id = '<wipe-id>';
   ```

4. **Contact Supabase Support**
   - For point-in-time recovery
   - If critical data loss occurred

---

## Questions?

Check the security audit logs for any issues:

```sql
SELECT * FROM the_life_security_logs 
WHERE event_type LIKE '%wipe%' 
ORDER BY created_at DESC 
LIMIT 50;
```
