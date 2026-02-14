# Anti-Cheat System - Complete Operations Guide

**Version:** 1.0  
**Last Updated:** February 14, 2026  
**Audience:** System Administrators, Moderators, Security Team

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Installation & Setup](#installation--setup)
3. [Daily Operations](#daily-operations)
4. [Investigation Workflows](#investigation-workflows)
5. [Configuration Management](#configuration-management)
6. [Alert Response Procedures](#alert-response-procedures)
7. [Ban Management](#ban-management)
8. [Maintenance & Monitoring](#maintenance--monitoring)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

---

## 1. System Overview

### Architecture

The anti-cheat system consists of:

1. **Client-Side Hardening** (`/src/utils/securityHardening.js`)
   - Honeypot variables
   - DevTools detection
   - Request signing
   - Anti-tampering measures

2. **Logging Infrastructure** (`/src/services/antiCheatLogger.js`)
   - Centralized action logging
   - Automatic rule checking
   - Risk score updates

3. **Detection Engine** (Supabase Edge Function: `anticheat-detection`)
   - Real-time log analysis
   - Pattern matching
   - Anomaly detection
   - Automated responses

4. **Admin Panel** (`/anticheat`)
   - Dashboard
   - Alert management
   - Player investigation
   - Configuration

### Data Flow

```
Player Action
    ↓
Client Validation (securityHardening.js)
    ↓
API Request (signed + fingerprinted)
    ↓
Server Validation (Edge Function / RLS)
    ↓
Action Logged (game_logs table)
    ↓
Detection Engine Triggered
    ↓
Alerts Created (if violations detected)
    ↓
Risk Score Updated
    ↓
Automated Response (if threshold met)
    ↓
Admin Notification
```

---

## 2. Installation & Setup

### Prerequisites

- Supabase project
- Vercel deployment
- PostgreSQL 14+
- Node.js 18+

### Database Setup

#### Step 1: Run Migrations

```bash
# From Supabase SQL Editor, run in order:

# 1. Anti-cheat tables (already done)
migrations/add_anticheat_system.sql

# 2. Configuration system
migrations/add_anticheat_configuration_system.sql

# 3. RLS policies
migrations/enable_rls_policies_for_anticheat.sql
```

#### Step 2: Configure Environment Variables

```env
# .env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_REQUEST_SIGNING_KEY=your_32_char_secret_key
```

#### Step 3: Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Deploy detection engine
supabase functions deploy anticheat-detection
```

#### Step 4: Initialize Security Hardening

Add to your main App.jsx:

```javascript
import { securityHardening } from './utils/securityHardening';

// At app startup
useEffect(() => {
  securityHardening.init();
}, []);
```

### Verification

Test the system is working:

1. Open browser console
2. Try to access honeypot: `window.__isAdmin`
3. Check if alert appears in admin panel
4. Verify logs in `game_logs` table

---

## 3. Daily Operations

### Morning Checklist

1. **Review Overnight Alerts**
   - Navigate to `/anticheat/alerts`
   - Filter by severity: Critical, High
   - Check "Requires Review" alerts

2. **Check System Health**
   - Dashboard metrics should be green
   - Verify detection engine is running
   - Check database storage usage

3. **Review High-Risk Players**
   - Go to `/anticheat/players`
   - Sort by risk score (descending)
   - Investigate any new high-risk players

### Weekly Tasks

1. **Configuration Review**
   - Review detection thresholds
   - Update whitelist if needed
   - Check for outdated feature flags

2. **Ban Appeal Review**
   - Review temporary ban expirations
   - Check permanent ban appeals
   - Update ban reasons if needed

3. **Report Generation**
   - Export weekly metrics
   - Analyze detection accuracy
   - Update detection rules based on trends

### Monthly Tasks

1. **System Audit**
   - Review all configuration changes
   - Audit admin actions
   - Update documentation

2. **Performance Tuning**
   - Check log table sizes
   - Optimize slow queries
   - Archive old data

3. **Security Review**
   - Rotate REQUEST_SIGNING_KEY
   - Update honeypot variables
   - Review false positive rate

---

## 4. Investigation Workflows

### Workflow A: Responding to Critical Alert

**Trigger:** Alert with severity = "critical" appears

**Steps:**

1. **Initial Assessment (5 minutes)**
   ```
   - Open alert in admin panel
   - Read alert description and evidence
   - Check player's risk score
   - Review recent actions
   ```

2. **Evidence Collection (10 minutes)**
   ```
   - Navigate to Investigation page
   - Export full evidence package
   - Review timeline for patterns
   - Check related accounts
   ```

3. **Decision Making**
   - **If confirmed cheat:**
     - Flag player immediately
     - Temp ban for 24h (if first offense)
     - Perm ban (if repeat offense or severe)
   
   - **If false positive:**
     - Mark alert as resolved
     - Add player to whitelist (if needed)
     - Document false positive reason

4. **Follow-Up**
   - Update detection rules if needed
   - Notify player (if ban)
   - Document decision in admin notes

### Workflow B: Multi-Account Investigation

**Trigger:** Device fingerprint shows >3 accounts

**Steps:**

1. **Collect Evidence**
   ```sql
   -- Find all players with same fingerprint
   SELECT DISTINCT p.id, p.username, p.created_at
   FROM the_life_players p
   JOIN player_sessions s ON s.player_id = p.id
   WHERE s.device_fingerprint = 'fingerprint_value';
   ```

2. **Analyze Behavior**
   - Check if accounts interact (transfers)
   - Compare action timing patterns
   - Review IP addresses
   - Check registration dates

3. **Determine Relationship**
   - **Same Person:** Ban all accounts
   - **Family Members:** Whitelist device
   - **Public Computer:** Monitor only

### Workflow C: Bot Detection Investigation

**Trigger:** Bot behavior alert (low timing variance)

**Steps:**

1. **Statistical Analysis**
   ```
   - Check coefficient of variation (CV)
   - Plot action intervals histogram
   - Compare to human baseline (CV > 0.3)
   ```

2. **Pattern Recognition**
   - Look for perfect intervals (e.g., every 60s)
   - Check for 24/7 activity
   - Review action diversity

3. **Verification**
   - CAPTCHA challenge (if suspicious)
   - Mouse movement analysis
   - Keystroke dynamics

4. **Action**
   - Confirmed bot → Permanent ban
   - Suspicious → Flag and monitor
   - Human-like → Clear alert

---

## 5. Configuration Management

### Accessing Configuration

Navigate to: `/anticheat/config` (admin only)

### Key Configurations

#### Detection Thresholds

```javascript
// Velocity check
velocity_max_actions_per_minute: 30  // Adjust based on game speed

// Money gain threshold
max_cash_per_crime: 50000  // Maximum reasonable crime payout

// Risk scoring
high_risk_threshold: 80  // When to flag
critical_risk_threshold: 150  // When to auto-ban
```

#### Rate Limiting

```javascript
global_rate_limit_per_minute: 60  // API calls per minute
crime_action_cooldown_seconds: 60  // Time between crimes
transaction_rate_limit_per_minute: 20  // Economy transactions
```

#### Automated Actions

```javascript
auto_flag_enabled: true  // Automatically flag high-risk
auto_flag_threshold: 150  // Risk score for auto-flag
auto_temp_ban_enabled: false  // Enable auto temp-ban (USE WITH CAUTION)
auto_temp_ban_threshold: 200  // Risk score for auto temp-ban
temp_ban_duration_hours: 24  // Duration of temp ban
```

### Whitelisting Players

To whitelist a trusted player:

```sql
INSERT INTO anticheat_whitelist (player_id, reason, whitelisted_checks, added_by)
VALUES (
  'player_uuid',
  'Community VIP - Verified legitimate play',
  ARRAY['velocity_check', 'money_gain_check'],
  'admin_uuid'
);
```

### Blacklisting IPs

```sql
INSERT INTO anticheat_ip_list (ip_address, list_type, reason, added_by)
VALUES (
  '1.2.3.4',
  'blacklist',
  'Known VPN / cheating source',
  'admin_uuid'
);
```

---

## 6. Alert Response Procedures

### Alert Severity Levels

| Severity | Description | Response Time | Action |
|----------|-------------|---------------|--------|
| **Critical** | Confirmed tampering, honeypot trigger | < 1 hour | Investigate immediately, likely ban |
| **High** | Strong indicators, velocity violations | < 4 hours | Investigate, flag player |
| **Medium** | Suspicious patterns, multi-account | < 24 hours | Monitor, collect evidence |
| **Low** | Minor anomalies, edge cases | < 7 days | Review during weekly audit |

### Response Decision Tree

```
Alert Received
    ↓
Is severity Critical or High?
    ↓ Yes          ↓ No
Investigate     Add to queue
    ↓
Review Evidence
    ↓
Confidence > 90%?
    ↓ Yes          ↓ No
Take Action    Monitor more
    ↓
First offense?
    ↓ Yes          ↓ No
Temp Ban 24h   Perm Ban
    ↓
Document & Close
```

### Alert Status Lifecycle

1. **Pending** - New alert, not reviewed
2. **Under Investigation** - Admin reviewing
3. **Action Taken** - Ban/flag applied
4. **False Positive** - Alert cleared
5. **Resolved** - Closed (with or without action)

---

## 7. Ban Management

### Types of Bans

#### Temporary Ban
- Duration: 24 hours (configurable)
- Reason: First offense, non-severe violations
- Effect: Player cannot login until expiry
- Appeal: Auto-expires, no manual review needed

#### Permanent Ban
- Duration: Indefinite
- Reason: Severe cheating, repeat offenses
- Effect: Account disabled permanently
- Appeal: Manual review required

#### Shadow Ban (Optional)
- Duration: Varies
- Effect: Player thinks they're playing, but isolated
- Use: Data collection, behavior analysis

### Applying Bans

#### Via Admin Panel
1. Navigate to Investigation page
2. Click "Temp Ban (24h)" or "Permanent Ban"
3. Confirm action
4. Add reason in prompt

#### Via SQL (Emergency)
```sql
-- Temporary ban
UPDATE the_life_players
SET is_banned = true,
    banned_until = NOW() + INTERVAL '24 hours',
    banned_at = NOW()
WHERE id = 'player_uuid';

-- Permanent ban
UPDATE the_life_players
SET is_banned = true,
    banned_until = NULL,
    banned_at = NOW()
WHERE id = 'player_uuid';
```

### Ban Appeals

#### Player Submits Appeal
1. Player emails support
2. Admin reviews case
3. Check evidence package
4. Make decision

#### Unban Process
```sql
UPDATE the_life_players
SET is_banned = false,
    banned_until = NULL
WHERE id = 'player_uuid';

-- Log unban
INSERT INTO admin_actions (action_type, target_player_id, reason)
VALUES ('unban', 'player_uuid', 'Appeal accepted - false positive');
```

---

## 8. Maintenance & Monitoring

### Database Maintenance

#### Weekly Cleanup

```sql
-- Delete old logs (>90 days)
DELETE FROM game_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Pseudonymize old IP addresses (>30 days)
UPDATE player_sessions
SET ip_address = md5(ip_address::text)::text
WHERE created_at < NOW() - INTERVAL '30 days'
  AND ip_address NOT LIKE 'md5:%';

-- Archive old alerts
INSERT INTO security_alerts_archive
SELECT * FROM security_alerts
WHERE created_at < NOW() - INTERVAL '365 days';

DELETE FROM security_alerts
WHERE created_at < NOW() - INTERVAL '365 days';
```

#### Performance Monitoring

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%anticheat%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%game_logs%'
  OR query LIKE '%security_alerts%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Monitoring Metrics

Track these weekly:

- **Detection Metrics**
  - True positive rate (confirmed cheats / total alerts)
  - False positive rate (false alarms / total alerts)
  - Mean time to detect (MTTD)
  - Mean time to respond (MTTR)

- **System Health**
  - Log ingestion rate (events/sec)
  - Database size growth
  - Edge Function errors
  - API response times

- **Player Metrics**
  - Active players
  - Banned players (total / this week)
  - Flagged players
  - Risk score distribution

---

## 9. Troubleshooting

### Issue: Logs not being created

**Symptoms:** game_logs table is empty

**Possible Causes:**
1. RLS policies not enabled
2. Client not calling logger
3. Supabase connection error

**Solution:**
```sql
-- Check RLS policies
SELECT * FROM information_schema.table_privileges 
WHERE table_name = 'game_logs';

-- Verify policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'game_logs';

-- Test insert manually
INSERT INTO game_logs (player_id, action_type, description)
VALUES ('test-uuid', 'test_action', 'Test log');
```

### Issue: Edge Function not triggering

**Symptoms:** Alerts not being created automatically

**Check:**
```bash
# View function logs
supabase functions logs anticheat-detection

# Test function manually
curl -X POST \
  'https://your-project.supabase.co/functions/v1/anticheat-detection' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -d '{"logId": "test-log-id", "playerId": "test-player-id"}'
```

### Issue: High false positive rate

**Symptoms:** Legitimate players getting flagged

**Investigation:**
1. Review recent alerts
2. Identify common pattern
3. Adjust threshold in config

**Example:** Too many velocity violations

```sql
-- Increase velocity threshold
UPDATE anticheat_config
SET value = '50'
WHERE key = 'velocity_max_actions_per_minute';
```

### Issue: Honeypot not detecting tampering

**Symptoms:** No alerts despite known tampering

**Check:**
1. Verify securityHardening.js is loaded
2. Check browser console for errors
3. Test manually: `window.__isAdmin`

---

## 10. API Reference

### Client-Side API

#### securityHardening

```javascript
import { securityHardening } from './utils/securityHardening';

// Initialize (automatic on import)
securityHardening.init();

// Create signed request
const requestConfig = await securityHardening.secureRequest(
  'POST',
  '/api/endpoint',
  { data: 'value' }
);

// Use in fetch
fetch('/api/endpoint', requestConfig);
```

#### antiCheatLogger

```javascript
import antiCheatLogger from './services/antiCheatLogger';

// Log action
await antiCheatLogger.logAction(playerId, 'commit_crime', {
  oldValue: 1000,
  newValue: 2000,
  valueDiff: 1000,
  metadata: { crimeType: 'robbery' }
});

// Log economy transaction
await antiCheatLogger.logEconomyTransaction(
  playerId,
  'earned',
  5000,
  'crime',
  crimeId
);
```

### Server-Side API

#### Supabase Functions

```typescript
// Call detection engine
const { data, error } = await supabase.functions.invoke('anticheat-detection', {
  body: {
    logId: 'log-uuid',
    playerId: 'player-uuid',
    actionType: 'commit_crime'
  }
});
```

#### Database Functions

```sql
-- Get config value
SELECT get_anticheat_config('velocity_max_actions_per_minute');

-- Check if player is whitelisted
SELECT is_player_whitelisted('player_uuid', 'velocity_check');

-- Check if IP is blacklisted
SELECT is_ip_blacklisted('1.2.3.4'::inet);

-- Check if feature is enabled
SELECT is_feature_enabled('honeypot_enabled');
```

---

## Appendix A: Example Alerts

### Critical: Honeypot Triggered
```json
{
  "alert_type": "honeypot_triggered",
  "severity": "critical",
  "description": "Honeypot variable accessed: __godMode",
  "evidence": {
    "honeypotName": "__godMode",
    "timestamp": "2026-02-14T10:30:00Z",
    "userAgent": "Mozilla/5.0..."
  },
  "action_taken": "Flag player, investigate immediately"
}
```

### High: Velocity Violation
```json
{
  "alert_type": "velocity_violation",
  "severity": "high",
  "description": "45 actions in 1 minute (limit: 30)",
  "evidence": {
    "actionCount": 45,
    "timeWindow": "1 minute",
    "threshold": 30
  },
  "action_taken": "Add 15 risk points, monitor"
}
```

### Medium: Multi-Account Detection
```json
{
  "alert_type": "multi_account_detection",
  "severity": "medium",
  "description": "4 accounts detected on same device",
  "evidence": {
    "accountCount": 4,
    "fingerprint": "abc123..."
  },
  "action_taken": "Investigate related accounts"
}
```

---

## Appendix B: Risk Score Calculation

```typescript
function calculateRiskScore(player) {
  let score = 0;
  
  // Velocity violations (0-40 points)
  score += player.velocityViolations * 10;
  
  // Suspicious money gains (0-40 points)
  score += player.suspiciousMoneyGains * 8;
  
  // Inventory anomalies (0-30 points)
  score += player.suspiciousInventoryChanges * 6;
  
  // Failed validations (0-30 points)
  score += player.failedValidations * 5;
  
  // Multi-account indicators (0-25 points)
  score += player.multiAccountScore * 5;
  
  // Bot-like behavior (0-25 points)
  score += player.botLikeness * 5;
  
  // Manual admin adjustments (±50 points)
  score += player.manualRiskAdjustment;
  
  // Time decay (older violations matter less)
  const daysSinceLastViolation = 
    (Date.now() - player.lastViolation) / 86400000;
  const decayFactor = Math.max(0.5, 1 - (daysSinceLastViolation / 30));
  
  return Math.round(score * decayFactor);
}
```

---

**End of Operations Guide**

For questions or issues, contact: security@yourgame.com
