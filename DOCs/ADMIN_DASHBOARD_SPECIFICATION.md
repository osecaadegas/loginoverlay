# The Life - Professional Admin Dashboard & Anti-Cheat System
## Complete Specification & Design Document

---

## Table of Contents
1. [Information Architecture](#information-architecture)
2. [Database Schema](#database-schema)
3. [UI Design & Wireframes](#ui-design--wireframes)
4. [Anti-Cheat Logic](#anti-cheat-logic)
5. [Example Data](#example-data)
6. [Security Best Practices](#security-best-practices)
7. [Implementation Roadmap](#implementation-roadmap)

---

## 1. Information Architecture

### 1.1 Main Navigation Structure

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Dashboard  │  🎯 Game Content  │  👥 Players  │  🔒 Security  │  ⚙️ Settings  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Page Hierarchy

#### **🏠 Dashboard** (Home/Overview)
- **System Health**
  - Active players (real-time)
  - Server status indicators
  - Database performance metrics
  - API response times
  
- **Key Metrics (Last 24h)**
  - Total crimes committed
  - Money earned/spent
  - Items purchased
  - New registrations
  - Ban actions taken
  
- **Recent Alerts** (Top 10)
  - Critical security alerts
  - Quick action buttons
  
- **Quick Actions Panel**
  - Create announcement
  - Emergency economy freeze
  - Broadcast message
  - View latest logs

---

#### **🎯 Game Content** (Expandable Sidebar)

##### Sub-Section: **Crimes**
- **Crime List Table**
  - Columns: ID | Name | Image | Category | Base Reward | Success Rate | Energy Cost | XP Reward | Required Level | Status | Actions
  - Inline editing for all fields
  - Bulk actions: Enable/Disable, Duplicate, Delete
  - Search: by name, category
  - Filters: Status (Active/Disabled), Category, Required Level Range
  - Sort: by any column
  
- **Crime Categories Tab**
  - Manage crime categories
  - Reorder priority
  - Set category images

##### Sub-Section: **Businesses**
- **Business List Table**
  - Columns: ID | Name | Type | Purchase Price | Daily Income | Max Level | Required Crime | Upgrade Costs | Status | Actions
  - Inline editing
  - Business upgrade tree visualization
  - Worker slots management
  - Production tracking
  
- **Business Production Tab**
  - Real-time production monitoring
  - Production speed modifiers
  - Resource requirements matrix

##### Sub-Section: **Items**
- **Item Management Table**
  - Columns: ID | Name | Image | Category | Type | Price | Stock | Effect | Rarity | Tradeable | Status | Actions
  - Item effects editor (inline JSON or form)
  - Bulk import/export
  - Item templates library
  
- **Item Categories Tab**
  - Weapons, Armor, Consumables, Special
  - Category attributes
  
- **Store Management Tab**
  - Active store listings
  - Price history
  - Stock alerts (low inventory warnings)
  - Flash sales scheduler

##### Sub-Section: **Economy**
- **Economy Overview**
  - Total money in circulation
  - Money sources/sinks graph (last 7/30 days)
  - Inflation indicators
  - Top earners/spenders
  
- **Reward Configuration**
  - Global multipliers (XP, Money, Drop Rates)
  - Event bonuses scheduler
  - Daily login rewards
  - Referral rewards
  
- **Market Controls**
  - Emergency freeze toggle
  - Price floor/ceiling enforcement
  - Transaction limits
  - Tax rates

##### Sub-Section: **Events & Seasons**
- **Active Events**
  - Event scheduler calendar
  - Event rewards configuration
  - Participation tracking
  
- **Season Management**
  - Season wipe scheduler
  - Season rewards
  - Leaderboard settings

---

#### **👥 Players** (User Management)

##### **Player List Table**
- **Columns**: ID | Username | Email | Level | Cash | Bank | Total Playtime | Last Login | Status | Risk Score | Actions
- **Search**: Username, Email, Player ID
- **Filters**: 
  - Status (Active, Banned, Suspended)
  - Risk Level (Safe, Low, Medium, High, Critical)
  - Level Range
  - Registration Date Range
  - Last Active
  
- **Bulk Actions**:
  - Suspend/Unsuspend
  - Ban/Unban
  - Send message
  - Adjust currency
  - Export selected

##### **Player Detail Page** (Click on player)
- **Tabs Navigation**:

  **1. Overview Tab**
  - Profile card (avatar, level, stats)
  - Account status badges
  - Risk score indicator
  - Quick actions (Ban, Suspend, Message, Adjust Values)
  
  **2. Stats & Progress Tab**
  - Current stats (HP, XP, Power, Intelligence, Defense)
  - Level history graph
  - Achievement progress
  - Business ownership
  - Crime success rates
  
  **3. Inventory Tab**
  - Complete inventory list with quantities
  - Equipped items
  - Recent inventory changes
  - Manual add/remove items
  
  **4. Economy Tab**
  - Current cash/bank balance
  - Transaction history (sortable table)
  - Money sources breakdown (pie chart)
  - Money sinks breakdown (pie chart)
  - Suspicious transactions flagged
  
  **5. Activity Timeline Tab**
  - Chronological log of all player actions
  - Filterable by action type
  - Date range selector
  - Export timeline
  
  **6. Security Tab**
  - Login history (IP, device, timestamp)
  - Failed login attempts
  - Device fingerprints
  - Associated accounts detection
  - Alert history for this player
  - Investigation notes (admin only)

---

#### **🔒 Security** (Anti-Cheat & Monitoring)

##### **Real-Time Alerts Dashboard**
- **Alert Feed** (Live updating)
  - Alert severity color coding:
    - 🟢 Low: Minor unusual behavior
    - 🟡 Medium: Repeated suspicious actions
    - 🟠 High: Likely cheating detected
    - 🔴 Critical: Confirmed exploit/hack
  
- **Alert Card Layout**:
  ```
  ┌────────────────────────────────────────────────┐
  │ 🔴 Critical Alert                    2m ago    │
  │ Player: JohnDoe123 (#45821)                   │
  │ Type: Abnormal Money Gain                     │
  │ Details: Gained $50,000,000 in 30 seconds     │
  │ Expected: Max $50,000 per 30s                 │
  │                                                │
  │ [View Player] [Investigate] [Dismiss]         │
  └────────────────────────────────────────────────┘
  ```
  
- **Alert Filters**:
  - By severity
  - By type
  - By status (New, Investigating, Resolved, False Positive)
  - By date range

##### **Game Logs Viewer**
- **Advanced Log Search**
  - Full-text search
  - Filter by:
    - Action type
    - Player ID/Username
    - Date/time range
    - IP address
    - Value changes threshold
  
- **Log Table**:
  - Columns: Timestamp | Player | Action Type | Description | Old Value | New Value | IP | Device | Flag Status
  - Color-coded rows for flagged entries
  - Click to expand full details
  - Export logs (CSV, JSON)
  
- **Log Types Tabs**:
  - All Logs
  - Economy Events
  - Inventory Changes
  - Crime Actions
  - Admin Actions
  - Security Events

##### **Anti-Cheat Rules Manager**
- **Active Rules List**
  - Rule name
  - Detection type
  - Threshold values
  - Alert severity
  - Status (Active/Disabled)
  - Trigger count (last 24h)
  
- **Rule Configuration** (Inline editing)
  ```
  Rule: Rapid Crime Execution
  Detection: Same crime > 10 times in < 60 seconds
  Severity: High
  Action: Flag + Temporary Suspend
  Status: ✅ Active
  ```
  
- **Custom Rule Builder**
  - IF condition selector
  - THEN action selector
  - Threshold inputs
  - Test rule against historical data

##### **Investigation Tools**

**Player Investigation Interface**
- **Search Player**: Quick lookup by username/ID
  
- **Investigation Dashboard**:
  
  **Timeline Replay**
  - Slider to replay player actions chronologically
  - Highlight suspicious actions
  - Compare expected vs actual values in real-time
  
  **Value Comparison Panel**
  - Expected money at time X
  - Actual money at time X
  - Difference highlighted
  - Drill down to see what caused difference
  
  **Pattern Detection**
  - Identify repeated actions
  - Time interval analysis
  - Success rate anomalies
  - Compare to average player behavior
  
  **Evidence Collection**
  - Flag specific log entries
  - Add investigation notes
  - Take snapshots of player state
  - Build case file for ban
  
  **Actions Panel**
  - Rollback player state to specific timestamp
  - Adjust values manually (with audit log)
  - Suspend/Ban with reason
  - Send warning message
  - Export investigation report

##### **Ban Management**
- **Ban List Table**
  - Columns: Player | Reason | Banned By | Date | Duration | Type | Appeal Status | Actions
  - Types: Temporary, Permanent, IP Ban, Device Ban
  - Bulk unban
  
- **Ban Appeal System**
  - Player appeal queue
  - Appeal details viewer
  - Accept/Reject with notes

---

#### **⚙️ Settings** (System Configuration)

##### **Admin Users**
- Admin accounts management
- Role-based permissions
  - Super Admin: Full access
  - Moderator: Player management, view logs
  - Economy Manager: Game content, rewards
  - Security Analyst: View alerts, investigations only
- Activity log per admin

##### **System Configuration**
- Maintenance mode toggle
- Server-side rate limits
- API endpoint controls
- Backup/restore

##### **Notifications**
- Email alerts for critical security events
- Webhook integrations (Discord, Slack)
- Alert threshold configuration

##### **Audit Log**
- Every admin action logged
- Cannot be deleted or modified
- Export compliance reports

---

## 2. Database Schema

### 2.1 Anti-Cheat & Logging Tables

#### **game_logs** (Primary logging table)
```sql
CREATE TABLE game_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  player_id INTEGER NOT NULL REFERENCES players(id),
  action_type VARCHAR(100) NOT NULL,
  action_category VARCHAR(50) NOT NULL, -- 'economy', 'inventory', 'crime', 'admin', 'auth'
  description TEXT,
  
  -- Value tracking
  old_value JSONB,
  new_value JSONB,
  value_diff NUMERIC, -- for money/xp changes
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  session_id UUID,
  
  -- Security
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason VARCHAR(255),
  flag_severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  
  -- Metadata
  metadata JSONB, -- flexible storage for action-specific data
  
  -- Indexes
  INDEX idx_player_id (player_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_action_type (action_type),
  INDEX idx_flagged (is_flagged) WHERE is_flagged = TRUE,
  INDEX idx_player_timestamp (player_id, timestamp DESC)
);
```

#### **security_alerts** (Active alerts)
```sql
CREATE TABLE security_alerts (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  player_id INTEGER NOT NULL REFERENCES players(id),
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  
  -- Alert details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Evidence
  evidence JSONB, -- contains relevant log IDs, values, comparisons
  related_log_ids BIGINT[], -- array of game_logs.id
  
  -- Detection
  detection_rule_id INTEGER REFERENCES anticheat_rules(id),
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  
  -- Status
  status VARCHAR(50) DEFAULT 'new', -- 'new', 'investigating', 'resolved', 'false_positive', 'banned'
  assigned_to INTEGER REFERENCES admin_users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by INTEGER REFERENCES admin_users(id),
  resolution_notes TEXT,
  
  -- Actions taken
  auto_action_taken VARCHAR(100), -- 'none', 'flagged', 'suspended', 'banned'
  
  INDEX idx_player_id (player_id),
  INDEX idx_severity (severity),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at DESC)
);
```

#### **anticheat_rules** (Detection rules configuration)
```sql
CREATE TABLE anticheat_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Rule logic
  rule_type VARCHAR(100) NOT NULL, -- 'rate_limit', 'threshold', 'pattern', 'comparison'
  detection_config JSONB NOT NULL, -- rule-specific configuration
  
  -- Examples of detection_config:
  -- Rate limit: {"action": "commit_crime", "max_count": 10, "window_seconds": 60}
  -- Threshold: {"field": "money_gained", "max_value": 1000000, "window_seconds": 300}
  -- Pattern: {"actions": ["buy_item", "sell_item"], "min_repeats": 5, "window_seconds": 30}
  
  -- Response
  severity VARCHAR(20) NOT NULL,
  auto_action VARCHAR(50) DEFAULT 'flag', -- 'flag', 'suspend', 'ban', 'none'
  alert_threshold INTEGER DEFAULT 1, -- trigger alert after N violations
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INTEGER REFERENCES admin_users(id),
  
  -- Statistics
  trigger_count INTEGER DEFAULT 0,
  false_positive_count INTEGER DEFAULT 0,
  
  INDEX idx_rule_type (rule_type),
  INDEX idx_active (is_active) WHERE is_active = TRUE
);
```

#### **player_risk_scores** (Real-time risk assessment)
```sql
CREATE TABLE player_risk_scores (
  player_id INTEGER PRIMARY KEY REFERENCES players(id),
  
  -- Risk metrics
  risk_score INTEGER DEFAULT 0, -- 0-100 scale
  risk_level VARCHAR(20) DEFAULT 'safe', -- 'safe', 'low', 'medium', 'high', 'critical'
  
  -- Contributing factors
  flagged_action_count INTEGER DEFAULT 0,
  alert_count INTEGER DEFAULT 0,
  ban_count INTEGER DEFAULT 0,
  
  -- Behavioral indicators
  suspicious_money_gains INTEGER DEFAULT 0,
  suspicious_inventory_changes INTEGER DEFAULT 0,
  rapid_action_violations INTEGER DEFAULT 0,
  impossible_success_rates INTEGER DEFAULT 0,
  
  -- Metadata
  last_suspicious_activity TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Notes
  investigation_notes TEXT,
  is_under_investigation BOOLEAN DEFAULT FALSE,
  
  INDEX idx_risk_level (risk_level),
  INDEX idx_risk_score (risk_score DESC)
);
```

#### **admin_actions** (Admin audit trail)
```sql
CREATE TABLE admin_actions (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id),
  
  -- Action details
  action_type VARCHAR(100) NOT NULL, -- 'ban_player', 'adjust_money', 'modify_item', etc.
  target_type VARCHAR(50), -- 'player', 'item', 'crime', 'setting'
  target_id INTEGER,
  
  -- Changes
  changes JSONB NOT NULL, -- what was changed
  reason TEXT,
  
  -- Context
  ip_address INET,
  
  INDEX idx_admin_user_id (admin_user_id),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_action_type (action_type)
);
```

#### **player_sessions** (Session tracking for device fingerprinting)
```sql
CREATE TABLE player_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id INTEGER NOT NULL REFERENCES players(id),
  
  -- Session info
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Device info
  ip_address INET NOT NULL,
  user_agent TEXT,
  device_fingerprint VARCHAR(255), -- hash of browser/device characteristics
  
  -- Geolocation
  country_code VARCHAR(2),
  city VARCHAR(100),
  
  -- Security flags
  is_suspicious BOOLEAN DEFAULT FALSE,
  vpn_detected BOOLEAN DEFAULT FALSE,
  proxy_detected BOOLEAN DEFAULT FALSE,
  
  INDEX idx_player_id (player_id),
  INDEX idx_active (is_active) WHERE is_active = TRUE,
  INDEX idx_device_fingerprint (device_fingerprint)
);
```

#### **inventory_changes_log** (Dedicated inventory tracking)
```sql
CREATE TABLE inventory_changes_log (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  player_id INTEGER NOT NULL REFERENCES players(id),
  
  -- Item info
  item_id INTEGER NOT NULL REFERENCES items(id),
  change_type VARCHAR(50) NOT NULL, -- 'added', 'removed', 'equipped', 'unequipped', 'traded'
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  
  -- Source
  source VARCHAR(100) NOT NULL, -- 'purchase', 'reward', 'trade', 'admin', 'crime', 'business'
  source_id INTEGER, -- ID of the source (crime_id, business_id, etc.)
  
  -- Transaction
  transaction_id UUID, -- group related changes
  
  -- Security
  is_flagged BOOLEAN DEFAULT FALSE,
  
  INDEX idx_player_id (player_id),
  INDEX idx_item_id (item_id),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_transaction_id (transaction_id)
);
```

#### **economy_transactions** (Money flow tracking)
```sql
CREATE TABLE economy_transactions (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  player_id INTEGER NOT NULL REFERENCES players(id),
  
  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL, -- 'earned', 'spent', 'transfer_sent', 'transfer_received', 'admin_adjustment'
  amount NUMERIC(20, 2) NOT NULL,
  balance_before NUMERIC(20, 2) NOT NULL,
  balance_after NUMERIC(20, 2) NOT NULL,
  
  -- Source/destination
  source VARCHAR(100) NOT NULL, -- 'crime', 'business', 'store', 'trade', 'daily_reward', 'admin'
  source_id INTEGER,
  counterparty_id INTEGER REFERENCES players(id), -- for transfers
  
  -- Metadata
  description TEXT,
  metadata JSONB,
  
  -- Security
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason VARCHAR(255),
  
  INDEX idx_player_id (player_id),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_flagged (is_flagged) WHERE is_flagged = TRUE
);
```

---

### 2.2 Enhanced Player Table

```sql
-- Add to existing players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS banned_by INTEGER REFERENCES admin_users(id);
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_playtime_seconds BIGINT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS account_created_ip INET;
ALTER TABLE players ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(255);
```

---

## 3. UI Design & Wireframes

### 3.1 Layout System

#### **Master Layout**
```
┌──────────────────────────────────────────────────────────────────┐
│  🎮 THE LIFE ADMIN          [Search...]  👤 Admin User  🔔 (5)  │ ← Top Bar
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────┐  ┌────────────────────────────────────────────┐│
│  │             │  │                                            ││
│  │  Sidebar    │  │          Main Content Area                ││
│  │  Navigation │  │                                            ││
│  │             │  │  - Tables                                  ││
│  │  Dashboard  │  │  - Forms                                   ││
│  │  Game       │  │  - Charts                                  ││
│  │  Content ▼  │  │  - Detail Views                            ││
│  │    Crimes   │  │                                            ││
│  │    Business │  │                                            ││
│  │    Items    │  │                                            ││
│  │    Economy  │  │                                            ││
│  │  Players    │  │                                            ││
│  │  Security ▼ │  │                                            ││
│  │    Alerts   │  │                                            ││
│  │    Logs     │  │                                            ││
│  │    Rules    │  │                                            ││
│  │  Settings   │  │                                            ││
│  │             │  │                                            ││
│  └─────────────┘  └────────────────────────────────────────────┘│
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**Measurements:**
- Sidebar: 240px fixed width
- Top bar: 64px height
- Main content: Fluid width with max-width: 1920px, centered
- Padding: 24px around main content

---

### 3.2 Component Design Patterns

#### **Table Component** (Used throughout)
```
┌────────────────────────────────────────────────────────────────────┐
│  📋 Crime Management                              [+ Add Crime]    │
├────────────────────────────────────────────────────────────────────┤
│  🔍 Search...          [Filter: All ▼]  [Status: All ▼]  Export ↓ │
├────────────────────────────────────────────────────────────────────┤
│  ☑ │ ID │ Name          │ Category │ Reward  │ Success │ Status   │
├────────────────────────────────────────────────────────────────────┤
│  ☐ │ 1  │ Pickpocket    │ Theft    │ $500    │ 85%     │ ✅ Active│
│  ☐ │ 2  │ Car Theft     │ Theft    │ $5,000  │ 60%     │ ✅ Active│
│  ☐ │ 3  │ Bank Heist    │ High     │ $50,000 │ 25%     │ ⚠️ Test  │
│  ☐ │ 4  │ Drug Deal     │ Drugs    │ $2,000  │ 70%     │ ❌ Disabled│
│                                                                     │
│  [Bulk Actions ▼]                          Showing 1-4 of 87 →    │
└────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Checkbox selection (individual + select all)
- Inline editing: Click any cell to edit
- Sortable columns: Click header to sort
- Hover row: Highlight + show quick actions (Edit, Duplicate, Delete)
- Pagination: 25/50/100 per page
- Sticky header on scroll

---

#### **Inline Edit Behavior**
- Click cell → Input field appears
- Auto-save on blur or Enter key
- Loading indicator during save
- Success/error toast notification
- Undo button (3s timeout)

---

#### **Alert Card Component**
```
┌──────────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL                                      2 min ago    │
│                                                               │
│ Abnormal Money Gain Detected                                 │
│ Player: DarkKnight99 (#12345)                                │
│                                                               │
│ ╔═══════════════════════════════════════════════════════════╗│
│ ║  Gained: $50,000,000                                     ║│
│ ║  Time Window: 30 seconds                                 ║│
│ ║  Expected Maximum: $50,000                               ║│
│ ║  Deviation: 1000x normal                                 ║│
│ ║  Confidence: 99%                                         ║│
│ ╚═══════════════════════════════════════════════════════════╝│
│                                                               │
│ Evidence:                                                     │
│ • Repeated rapid API calls to /api/complete-crime            │
│ • Same crime ID (#45) executed 200 times                     │
│ • Client-side timing bypass detected                         │
│                                                               │
│ [🔍 View Player Details]  [⚠️ Suspend]  [🚫 Ban]  [✓ Dismiss]│
└──────────────────────────────────────────────────────────────┘
```

**Color Coding:**
- 🟢 Low: #10b981 (green)
- 🟡 Medium: #f59e0b (amber)
- 🟠 High: #f97316 (orange)
- 🔴 Critical: #ef4444 (red)

---

#### **Player Detail Page Layout**
```
┌────────────────────────────────────────────────────────────────┐
│  ← Back to Players                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  👤 DarkKnight99 (#12345)                     🔴 HIGH RISK││
│  │  Level 47 • Last seen: 5 min ago                          ││
│  │  Email: player@example.com • Joined: Jan 15, 2025         ││
│  │                                                            ││
│  │  💰 Cash: $12,450,000  🏦 Bank: $5,000,000  ⭐ XP: 89,450 ││
│  │                                                            ││
│  │  [✉️ Message] [💸 Adjust Money] [⚠️ Suspend] [🚫 Ban]     ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Overview │ Stats │ Inventory │ Economy │ Timeline │ Security││
│  ├─────────────────────────────────────────────────────────┤  │
│  │                                                          │  │
│  │  [Content based on active tab]                          │  │
│  │                                                          │  │
│  │  Overview: Quick stats, recent activity                 │  │
│  │  Stats: Level progression graphs, combat stats          │  │
│  │  Inventory: Items list with filters                     │  │
│  │  Economy: Transaction history, money flow charts        │  │
│  │  Timeline: Chronological action log with replay         │  │
│  │  Security: Login history, alerts, investigation tools   │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

#### **Investigation Interface**
```
┌──────────────────────────────────────────────────────────────────┐
│  🔍 Investigating: DarkKnight99                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Alert: Abnormal Money Gain • Confidence: 99%                    │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  Timeline Replay                                             ││
│  │  ════════════════════════════════●══════════════════        ││
│  │  Jan 15, 14:23:45                                            ││
│  │                                                               ││
│  │  [◀◀] [◀] [▶] [▶▶]  Speed: 1x ▼                             ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │  Expected Values    │  │  Actual Values                   │  │
│  ├─────────────────────┤  ├──────────────────────────────────┤  │
│  │  Money: $50,000     │  │  Money: $50,000,000 ⚠️          │  │
│  │  XP: 1,200          │  │  XP: 1,200 ✓                    │  │
│  │  Crimes: 5-10       │  │  Crimes: 200 ⚠️                 │  │
│  │  Time: 5 min        │  │  Time: 30 sec ⚠️                │  │
│  └─────────────────────┘  └──────────────────────────────────┘  │
│                                                                    │
│  Pattern Analysis:                                                │
│  • Same crime (#45 - "Bank Heist") executed 200 times            │
│  • Average interval: 0.15 seconds (impossible for human)         │
│  • Success rate: 100% (expected: 25%)                            │
│  • No energy depletion recorded                                  │
│                                                                    │
│  Evidence Score: 95/100 (Highly Likely Cheating)                 │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  📝 Investigation Notes                                      ││
│  │  ┌────────────────────────────────────────────────────────┐ ││
│  │  │ [Admin] Added note:                                     │ ││
│  │  │ Player likely using auto-clicker or API exploit.       │ ││
│  │  │ Recommend immediate suspension pending review.         │ ││
│  │  └────────────────────────────────────────────────────────┘ ││
│  │  [Add Note]                                                  ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                    │
│  Actions:                                                          │
│  [🔄 Rollback to 14:23:00]  [💸 Adjust Values]  [⚠️ Suspend]     │
│  [🚫 Permanent Ban]  [✓ Mark False Positive]  [📄 Export Report] │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 Color System & Visual Hierarchy

#### **Color Palette**
```css
/* Brand */
--primary: #d4af37; /* Gold */
--primary-dark: #b8941e;

/* Status */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* Risk Levels */
--risk-safe: #10b981;
--risk-low: #84cc16;
--risk-medium: #f59e0b;
--risk-high: #f97316;
--risk-critical: #ef4444;

/* Backgrounds */
--bg-primary: #0f0f0f;
--bg-secondary: #1a1a1a;
--bg-tertiary: #2a2a2a;

/* Borders */
--border-light: rgba(255, 255, 255, 0.1);
--border-medium: rgba(255, 255, 255, 0.2);
--border-strong: rgba(255, 255, 255, 0.3);

/* Text */
--text-primary: #ffffff;
--text-secondary: #a0a0a0;
--text-tertiary: #666666;
```

---

## 4. Anti-Cheat Logic

### 4.1 Detection Rules

#### **Rule 1: Abnormal Money Gain**
```javascript
{
  rule_name: "abnormal_money_gain",
  rule_type: "threshold",
  detection_config: {
    field: "money_gained",
    time_windows: [
      { duration_seconds: 60, max_gain: 100000 },
      { duration_seconds: 300, max_gain: 500000 },
      { duration_seconds: 3600, max_gain: 2000000 }
    ],
    comparison: "greater_than"
  },
  severity: "high",
  alert_threshold: 1,
  auto_action: "suspend"
}
```

**Logic:**
1. Track all money-adding transactions for each player
2. Sum gains in rolling time windows (1 min, 5 min, 1 hour)
3. Compare against maximum expected gains (based on highest-paying crimes/businesses)
4. If exceeded → trigger alert
5. Consider player level (higher level = higher threshold)

**False Positive Prevention:**
- Whitelist: Daily rewards, admin gifts, legitimate event rewards
- Grace period for new features release
- Manual review required before permanent ban

---

#### **Rule 2: Rapid Action Execution (Bot Detection)**
```javascript
{
  rule_name: "rapid_action_execution",
  rule_type: "rate_limit",
  detection_config: {
    actions_monitored: ["commit_crime", "use_item", "craft_item"],
    max_count: 10,
    window_seconds: 60,
    min_interval_ms: 500 // minimum time between actions
  },
  severity: "high",
  alert_threshold: 2,
  auto_action: "flag"
}
```

**Logic:**
1. Timestamp every game action per player
2. Calculate interval between consecutive actions
3. If interval < 500ms consistently → likely bot/macro
4. If same action > 10 times in 60 seconds → flag
5. Human players have natural variance in timing

**Detection Thresholds:**
- **Bot Certainty**: 100% actions at < 300ms interval
- **Macro Likely**: 90%+ actions at fixed interval (±50ms)
- **Fast Human**: Variable intervals, 500-1000ms average

---

#### **Rule 3: Impossible Success Rates**
```javascript
{
  rule_name: "impossible_success_rate",
  rule_type: "pattern",
  detection_config: {
    action: "commit_crime",
    expected_success_rate_field: "crime.base_success_rate",
    sample_size_min: 20,
    deviation_threshold: 2.5, // standard deviations
    confidence_level: 0.95
  },
  severity: "critical",
  alert_threshold: 1,
  auto_action: "suspend"
}
```

**Logic:**
1. Track crime success/failure per player per crime type
2. Calculate actual success rate after minimum 20 attempts
3. Compare to expected success rate (set in crime config)
4. Statistical test: If actual rate is > 2.5σ above expected → impossible
5. Example: Crime has 25% success rate, player has 100% success over 50 attempts

**Math:**
```
Expected: p = 0.25
Sample size: n = 50
Expected successes: np = 12.5
Standard deviation: σ = √(np(1-p)) = 3.06
Player's successes: 50
Z-score: (50 - 12.5) / 3.06 = 12.25 (!!!)
If Z > 2.5: IMPOSSIBLE (p < 0.01)
```

---

#### **Rule 4: Inventory Duplication**
```javascript
{
  rule_name: "inventory_duplication",
  rule_type: "comparison",
  detection_config: {
    monitor: "inventory_changes",
    check_for: "identical_additions",
    time_window_seconds: 10,
    min_occurrences: 2,
    check_transaction_ids: true
  },
  severity: "critical",
  alert_threshold: 1,
  auto_action: "ban"
}
```

**Logic:**
1. Monitor all `inventory_changes_log` entries
2. Detect multiple additions of the same item within 10 seconds
3. Verify: Are these legitimate (e.g., bulk purchase)?
  - Check transaction IDs: Should be different
  - Check source: Should have valid purchase/reward record
4. If same item added 2+ times with NO valid source → duplication exploit
5. Immediate ban + rollback inventory

**Example Exploit Detection:**
```
Player adds 100x "Diamond Ring" (value: $50,000 each)
Transaction ID: NULL (red flag)
Source: "crime_reward" but no matching crime completion log
Time: All additions within 0.5 seconds
→ DUPLICATION DETECTED → Ban + Remove items
```

---

#### **Rule 5: API Abuse / Tampered Requests**
```javascript
{
  rule_name: "api_abuse_detection",
  rule_type: "pattern",
  detection_config: {
    monitor_endpoints: [
      "/api/complete-crime",
      "/api/purchase-item",
      "/api/upgrade-business"
    ],
    indicators: [
      { type: "missing_client_token", weight: 40 },
      { type: "tampered_payload", weight: 50 },
      { type: "excessive_requests", max_per_minute: 30, weight: 30 },
      { type: "invalid_sequence", weight: 60 },
      { type: "manipulated_timestamps", weight: 70 }
    ],
    total_weight_threshold: 100,
    window_seconds: 300
  },
  severity: "critical",
  alert_threshold: 1,
  auto_action: "ban"
}
```

**Logic:**
1. All API requests must include:
  - Valid JWT session token
  - Request signature (HMAC of payload + timestamp + secret)
  - Client-side calculated values match server expectations

2. **Tampered Payload Detection:**
  - Client sends: "crime_id: 5, expected_reward: 1000000"
  - Server knows: Crime #5 reward is $5,000
  - Mismatch → Tampered → Reject + Flag

3. **Invalid Sequence Detection:**
  - Client tries to commit crime before previous crime cooldown ends
  - Client tries to spend money they don't have
  - Client claims success on crime that wasn't initiated
  
4. **Request Signature Verification:**
```javascript
// Server-side
const expectedSignature = hmac_sha256(
  JSON.stringify(payload) + timestamp + server_secret
);
if (receivedSignature !== expectedSignature) {
  logSecurityEvent('tampered_request', player_id);
  return 403; // Reject
}
```

---

#### **Rule 6: Multi-Account Detection**
```javascript
{
  rule_name: "multi_account_detection",
  rule_type: "pattern",
  detection_config: {
    indicators: [
      { type: "same_device_fingerprint", weight: 60 },
      { type: "same_ip_address", weight: 40 },
      { type: "money_transfer_between_accounts", weight: 80 },
      { type: "same_email_pattern", weight: 50 },
      { type: "login_time_correlation", weight: 30 }
    ],
    total_weight_threshold: 120,
    max_accounts_per_device: 3
  },
  severity: "medium",
  alert_threshold: 1,
  auto_action: "flag"
}
```

**Logic:**
1. Track device fingerprints (browser canvas, WebGL, fonts, screen resolution hash)
2. Group accounts with same fingerprint
3. Allow up to 3 accounts per device (family sharing)
4. If accounts transfer money between each other → farming flag
5. If > 5 accounts on same device/IP → ban farm

---

### 4.2 Backend Implementation Strategy

#### **Real-Time Monitoring Service**
```javascript
// Pseudocode for anti-cheat service

class AntiCheatMonitor {
  async logAction(playerId, actionType, actionData) {
    // 1. Insert into game_logs
    const logEntry = await db.game_logs.insert({
      player_id: playerId,
      action_type: actionType,
      action_category: this.categorizeAction(actionType),
      timestamp: new Date(),
      old_value: actionData.before,
      new_value: actionData.after,
      value_diff: actionData.after - actionData.before,
      metadata: actionData.metadata,
      ip_address: actionData.ip,
      device_fingerprint: actionData.fingerprint
    });
    
    // 2. Run detection rules asynchronously
    this.checkRules(playerId, actionType, logEntry);
    
    // 3. Update player risk score
    this.updateRiskScore(playerId);
    
    return logEntry;
  }
  
  async checkRules(playerId, actionType, logEntry) {
    // Get all active rules that apply to this action
    const rules = await db.anticheat_rules
      .where({ is_active: true })
      .whereRaw(`detection_config->>'action' = ? OR detection_config IS NULL`, actionType);
    
    for (const rule of rules) {
      const violation = await this.evaluateRule(rule, playerId, logEntry);
      
      if (violation) {
        await this.handleViolation(rule, playerId, violation);
      }
    }
  }
  
  async evaluateRule(rule, playerId, logEntry) {
    switch(rule.rule_type) {
      case 'rate_limit':
        return this.checkRateLimit(rule, playerId, logEntry);
      
      case 'threshold':
        return this.checkThreshold(rule, playerId, logEntry);
      
      case 'pattern':
        return this.checkPattern(rule, playerId, logEntry);
      
      case 'comparison':
        return this.checkComparison(rule, playerId, logEntry);
    }
  }
  
  async checkRateLimit(rule, playerId, logEntry) {
    const config = rule.detection_config;
    const timeWindow = new Date(Date.now() - config.window_seconds * 1000);
    
    // Count actions in time window
    const actionCount = await db.game_logs
      .where({
        player_id: playerId,
        action_type: config.action
      })
      .where('timestamp', '>', timeWindow)
      .count();
    
    if (actionCount > config.max_count) {
      return {
        violated: true,
        evidence: {
          count: actionCount,
          max_allowed: config.max_count,
          window_seconds: config.window_seconds
        }
      };
    }
    
    // Check minimum interval
    if (config.min_interval_ms) {
      const recentActions = await db.game_logs
        .where({ player_id: playerId, action_type: config.action })
        .orderBy('timestamp', 'desc')
        .limit(10);
      
      const intervals = [];
      for (let i = 0; i < recentActions.length - 1; i++) {
        const interval = recentActions[i].timestamp - recentActions[i+1].timestamp;
        intervals.push(interval);
      }
      
      const avgInterval = intervals.reduce((a,b) => a+b, 0) / intervals.length;
      
      if (avgInterval < config.min_interval_ms) {
        return {
          violated: true,
          evidence: {
            avg_interval_ms: avgInterval,
            min_required: config.min_interval_ms,
            bot_probability: 0.95
          }
        };
      }
    }
    
    return null;
  }
  
  async checkThreshold(rule, playerId, logEntry) {
    const config = rule.detection_config;
    
    for (const window of config.time_windows) {
      const timeStart = new Date(Date.now() - window.duration_seconds * 1000);
      
      // Sum all value changes in window
      const totalGain = await db.economy_transactions
        .where({
          player_id: playerId,
          transaction_type: 'earned'
        })
        .where('timestamp', '>', timeStart)
        .sum('amount');
      
      if (totalGain > window.max_gain) {
        return {
          violated: true,
          evidence: {
            actual_gain: totalGain,
            max_allowed: window.max_gain,
            window_seconds: window.duration_seconds,
            deviation_multiplier: totalGain / window.max_gain
          }
        };
      }
    }
    
    return null;
  }
  
  async handleViolation(rule, playerId, violation) {
    // Create alert
    const alert = await db.security_alerts.insert({
      player_id: playerId,
      alert_type: rule.rule_name,
      severity: rule.severity,
      title: this.generateAlertTitle(rule, violation),
      description: this.generateAlertDescription(rule, violation),
      evidence: violation.evidence,
      detection_rule_id: rule.id,
      confidence_score: violation.evidence.bot_probability || 0.85,
      status: 'new'
    });
    
    // Take automatic action
    if (rule.auto_action !== 'none') {
      await this.executeAutoAction(rule.auto_action, playerId, alert.id);
    }
    
    // Update trigger count
    await db.anticheat_rules
      .where({ id: rule.id })
      .increment('trigger_count', 1);
    
    // Send notification to admins
    await this.notifyAdmins(alert);
  }
  
  async executeAutoAction(action, playerId, alertId) {
    switch(action) {
      case 'flag':
        await db.players.update({ player_id: playerId }, { is_flagged: true });
        await db.player_risk_scores.increment({ player_id: playerId }, 'flagged_action_count', 1);
        break;
      
      case 'suspend':
        await db.players.update({ 
          player_id: playerId 
        }, { 
          is_banned: true,
          ban_reason: `Automatic suspension: Alert #${alertId}`,
          banned_until: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });
        break;
      
      case 'ban':
        await db.players.update({ 
          player_id: playerId 
        }, { 
          is_banned: true,
          ban_reason: `Automatic permanent ban: Alert #${alertId}`,
          banned_until: null // Permanent
        });
        break;
    }
    
    // Log admin action (automated)
    await db.admin_actions.insert({
      admin_user_id: null, // System action
      action_type: `auto_${action}`,
      target_type: 'player',
      target_id: playerId,
      changes: { alert_id: alertId, action: action },
      reason: `Automatic action triggered by rule violation`
    });
  }
  
  async updateRiskScore(playerId) {
    const riskData = await db.player_risk_scores.findOne({ player_id: playerId });
    
    // Calculate new risk score (0-100)
    let score = 0;
    score += riskData.alert_count * 10;
    score += riskData.flagged_action_count * 5;
    score += riskData.ban_count * 30;
    score += riskData.suspicious_money_gains * 8;
    score += riskData.suspicious_inventory_changes * 6;
    score += riskData.rapid_action_violations * 7;
    score += riskData.impossible_success_rates * 15;
    
    // Cap at 100
    score = Math.min(score, 100);
    
    // Determine risk level
    let risk_level;
    if (score < 10) risk_level = 'safe';
    else if (score < 30) risk_level = 'low';
    else if (score < 60) risk_level = 'medium';
    else if (score < 85) risk_level = 'high';
    else risk_level = 'critical';
    
    await db.player_risk_scores.update({
      player_id: playerId
    }, {
      risk_score: score,
      risk_level: risk_level,
      last_updated: new Date()
    });
    
    await db.players.update({
      id: playerId
    }, {
      risk_score: score
    });
  }
}
```

---

### 4.3 Client-Side Security Measures

#### **Request Signing**
```javascript
// client/lib/secureRequest.js

async function secureApiCall(endpoint, data) {
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();
  
  const payload = {
    ...data,
    timestamp,
    nonce
  };
  
  // Sign the request
  const signature = await generateSignature(payload);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'Authorization': `Bearer ${getSessionToken()}`
    },
    body: JSON.stringify(payload)
  });
  
  return response.json();
}

