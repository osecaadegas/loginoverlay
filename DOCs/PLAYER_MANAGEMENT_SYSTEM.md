# 🎮 PLAYER MANAGEMENT SYSTEM - Complete Documentation

## Overview

Professional-grade admin tools for managing player accounts in your browser life game. Built with enterprise security standards, full audit trails, and role-based access control.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Installation & Setup](#installation--setup)
3. [Role Hierarchy & Permissions](#role-hierarchy--permissions)
4. [Admin Operations Guide](#admin-operations-guide)
5. [Security & Audit](#security--audit)
6. [Rollback System](#rollback-system)
7. [Anti-Cheat Integration](#anti-cheat-integration)
8. [API Reference](#api-reference)
9. [Abuse Prevention](#abuse-prevention)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────┐
│                  FRONTEND (React)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐│
│  │ Search Bar   │  │  Player View │  │  Actions  ││
│  │  Username    │  │  Profile Tab │  │  Edit     ││
│  │  ID / Twitch │  │  Economy Tab │  │  Ban      ││
│  └──────────────┘  │  Inventory   │  │  Rollback ││
│                    │  Security    │  └───────────┘│
│                    │  History Tab │               │
│                    └──────────────┘               │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│           EDGE FUNCTIONS (TypeScript)               │
│  ┌────────────────────────────────────────────────┐│
│  │  admin-middleware (RBAC)                       ││
│  │  - authenticateAdmin()                         ││
│  │  - requirePermission()                         ││
│  │  - checkQuota()                                ││
│  │  - logAction()                                 ││
│  │  - createSnapshot()                            ││
│  │  - executeRollback()                           ││
│  └────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────┐│
│  │  player-management                             ││
│  │  - search, view, edit:money, edit:level        ││
│  │  - ban:temp, ban:perm, unban                   ││
│  │  - notes:add, rollback                         ││
│  └────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL)                  │
│  ┌────────────────┐  ┌────────────────────────────┐│
│  │ Admin System   │  │  Player Data               ││
│  │ - roles        │  │  - the_life_players        ││
│  │ - permissions  │  │  - player_inventory        ││
│  │ - user_roles   │  │  - businesses              ││
│  │ - actions      │  │  - player_risk_scores      ││
│  │ - notes        │  │  - security_alerts         ││
│  │ - rollbacks    │  │  - game_logs               ││
│  │ - quotas       │  │                            ││
│  └────────────────┘  └────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Security Layers

1. **Authentication**: JWT tokens from Supabase Auth
2. **Authorization**: RBAC with role levels (owner=100, admin=75, moderator=50, support=25)
3. **Permission Checks**: Granular permissions per action
4. **Quota Enforcement**: Rate limiting per role per action
5. **Audit Logging**: Every action logged with before/after state
6. **Rollback System**: Undo any action with state snapshots
7. **Dual-Confirmation**: Required for destructive actions

---

## Installation & Setup

### Step 1: Run Database Migrations

```sql
-- In Supabase SQL Editor, run:
-- migrations/add_admin_player_management_system.sql
```

This creates:
- 5 admin tables (roles, permissions, user_roles, actions, notes)
- 3 system tables (rollbacks, quotas, quota_configs)
- 10 helper functions
- 12 RLS policies
- Default roles and permissions

### Step 2: Assign Admin Roles

```sql
-- Make yourself an owner
INSERT INTO admin_user_roles (user_id, role_name, assigned_by)
VALUES (
  'YOUR_USER_ID',  -- Get from auth.users table
  'owner',
  'YOUR_USER_ID'
);

-- Assign other admins
INSERT INTO admin_user_roles (user_id, role_name, assigned_by)
VALUES (
  'OTHER_USER_ID',
  'admin',  -- or 'moderator', 'support'
  'YOUR_USER_ID'
);
```

### Step 3: Deploy Edge Functions

```bash
# Deploy middleware
supabase functions deploy admin-middleware

# Deploy player management
supabase functions deploy player-management
```

### Step 4: Create Vercel Wrapper (Optional)

Create `api/player-management.js`:

```javascript
// Wrapper to call Supabase Edge Function from Vercel
export default async function handler(req, res) {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/player-management`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify(req.body)
    }
  );

  const data = await response.json();
  res.status(response.status).json(data);
}
```

### Step 5: Add UI Route

In your admin router:

```jsx
import PlayerManagementPage from './components/Admin/pages/PlayerManagementPage';

<Route path="/admin/players" element={<PlayerManagementPage />} />
```

---

## Role Hierarchy & Permissions

### Roles (Highest to Lowest)

| Role | Level | Description | Key Permissions |
|------|-------|-------------|-----------------|
| **Owner** | 100 | Full system access | Everything including managing other admins |
| **Admin** | 75 | High-level access | Edit economy, inventory, issue bans, rollbacks |
| **Moderator** | 50 | Limited access | Temp bans, view data, flag players |
| **Support** | 25 | Read-only | View player data for support tickets |

### Permission Scopes

#### Player Management
- `player:view` - View player profiles (Level 25+)
- `player:edit:basic` - Edit username, avatar (Level 50+)
- `player:edit:stats` - Edit level, XP, stats (Level 75+)
- `player:ban:temp` - Temp ban up to 7 days (Level 50+)
- `player:ban:perm` - Permanent ban (Level 75+) **⚠️ DESTRUCTIVE**
- `player:delete` - Delete account (Level 100+) **⚠️ DESTRUCTIVE**
- `player:notes:add` - Add internal notes (Level 25+)

#### Economy Management
- `economy:view` - View economy data (Level 25+)
- `economy:edit:money` - Add/remove cash/bank (Level 75+)
- `economy:edit:items` - Grant/remove items (Level 75+)
- `economy:reset` - Wipe economy (Level 100+) **⚠️ DESTRUCTIVE**

#### Inventory Management
- `inventory:view` - View inventory (Level 25+)
- `inventory:add` - Add items (Level 75+)
- `inventory:remove` - Remove items (Level 75+)
- `inventory:reset` - Wipe inventory (Level 100+) **⚠️ DESTRUCTIVE**

#### Security Management
- `security:view` - View alerts/flags (Level 50+)
- `security:flag` - Flag/unflag player (Level 50+)
- `security:whitelist` - Bypass anti-cheat (Level 75+)
- `security:logs` - View action logs (Level 50+)

#### System Management
- `system:rollback` - Undo admin actions (Level 75+)
- `system:audit` - View audit logs (Level 50+)
- `system:manage:admins` - Manage other admins (Level 100+) **⚠️ DESTRUCTIVE**

---

## Admin Operations Guide

### Daily Workflows

#### 1. Search for a Player

```
1. Go to /admin/players
2. Select search type (Username / ID / Twitch ID)
3. Enter search query
4. Click Search
5. Results appear below
6. Click any player to open full profile
```

#### 2. Edit Player Money

```
1. Search and open player
2. Go to "Economy" tab
3. Use quick buttons (+1K, +10K, -1K) or custom amount
4. Modal prompts for reason
5. Enter reason (required)
6. Confirm
7. Change is logged and can be rolled back
```

#### 3. Issue Temporary Ban

```
1. Search and open player
2. Click "Temp Ban" button
3. Enter duration in hours (max 168 = 7 days)
4. Enter reason (visible to player)
5. Confirm
6. Ban is active immediately
7. Auto-unbans after duration
```

#### 4. Issue Permanent Ban

```
⚠️ DESTRUCTIVE ACTION - Use with caution
1. Search and open player
2. Click "Perm Ban" button
3. Confirm warning dialog
4. Enter detailed reason
5. Ban is permanent (no auto-unban)
6. Can be manually unbanned by admin
```

#### 5. View Security Alerts

```
1. Open player profile
2. Go to "Security" tab
3. View risk score breakdown
4. Review security alerts list
5. Each alert shows:
   - Alert type
   - Severity (low/medium/high)
   - Description
   - Timestamp
```

#### 6. Add Internal Note

```
1. Open player profile
2. Click "Add Note" button
3. Select note type:
   - info: General information
   - warning: Caution for other admins
   - ban_reason: Ban justification
   - support_ticket: Related to support
   - investigation: Ongoing investigation
4. Enter note content
5. Note is visible to all staff
```

#### 7. Rollback Admin Action

```
1. Open player profile
2. Go to "History" tab
3. View recent admin actions
4. Click "Rollback" on completed action
5. Enter rollback reason
6. Confirm
7. Previous state is restored
8. Rollback is logged
```

### Weekly Workflows

#### Review Audit Logs

```sql
-- In Supabase SQL Editor
SELECT 
  admin_username,
  action_type,
  target_player_username,
  reason,
  created_at
FROM admin_actions
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 100;
```

#### Check Quota Usage

```sql
SELECT 
  aur.user_id,
  aur.role_name,
  aaq.action_type,
  aaq.actions_taken,
  aaq.quota_limit,
  aaq.is_locked
FROM admin_action_quotas aaq
JOIN admin_user_roles aur ON aaq.admin_id = aur.user_id
WHERE aaq.period_end > NOW()
ORDER BY aaq.actions_taken DESC;
```

---

## Security & Audit

### Audit Trail

Every admin action is logged with:

```json
{
  "action_id": "uuid",
  "admin_id": "uuid",
  "admin_username": "admin123",
  "admin_role": "admin",
  "action_type": "economy:edit:money",
  "action_category": "economy",
  "target_player_id": "uuid",
  "target_player_username": "player123",
  "field_changed": "cash",
  "before_value": { "cash": 1000 },
  "after_value": { "cash": 11000 },
  "change_delta": { "added": 10000 },
  "reason": "Compensation for bug",
  "ip_address": "203.0.113.1",
  "is_destructive": false,
  "status": "completed",
  "created_at": "2026-02-14T10:30:00Z"
}
```

### Viewing Audit Logs

**In Admin Panel:**
1. Go to player profile → History tab
2. See all actions on that player

**In Database:**
```sql
-- All actions by specific admin
SELECT * FROM admin_actions
WHERE admin_id = 'ADMIN_USER_ID'
ORDER BY created_at DESC;

-- All actions on specific player
SELECT * FROM admin_actions
WHERE target_player_id = 'PLAYER_ID'
ORDER BY created_at DESC;

-- Destructive actions only
SELECT * FROM admin_actions
WHERE is_destructive = true
ORDER BY created_at DESC;

-- Actions that were rolled back
SELECT * FROM admin_actions
WHERE is_rolled_back = true
ORDER BY created_at DESC;
```

### Exporting Audit Data

```sql
-- CSV export for compliance
COPY (
  SELECT 
    created_at,
    admin_username,
    action_type,
    target_player_username,
    field_changed,
    before_value,
    after_value,
    reason,
    ip_address
  FROM admin_actions
  WHERE created_at BETWEEN '2026-01-01' AND '2026-02-01'
  ORDER BY created_at
) TO '/tmp/admin_actions_jan_2026.csv' WITH CSV HEADER;
```

---

## Rollback System

### How It Works

1. **Before Change**: System creates a snapshot of current state
2. **Execute Change**: Modify player data (cash, level, etc.)
3. **Log Action**: Record what changed
4. **Store Snapshot**: Link snapshot to action ID

### Rollback Process

```typescript
// Automatic flow:
1. Admin clicks "Rollback" on action
2. System retrieves original snapshot
3. Restores all affected tables to previous state
4. Marks original action as "rolled_back"
5. Logs the rollback as new admin action
```

### Snapshot Structure

```json
{
  "rollback_id": "uuid",
  "original_action_id": "uuid",
  "player_id": "uuid",
  "snapshot_tables": ["the_life_players", "player_inventory"],
  "snapshot_data": {
    "the_life_players": [{
      "id": "uuid",
      "cash": 1000,
      "bank": 5000,
      "level": 10,
      "xp": 2500
    }],
    "player_inventory": [
      { "item_id": "uuid", "quantity": 5 },
      { "item_id": "uuid", "quantity": 10 }
    ]
  },
  "rollback_status": "completed"
}
```

### Limitations

- **Cannot rollback if**:
  - Player has been deleted
  - Snapshot is corrupted
  - Over 30 days old (configurable)
  - Already rolled back

- **Partial rollbacks**: Not supported (all or nothing)
- **Chained actions**: Rollback each individually

### Manual Rollback (SQL)

```sql
-- If admin panel fails, manual rollback:
-- 1. Find the action
SELECT * FROM admin_actions WHERE id = 'ACTION_ID';

-- 2. Get snapshot
SELECT * FROM action_rollbacks WHERE original_action_id = 'ACTION_ID';

-- 3. Restore manually (example for cash)
UPDATE the_life_players
SET cash = (snapshot_data->'the_life_players'->0->>'cash')::integer
WHERE id = 'PLAYER_ID';

-- 4. Mark as rolled back
UPDATE admin_actions
SET is_rolled_back = true,
    rolled_back_at = NOW(),
    status = 'rolled_back'
WHERE id = 'ACTION_ID';
```

---

## Anti-Cheat Integration

### Marking Admin Actions as Trusted

All admin actions bypass anti-cheat detection automatically:

```typescript
// In game_logs table
{
  "log_id": "uuid",
  "player_id": "uuid",
  "action_type": "money_received",
  "amount": 10000,
  "is_admin_action": true,  // ← Bypass anti-cheat
  "admin_action_id": "uuid"  // Link to admin_actions
}
```

### Detection Engine Update

Add to `anticheat-detection` Edge Function:

```typescript
// Skip detection for admin actions
if (log.is_admin_action === true) {
  console.log('Skipping detection: Admin action');
  continue;  // Skip this log
}

// Otherwise, run normal detection rules...
```

### Audit Trail

Even though admin actions bypass detection, they are still logged:

```sql
-- View all admin actions that affected game_logs
SELECT 
  gl.action_type,
  gl.player_id,
  aa.admin_username,
  aa.reason,
  aa.created_at
FROM game_logs gl
JOIN admin_actions aa ON gl.admin_action_id = aa.id
WHERE gl.is_admin_action = true
ORDER BY aa.created_at DESC;
```

### Preventing Abuse

- Admin actions still count toward quotas
- All actions require reason
- Cannot disable audit logging
- Rollbacks require separate permission
- Owner-level actions notify all admins

---

## API Reference

### Search Players

**Endpoint**: `POST /api/player-management`

**Request:**
```json
{
  "action": "search",
  "query": "player123",
  "searchBy": "username",  // or "id", "twitch_id"
  "limit": 50
}
```

**Response:**
```json
{
  "success": true,
  "players": [
    {
      "id": "uuid",
      "username": "player123",
      "level": 15,
      "cash": 5000,
      "bank": 10000,
      "is_banned": false,
      "is_flagged": false,
      "created_at": "2026-01-01T00:00:00Z",
      "last_login": "2026-02-14T10:00:00Z"
    }
  ],
  "count": 1
}
```

### View Player Profile

**Request:**
```json
{
  "action": "view",
  "playerId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "player": {
    "id": "uuid",
    "username": "player123",
    "level": 15,
    "xp": 5000,
    "cash": 5000,
    "bank": 10000,
    "inventory": [ /* items */ ],
    "businesses": [ /* businesses */ ],
    "riskScore": { /* risk data */ },
    "alerts": [ /* security alerts */ ],
    "notes": [ /* admin notes */ ],
    "recentActions": [ /* admin actions */ ]
  }
}
```

### Edit Money

**Request:**
```json
{
  "action": "edit:money",
  "playerId": "uuid",
  "field": "cash",  // or "bank"
  "amount": 10000,  // positive = add, negative = remove
  "reason": "Compensation for bug"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Updated cash by 10000",
  "before": { "cash": 5000, "bank": 10000 },
  "after": { "cash": 15000, "bank": 10000 }
}
```

### Temp Ban

**Request:**
```json
{
  "action": "ban:temp",
  "playerId": "uuid",
  "duration": 24,  // hours (max 168)
  "reason": "Toxic behavior in chat"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Player banned for 24 hours",
  "expiresAt": "2026-02-15T10:00:00Z"
}
```

### Perm Ban

**Request:**
```json
{
  "action": "ban:perm",
  "playerId": "uuid",
  "reason": "Repeated exploiting after warnings"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Player permanently banned"
}
```

### Rollback Action

**Request:**
```json
{
  "action": "rollback",
  "actionId": "uuid",
  "reason": "Accidental ban"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Action rolled back successfully"
}
```

---

## Abuse Prevention

### Quota System

Prevents admin spam/abuse:

| Role | Action | Limit | Period |
|------|--------|-------|--------|
| Support | player:view | 100 | hour |
| Support | player:notes:add | 50 | day |
| Moderator | player:ban:temp | 20 | day |
| Admin | economy:edit:money | 50 | day |
| Admin | system:rollback | 20 | day |
| Owner | system:manage:admins | 50 | day |

**Quota Lock:**
If quota exceeded:
- Admin is locked from that action
- Lock expires when quota period ends
- All admins are notified
- Logged in audit trail

**Override:**
Only owner can manually reset quotas:

```sql
UPDATE admin_action_quotas
SET is_locked = false,
    locked_until = NULL
WHERE admin_id = 'ADMIN_ID' AND action_type = 'ACTION_TYPE';
```

### Dual-Confirmation

Destructive actions require confirmation:

1. Admin clicks destructive action (perm ban, delete, reset)
2. Warning modal shows consequences
3. Admin must type "CONFIRM" to proceed
4. Action requires additional permission check
5. Logged with `is_destructive = true`

**Destructive Actions:**
- `player:ban:perm`
- `player:delete`
- `economy:reset`
- `inventory:reset`
- `reset:full`
- `system:manage:admins`

### Permission Scoping

Admins cannot escalate their own permissions:

```typescript
// Enforced at database level
CREATE POLICY "Cannot self-promote" ON admin_user_roles
  FOR INSERT WITH CHECK (
    user_id != auth.uid()  -- Cannot change own role
  );
```

### Action Notifications

High-severity actions notify all owner-level admins:

- Permanent bans
- Account deletions
- Admin role changes
- Quota overrides
- Mass actions (>10 players affected)

---

## Troubleshooting

### "Access Denied: Not an admin"

**Cause:** User is not in `admin_user_roles` table

**Solution:**
```sql
-- Check if user has role
SELECT * FROM admin_user_roles WHERE user_id = 'YOUR_USER_ID';

-- If not, add role
INSERT INTO admin_user_roles (user_id, role_name, assigned_by)
VALUES ('YOUR_USER_ID', 'owner', 'YOUR_USER_ID');
```

### "Missing permission 'economy:edit:money'"

**Cause:** Role level too low for action

**Solution:**
- Check required permission level in `admin_permissions` table
- Upgrade role or reassign to higher-level admin

### "Quota exceeded"

**Cause:** Hit rate limit for action

**Solution:**
- Wait for quota period to end
- Or have owner manually reset quota
- Review quota configs if too restrictive

### "Rollback snapshot not found"

**Cause:** Snapshot expired or was deleted

**Solution:**
- Cannot rollback this action
- Manual restore required (use SQL queries)
- Adjust snapshot retention policy

### "Player not found"

**Cause:** Player ID doesn't exist or was deleted

**Solution:**
- Verify player ID is correct
- Check if player was deleted
- Search by username instead

---

## Best Practices

1. **Always provide detailed reasons** - Helps with audits and disputes
2. **Use temp bans first** - Can be undone easier than perm bans
3. **Test on test account first** - Before mass actions
4. **Review action history** - Before major changes
5. **Use rollback sparingly** - Understand consequences first
6. **Document edge cases** - In admin notes
7. **Regular audit reviews** - Weekly or monthly
8. **Train all admins** - On proper procedures
9. **Keep quotas reasonable** - Balance security and usability
10. **Never share admin accounts** - One account per person

---

**Version:** 1.0  
**Last Updated:** February 14, 2026  
**Maintained By:** Game Studio Admin Team
