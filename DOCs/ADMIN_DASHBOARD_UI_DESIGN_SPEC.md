# Admin Dashboard UI Design Specification
## Professional Anti-Cheat & Investigation Tool

**Version:** 1.0  
**Last Updated:** February 3, 2026  
**Design Philosophy:** Internal tool for daily investigation work. Clean, fast, no-nonsense.

---

## 1. GLOBAL LAYOUT

### Primary Structure
```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] The Life Admin              [Search] [Alerts] [Profile]  │ ← Top Bar (60px)
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                       │
│ SIDEBAR  │              MAIN CONTENT AREA                       │
│ (240px)  │              (max-width: 1600px, centered)           │
│          │                                                       │
│          │              [Page Title]                            │
│ Nav      │              [Action Bar]                            │
│ Items    │              [Filters/Tabs]                          │
│          │                                                       │
│          │              [Content Grid]                          │
│          │                                                       │
│          │                                                       │
│          │              [Pagination]                            │
│          │                                                       │
└──────────┴──────────────────────────────────────────────────────┘
```

### Sidebar Structure (240px fixed)
```
┌────────────────────┐
│  [The Life Admin]  │ ← Logo area (60px height)
├────────────────────┤
│                    │
│ 🏠 Dashboard       │ ← Active state: bg + border-left accent
│ 🚨 Alerts      [3] │ ← Badge shows unread count
│ 📊 Logs            │
│ 👥 Players         │
│ 🔍 Investigations  │
│ ⚙️  Rules          │
│                    │
├────────────────────┤ ← Divider
│ 🔧 Settings        │
│ 📖 Documentation   │
└────────────────────┘
```

### Top Bar (60px height)
```
┌──────────────────────────────────────────────────────────────┐
│ [☰ Toggle] The Life Admin    [🔍 Search...]  [🔔2] [👤 JM] │
└──────────────────────────────────────────────────────────────┘
```

**Components:**
- **Left:** Sidebar collapse toggle (mobile), logo/title
- **Center:** Global search (⌘K to open) - searches players, logs, alerts
- **Right:** Notification bell (unread alerts), admin profile dropdown

### Spacing System
```
Base unit: 4px

Spacing scale:
- xs:  4px  (gaps between inline elements)
- sm:  8px  (tight spacing)
- md:  16px (default gap between components)
- lg:  24px (section spacing)
- xl:  32px (major section breaks)
- 2xl: 48px (page section dividers)
- 3xl: 64px (hero spacing)

Page padding: 32px (desktop), 16px (mobile)
Max content width: 1600px (centered)
```

### Grid System
```
12-column grid with 16px gutters

Common layouts:
- Full width: col-span-12
- Two columns: col-span-6 + col-span-6
- Sidebar + main: col-span-4 + col-span-8
- Three cards: col-span-4 + col-span-4 + col-span-4
```

### Typography System
```
Font Family:
- Primary: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Monospace: 'Fira Code', 'Courier New', monospace (for IDs, JSON)

Font Sizes:
- Display:  32px / 38px (line-height) / 700 (weight)
- Title:    24px / 32px / 600
- Heading:  18px / 28px / 600
- Body:     14px / 22px / 400
- Small:    12px / 18px / 400
- Tiny:     11px / 16px / 500

Text Colors (Dark Mode):
- Primary:    #FFFFFF (headings, important)
- Secondary:  #A1A1AA (body text)
- Tertiary:   #71717A (labels, metadata)
- Disabled:   #52525B (disabled state)
```

### Color Tokens

#### Dark Mode (Primary)
```css
/* Base */
--bg-primary:     #0A0A0B    (main background)
--bg-secondary:   #18181B    (cards, elevated surfaces)
--bg-tertiary:    #27272A    (inputs, hovers)
--bg-hover:       #3F3F46    (interactive hover)

/* Borders */
--border-subtle:  #27272A    (light dividers)
--border-default: #3F3F46    (standard borders)
--border-strong:  #52525B    (emphasized)

/* Text */
--text-primary:   #FFFFFF
--text-secondary: #A1A1AA
--text-tertiary:  #71717A
--text-disabled:  #52525B

/* Semantic Colors */
--accent:         #3B82F6    (primary actions, links)
--accent-hover:   #2563EB
--success:        #10B981
--warning:        #F59E0B
--danger:         #EF4444
--info:           #6366F1

/* Alert Severity */
--severity-low:       #3B82F6
--severity-medium:    #F59E0B
--severity-high:      #FB923C
--severity-critical:  #EF4444

/* Risk Levels */
--risk-safe:      #10B981
--risk-low:       #3B82F6
--risk-medium:    #F59E0B
--risk-high:      #FB923C
--risk-critical:  #EF4444
```

#### Light Mode (Optional)
```css
/* Base */
--bg-primary:     #FFFFFF
--bg-secondary:   #F9FAFB
--bg-tertiary:    #F3F4F6
--bg-hover:       #E5E7EB

/* Borders */
--border-subtle:  #F3F4F6
--border-default: #E5E7EB
--border-strong:  #D1D5DB

/* Text */
--text-primary:   #111827
--text-secondary: #6B7280
--text-tertiary:  #9CA3AF
--text-disabled:  #D1D5DB

/* Keep semantic colors same, adjust opacity if needed */
```

---

## 2. NAVIGATION STRUCTURE

### Sidebar Navigation (Priority Order)
```
PRIMARY ACTIONS (Daily Use):
┌─────────────────────────┐
│ 🏠 Dashboard            │ ← Overview, KPIs
│ 🚨 Alerts          [3]  │ ← Real-time threats (badge = new count)
│ 📊 Logs                 │ ← All player actions
│ 👥 Players              │ ← Risk leaderboard
│ 🔍 Investigations       │ ← Deep dive tool
└─────────────────────────┘

CONFIGURATION (Weekly Use):
┌─────────────────────────┐
│ ⚙️  Rules               │ ← Anti-cheat rules config
└─────────────────────────┘

UTILITY (As Needed):
┌─────────────────────────┐
│ 🔧 Settings             │ ← Admin prefs, users
│ 📖 Documentation        │ ← Help docs
└─────────────────────────┘
```

### Icon System (Lucide React recommended)
```
Dashboard:      Home / LayoutDashboard
Alerts:         AlertTriangle / Shield
Logs:           ScrollText / Database
Players:        Users / UserCheck
Investigations: Search / FileSearch
Rules:          Settings / Sliders
Settings:       Wrench / Cog
Documentation:  Book / HelpCircle
```

### Badge/Counter Logic
```
Show red badge when:
- Alerts: new/unread alerts (status='new')
- Investigations: flagged players awaiting review

Badge colors:
- Red dot: Critical/urgent (1-99)
- Gray dot: Info/completed

Max display: 99+ (if count > 99)
Update: Real-time via Supabase subscriptions
```

### Active State Design
```
Active navigation item:
- Background: --bg-tertiary
- Border-left: 3px solid --accent
- Text color: --text-primary
- Icon: --accent

Hover state (non-active):
- Background: --bg-hover
- Transition: 150ms ease
```

---

## 3. ALERTS PAGE UI

### Page Header
```
┌─────────────────────────────────────────────────────────────┐
│ Alerts                                    [Mark All Read]    │
│ Real-time security alerts from anti-cheat rules             │
└─────────────────────────────────────────────────────────────┘
```

### Filter Bar (Sticky)
```
┌─────────────────────────────────────────────────────────────┐
│ Status: [All▾] [New][Investigating][Resolved][Dismissed]    │
│ Severity: [🔴 Critical] [🟠 High] [🟡 Medium] [🔵 Low]      │
│ Rule: [All Rules ▾]                                         │
│                                                  [Export CSV]│
└─────────────────────────────────────────────────────────────┘
```

