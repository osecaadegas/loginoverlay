# Anti-Cheat Threat Model & Security Architecture

**Document Version:** 1.0  
**Last Updated:** February 14, 2026  
**Classification:** Internal - Security Sensitive

---

## Executive Summary

This document provides a comprehensive threat model for the browser-based "The Life" game, identifying realistic attack vectors, threat actors, and mitigation strategies. This is a **production-grade security system** designed to detect and prevent cheating while maintaining legitimate player experience.

---

## 1. Threat Actors & Motivation

### 1.1 Script Kiddies (Low Skill)
- **Motivation:** Quick wins, bragging rights, experimentation
- **Tools:** Tampermonkey, CheatEngine, browser DevTools
- **Threat Level:** Medium (high volume, low sophistication)
- **Attack Style:** Copy-paste scripts, obvious manipulation

### 1.2 Motivated Cheaters (Medium Skill)
- **Motivation:** Competitive advantage, account selling, griefing
- **Tools:** Custom userscripts, API interception, traffic replay
- **Threat Level:** High (moderate volume, medium sophistication)
- **Attack Style:** Systematic exploitation, understanding of game mechanics

### 1.3 Advanced Attackers (High Skill)
- **Motivation:** Financial gain, reputation, security research
- **Tools:** Proxy tools (Burp Suite), custom bots, crypto analysis
- **Threat Level:** Critical (low volume, high sophistication)
- **Attack Style:** Zero-day exploits, reverse engineering, distributed attacks

### 1.4 Insider Threats
- **Motivation:** Account boosting, favoritism, data theft
- **Tools:** Direct database access, admin panel abuse
- **Threat Level:** Critical (rare but devastating)
- **Attack Style:** Privileged access abuse, evidence tampering

---

## 2. Attack Surface Analysis

### 2.1 Client-Side Vulnerabilities

#### **A. JavaScript Manipulation**
**Attack Vector:**
```javascript
// Tampermonkey script example
document.querySelector('#cash-display').addEventListener('DOMSubtreeModified', function() {
  localStorage.setItem('game_cash', '999999999');
  window.playerData.cash = 999999999;
});
```

**Risk:** HIGH  
**Impact:** Unlimited resources, game economy disruption  
**Mitigation:**
- Server-side validation on ALL transactions
- Shadow values (server truth vs client display)
- Checksum validation on critical state
- Honeypot variables to detect manipulation

#### **B. DevTools Console Injection**
**Attack Vector:**
```javascript
// Console injection
window.__gameState.inventory.addItem('legendary_weapon', 999);
window.dispatchEvent(new CustomEvent('game:complete-mission'));
```

**Risk:** HIGH  
**Impact:** Inventory duplication, mission skipping, stat manipulation  
**Mitigation:**
- Never expose game logic to global scope
- Use closures and private scope
- Validate all state changes server-side
- Rate limit all actions

#### **C. Local Storage Tampering**
**Attack Vector:**
```javascript
// Modify localStorage
localStorage.setItem('player_level', '100');
localStorage.setItem('vip_status', 'true');
localStorage.setItem('last_daily_claim', '0');
```

**Risk:** MEDIUM  
**Impact:** Feature unlocking, cooldown bypass, progress skipping  
**Mitigation:**
- Never trust client storage for critical data
- Encrypt sensitive data in localStorage
- Server-side session verification
- Timestamp validation with clock drift detection

#### **D. Client-Side RNG Manipulation**
**Attack Vector:**
```javascript
// Override Math.random()
Math.random = () => 0.999; // Always win
Date.now = () => 1234567890000; // Freeze time
```

**Risk:** CRITICAL  
**Impact:** Guaranteed gambling wins, loot box manipulation  
**Mitigation:**
- **ALL** RNG must be server-side (Supabase Edge Functions)
- Client displays results only, never generates them
- Use cryptographically secure random (crypto.getRandomValues)
- Audit trail for all random outcomes

---

### 2.2 Network-Level Attacks

#### **A. API Request Replay**
**Attack Vector:**
```http
POST /api/claim-daily-reward
Authorization: Bearer eyJhbG...
X-Session-ID: abc123

// Capture and replay 100 times → 100x rewards
```

**Risk:** CRITICAL  
**Impact:** Resource duplication, unlimited daily rewards  
**Mitigation:**
- One-time nonce tokens per request
- Request signing with HMAC
- Idempotency keys on all mutations
- Short-lived tokens (5 min expiry)
- Replay detection via request fingerprinting