async function generateSignature(payload) {
  const message = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

#### **Server-Side Verification**
```javascript
// server/middleware/verifyRequest.js

async function verifyRequest(req, res, next) {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  const nonce = req.headers['x-nonce'];
  
  // Check timestamp (prevent replay attacks)
  const now = Date.now();
  if (Math.abs(now - timestamp) > 5000) { // 5 second window
    return res.status(403).json({ error: 'Request expired' });
  }
  
  // Check nonce (prevent duplicate requests)
  const nonceExists = await redis.get(`nonce:${nonce}`);
  if (nonceExists) {
    logSecurityEvent('duplicate_nonce', req.userId);
    return res.status(403).json({ error: 'Duplicate request' });
  }
  await redis.set(`nonce:${nonce}`, '1', 'EX', 10); // Store for 10 seconds
  
  // Verify signature
  const expectedSignature = await generateServerSignature(req.body, timestamp);
  if (signature !== expectedSignature) {
    logSecurityEvent('invalid_signature', req.userId);
    return res.status(403).json({ error: 'Invalid signature' });
  }
  
  next();
}
```

#### **Value Validation**
```javascript
// server/controllers/crimeController.js

async function completeCrime(req, res) {
  const { crimeId, clientTimestamp } = req.body;
  const playerId = req.userId;
  
  // 1. Verify crime was actually started
  const ongoingCrime = await db.ongoing_crimes.findOne({
    player_id: playerId,
    crime_id: crimeId,
    status: 'in_progress'
  });
  
  if (!ongoingCrime) {
    logSecurityEvent('crime_not_started', playerId);
    return res.status(400).json({ error: 'Crime not started' });
  }
  
  // 2. Verify cooldown period elapsed
  const crimeConfig = await db.crimes.findOne({ id: crimeId });
  const timeSinceStart = Date.now() - ongoingCrime.started_at.getTime();
  
  if (timeSinceStart < crimeConfig.cooldown_seconds * 1000) {
    logSecurityEvent('crime_cooldown_bypass', playerId);
    return res.status(400).json({ error: 'Cooldown not elapsed' });
  }
  
  // 3. Verify player has required resources
  const player = await db.players.findOne({ id: playerId });
  if (player.energy < crimeConfig.energy_cost) {
    logSecurityEvent('insufficient_energy_bypass', playerId);
    return res.status(400).json({ error: 'Insufficient energy' });
  }
  
  // 4. Server-side success calculation (NEVER trust client)
  const successRoll = Math.random() * 100;
  const success = successRoll <= crimeConfig.base_success_rate;
  
  // 5. Calculate rewards (server-side only)
  let reward = 0;
  if (success) {
    reward = calculateCrimeReward(crimeConfig, player);
  }
  
  // 6. Update player state atomically
  await db.transaction(async (trx) => {
    // Deduct energy
    await trx('players')
      .where({ id: playerId })
      .decrement('energy', crimeConfig.energy_cost);
    
    // Add money if successful
    if (success) {
      await trx('players')
        .where({ id: playerId })
        .increment('cash', reward)
        .increment('xp', crimeConfig.xp_reward);
      
      // Log transaction
      await trx('economy_transactions').insert({
        player_id: playerId,
        transaction_type: 'earned',
        amount: reward,
        source: 'crime',
        source_id: crimeId,
        balance_before: player.cash,
        balance_after: player.cash + reward
      });
    }
    
    // Complete ongoing crime
    await trx('ongoing_crimes')
      .where({ id: ongoingCrime.id })
      .update({ status: 'completed', completed_at: new Date() });
    
    // Log action
    await antiCheat.logAction(playerId, 'commit_crime', {
      before: { cash: player.cash, xp: player.xp },
      after: { cash: player.cash + reward, xp: player.xp + crimeConfig.xp_reward },
      metadata: { crime_id: crimeId, success, reward }
    });
  });
  
  return res.json({ success, reward });
}
```

---

## 5. Example Data

### 5.1 Example Log Entries

#### **Example 1: Normal Crime Completion**
```json
{
  "id": 1024853,
  "timestamp": "2026-02-03T14:23:45.123Z",
  "player_id": 12345,
  "action_type": "commit_crime",
  "action_category": "crime",
  "description": "Completed crime: Pickpocket",
  "old_value": {
    "cash": 45000,
    "xp": 8900,
    "energy": 100
  },
  "new_value": {
    "cash": 45500,
    "xp": 8950,
    "energy": 90
  },
  "value_diff": 500,
  "metadata": {
    "crime_id": 1,
    "crime_name": "Pickpocket",
    "success": true,
    "reward": 500,
    "xp_gained": 50,
    "energy_cost": 10
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "device_fingerprint": "abc123def456",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_flagged": false,
  "flag_reason": null,
  "flag_severity": null
}
```

#### **Example 2: Suspicious Money Gain (Flagged)**
```json
{
  "id": 1024854,
  "timestamp": "2026-02-03T14:25:12.456Z",
  "player_id": 67890,
  "action_type": "commit_crime",
  "action_category": "crime",
  "description": "Completed crime: Bank Heist (200th in 30 seconds)",
  "old_value": {
    "cash": 49500000,
    "xp": 15400
  },
  "new_value": {
    "cash": 50000000,
    "xp": 15500
  },
  "value_diff": 500000,
  "metadata": {
    "crime_id": 45,
    "crime_name": "Bank Heist",
    "success": true,
    "reward": 500000,
    "expected_success_rate": 0.25,
    "actual_recent_success_rate": 1.0,
    "action_interval_ms": 150
  },
  "ip_address": "203.0.113.42",
  "user_agent": "Mozilla/5.0...",
  "device_fingerprint": "xyz789ghi012",
  "session_id": "660f9511-f39c-52e5-b827-557766551111",
  "is_flagged": true,
  "flag_reason": "Rapid action execution detected; Impossible success rate; Abnormal money gain",
  "flag_severity": "critical"
}
```

#### **Example 3: Item Purchase**
```json
{
  "id": 1024855,
  "timestamp": "2026-02-03T14:26:30.789Z",
  "player_id": 12345,
  "action_type": "purchase_item",
  "action_category": "economy",
  "description": "Purchased item: Diamond Ring (x5)",
  "old_value": {
    "cash": 45500,
    "inventory_item_65_quantity": 0
  },
  "new_value": {
    "cash": 20500,
    "inventory_item_65_quantity": 5
  },
  "value_diff": -25000,
  "metadata": {
    "item_id": 65,
    "item_name": "Diamond Ring",
    "quantity": 5,
    "unit_price": 5000,
    "total_cost": 25000
  },
  "ip_address": "192.168.1.100",
  "device_fingerprint": "abc123def456",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "is_flagged": false
}
```

#### **Example 4: Admin Action**
```json
{
  "id": 1024856,
  "timestamp": "2026-02-03T14:30:00.000Z",
  "player_id": 67890,
  "action_type": "admin_ban",
  "action_category": "admin",
  "description": "Player banned by admin",
  "old_value": {
    "is_banned": false,
    "ban_reason": null
  },
  "new_value": {
    "is_banned": true,
    "ban_reason": "Automated cheat detection: Alert #5423"
  },
  "metadata": {
    "banned_by_admin_id": 1,
    "banned_by_admin_name": "AdminUser",
    "alert_id": 5423,
    "ban_duration": "permanent"
  },
  "ip_address": "10.0.0.5",
  "is_flagged": false
}
```

---

### 5.2 Example Alert Scenarios

#### **Alert Scenario 1: Bot Detection**
```json
{
  "id": 5423,
  "created_at": "2026-02-03T14:25:15.000Z",
  "player_id": 67890,
  "alert_type": "rapid_action_execution",
  "severity": "critical",
  "title": "Bot/Macro Activity Detected",
  "description": "Player executed 200 crimes in 30 seconds with consistent 150ms intervals",
  "evidence": {
    "action_count": 200,
    "time_window_seconds": 30,
    "average_interval_ms": 150,
    "interval_variance_ms": 5,
    "bot_probability": 0.99,
    "affected_actions": [
      {
        "log_id": 1024854,
        "timestamp": "2026-02-03T14:25:12.456Z",
        "action": "commit_crime",
        "crime_id": 45,
        "interval_from_previous": 148
      }
    ]
  },
  "related_log_ids": [1024800, 1024801, 1024802, "...", 1024999],
  "detection_rule_id": 2,
  "confidence_score": 0.99,
  "status": "new",
  "auto_action_taken": "suspended"
}
```

#### **Alert Scenario 2: Inventory Duplication**
```json
{
  "id": 5424,
  "created_at": "2026-02-03T15:10:22.000Z",
  "player_id": 45678,
  "alert_type": "inventory_duplication",
  "severity": "critical",
  "title": "Item Duplication Exploit Detected",
  "description": "Player gained 100x 'Diamond Ring' without valid transaction source",
  "evidence": {
    "item_id": 65,
    "item_name": "Diamond Ring",
    "quantity_added": 100,
    "time_window_seconds": 0.5,
    "transaction_ids": null,
    "valid_source_found": false,
    "total_value": 500000,
    "inventory_logs": [
      {
        "timestamp": "2026-02-03T15:10:22.100Z",
        "quantity_change": 50,
        "source": "unknown"
      },
      {
        "timestamp": "2026-02-03T15:10:22.200Z",
        "quantity_change": 50,
        "source": "unknown"
      }
    ]
  },
  "related_log_ids": [1034567, 1034568],
  "detection_rule_id": 4,
  "confidence_score": 1.0,
  "status": "new",
  "auto_action_taken": "banned"
}
```

#### **Alert Scenario 3: Impossible Success Rate**
```json
{
  "id": 5425,
  "created_at": "2026-02-03T16:45:00.000Z",
  "player_id": 23456,
  "alert_type": "impossible_success_rate",
  "severity": "high",
  "title": "Statistically Impossible Success Rate",
  "description": "Player achieved 100% success rate on 'Bank Heist' (expected: 25%) over 50 attempts",
  "evidence": {
    "crime_id": 45,
    "crime_name": "Bank Heist",
    "expected_success_rate": 0.25,
    "actual_success_rate": 1.0,
    "sample_size": 50,
    "expected_successes": 12.5,
    "actual_successes": 50,
    "z_score": 12.25,
    "p_value": 0.0000001,
    "statistical_significance": "extremely_significant"
  },
  "detection_rule_id": 3,
  "confidence_score": 0.99,
  "status": "investigating",
  "assigned_to": 1,
  "auto_action_taken": "suspended"
}
```

#### **Alert Scenario 4: Multi-Account Farming**
```json
{
  "id": 5426,
  "created_at": "2026-02-03T17:20:00.000Z",
  "player_id": 78901,
  "alert_type": "multi_account_detection",
  "severity": "medium",
  "title": "Multiple Accounts with Money Transfer",
  "description": "7 accounts detected on same device with money transfers between them",
  "evidence": {
    "device_fingerprint": "mno345pqr678",
    "ip_address": "198.51.100.42",
    "associated_accounts": [78901, 78902, 78903, 78904, 78905, 78906, 78907],
    "money_transfers": [
      {
        "from": 78902,
        "to": 78901,
        "amount": 50000,
        "timestamp": "2026-02-03T17:15:00.000Z"
      },
      {
        "from": 78903,
        "to": 78901,
        "amount": 75000,
        "timestamp": "2026-02-03T17:18:00.000Z"
      }
    ],
    "total_farmed_amount": 125000,
    "detection_score_weight": 180
  },
  "detection_rule_id": 6,
  "confidence_score": 0.85,
  "status": "new",
  "auto_action_taken": "flagged"
}
```

---

## 6. Security Best Practices

### 6.1 Backend Security

#### **Never Trust the Client**
- **Rule**: ALL game logic calculations must be server-side
- Client can only send: "I want to do X"
- Server validates: "Can they? Should they? What's the result?"

```javascript
// ❌ WRONG - Client calculates
// Client: "I did crime #5, I earned $1,000,000"
// Server: "OK, here you go"

// ✅ RIGHT - Server calculates
// Client: "I want to complete crime #5"
// Server: "Let me check... Yes, valid. You earned $5,000 (I calculated)"
```

#### **Rate Limiting**
- Implement at multiple levels:
  1. **Web Server**: nginx/Cloudflare rate limiting (100 req/min per IP)
  2. **API Gateway**: 30 req/min per authenticated user
  3. **Action-Specific**: 10 crimes/min, 5 purchases/min
  
```javascript
// Redis-based rate limiter
async function checkRateLimit(userId, action, maxCount, windowSeconds) {
  const key = `ratelimit:${userId}:${action}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  
  if (count > maxCount) {
    throw new Error('Rate limit exceeded');
  }
}
```

#### **Database Security**
- Use parameterized queries (prevent SQL injection)
- Row-level security (RLS) in Supabase
- Audit logs for all admin actions
- Encrypted sensitive data (emails, IPs)

```sql
-- Supabase RLS example
CREATE POLICY "Users can only read their own data"
  ON players FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can update"
  ON players FOR UPDATE
  USING (auth.jwt()->>'role' = 'admin');