### Alerts Table Layout
```
┌──────┬─────────────┬──────────────────────────────────┬──────────┬──────────┬─────────┐
│ SEV  │ PLAYER      │ ALERT                            │ RULE     │ TIME     │ STATUS  │
├──────┼─────────────┼──────────────────────────────────┼──────────┼──────────┼─────────┤
│ 🔴   │ Player#1234 │ Abnormal Money Gain              │ Money    │ 2m ago   │ 🟡 New  │
│ Crit │ JohnDoe     │ +$50,000 in 30 seconds           │ Gain     │          │         │
│      │ Risk: 85    │ Expected: $500, Got: $50,000     │          │          │ [View]  │
├──────┼─────────────┼──────────────────────────────────┼──────────┼──────────┼─────────┤
│ 🟠   │ Player#5678 │ Rapid Action Execution           │ Bot      │ 15m ago  │ 🔵 Inv  │
│ High │ CheaterX    │ 45 actions in 10 seconds         │ Detect   │          │         │
│      │ Risk: 72    │ Threshold: 10 actions/10s        │          │          │ [View]  │
├──────┼─────────────┼──────────────────────────────────┼──────────┼──────────┼─────────┤
│ 🟡   │ Player#9012 │ Multi-Account Detection          │ Multi    │ 1h ago   │ ✅ Res  │
│ Med  │ Suspect123  │ Same device fingerprint detected │ Account  │          │         │
│      │ Risk: 45    │ 3 accounts from same device      │          │          │ [View]  │
└──────┴─────────────┴──────────────────────────────────┴──────────┴──────────┴─────────┘
```

### Alert Row Design (Detailed)
```
Each row has 3 lines of information:

Line 1 (Main):
[SEV_ICON] [PLAYER_NAME] [ALERT_TITLE]              [TIME] [STATUS_BADGE]

Line 2 (Detail):
           [PLAYER_ID]   [ALERT_DESCRIPTION]        [RULE_TYPE]

Line 3 (Metadata):
           [Risk: XX]    [Evidence summary]         [Action Button]

Height: Auto (min 72px)
Padding: 16px vertical, 12px horizontal
Hover: Slight bg change, cursor pointer
Click: Navigate to Investigation page for that player
```

### Severity Color System
```
Critical (🔴):
- Icon: Red circle with exclamation
- Row border-left: 3px solid #EF4444
- Background tint: rgba(239, 68, 68, 0.05)
- Text: #FCA5A5

High (🟠):
- Icon: Orange triangle
- Border-left: 3px solid #FB923C
- Background tint: rgba(251, 146, 60, 0.05)
- Text: #FDBA74

Medium (🟡):
- Icon: Yellow warning
- Border-left: 3px solid #F59E0B
- Background tint: rgba(245, 158, 11, 0.05)
- Text: #FCD34D

Low (🔵):
- Icon: Blue info
- Border-left: 3px solid #3B82F6
- Background tint: rgba(59, 130, 246, 0.05)
- Text: #93C5FD
```

### Status Badges
```
New:           Yellow badge  "New"
Investigating: Blue badge    "Investigating"
Resolved:      Green badge   "Resolved"
Dismissed:     Gray badge    "Dismissed"
Auto-Actioned: Purple badge  "Auto-Banned"

Badge design:
- Rounded pill (border-radius: 12px)
- Padding: 4px 10px
- Font: 11px, 600 weight
- With dot indicator
```

### Click Behavior
```
On Row Click:
→ Navigate to /admin/investigations?player={player_id}&alert={alert_id}
→ Automatically opens full investigation view
→ Highlights the specific alert in timeline

On [View] Button:
→ Opens investigation in same behavior
→ Tracked as "Alert Viewed" in admin_actions

Quick Actions (Hover shows):
→ [Dismiss] - Mark as false positive
→ [Flag Player] - Add to watchlist
→ [Ban] - Immediate suspension (requires confirmation)
```

### Empty State
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    🎉 All Clear!                            │
│                                                             │
│         No active security alerts at the moment.            │
│     Anti-cheat system is monitoring 1,247 players.          │
│                                                             │
│         Last alert: 3 hours ago (Resolved)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. LOGS PAGE UI

### Page Header
```
┌─────────────────────────────────────────────────────────────┐
│ Player Action Logs                      [Live] [Refresh]    │
│ Comprehensive audit trail of all player actions             │
└─────────────────────────────────────────────────────────────┘
```

### Advanced Filters (Collapsible)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [▾ Filters]                                                    [Clear All]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Player:      [Search by ID or username...]                                │
│  Category:    [☑ All] [ ] Economy [ ] Inventory [ ] Crime [ ] Auth         │
│  Action Type: [All Actions ▾]                                              │
│  Date Range:  [Last 24 hours ▾]  or  [Custom: _____ to _____]             │
│  Flagged:     [ ] Show only flagged actions                                │
│  IP Address:  [Filter by IP...]                                            │
│  Device FP:   [Filter by fingerprint...]                                   │
│                                                                             │
│                                           [Reset] [Apply Filters]          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Logs Table Layout
```
┌──────────┬───────────────┬──────────────────────┬─────────────────┬──────────┬──────────┐
│ TIME     │ PLAYER        │ ACTION               │ DETAILS         │ CHANGE   │ FLAG     │
├──────────┼───────────────┼──────────────────────┼─────────────────┼──────────┼──────────┤
│ 14:32:15 │ Player#1234   │ commit_crime         │ Grand Theft     │ +$1,200  │          │
│ 2s ago   │ JohnDoe       │ Economy              │ Success         │ +15 XP   │          │
│          │               │                      │                 │          │ [View]   │
├──────────┼───────────────┼──────────────────────┼─────────────────┼──────────┼──────────┤
│ 14:31:48 │ Player#5678   │ purchase_item        │ AK-47 x1        │ -$5,000  │ 🚩       │
│ 29s ago  │ CheaterX      │ Inventory            │ Flagged: Dup    │ +1 item  │ Critical │
│          │               │                      │                 │          │ [View]   │
├──────────┼───────────────┼──────────────────────┼─────────────────┼──────────┼──────────┤
│ 14:30:12 │ Player#9012   │ login                │ Device: Chrome  │ Session  │          │
│ 2m ago   │ NewUser       │ Auth                 │ IP: 192.168.*   │ Started  │          │
│          │               │                      │                 │          │ [View]   │
└──────────┴───────────────┴──────────────────────┴─────────────────┴──────────┴──────────┘

[← Previous]  Page 1 of 2,847  [Next →]            [100 per page ▾]
```

### Column Details

**TIME:**
- Format: HH:MM:SS (24-hour)
- Relative: "2s ago", "5m ago", "2h ago"
- Tooltip: Full timestamp on hover
- Width: 100px

**PLAYER:**
- Primary: Player username/display name
- Secondary: Player ID (monospace font)
- Clickable: → Opens investigation page
- Width: 140px

**ACTION:**
- Primary: Action type (formatted, readable)
- Secondary: Category badge (Economy/Inventory/Crime/Auth)
- Color-coded by category
- Width: 180px

**DETAILS:**
- Context about the action
- For crimes: Crime name, outcome
- For purchases: Item name, quantity
- For economy: Transaction source
- Width: 200px (flexible)

**CHANGE:**
- Value diff displayed
- Positive: Green "+$1,200"
- Negative: Red "-$500"
- Neutral: Gray "Session started"
- Width: 120px

**FLAG:**
- Shows flag icon if is_flagged = true
- Click to see flag_reason
- Severity color-coded
- Width: 80px

### Row Expansion (Click to Expand)
```
When you click [View] on a log entry:

┌─────────────────────────────────────────────────────────────────────────────┐
│ 14:32:15 │ Player#1234   │ commit_crime         │ Grand Theft     │ +$1,200  │          │
│ 2s ago   │ JohnDoe       │ Economy              │ Success         │ +15 XP   │          │
│          │               │                      │                 │          │ [Hide ▴] │
├─────────────────────────────────────────────────────────────────────────────┤
│ FULL DETAILS                                                                │
│                                                                             │
│  Log ID:           12847563                                                 │
│  Player ID:        1234                                                     │
│  Session ID:       550e8400-e29b-41d4-a716-446655440000                     │
│  IP Address:       192.168.1.100                                            │
│  Device FP:        a3f5c8d9e1b2...                                          │
│  User Agent:       Mozilla/5.0 (Windows NT 10.0...)                         │
│                                                                             │
│  OLD VALUE:        { "cash": 8500, "xp": 150 }                             │
│  NEW VALUE:        { "cash": 9700, "xp": 165 }                             │
│  VALUE DIFF:       +1200                                                    │
│                                                                             │
│  METADATA:         ┌────────────────────────────────────────────────┐      │
│                    │ {                                              │      │
│                    │   "crime_id": 5,                               │      │
│                    │   "crime_name": "Grand Theft Auto",            │      │
│                    │   "success_rate": 0.35,                        │      │
│                    │   "outcome": "success",                        │      │
│                    │   "jail_time": 0,                              │      │
│                    │   "reward": {                                  │      │
│                    │     "cash": 1200,                              │      │
│                    │     "xp": 15                                   │      │
│                    │   }                                            │      │
│                    │ }                                              │      │
│                    └────────────────────────────────────────────────┘      │
│                                                                             │
│  [View Player Investigation] [Copy JSON] [Flag This Action]                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Old Value / New Value Display
```
For economy/stats changes, show diff:

