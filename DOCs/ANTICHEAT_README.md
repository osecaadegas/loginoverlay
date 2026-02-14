# 🛡️ Production-Grade Anti-Cheat System

A comprehensive, enterprise-level anti-cheat system for browser-based games using Supabase and vanilla JavaScript/React.

## 🚀 Features

### ✅ Threat Detection
- **Velocity Checking** - Detects rapid-fire actions (bot-like behavior)
- **Impossible Value Detection** - Server-side validation of all transactions
- **Clock Drift Detection** - Prevents time manipulation exploits
- **Pattern Matching** - Identifies known exploit signatures
- **Multi-Account Detection** - Device fingerprinting + IP clustering
- **Bot Behavior Analysis** - Statistical timing analysis (coefficient of variation)
- **Honeypot System** - Fake variables that trigger alerts when accessed
- **Inventory Consistency Checks** - Prevents duplication glitches
- **Failed Validation Tracking** - Accumulates suspicious validation failures

### 🔐 Client-Side Hardening
- Request signing (HMAC-SHA256)
- Anti-replay tokens (nonces)
- Honeypot variables (triggers on tampering)
- DevTools detection (3 methods)
- Sealed critical objects (Math.random, Date.now)
- Device fingerprinting (canvas, WebGL, browser entropy)
- Tampermonkey/userscript detection
- Selenium/WebDriver detection

### 📊 Admin Dashboard
- **Real-time Dashboard** - System metrics, recent alerts, high-risk players
- **Alert Management** - Filter, search, and respond to security alerts
- **Player Investigation** - Comprehensive forensic tool with timeline, sessions, evidence export
- **Log Viewer** - Searchable action logs with expandable JSON
- **Risk Leaderboard** - Top players by risk score with visual indicators
- **Configuration Panel** - Runtime configuration of detection rules

### ⚙️ Configuration System
- Runtime-adjustable thresholds
- Feature flags (enable/disable checks dynamically)
- Player whitelist (trusted players)
- IP blacklist/whitelist
- Device blacklist
- Alert suppression rules
- Audit trail for all config changes

### 🤖 Automated Responses
- Auto-flagging at configurable risk thresholds
- Temporary auto-bans (optional, disabled by default)
- Rate limiting for high-risk players
- Escalation matrix based on severity

## 📦 Installation

### Prerequisites

- Supabase project
- Vercel/GitHub Pages deployment
- Node.js 18+
- PostgreSQL 14+

### Step 1: Database Setup

Run migrations in order:

```sql
-- 1. Anti-cheat tables
migrations/add_anticheat_system.sql

-- 2. Configuration system
migrations/add_anticheat_configuration_system.sql

-- 3. Enable RLS policies
migrations/enable_rls_policies_for_anticheat.sql
```

### Step 2: Environment Variables

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_REQUEST_SIGNING_KEY=your_32_character_secret_key_here
```

### Step 3: Deploy Edge Function

```bash
npm install -g supabase
supabase functions deploy anticheat-detection
```

### Step 4: Install Dependencies

```bash
npm install crypto-js
```

### Step 5: Initialize in Your App

```javascript
// App.jsx
import { securityHardening } from './utils/securityHardening';
import antiCheatLogger from './services/antiCheatLogger';

function App() {
  useEffect(() => {
    // Initialize security hardening
    securityHardening.init();
  }, []);
  
  // ... rest of your app
}
```

### Step 6: Add Anti-Cheat Routes

Already configured in `/anticheat` route:
- `/anticheat/dashboard` - Overview
- `/anticheat/alerts` - Alert management
- `/anticheat/logs` - Action logs
- `/anticheat/players` - Risk leaderboard
- `/anticheat/investigate` - Player investigation

## 🎯 Usage

### Logging Player Actions

```javascript
import antiCheatLogger from './services/antiCheatLogger';

// Log a game action
await antiCheatLogger.logAction(playerId, 'commit_crime', {
  oldValue: 1000,
  newValue: 2000,
  valueDiff: 1000,
  metadata: {
    crimeType: 'robbery',
    location: 'bank'
  }
});

// Log economy transaction
await antiCheatLogger.logEconomyTransaction(
  playerId,
  'earned',  // or 'spent', 'transfer', etc.
  5000,
  'crime',
  crimeId
);
```

### Making Secure API Requests

```javascript
import { secureGameAction } from './utils/securityHardening';

// Automatically signs and fingerprints the request
const result = await secureGameAction('commit_crime', {
  crimeType: 'robbery'
});
```

### Checking if Player is Whitelisted

```sql
SELECT is_player_whitelisted('player_uuid', 'velocity_check');
```

### Configuring Detection Thresholds

```sql
-- Via SQL
UPDATE anticheat_config
SET value = '50'
WHERE key = 'velocity_max_actions_per_minute';