```

#### **API Endpoint Protection**
```javascript
// Every critical endpoint should have:
app.post('/api/complete-crime', [
  authenticateJWT,        // Verify user is logged in
  verifyRequestSignature, // Verify request wasn't tampered
  checkRateLimit,         // Prevent spam
  validateInput,          // Sanitize inputs
  antiCheatLog            // Log for monitoring
], crimeController.complete);
```

---

### 6.2 Frontend Security

#### **Obfuscation & Anti-Tampering**
- Minify and obfuscate JavaScript
- Use webpack/vite code splitting
- Implement integrity checks

```javascript
// Detect DevTools open
(function() {
  const devtools = /./;
  devtools.toString = function() {
    this.opened = true;
  };
  
  setInterval(() => {
    if (devtools.opened) {
      // DevTools detected - log security event
      fetch('/api/security-event', {
        method: 'POST',
        body: JSON.stringify({ type: 'devtools_detected' })
      });
      devtools.opened = false;
    }
  }, 1000);
})();
```

#### **Data Validation**
```javascript
// Validate all user inputs client-side AND server-side
function validateCrimeRequest(crimeId) {
  // Client-side validation (UX)
  if (!crimeId || crimeId < 1) {
    showError('Invalid crime');
    return false;
  }
  
  // Server will validate again (security)
  return true;
}
```

#### **Token Management**
- Store JWT in httpOnly cookies (not localStorage)
- Short-lived access tokens (15 min)
- Refresh tokens for session extension
- Logout on suspicious activity

---

### 6.3 Monitoring & Alerting

#### **Real-Time Monitoring Stack**
```
Client → API Gateway → Backend → Database
                |
                ├→ Log Service (game_logs)
                ├→ Anti-Cheat Service (rules engine)
                └→ Alert Service (notifications)