┌────────────────────────────────────────┐
│ BEFORE          CHANGE        AFTER    │
├────────────────────────────────────────┤
│ $8,500     →    +$1,200   →   $9,700  │
│ 150 XP     →    +15 XP    →   165 XP  │
└────────────────────────────────────────┘

Color coding:
- Before: Gray text
- Change: Green (positive) / Red (negative)
- After: White text (result)

Use monospace font for alignment
```

### JSON Inspector Component
```
Collapsible, syntax-highlighted JSON viewer:

┌────────────────────────────────────────┐
│ [▾] METADATA                   [Copy]  │
├────────────────────────────────────────┤
│ 1  {                                   │
│ 2    "crime_id": 5,                    │
│ 3    "crime_name": "Grand Theft Auto", │
│ 4    "success_rate": 0.35,             │
│ 5    "outcome": "success"              │
│ 6  }                                   │
└────────────────────────────────────────┘

Features:
- Syntax highlighting (keys, strings, numbers)
- Line numbers
- Copy button
- Expand/collapse
- Search within JSON (Ctrl+F)
```

### Live Mode Toggle
```
┌──────────────────────────────────┐
│ [🟢 LIVE]  Auto-refresh: ON      │
│                                  │
│ New logs appear at top           │
│ Updates every 3 seconds          │
│                                  │
│ [Pause] to stop auto-refresh     │
└──────────────────────────────────┘

When live:
- Green dot pulses
- New rows fade in with animation
- Scroll to top on new entry
- Sound notification (optional)
```

### Empty State
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    📊 No Logs Found                         │
│                                                             │
│         Try adjusting your filters or date range.           │
│                                                             │
│         [Clear All Filters]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. PLAYERS PAGE UI

### Page Header
```
┌─────────────────────────────────────────────────────────────┐
│ Players                                  [Export] [Refresh]  │
│ Risk leaderboard and player management                      │
└─────────────────────────────────────────────────────────────┘
```

### Summary Cards (Top)
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ 🟢 Total Players│ 🔴 High Risk    │ 🚩 Flagged      │ 🚫 Banned       │
│                 │                 │                 │                 │
│   1,247         │   23            │   8             │   5             │
│   ↑ 12 today    │   ↑ 3 today     │   → No change   │   ↑ 1 today     │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Filter Bar
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Search: [Player name or ID...]                                             │
│ Risk Level: [All] [🟢 Safe] [🔵 Low] [🟡 Medium] [🟠 High] [🔴 Critical]  │
│ Status: [All] [Active] [Flagged] [Banned] [Under Investigation]           │
│ Sort By: [Risk Score ▾]                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Players Table (Risk Leaderboard)
```
┌──────┬──────────────────┬───────────────┬──────────────┬────────────┬──────────┐
│ RANK │ PLAYER           │ RISK SCORE    │ ALERTS       │ ACTIVITY   │ ACTIONS  │
├──────┼──────────────────┼───────────────┼──────────────┼────────────┼──────────┤
│  1   │ Player#1234      │ ████████░░ 85 │ 5 active     │ 2m ago     │ [View]   │
│      │ JohnDoe          │ 🔴 CRITICAL   │ 12 total     │ Online     │ [Ban]    │
│      │ ID: 1234         │               │              │            │          │
├──────┼──────────────────┼───────────────┼──────────────┼────────────┼──────────┤
│  2   │ Player#5678      │ ███████░░░ 72 │ 3 active     │ 15m ago    │ [View]   │
│      │ CheaterX         │ 🟠 HIGH       │ 8 total      │ Active     │ [Flag]   │
│      │ ID: 5678         │               │              │            │          │
├──────┼──────────────────┼───────────────┼──────────────┼────────────┼──────────┤
│  3   │ Player#9012      │ █████░░░░░ 45 │ 1 active     │ 1h ago     │ [View]   │
│      │ Suspect123       │ 🟡 MEDIUM     │ 2 total      │ Active     │          │
│      │ ID: 9012         │               │              │            │          │
├──────┼──────────────────┼───────────────┼──────────────┼────────────┼──────────┤
│  4   │ Player#3456      │ ██░░░░░░░░ 18 │ 0 active     │ 3h ago     │ [View]   │
│      │ CleanPlayer      │ 🔵 LOW        │ 0 total      │ Active     │          │
│      │ ID: 3456         │               │              │            │          │
└──────┴──────────────────┴───────────────┴──────────────┴────────────┴──────────┘
```

### Risk Score Visual Design
```
Risk bar (progress bar):
┌────────────────────────────────────────┐
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░ 45 │
└────────────────────────────────────────┘

Coloring:
- 0-10:   Green fill
- 11-30:  Blue fill
- 31-60:  Yellow fill
- 61-85:  Orange fill
- 86-100: Red fill

Width: 150px
Height: 8px
Border-radius: 4px
Background: --bg-tertiary
```

### Risk Level Badge
```
🟢 SAFE       (0-10)    - Green
🔵 LOW        (11-30)   - Blue
🟡 MEDIUM     (31-60)   - Yellow
🟠 HIGH       (61-85)   - Orange
🔴 CRITICAL   (86-100)  - Red

Badge design:
- Icon + text
- 12px font, 600 weight
- Uppercase
- Padding: 4px 8px
- Border-radius: 4px
```

### Player Row Hover Actions
```
On hover, show quick actions:

┌──────────────────────────────────────────────────────────────┐
│  [🔍 Investigate] [📊 View Logs] [🚩 Flag] [🚫 Ban]        │
└──────────────────────────────────────────────────────────────┘

Button design:
- Small, icon + text
- Ghost style (transparent)
- Hover: bg change
- Keyboard accessible (Tab navigation)
```

### Player Card (Quick View on Click)
```
When you click [View]:

┌─────────────────────────────────────────────────────────────┐
│ 👤 Player#1234 (JohnDoe)                          [✕ Close] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Risk Score: ████████░░ 85 🔴 CRITICAL                     │
│  Status: 🚩 Flagged                                         │
│  Account Created: Jan 15, 2026                             │
│  Last Active: 2 minutes ago                                │
│                                                             │
│  ┌───────────────┬───────────────┬───────────────┐         │
│  │ Total Cash    │ Total XP      │ Level         │         │
│  │ $125,430      │ 3,582         │ 18            │         │
│  └───────────────┴───────────────┴───────────────┘         │
│                                                             │
│  Recent Activity:                                          │
│  • Committed Grand Theft Auto (2m ago)                     │
│  • Purchased AK-47 (5m ago)                                │
│  • Logged in from new device (10m ago)                     │
│                                                             │
│  Active Alerts: 5                                          │
│  • Abnormal Money Gain (Critical)                          │
│  • Rapid Action Execution (High)                           │
│  • Multi-Account Detection (Medium)                        │
│                                                             │
│  [Full Investigation →] [Ban User] [Flag] [Reset Risk]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Empty State
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    👥 No Players Found                      │
│                                                             │
│         Try adjusting your filters.                         │
│                                                             │
│         [Clear Filters]                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. INVESTIGATION PAGE UI (MOST IMPORTANT)

### Layout Structure (3-Panel)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [← Back to Players]  Investigation: Player#1234 (JohnDoe)   [Export Report] │
├───────────────┬─────────────────────────────────────────────┬───────────────┤
│               │                                             │               │
│  LEFT PANEL   │           MAIN CONTENT PANEL                │  RIGHT PANEL  │
│  (280px)      │           (flexible, centered)              │  (320px)      │
│               │                                             │               │
│  Player       │  [Tabs: Timeline | Economy | Inventory]     │  Quick Info   │
│  Profile      │                                             │               │
│               │  ┌─────────────────────────────────────┐    │  Device Info  │
│  Risk Score   │  │                                     │    │               │
│               │  │                                     │    │  IP History   │
│  Sessions     │  │       MAIN VISUALIZATION            │    │               │
│               │  │                                     │    │  Linked       │
│  Flags        │  │                                     │    │  Accounts     │
│               │  └─────────────────────────────────────┘    │               │
│  Timeline     │                                             │  Recent       │
│  Summary      │                                             │  Alerts       │
│               │                                             │               │
└───────────────┴─────────────────────────────────────────────┴───────────────┘
│                                                                             │
│                          BOTTOM ACTION BAR                                  │
│  [Flag Player] [Adjust Risk Score] [Suspend 24h] [Ban Permanently]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### LEFT PANEL (280px fixed, scrollable)