#### **B. Race Conditions**
**Attack Vector:**
```javascript
// Send 10 simultaneous requests
Promise.all([
  fetch('/api/purchase-item', { body: itemData }),
  fetch('/api/purchase-item', { body: itemData }),
  // ... repeat 10x
]);
// Goal: Buy 10 items for the price of 1
```

**Risk:** HIGH  
**Impact:** Economy bypass, inventory duplication  
**Mitigation:**
- Database transactions with row-level locking
- Optimistic locking with version numbers
- Request deduplication window (500ms)
- Queue-based processing for critical operations

#### **C. Man-in-the-Middle (MitM)**
**Attack Vector:**
```bash
# Intercept traffic with mitmproxy
mitmproxy --mode transparent
# Modify requests in flight
```

**Risk:** MEDIUM (HTTPS mitigates)  
**Impact:** Parameter tampering, token theft  
**Mitigation:**
- Enforce HTTPS everywhere
- HTTP Strict Transport Security (HSTS)
- Certificate pinning (if mobile app)
- Request integrity checks (HMAC signatures)

#### **D. Rate Limit Bypass**
**Attack Vector:**
```javascript
// Rotate IPs using proxies
const proxies = ['1.2.3.4', '5.6.7.8', ...];
proxies.forEach(proxy => {
  fetch('/api/action', { proxy });
});
```

**Risk:** MEDIUM  
**Impact:** Automation, farming, DoS  
**Mitigation:**
- Multi-factor rate limiting (IP + userId + deviceFingerprint + sessionId)
- Progressive backoff (exponential delays)
- CAPTCHA on suspicious patterns
- Supabase Edge Function for distributed rate limiting

---

### 2.3 Game-Specific Exploits

#### **A. Time Manipulation**
**Attack Vector:**
```javascript
// Override Date object
Date = class extends Date {
  constructor() {
    super(0); // Always return epoch time
  }
};
// Bypass cooldowns, reset daily timers
```

**Risk:** HIGH  
**Impact:** Infinite daily rewards, cooldown bypass, event manipulation  
**Mitigation:**
- Server-side time authority (Supabase timestamps)
- Clock drift detection (±30 seconds tolerance)
- Cooldown verification on server
- Event scheduling server-side only

#### **B. Multi-Account Abuse (Sybil Attack)**
**Attack Vector:**
```bash
# Create 100 accounts using different Twitch accounts
for i in {1..100}; do
  create_twitch_account
  link_game_account
  transfer_resources_to_main
done
```

**Risk:** HIGH  
**Impact:** Resource farming, vote manipulation, referral abuse  
**Mitigation:**
- Device fingerprinting (canvas, WebGL, audio)
- IP address clustering analysis
- Behavioral pattern matching (timing, actions)
- Transfer restrictions between new accounts
- Machine learning clustering (DBSCAN)

#### **C. Botting & Automation**
**Attack Vector:**
```python
# Selenium automation script
from selenium import webdriver
driver = webdriver.Chrome()
driver.get('https://game.com')
while True:
    driver.find_element_by_id('commit-crime').click()
    time.sleep(60)
```

**Risk:** CRITICAL  
**Impact:** Farming, economy imbalance, server load  
**Mitigation:**
- Mouse movement entropy analysis
- Keystroke dynamics profiling
- Action timing variance (humans are inconsistent)
- CAPTCHA on repeated actions
- Selenium/headless browser detection
- WebDriver detection flags

#### **D. Inventory Duplication**
**Attack Vector:**
```javascript
// Exploit race condition in inventory system
async function dupeItem(itemId) {
  await Promise.all([
    api.transferItem(itemId, targetPlayerId),
    api.useItem(itemId),
    api.sellItem(itemId)
  ]);
  // If not atomic, item exists in multiple states
}
```

**Risk:** CRITICAL  
**Impact:** Economy destruction, unfair advantage  
**Mitigation:**
- Database ACID transactions
- Inventory state machine (pending → committed)
- Idempotency keys on transfers
- Optimistic locking with version field
- Post-transaction verification hook