```

#### **Alert Channels**
- **Discord Webhook**: Real-time critical alerts
- **Email**: Daily/weekly summaries
- **SMS**: Critical exploits detected
- **Admin Dashboard**: Live feed

```javascript
// Discord webhook example
async function notifyAdmins(alert) {
  if (alert.severity === 'critical') {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🚨 CRITICAL ALERT',
          description: alert.title,
          color: 0xff0000,
          fields: [
            { name: 'Player', value: `#${alert.player_id}`, inline: true },
            { name: 'Type', value: alert.alert_type, inline: true },
            { name: 'Confidence', value: `${alert.confidence_score * 100}%`, inline: true },
            { name: 'Details', value: alert.description }
          ],
          timestamp: new Date().toISOString()
        }]
      })
    });
  }
}
```

---

### 6.4 Incident Response Plan

#### **When Exploit is Discovered**

**1. Immediate Response (0-15 min)**
- Enable maintenance mode
- Freeze economy (disable transactions)
- Capture full database snapshot
- Review recent logs for affected players

**2. Investigation (15-60 min)**
- Identify exploit vector
- Find all players who exploited
- Calculate impact (money gained, items duplicated)
- Preserve evidence (logs, screenshots)

**3. Remediation (1-24 hours)**
- Deploy hotfix to patch exploit
- Rollback affected player data
- Ban confirmed exploiters
- Communicate with community (transparency)

**4. Post-Mortem (24-72 hours)**
- Document exploit details
- Update anti-cheat rules
- Implement additional safeguards
- Compensate legitimate players if affected

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Set up database schema (all tables)
- [ ] Implement basic logging service
- [ ] Create admin authentication system
- [ ] Build admin panel layout (sidebar, header, routing)

### Phase 2: Game Logs (Week 3)
- [ ] Implement comprehensive logging for all actions
- [ ] Create log viewer interface
- [ ] Add search and filter functionality
- [ ] Build log export feature

### Phase 3: Anti-Cheat Rules (Week 4-5)
- [ ] Implement rule engine
- [ ] Create first 6 detection rules
- [ ] Build rule configuration interface
- [ ] Test rules against historical data

### Phase 4: Alerts & Investigation (Week 6)
- [ ] Build real-time alert system
- [ ] Create alert dashboard
- [ ] Implement investigation tools
- [ ] Add manual action capabilities (ban, rollback)

### Phase 5: Admin UI Polish (Week 7)
- [ ] Build all content management tables (crimes, items, businesses)
- [ ] Implement inline editing
- [ ] Add bulk actions
- [ ] Create player management interface

### Phase 6: Testing & Optimization (Week 8)
- [ ] Load testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] Documentation

### Phase 7: Launch (Week 9)
- [ ] Deploy to production
- [ ] Train admin staff
- [ ] Monitor initial period
- [ ] Iterate based on feedback

---

## 8. Technology Stack Recommendations

### Backend
- **Framework**: Node.js + Express OR Python + FastAPI
- **Database**: PostgreSQL (via Supabase or self-hosted)
- **Cache**: Redis (for rate limiting, session management)
- **Queue**: Bull (for async rule processing)
- **Real-time**: Socket.io or Supabase Realtime

### Frontend (Admin Panel)
- **Framework**: React + Vite (matches your existing stack)
- **UI Library**: Shadcn/ui or Material-UI
- **Tables**: TanStack Table (React Table v8)
- **Charts**: Recharts or Chart.js
- **State**: Zustand or Redux Toolkit
- **Forms**: React Hook Form + Zod validation

### Monitoring
- **Logs**: Winston or Pino (structured logging)
- **APM**: Sentry (error tracking)
- **Metrics**: Prometheus + Grafana
- **Uptime**: BetterStack or UptimeRobot

---

## Conclusion

This specification provides a complete blueprint for a professional admin dashboard with robust anti-cheat capabilities. Key principles:

1. **Never trust client data** - All calculations server-side
2. **Log everything** - Comprehensive audit trail
3. **Automate detection** - Rules engine catches 90% of cheats
4. **Enable investigation** - Tools for the remaining 10%
5. **Act quickly** - Automated responses to critical alerts
6. **Stay transparent** - Clear communication with community

This system is designed to scale with your game and provide the security necessary when real money is at stake. Implement in phases, test thoroughly, and iterate based on real-world usage.

---

**Document Version**: 1.0  
**Date**: February 3, 2026  
**Author**: GitHub Copilot  
**Status**: Ready for Implementation