#### Player Profile Section
```
┌─────────────────────────────────┐
│  👤 Player#1234                 │
│     JohnDoe                     │
│                                 │
│  Status: 🟢 Online              │
│  Level: 18                      │
│  Created: Jan 15, 2026          │
│  Last Active: 2 minutes ago     │
│                                 │
│  [View Full Profile →]          │
└─────────────────────────────────┘
```

#### Risk Score Card
```
┌─────────────────────────────────┐
│  RISK SCORE                     │
│                                 │
│  ████████░░ 85                  │
│  🔴 CRITICAL                    │
│                                 │
│  Contributing Factors:          │
│  • Abnormal gains: +40          │
│  • Rapid actions: +25           │
│  • Multi-account: +20           │
│                                 │
│  Last Updated: 2m ago           │
│                                 │
│  [Adjust Score]                 │
└─────────────────────────────────┘
```

#### Active Sessions
```
┌─────────────────────────────────┐
│  ACTIVE SESSIONS                │
│                                 │
│  🟢 Current Session             │
│  Started: 2h ago                │
│  Device: Chrome on Windows      │
│  IP: 192.168.1.100              │
│                                 │
│  Recent Sessions (3):           │
│  • 6h ago - Chrome              │
│  • Yesterday - Mobile Safari    │
│  • 2 days ago - Chrome          │
│                                 │
│  [View All →]                   │
└─────────────────────────────────┘
```

#### Flags & Notes
```
┌─────────────────────────────────┐
│  FLAGS & NOTES                  │
│                                 │
│  🚩 Flagged for Review          │
│  By: Admin_Jake                 │
│  Reason: Suspicious gains       │
│  Date: 1h ago                   │
│                                 │
│  Investigation Notes:           │
│  "Multiple large transactions   │
│   in short time window.         │
│   Monitoring closely."          │
│                                 │
│  [Add Note] [Remove Flag]       │
└─────────────────────────────────┘
```

### MAIN CONTENT PANEL (Flexible, Tabbed)

#### Tab Navigation
```
┌───────────────────────────────────────────────────────────────┐
│ [Timeline] [Economy] [Inventory] [Alerts] [Sessions]          │
└───────────────────────────────────────────────────────────────┘

Active tab: Bold, underline accent, white text
Inactive: Gray text, hover lighten
```

#### TIMELINE TAB (Default View)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Timeline                                           [Filter by type ▾]        │
│ Chronological view of all player actions                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🕐 2 minutes ago                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ 💰 Committed Grand Theft Auto                                       │    │
│  │ Earned: +$1,200, +15 XP                                            │    │
│  │ Success rate: 35% (got lucky)                                      │    │
│  │ [View Log Details]                                                 │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  🕐 5 minutes ago                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ 🛒 Purchased Item: AK-47 x1                                        │    │
│  │ Spent: -$5,000                                                     │    │
│  │ 🚩 FLAGGED: Possible duplication exploit                          │    │
│  │ [View Log Details] [Investigate Alert]                            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  🕐 10 minutes ago                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ 🔐 Logged In                                                       │    │
│  │ Device: Chrome 121 on Windows 10                                   │    │
│  │ IP: 192.168.1.100                                                  │    │
│  │ Device FP: a3f5c8d9e1b2...                                         │    │
│  │ [View Session Details]                                             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  🕐 15 minutes ago                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ 💼 Collected Business Income                                       │    │
│  │ Earned: +$2,500 from Drug Lab                                      │    │
│  │ [View Log Details]                                                 │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  [Load More ▾]                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Timeline Card Design:**
- Icon for action type (💰=economy, 🛒=purchase, 🔐=auth, etc.)
- Time shown as relative ("5 minutes ago")
- Card has subtle border, padding: 16px
- Flagged items: Red accent border-left
- Hover: Slight elevation, show "Copy JSON" button
- Click: Expands to show full log details

#### ECONOMY TAB
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Economy Analysis                                    [Date Range: 7 days ▾]  │
│ Money flow and transaction patterns                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BALANCE OVER TIME                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ $150k ┤                                                        ╱     │   │
│  │       ┤                                               ╱────────      │   │
│  │ $100k ┤                                    ╱──────────               │   │
│  │       ┤                          ╱─────────                          │   │
│  │  $50k ┤               ╱──────────                                    │   │
│  │       ┤    ╱──────────                                               │   │
│  │     0 ┼────┴────┴────┴────┴────┴────┴────┴                          │   │
│  │       Mon  Tue  Wed  Thu  Fri  Sat  Sun                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  🚩 ANOMALIES DETECTED:                                                     │
│  • Sudden spike: +$50,000 on Thursday (15x daily average)                  │
│  • Impossible earnings: $12,000/hour (avg: $800/hour)                      │
│                                                                             │
│  TRANSACTION SUMMARY                                                        │
│  ┌─────────────────┬──────────────┬──────────────┬──────────────┐          │
│  │ SOURCE          │ COUNT        │ TOTAL        │ AVG          │          │
│  ├─────────────────┼──────────────┼──────────────┼──────────────┤          │
│  │ Crimes          │ 234          │ +$45,230     │ +$193        │          │
│  │ Businesses      │ 48           │ +$38,500     │ +$802        │          │
│  │ Item Sales      │ 12           │ +$6,800      │ +$567        │          │
│  │ Purchases       │ 67           │ -$15,340     │ -$229        │          │
│  │ Transfers OUT   │ 5            │ -$2,500      │ -$500        │          │
│  │ Transfers IN    │ 2            │ +$1,000      │ +$500        │          │
│  └─────────────────┴──────────────┴──────────────┴──────────────┘          │
│                                                                             │
│  RECENT TRANSACTIONS (Top 10)                                              │
│  ┌──────────────┬────────────────────────────┬──────────────┐              │
│  │ TIME         │ TYPE                       │ AMOUNT       │              │
│  ├──────────────┼────────────────────────────┼──────────────┤              │
│  │ 2m ago       │ Crime: Grand Theft Auto    │ +$1,200  ✓   │              │
│  │ 5m ago       │ Purchase: AK-47 x1         │ -$5,000  🚩  │              │
│  │ 15m ago      │ Business: Drug Lab Income  │ +$2,500  ✓   │              │
│  │ 1h ago       │ Crime: Bank Heist          │ +$8,500  ✓   │              │
│  │ 2h ago       │ Transfer OUT to Player#999 │ -$1,000  ✓   │              │
│  └──────────────┴────────────────────────────┴──────────────┘              │
│                                                                             │
│  [Export CSV] [View All Transactions →]                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Graph Features:**
- Interactive line/area chart
- Hover shows exact values and timestamps
- Highlight anomalies with red dots
- Zoom and pan controls
- Toggle between daily/hourly/weekly views