#### **E. Admin Panel Impersonation**
**Attack Vector:**
```javascript
// JWT manipulation (if weak secret)
const fakeJWT = jwt.sign({ role: 'admin', userId: 123 }, 'guessed_secret');
fetch('/api/admin/ban-player', {
  headers: { Authorization: `Bearer ${fakeJWT}` }
});
```

**Risk:** CRITICAL  
**Impact:** Unauthorized bans, data theft, system compromise  
**Mitigation:**
- Strong JWT secrets (256-bit minimum)
- Role-based access control (RBAC) in database RLS
- Admin action audit logging
- Two-factor authentication for admin actions
- IP whitelist for admin endpoints

---

## 3. Detection Strategy Matrix

| Attack Type | Detection Method | Response | Confidence Level |
|-------------|-----------------|----------|------------------|
| DevTools Injection | Honeypot variables, sealed objects | Flag + monitor | 95% |
| API Replay | Nonce validation, timing analysis | Reject + flag | 99% |
| Rate Limit Abuse | Velocity checks, pattern analysis | Throttle + flag | 90% |
| Time Manipulation | Clock drift detection | Reject + flag | 100% |
| Multi-Account | Fingerprint clustering, IP analysis | Flag + investigate | 75% |
| Botting | Mouse entropy, timing variance | CAPTCHA + flag | 85% |
| Race Condition | Transaction conflict detection | Rollback + flag | 100% |
| Inventory Dupe | State consistency checks | Rollback + ban | 100% |
| RNG Manipulation | Server-side RNG only | N/A (prevented) | 100% |
| Admin Impersonation | JWT validation, RBAC | Block + alert | 100% |

---

## 4. Defense-in-Depth Architecture

### Layer 1: Client Hardening
- Code obfuscation (webpack-obfuscator)
- Integrity checks (SRI, CSP headers)
- Honeypot variables
- Sealed object prototypes
- DevTools detection

### Layer 2: Network Security
- HTTPS only (HSTS enabled)
- Request signing (HMAC-SHA256)
- Anti-replay tokens (nonce)
- Rate limiting (multi-factor)
- DDoS protection (Vercel/Cloudflare)

### Layer 3: Application Logic
- Server-side validation on EVERYTHING
- Atomic transactions (PostgreSQL)
- Idempotency enforcement
- State machine enforcement
- Shadow values (server truth)

### Layer 4: Behavioral Analysis
- Velocity checks (actions/minute)
- Pattern recognition (sequences)
- Anomaly detection (z-score)
- Risk scoring (cumulative)
- Machine learning (future)

### Layer 5: Database Security
- Row-Level Security (RLS) policies
- Audit logging (immutable)
- Encrypted sensitive data
- Backup and recovery
- Access control (RBAC)

### Layer 6: Monitoring & Response
- Real-time alerting (Edge Functions)
- Admin dashboard (investigation tools)
- Automated responses (temp ban)
- Evidence collection (forensics)
- Post-incident analysis

---

## 5. Risk Scoring Formula

```typescript
// Comprehensive risk calculation
function calculateRiskScore(player: Player): number {
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
  
  // Clock drift violations (0-20 points)
  score += player.clockDriftViolations * 10;
  
  // Pattern matches (0-30 points)
  score += player.patternMatches * 15;
  
  // Admin manual adjustments (±50 points)
  score += player.manualRiskAdjustment;
  
  // Time decay (older violations matter less)
  const daysSinceLastViolation = (Date.now() - player.lastViolation) / 86400000;
  const decayFactor = Math.max(0.5, 1 - (daysSinceLastViolation / 30));
  
  return Math.round(score * decayFactor);
}

// Risk levels
// 0-20:   Clean (✅)
// 21-50:  Low Risk (⚠️)
// 51-80:  Medium Risk (🟡)
// 81-150: High Risk (🔴)
// 151+:   Critical Risk (🚫 auto-flag)
```

---

## 6. Response Escalation Matrix

| Risk Score | Action | Admin Alert | Auto-Action |
|------------|--------|-------------|-------------|
| 0-20 | None | No | None |
| 21-50 | Monitor | No | Increase logging |
| 51-80 | Flag | Yes (daily digest) | Add to watch list |
| 81-150 | Investigate | Yes (real-time) | Rate limit (50%) |
| 151-200 | Suspend | Yes (urgent) | Temp ban (24h) |
| 201+ | Ban | Yes (critical) | Permanent ban |

---

## 7. Evasion Techniques & Counter-Measures