-- Or via admin panel: /anticheat/config
```

## 📖 Documentation

### Core Documents

1. **[Threat Model](DOCs/ANTICHEAT_THREAT_MODEL.md)** - Comprehensive attack vector analysis
2. **[Operations Guide](DOCs/ANTICHEAT_OPERATIONS_GUIDE.md)** - Daily operations, investigation workflows
3. **[System Guide](DOCs/ANTICHEAT_SYSTEM_GUIDE.md)** - Already exists in your docs

### Key Concepts

#### Risk Scoring

Risk scores accumulate based on violations:

| Violation Type | Points Added |
|----------------|--------------|
| Velocity violation | +10 |
| Suspicious money gain | +8 |
| Inventory anomaly | +6 |
| Failed validation | +5 |
| Multi-account indicator | +5 |
| Bot-like behavior | +5 |

**Risk Levels:**
- 0-20: Clean ✅
- 21-50: Low Risk ⚠️
- 51-80: Medium Risk 🟡
- 81-150: High Risk 🔴
- 151+: Critical Risk 🚫 (auto-flagged)

#### Time Decay

Risk scores decay over 30 days:
```javascript
decayFactor = max(0.5, 1 - (daysSinceLastViolation / 30))
finalScore = score * decayFactor
```

## 🔍 Admin Workflows

### Investigating a Player

1. Go to `/anticheat/players`
2. Click on player with high risk score
3. Review tabs: Overview, Timeline, Alerts, Sessions
4. Export evidence if needed
5. Take action: Flag, Temp Ban, or Perm Ban

### Responding to Critical Alert

1. Alert appears in `/anticheat/alerts`
2. Click to view details
3. Check evidence (JSON payload)
4. Navigate to player investigation
5. Review timeline and sessions
6. Make decision (ban/flag/clear)

### Whitelisting Trusted Player

```sql
INSERT INTO anticheat_whitelist (player_id, reason, whitelisted_checks)
VALUES (
  'player_uuid',
  'Community VIP - verified legitimate',
  ARRAY['velocity_check', 'money_gain_check']
);
```

## 🧪 Testing the System

### Test Honeypot

```javascript
// In browser console
window.__isAdmin  // Should trigger alert
window.__godMode  // Should trigger alert
window.__cheat.enable()  // Should trigger alert
```

### Test Velocity Detection

```javascript
// Rapidly call an action (>30 times per minute)
for (let i = 0; i < 50; i++) {
  await gameAction();
}
// Should create velocity violation alert
```

### Test Clock Drift

```javascript
// Override Date.now (client-side hardening should prevent this)
Date.now = () => 0;
// Should trigger clock drift or tampering alert
```

## 📊 Monitoring

### Key Metrics to Track

1. **Detection Metrics**
   - True positive rate: >95%
   - False positive rate: <2%
   - Mean time to detect: <60 seconds

2. **System Health**
   - Log ingestion rate: ~1000 events/sec
   - Database size growth
   - Edge Function error rate

3. **Player Metrics**
   - Total active players
   - Flagged players
   - Banned players
   - Risk score distribution

### Database Maintenance

```sql
-- Weekly cleanup (logs older than 90 days)
DELETE FROM game_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- Pseudonymize old IPs (privacy compliance)
UPDATE player_sessions
SET ip_address = md5(ip_address::text)::text
WHERE created_at < NOW() - INTERVAL '30 days';
```

## 🚨 Incident Response

### Severity 1: Mass Exploitation
1. Disable affected endpoint (feature flag)
2. Identify attack vector
3. Deploy patch within 1 hour
4. Rollback affected transactions
5. Ban confirmed cheaters within 24 hours

### Severity 2: Individual Sophisticated Cheater
1. Flag account immediately
2. Collect evidence (24 hours)
3. Admin review
4. Ban if confirmed (72 hours)

### Severity 3: Suspicious Pattern (Unconfirmed)
1. Add to watch list
2. Review evidence (7 days)
3. Decision: clear or escalate

## 🛠️ Configuration Reference

### Detection Settings

```javascript
{
  velocity_check_enabled: true,
  velocity_max_actions_per_minute: 30,
  clock_drift_tolerance_seconds: 30,
  multi_account_detection_enabled: true,
  bot_detection_enabled: true,
  pattern_matching_enabled: true
}
```

### Risk Scoring

```javascript
{
  velocity_violation_points: 10,
  suspicious_money_points: 8,
  failed_validation_points: 5,
  risk_decay_days: 30,
  low_risk_threshold: 20,
  high_risk_threshold: 80,
  critical_risk_threshold: 150
}
```

### Automated Actions

```javascript
{
  auto_flag_enabled: true,
  auto_flag_threshold: 150,
  auto_temp_ban_enabled: false,  // USE WITH CAUTION
  auto_temp_ban_threshold: 200,
  temp_ban_duration_hours: 24
}
```

## 🤝 Contributing

This is a production system. Changes should be:
1. Tested thoroughly in staging
2. Reviewed by security team
3. Documented in operations guide
4. Deployed during low-traffic windows

## 📜 License

Internal use only. Not for redistribution.

## 🆘 Support

- **Security Issues:** security@yourgame.com
- **Bug Reports:** Create issue in repo
- **Feature Requests:** Discuss with team first

## 🎓 Training

New admin onboarding:
1. Read Threat Model document
2. Read Operations Guide
3. Shadow experienced admin for 1 week
4. Review 10 past cases
5. Take training quiz
6. Get admin access

## ⚠️ Known Limitations

- No machine learning models (planned for Q2 2026)
- Limited cross-session pattern detection
- Manual review required for edge cases
- No external threat intelligence integration

## 🗺️ Roadmap

- **Q2 2026:** ML-based anomaly detection (Isolation Forest)
- **Q3 2026:** Cross-game behavioral profiling
- **Q4 2026:** Automated ban appeals system
- **Q1 2027:** Threat intelligence feed integration

---

**Version:** 1.0  
**Last Updated:** February 14, 2026  
**Maintainer:** Security Team

**Remember:** This system makes cheating harder, not impossible. The goal is to detect and respond faster than cheaters can adapt. Always validate server-side. Never trust the client.