#### INVENTORY TAB
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Inventory Analysis                                [Show: All Items ▾]       │
│ Item acquisition and usage patterns                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CURRENT INVENTORY (24 items)                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ ITEM              │ QUANTITY │ ACQUIRED       │ VALUE    │ FLAG │      │
│  ├──────────────────┼──────────┼────────────────┼──────────┼──────┤      │
│  │ 🔫 AK-47         │ 1        │ 5m ago         │ $5,000   │ 🚩   │      │
│  │ 💊 Health Kit    │ 15       │ Multiple dates │ $2,250   │      │      │
│  │ 🚗 Sports Car    │ 1        │ Yesterday      │ $25,000  │      │      │
│  │ 🏠 Mansion Key   │ 1        │ 3 days ago     │ $100,000 │      │      │
│  └──────────────────┴──────────┴────────────────┴──────────┴──────┘      │
│                                                                             │
│  🚩 SUSPICIOUS PATTERNS:                                                   │
│  • AK-47 purchased but not recorded in inventory change log                │
│  • Possible duplication: Item appeared without purchase record             │
│                                                                             │
│  INVENTORY CHANGES (Last 7 days)                                           │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ TIME      │ ITEM          │ CHANGE │ SOURCE         │ FLAG       │      │
│  ├───────────┼───────────────┼────────┼────────────────┼────────────┤      │
│  │ 5m ago    │ AK-47         │ +1     │ Purchase       │ 🚩 Flagged │      │
│  │ 1h ago    │ Health Kit    │ +5     │ Business Drop  │ ✓          │      │
│  │ 3h ago    │ Health Kit    │ -2     │ Used           │ ✓          │      │
│  │ Yesterday │ Sports Car    │ +1     │ Crime Reward   │ ✓          │      │
│  └───────────┴───────────────┴────────┴────────────────┴────────────┘      │
│                                                                             │
│  ACQUISITION SOURCES                                                        │
│  ┌─────────────────────────┐                                               │
│  │ Purchases:      45% ███ │                                               │
│  │ Crime Rewards:  30% ██  │                                               │
│  │ Business Drops: 20% ██  │                                               │
│  │ Trades:          5% █   │                                               │
│  └─────────────────────────┘                                               │
│                                                                             │
│  [Export Inventory Report]                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### ALERTS TAB
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Security Alerts                                    [Status: All ▾]          │
│ All alerts triggered for this player                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ACTIVE ALERTS (5)                                                          │
│                                                                             │
│  🔴 CRITICAL - Abnormal Money Gain                      2 minutes ago       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Rule: Money Gain Threshold                                          │   │
│  │ Trigger: +$50,000 in 30 seconds (expected: $500)                    │   │
│  │ Evidence:                                                           │   │
│  │ • Balance before: $8,500                                            │   │
│  │ • Balance after: $58,500                                            │   │
│  │ • Source: Crime (Grand Theft Auto)                                  │   │
│  │ • Success rate: 35% (unlikely streak)                               │   │
│  │                                                                     │   │
│  │ [Mark Resolved] [Dismiss] [Auto-Ban Player]                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  🟠 HIGH - Rapid Action Execution                       15 minutes ago      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Rule: Bot Detection - Rate Limit                                    │   │
│  │ Trigger: 45 actions in 10 seconds (threshold: 10 actions/10s)       │   │
│  │ Evidence:                                                           │   │
│  │ • Actions: commit_crime x45                                         │   │
│  │ • Average interval: 0.22s                                           │   │
│  │ • Human average: 2-5s                                               │   │
│  │ • Likely bot or macro usage                                         │   │
│  │                                                                     │   │
│  │ [Mark Investigating] [Dismiss] [View Logs]                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  🟡 MEDIUM - Multi-Account Detection                    1 hour ago          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Rule: Multi-Account - Device Fingerprint                            │   │
│  │ Trigger: Same device fingerprint as 2 other accounts                │   │
│  │ Evidence:                                                           │   │
│  │ • Device FP: a3f5c8d9e1b2...                                        │   │
│  │ • Linked Accounts: Player#999, Player#1111                          │   │
│  │ • Transfer history: $5,000 total sent from linked accounts          │   │
│  │                                                                     │   │
│  │ [Mark Resolved] [View Linked Accounts] [Ban All]                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RESOLVED ALERTS (8)                                                        │
│  [▾ Show Resolved]                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RIGHT PANEL (320px fixed, scrollable)

#### Quick Info Card
```
┌──────────────────────────────┐
│ QUICK INFO                   │
│                              │
│ Account Age: 20 days         │
│ Total Playtime: 48h 23m      │
│ Sessions: 127                │
│ Logins: 134                  │
│ Failed Logins: 2             │
│                              │
│ Economy:                     │
│ • Cash: $125,430             │
│ • Net Worth: $347,800        │
│ • Total Earned: $1.2M        │
│ • Total Spent: $875K         │
│                              │
│ Stats:                       │
│ • Level: 18                  │
│ • XP: 3,582                  │
│ • Crimes: 1,247              │
│ • Businesses: 3              │
└──────────────────────────────┘
```

#### Device Information
```
┌──────────────────────────────┐
│ DEVICE INFO                  │
│                              │
│ Current Device:              │
│ • Chrome 121                 │
│ • Windows 10                 │
│ • 1920x1080                  │
│                              │
│ Device Fingerprint:          │
│ a3f5c8d9e1b2...              │
│ [Copy]                       │
│                              │
│ All Devices (3):             │
│ • Chrome on Windows (2)      │
│ • Safari on iPhone (1)       │
│                              │
│ [View Device History →]      │
└──────────────────────────────┘
```

#### IP Address History
```
┌──────────────────────────────┐
│ IP ADDRESS HISTORY           │
│                              │
│ Current IP:                  │
│ 192.168.1.100                │
│ [Copy] [Lookup]              │
│                              │
│ Location: New York, US       │
│ ISP: Verizon                 │
│                              │
│ Recent IPs (5):              │
│ • 192.168.1.100 (Now)        │
│ • 192.168.1.100 (Yesterday)  │
│ • 10.0.0.15 (3 days ago)     │
│ • 192.168.1.100 (5 days ago) │
│                              │
│ 🚩 No VPN/Proxy detected     │
│                              │
│ [View Full History →]        │
└──────────────────────────────┘
```

#### Linked Accounts
```
┌──────────────────────────────┐
│ LINKED ACCOUNTS              │
│                              │
│ 🚩 2 linked accounts found   │
│                              │
│ Same Device Fingerprint:     │
│ • Player#999 (Active)        │
│   Last: 1h ago               │
│   Risk: 62 🟠                │
│                              │
│ • Player#1111 (Banned)       │
│   Banned: 2 days ago         │
│   Reason: Exploit            │
│                              │
│ Transfer History:            │
│ • Received $3,000 from #999  │
│ • Received $2,000 from #1111 │
│                              │
│ [Investigate All]            │
└──────────────────────────────┘
```

#### Recent Alerts Summary
```
┌──────────────────────────────┐
│ RECENT ALERTS                │
│                              │
│ 🔴 Critical: 1               │
│ 🟠 High: 2                   │
│ 🟡 Medium: 2                 │
│ 🔵 Low: 0                    │
│                              │
│ Last Alert: 2m ago           │
│ Total: 12 (7 days)           │
│                              │
│ [View All Alerts →]          │
└──────────────────────────────┘
```

### BOTTOM ACTION BAR (Fixed, 80px height)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  [🚩 Flag Player]  [📊 Adjust Risk]  [⏸️ Suspend 24h]  [🚫 Ban Permanent]  │
│                                                                             │
│  [📝 Add Note]  [💬 Message Player]  [🔄 Reset Account]  [📤 Export]       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Action Buttons:**
- Large, prominent (48px height)
- Icon + text label
- Color-coded by severity:
  - Flag: Yellow
  - Adjust: Blue
  - Suspend: Orange
  - Ban: Red (requires confirmation)
- Keyboard shortcuts (shown in tooltips)
- Disabled states when not applicable

### Key UX Principles for Investigation Page

**1. Information Hierarchy:**
- Most critical info (risk score, active alerts) → Left panel, always visible
- Detailed analysis → Main panel with tabs
- Context/metadata → Right panel
- Actions → Fixed bottom bar

**2. No Scrolling Required for Critical Decisions:**
- All critical info fits above the fold (first screen)
- Risk score visible at all times (left panel)
- Active alert count visible
- Quick actions in fixed bottom bar

**3. Progressive Disclosure:**
- Start with overview (Timeline tab)
- Drill into specifics (Economy/Inventory tabs)
- Raw data available on demand (click to expand)
- Collapsible sections for less important info

**4. Fast Navigation:**
- Keyboard shortcuts for all actions
- Tab key navigation
- Quick filters at top
- Breadcrumbs for context

---

## 7. RULES MANAGER UI

### Page Header
```
┌─────────────────────────────────────────────────────────────┐
│ Anti-Cheat Rules                       [+ Add New Rule]     │
│ Configure detection rules and thresholds                    │
└─────────────────────────────────────────────────────────────┘
```