### Evasion: IP Rotation
**Counter:** Device fingerprinting + behavioral linking

### Evasion: Browser Spoofing
**Counter:** Canvas fingerprinting, WebGL signatures, audio context

### Evasion: Timing Randomization
**Counter:** Entropy analysis, distribution fitting (chi-square test)

### Evasion: Proxy Detection Bypass
**Counter:** ASN blacklisting, latency analysis, TOR detection

### Evasion: Clean Account Age
**Counter:** Trust score accumulation, transfer restrictions for new accounts

### Evasion: Manual Cheating (Slow)
**Counter:** Statistical anomaly detection, long-term pattern analysis

---

## 8. Privacy & Compliance Considerations

### GDPR Compliance
- Pseudonymize IP addresses after 30 days
- Provide data export API for players
- Honor deletion requests (7-day retention)
- Log retention: 90 days (evidence), 30 days (routine)

### Twitch TOS Compliance
- Don't access Twitch credentials
- Don't scrape Twitch data
- Only use authorized OAuth scopes
- Respect Twitch user privacy

### Ethical Boundaries
- No keystroke logging
- No webcam access
- No location tracking beyond IP
- Transparent about anti-cheat measures (TOS)

---

## 9. Testing & Red Team Exercises

### Penetration Test Scenarios
1. **Scenario A:** Attempt inventory duplication via race conditions
2. **Scenario B:** Bypass rate limits using distributed proxies
3. **Scenario C:** Manipulate client-side timers to bypass cooldowns
4. **Scenario D:** Create 50 accounts and cluster analysis evasion
5. **Scenario E:** Automate gameplay with Selenium + anti-detection

### Success Criteria
- Detection rate: >95% for known attacks
- False positive rate: <2%
- Detection latency: <60 seconds
- Investigation time: <10 minutes per case

---

## 10. Known Limitations & Future Enhancements

### Current Limitations
- No machine learning models (phase 2)
- Limited cross-session pattern detection
- Manual admin review required for edge cases
- No integration with external threat intelligence

### Roadmap
- **Q2 2026:** ML-based anomaly detection (Isolation Forest)
- **Q3 2026:** Cross-game behavioral profiling
- **Q4 2026:** Automated ban appeals system
- **Q1 2027:** Integration with threat intelligence feeds

---

## 11. Incident Response Playbook

### Severity 1: Mass Exploitation Detected
1. **Immediate:** Disable affected endpoint (feature flag)
2. **Within 1 hour:** Identify attack vector, patch vulnerability
3. **Within 4 hours:** Rollback affected transactions
4. **Within 24 hours:** Ban confirmed cheaters
5. **Within 7 days:** Post-mortem report

### Severity 2: Sophisticated Individual Cheater
1. **Immediate:** Flag account, increase monitoring
2. **Within 24 hours:** Collect evidence, admin review
3. **Within 72 hours:** Enforce ban if confirmed
4. **Within 7 days:** Update detection rules

### Severity 3: Suspicious Pattern (Unconfirmed)
1. **Immediate:** Add to watch list
2. **Within 7 days:** Review evidence
3. **Within 14 days:** Decision (clear or escalate)

---

## 12. Success Metrics

### Detection Effectiveness
- True positive rate (TPR): >95%
- False positive rate (FPR): <2%
- Mean time to detect (MTTD): <60 seconds
- Mean time to respond (MTTR): <10 minutes

### System Health
- Log ingestion rate: ~1000 events/sec
- Alert fatigue prevention: <10 alerts/day/admin
- Investigation efficiency: <15 min/case
- Ban accuracy: >98% upheld on appeal

### Player Experience
- Legitimate player disruption: 0%
- Cheat prevalence: <0.5% of active players
- Community trust score: >8/10
- Report response time: <24 hours

---

## Appendix A: Glossary

- **Sybil Attack:** Creating multiple fake identities
- **Race Condition:** Timing-based vulnerability exploiting concurrent operations
- **Honeypot:** Fake variable designed to detect manipulation
- **Nonce:** Number used once, prevents replay attacks
- **Idempotency:** Same request produces same result (no duplicates)
- **Device Fingerprinting:** Unique browser/device identification
- **Shadow Value:** Server-side truth value hidden from client
- **Clock Drift:** Difference between client and server time

---

**Document Control:**  
This is a living document. Update monthly or after major incidents.  
Next review: March 14, 2026