### Rules Table (Inline Editing)
```
┌────┬────────────────────────┬───────────┬────────────┬──────────────┬─────────┐
│ ON │ RULE NAME              │ TYPE      │ THRESHOLD  │ LAST TRIGGER │ ACTIONS │
├────┼────────────────────────┼───────────┼────────────┼──────────────┼─────────┤
│ ✓  │ Abnormal Money Gain    │ Threshold │ ────●──────│ 2m ago (5x)  │ [Edit]  │
│    │ Detects impossible...  │           │ $10,000    │              │ [Del]   │
├────┼────────────────────────┼───────────┼────────────┼──────────────┼─────────┤
│ ✓  │ Rapid Action Exec      │ Rate Lim  │ ───●───────│ 15m ago (3x) │ [Edit]  │
│    │ Bot/macro detection... │           │ 10 act/10s │              │ [Del]   │
├────┼────────────────────────┼───────────┼────────────┼──────────────┼─────────┤
│ ✓  │ Impossible Success     │ Pattern   │ ─────●─────│ 1h ago (1x)  │ [Edit]  │
│    │ Statistical anomaly... │           │ 95% rate   │              │ [Del]   │
├────┼────────────────────────┼───────────┼────────────┼──────────────┼─────────┤
│ ✗  │ Multi-Account Detect   │ Compare   │ ────────●──│ Never        │ [Edit]  │
│    │ Device fingerprint...  │           │ 3 accounts │              │ [Del]   │
└────┴────────────────────────┴───────────┴────────────┴──────────────┴─────────┘
```

### Rule Card (Click [Edit] to expand)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Edit Rule: Abnormal Money Gain                              [✕ Close] [Save] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Rule Name:                                                                 │
│  [Abnormal Money Gain                                              ]        │
│                                                                             │
│  Description:                                                               │
│  [Detects when a player earns money far exceeding normal patterns  ]        │
│                                                                             │
│  Rule Type:                                                                 │
│  [Threshold ▾]                                                              │
│                                                                             │
│  Threshold Configuration:                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ Money gain amount:                                              │        │
│  │ ────────────●────────────────────────                           │        │
│  │ $0        $10,000       $50,000        $100,000                 │        │
│  │                                                                 │        │
│  │ Time window: [30 seconds ▾]                                     │        │
│  │                                                                 │        │
│  │ Compare to: [Expected value ▾]                                  │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  Severity: [🔴 Critical ▾]                                                  │
│                                                                             │
│  Auto-Action on Trigger:                                                    │
│  ☑ Create alert                                                             │
│  ☑ Update risk score (+40 points)                                          │
│  ☐ Flag player automatically                                                │
│  ☐ Auto-suspend (requires approval)                                         │
│  ☐ Auto-ban (requires approval)                                             │
│                                                                             │
│  Status: [✓ Enabled]  [Test Rule]                                          │
│                                                                             │
│  Statistics:                                                                │
│  • Triggered 237 times (7 days)                                             │
│  • True positives: 89%                                                      │
│  • False positives: 11%                                                     │
│  • Last trigger: 2 minutes ago                                              │
│                                                                             │
│  [Delete Rule] [Duplicate] [Save Changes]                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Threshold Slider Component
```
Interactive slider with visual feedback:

┌─────────────────────────────────────────────────────┐
│ Threshold: $10,000                                  │
│                                                     │
│ ┣━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫   │
│ $0   $5k   $10k   $25k   $50k   $100k   $500k   │
│                                                     │
│ Current: $10,000                                    │
│ Recommended: $5,000 - $15,000                       │
│                                                     │
│ 🔔 237 alerts in last 7 days                        │
│                                                     │
└─────────────────────────────────────────────────────┘

Features:
- Drag to adjust
- Click positions to jump
- Input box for precise values
- Shows current vs recommended
- Real-time preview of impact (alert count)
```

### Enable/Disable Toggle
```
┌──────────────────────────────┐
│ [✓ Enabled]                  │
│                              │
│ Toggle to disable/enable     │
│ Disabled rules don't trigger │
│ but remain configured        │
└──────────────────────────────┘

Visual design:
- Large toggle switch
- Green (on) / Gray (off)
- Smooth animation
- Immediate effect
```

### Last Triggered Indicator
```
Display format:

"2 minutes ago (5x today)"
"Never triggered"
"1 hour ago (12x this week)"

Show:
- Relative time
- Frequency (today/week)
- Color: Recent (red) → Old (gray)
```

### Add New Rule Button
```
Clicking [+ Add New Rule] opens modal with templates:

┌─────────────────────────────────────────────────────┐
│ Create New Rule                        [✕ Close]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Choose a template:                                  │
│                                                     │
│ ┌───────────────────┐  ┌───────────────────┐       │
│ │ 💰 Economy        │  │ 🎮 Gameplay       │       │
│ │ Threshold         │  │ Rate Limit        │       │
│ │                   │  │                   │       │
│ │ [Select]          │  │ [Select]          │       │
│ └───────────────────┘  └───────────────────┘       │
│                                                     │
│ ┌───────────────────┐  ┌───────────────────┐       │
│ │ 📦 Inventory      │  │ 🔗 Multi-Account  │       │
│ │ Pattern           │  │ Comparison        │       │
│ │                   │  │                   │       │
│ │ [Select]          │  │ [Select]          │       │
│ └───────────────────┘  └───────────────────┘       │
│                                                     │
│ Or start from scratch: [Custom Rule]               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 8. COMPONENT SYSTEM

### DataTable Component
```javascript
<DataTable
  columns={[
    { key: 'player', label: 'Player', sortable: true, width: '200px' },
    { key: 'risk', label: 'Risk Score', sortable: true, render: RiskBar },
    { key: 'alerts', label: 'Alerts', sortable: true },
    { key: 'actions', label: 'Actions', render: ActionButtons }
  ]}
  data={players}
  onRowClick={handleRowClick}
  emptyState={<EmptyState message="No players found" />}
  loading={isLoading}
  pagination={{
    currentPage: 1,
    totalPages: 10,
    perPage: 50,
    perPageOptions: [25, 50, 100, 250]
  }}
/>
```

**Features:**
- Sortable columns (click header)
- Custom cell renderers
- Row click handler
- Hover effects
- Loading skeleton
- Empty states
- Pagination controls
- Responsive (stacks on mobile)
- Keyboard navigation (Tab, Arrow keys)

**Visual Design:**
```
┌──────────────────────────────────────────────────────┐
│ COLUMN 1 ↑    COLUMN 2 ↓    COLUMN 3    COLUMN 4    │ ← Header
├──────────────────────────────────────────────────────┤
│ Cell          Cell          Cell        [Actions]    │ ← Row (hover: bg change)
├──────────────────────────────────────────────────────┤
│ Cell          Cell          Cell        [Actions]    │
├──────────────────────────────────────────────────────┤
│ Cell          Cell          Cell        [Actions]    │
└──────────────────────────────────────────────────────┘

Header:
- Bold, uppercase, 11px
- Sort indicators (↑↓)
- Sticky on scroll
- Border-bottom: 2px

Rows:
- 56px height (comfortable)
- Alternate row background (subtle)
- Hover: bg-hover
- Click: navigate or expand
```

### SeverityBadge Component
```javascript
<SeverityBadge severity="critical" />
<SeverityBadge severity="high" />
<SeverityBadge severity="medium" />
<SeverityBadge severity="low" />
```

**Visual Design:**
```
Critical:  [🔴 Critical]  (red bg, white text)
High:      [🟠 High]      (orange bg, white text)
Medium:    [🟡 Medium]    (yellow bg, dark text)
Low:       [🔵 Low]       (blue bg, white text)

Styling:
- Border-radius: 12px (pill shape)
- Padding: 4px 10px
- Font: 11px, 600 weight, uppercase
- Icon + text
- Inline-flex, align-center
```

### TimelineItem Component
```javascript
<TimelineItem
  icon="💰"
  time="2 minutes ago"
  title="Committed Grand Theft Auto"
  description="Earned: +$1,200, +15 XP"
  flagged={false}
  actions={[
    { label: 'View Details', onClick: handleView }
  ]}
/>
```

**Visual Design:**
```
┌─────────────────────────────────────────────────────┐
│ 💰 2 minutes ago                                    │
│                                                     │
│    Committed Grand Theft Auto                       │
│    Earned: +$1,200, +15 XP                          │
│    Success rate: 35% (got lucky)                    │
│                                                     │
│    [View Details]                                   │
└─────────────────────────────────────────────────────┘

Structure:
- Icon: Large (32px), left-aligned
- Time: Small, gray, right-aligned
- Title: Bold, 16px
- Description: Regular, 14px, gray
- Actions: Button group at bottom
- Border-left: 3px accent (flagged = red)
- Padding: 16px
- Margin-bottom: 12px
- Hover: Slight elevation
```

### PlayerCard Component
```javascript
<PlayerCard
  player={{
    id: 1234,
    username: 'JohnDoe',
    riskScore: 85,
    status: 'online',
    level: 18
  }}
  onClick={handleClick}
/>
```

**Visual Design:**
```
┌──────────────────────────────────┐
│ 👤 Player#1234                   │
│    JohnDoe                       │
│                                  │
│ Risk: ████████░░ 85 🔴          │
│ Status: 🟢 Online                │
│ Level: 18                        │
│                                  │
│ [View Investigation →]           │
└──────────────────────────────────┘

Compact version (for lists):
┌────────────────────────────────────┐
│ 👤 JohnDoe (#1234)  Risk: 85 🔴   │
└────────────────────────────────────┘
```

### MetricCard Component
```javascript
<MetricCard
  label="Total Players"
  value="1,247"
  change="+12 today"
  trend="up"
  icon="👥"
  color="blue"
/>
```

**Visual Design:**
```
┌─────────────────────────┐
│ 👥 Total Players        │
│                         │
│     1,247               │
│     ↑ 12 today          │
└─────────────────────────┘

Styling:
- Icon: Top-left, 24px
- Label: Gray, 12px, uppercase
- Value: Large, 32px, bold
- Change: Small, 12px, with trend arrow
- Trend colors: Up (green), Down (red), Neutral (gray)
- Background: --bg-secondary
- Border: 1px solid --border-default
- Padding: 24px
- Border-radius: 12px
- Hover: Slight elevation
```

### JSONInspector Component
```javascript
<JSONInspector
  data={{
    crime_id: 5,
    crime_name: "Grand Theft Auto",
    outcome: "success",
    reward: { cash: 1200, xp: 15 }
  }}
  collapsible={true}
  copyable={true}
/>
```

**Visual Design:**
```
┌────────────────────────────────────────────────┐
│ [▾] METADATA                       [📋 Copy]   │
├────────────────────────────────────────────────┤
│ {                                              │
│   "crime_id": 5,                               │
│   "crime_name": "Grand Theft Auto",            │
│   "outcome": "success",                        │
│   "reward": {                                  │
│     "cash": 1200,                              │
│     "xp": 15                                   │
│   }                                            │
│ }                                              │
└────────────────────────────────────────────────┘

Features:
- Syntax highlighting:
  - Keys: Blue (#3B82F6)
  - Strings: Green (#10B981)
  - Numbers: Orange (#F59E0B)
  - Booleans: Purple (#8B5CF6)
  - Null: Gray (#71717A)
- Line numbers (optional)
- Collapsible nested objects
- Copy button (copies formatted JSON)
- Search within (Ctrl+F)
- Monospace font
- Dark background
- Max height: 400px, scroll
```

---

## 9. UX DETAILS (CRITICAL)

### Keyboard Shortcuts
```
Global:
⌘K / Ctrl+K         Open global search
⌘/ / Ctrl+/         Show keyboard shortcuts help
Esc                 Close modal/dialog/panel

Navigation:
G → D               Go to Dashboard
G → A               Go to Alerts
G → L               Go to Logs
G → P               Go to Players
G → I               Go to Investigations
G → R               Go to Rules

Tables:
↑ / ↓               Navigate rows
Enter               Open selected row
Space               Toggle selection
⌘A / Ctrl+A         Select all

Alerts:
1-5                 Filter by severity (1=low, 5=critical)
R                   Mark as resolved
D                   Dismiss alert
F                   Flag player

Investigation Page:
T                   Focus timeline tab
E                   Focus economy tab
I                   Focus inventory tab
A                   Focus alerts tab
N                   Add note
B                   Ban player (with confirmation)
S                   Suspend player
```

### Default Sorting
```
Alerts Page:
- Sort by: Severity (critical first)
- Then by: Created time (newest first)

Logs Page:
- Sort by: Timestamp (newest first)

Players Page:
- Sort by: Risk score (highest first)

Investigation Timeline:
- Sort by: Timestamp (newest first, reverse chronological)

Rules Page:
- Sort by: Enabled status (enabled first)
- Then by: Last triggered (most recent first)
```

### Empty States
**Philosophy:** Empathetic, helpful, actionable

#### No Alerts
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                  🎉                                 │
│              All Clear!                             │
│                                                     │
│    No active security alerts at the moment.         │
│  Anti-cheat system is monitoring 1,247 players.     │
│                                                     │
│         Last alert: 3 hours ago (Resolved)          │
│                                                     │
│         [View Resolved Alerts]                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### No Search Results
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                  🔍                                 │
│            No results found                         │
│                                                     │
│       Try adjusting your search or filters.         │
│                                                     │
│       [Clear Filters] [Reset Search]                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### No Logs Yet
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                  📊                                 │
│            No logs yet                              │
│                                                     │
│    Player actions will appear here automatically.   │
│    Check back after players start using the game.   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Error States
**Philosophy:** Clear, non-technical, actionable

#### Failed to Load Data
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                  ⚠️                                  │
│          Failed to load data                        │
│                                                     │
│    We couldn't connect to the database.             │
│    Please check your connection and try again.      │
│                                                     │
│    Error: Connection timeout                        │
│                                                     │
│    [Try Again] [Contact Support]                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Action Failed
```
┌──────────────────────────────────────────────┐
│ ⚠️  Failed to ban player                     │
│                                              │
│ Error: Insufficient permissions              │
│                                              │
│ You need admin-level access to ban players.  │
│ Contact your system administrator.           │
│                                              │
│ [Dismiss]                                    │
└──────────────────────────────────────────────┘
```

### Loading States
**Philosophy:** Show immediate feedback, preserve layout

#### Skeleton Loaders (Preferred)
```
Table loading:
┌──────────────────────────────────────────────────┐
│ ████████  ████████  ████████  ████████          │ ← Shimmer animation
│ ████████  ████████  ████████  ████████          │
│ ████████  ████████  ████████  ████████          │
└──────────────────────────────────────────────────┘

Card loading:
┌──────────────────┐
│ ████████         │
│                  │
│ ████████████     │
│ ████████         │
└──────────────────┘
```

#### Spinner (Minimal Use)
```
Use for:
- Button actions (inline spinner)
- Full page first load
- Modal content loading

┌──────────────────────────────────────────────┐
│                                              │
│                   ⏳                         │
│              Loading...                      │
│                                              │
└──────────────────────────────────────────────┘
```

#### Progress Indicators
```
For long operations (exports, bulk actions):

┌──────────────────────────────────────────────┐
│ Exporting data...                            │
│                                              │
│ ██████████████████░░░░░░░░░░  65%           │
│                                              │
│ Processing 6,500 of 10,000 records...        │
│                                              │
│ [Cancel]                                     │
└──────────────────────────────────────────────┘
```

### Cognitive Load Prevention

#### 1. Progressive Disclosure
```
✓ Show summary first, details on demand
✓ Collapsible sections for advanced options
✓ Tabs to separate concerns
✗ Don't show everything at once
✗ Avoid deep nesting (max 2 levels)
```

#### 2. Chunking Information
```
✓ Group related items (max 5-7 per group)
✓ Use whitespace generously
✓ Visual separators between sections
✗ Don't create walls of text
✗ Avoid cramped layouts
```

#### 3. Consistent Patterns
```
✓ Same action in same place (e.g., [Save] always top-right)
✓ Same colors for same meanings (red = danger everywhere)
✓ Same interaction patterns (click to open, not hover)
✗ Don't change patterns between pages
✗ Avoid mixing metaphors
```

#### 4. Scannability
```
✓ Use visual hierarchy (size, weight, color)
✓ Left-align text, right-align numbers
✓ Highlight important info (bold, color, badges)
✗ Don't use all caps for long text
✗ Avoid center-aligned body text
```

#### 5. Reduce Choices
```
✓ Provide smart defaults
✓ Recommend actions ("Most users choose...")
✓ Hide advanced options behind "Advanced" toggle
✗ Don't show 50 options at once
✗ Avoid decision paralysis
```

#### 6. Immediate Feedback
```
✓ Show loading states immediately
✓ Success/error messages appear instantly
✓ Optimistic updates (show success, rollback if error)
✗ Don't leave users wondering
✗ Avoid silent actions
```

### Toast Notifications
```
Success:
┌──────────────────────────────────────┐
│ ✓ Player banned successfully         │
└──────────────────────────────────────┘
(Green background, auto-dismiss 4s)

Error:
┌──────────────────────────────────────┐
│ ⚠️ Failed to update risk score       │
│ Please try again                     │
└──────────────────────────────────────┘
(Red background, manual dismiss)

Info:
┌──────────────────────────────────────┐
│ ℹ️ Export started (check email)      │
└──────────────────────────────────────┘
(Blue background, auto-dismiss 6s)

Warning:
┌──────────────────────────────────────┐
│ ⚠️ This action cannot be undone      │
│ [Confirm] [Cancel]                   │
└──────────────────────────────────────┘
(Yellow background, requires action)

Position: Top-right corner
Max stack: 3 toasts
Animation: Slide in from right, fade out
```

### Confirmation Dialogs
```
For destructive actions (ban, delete):

┌────────────────────────────────────────────────┐
│ Ban Player Permanently?                        │
├────────────────────────────────────────────────┤
│                                                │
│ You are about to permanently ban:              │
│                                                │
│ • Player: JohnDoe (#1234)                      │
│ • Risk Score: 85 (Critical)                    │
│ • Active Since: Jan 15, 2026                   │
│                                                │
│ This action cannot be undone.                  │
│ The player will not be able to access          │
│ the game or create new accounts.               │
│                                                │
│ Reason (required):                             │
│ [Exploiting game mechanics for monetary gain_] │
│                                                │
│           [Cancel]    [Ban Player]             │
│                                                │
└────────────────────────────────────────────────┘

Design:
- Modal overlay (dark backdrop)
- Centered, max-width: 500px
- Danger action (Ban): Red, right-aligned
- Cancel: Gray, left-aligned
- Escape key: Close/cancel
- Tab navigation: Focus Cancel first (safe default)
```

---

## 10. DO'S AND DON'TS

### ✅ DO's

**Design:**
- ✓ Use consistent spacing (8px grid system)
- ✓ Maintain clear visual hierarchy
- ✓ Use color purposefully (not decoratively)
- ✓ Provide dark mode (easier on eyes for long use)
- ✓ Use monospace font for IDs, code, JSON
- ✓ Keep important actions above the fold
- ✓ Make clickable areas large (min 44x44px)
- ✓ Use tooltips for icon-only buttons

**Data Display:**
- ✓ Show relative timestamps ("2m ago") with full timestamp on hover
- ✓ Format numbers with commas (1,247 not 1247)
- ✓ Use progress bars for percentages
- ✓ Color-code values (green=positive, red=negative)
- ✓ Provide export options (CSV, JSON)
- ✓ Show data freshness ("Updated 30s ago")
- ✓ Paginate long lists (50-100 per page)

**Interaction:**
- ✓ Provide keyboard shortcuts for common actions
- ✓ Confirm destructive actions (delete, ban)
- ✓ Show loading states immediately
- ✓ Allow undo when possible
- ✓ Autosave drafts (notes, configurations)
- ✓ Preserve filter state across navigation
- ✓ Support Cmd/Ctrl+Click for new tabs

**Performance:**
- ✓ Load critical data first (above the fold)
- ✓ Lazy load images and charts
- ✓ Debounce search inputs (300ms)
- ✓ Cache frequently accessed data
- ✓ Show skeleton loaders while loading
- ✓ Virtualize long lists (1000+ items)

**Accessibility:**
- ✓ Maintain keyboard navigation throughout
- ✓ Use semantic HTML (button, nav, header)
- ✓ Provide text alternatives for icons
- ✓ Ensure sufficient color contrast (WCAG AA)
- ✓ Support screen readers (ARIA labels)
- ✓ Allow text resize up to 200%

### ❌ DON'Ts

**Design:**
- ✗ Don't use tiny fonts (<11px for body text)
- ✗ Don't use low contrast colors
- ✗ Don't cram too much in one screen
- ✗ Don't use more than 3 levels of hierarchy
- ✗ Don't use color as the only indicator
- ✗ Don't make users scroll horizontally
- ✗ Don't use click-through menus (use direct links)
- ✗ Don't auto-play animations (distracting)

**Data Display:**
- ✗ Don't show raw timestamps (2026-02-03T14:32:15Z)
- ✗ Don't show truncated data without hover/expand
- ✗ Don't use pie charts (use bars instead)
- ✗ Don't paginate with only "Previous" (show page numbers)
- ✗ Don't hide critical info in tooltips
- ✗ Don't use tables for small datasets (use cards)

**Interaction:**
- ✗ Don't perform destructive actions without confirmation
- ✗ Don't use hover-only interactions (mobile won't work)
- ✗ Don't disable buttons without explaining why
- ✗ Don't auto-refresh without warning (loses scroll position)
- ✗ Don't open links in new tabs without indication
- ✗ Don't use modals for content (use pages)
- ✗ Don't hijack browser back button

**Performance:**
- ✗ Don't load all data at once (10,000+ rows)
- ✗ Don't block UI while loading
- ✗ Don't fetch on every keystroke (use debounce)
- ✗ Don't use synchronous operations
- ✗ Don't load images without lazy loading
- ✗ Don't render off-screen content

**Accessibility:**
- ✗ Don't rely on color alone for meaning
- ✗ Don't trap keyboard focus in modals
- ✗ Don't use placeholder as label
- ✗ Don't auto-focus inputs unexpectedly
- ✗ Don't use custom scrollbars (breaks accessibility)
- ✗ Don't disable zoom on mobile

---

## 11. RESPONSIVE DESIGN

### Breakpoints
```
Mobile:    < 768px
Tablet:    768px - 1024px
Desktop:   > 1024px
Wide:      > 1440px
```

### Mobile Adaptations

**Sidebar:**
- Collapse by default
- Hamburger menu top-left
- Slide-out drawer (overlay)
- Tap outside to close

**Tables:**
- Stack columns vertically (card layout)
- Show 2-3 most important columns
- "View More" button to expand

**Investigation Page:**
- Single column layout
- Left panel → Top section (collapsible)
- Main panel → Middle section (tabs)
- Right panel → Bottom section (collapsible)
- Action bar → Sticky bottom sheet

**Filters:**
- Collapse by default
- "Filters" button shows count (e.g., "Filters (3)")
- Slide up from bottom
- Apply/Clear buttons

### Touch Targets
```
Minimum size: 44x44px
Spacing: 8px minimum between targets
Large touch areas for primary actions
```

---

## 12. IMPLEMENTATION PRIORITIES

### Phase 1: Core Layout (Week 1)
- [ ] Sidebar navigation
- [ ] Top bar with search
- [ ] Page structure
- [ ] Dark mode theme tokens
- [ ] DataTable component

### Phase 2: Alerts & Logs (Week 2)
- [ ] Alerts page with filters
- [ ] Logs page with advanced filters
- [ ] SeverityBadge component
- [ ] TimelineItem component
- [ ] JSONInspector component

### Phase 3: Players & Investigation (Week 3)
- [ ] Players page with risk leaderboard
- [ ] Investigation page (3-panel layout)
- [ ] PlayerCard component
- [ ] MetricCard component
- [ ] Economy/Inventory charts

### Phase 4: Rules & Polish (Week 4)
- [ ] Rules manager with inline editing
- [ ] Keyboard shortcuts
- [ ] Empty/error/loading states
- [ ] Toast notifications
- [ ] Responsive mobile layout

---

## FINAL NOTES

**This is an operational tool, not a customer-facing product.**

Design priorities:
1. **Speed** - Fast load, fast navigation, fast actions
2. **Clarity** - No ambiguity, clear hierarchy, obvious next steps
3. **Reliability** - No bugs, no data loss, predictable behavior
4. **Efficiency** - Minimal clicks, keyboard shortcuts, smart defaults

**The user is an admin investigating potential cheaters.**
- They need evidence quickly
- They need to make decisions confidently
- They work under time pressure
- They use this daily for hours

Design for this reality, not for aesthetics.

---

End of Specification. Ready for implementation.
