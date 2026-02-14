# 🚀 Anti-Cheat System - Deployment Checklist

**Date:** _____________  
**Deployed By:** _____________  
**Environment:** ☐ Staging  ☐ Production

---

## Pre-Deployment

### 1. Database Migrations ✅

- [ ] **Backup database** before running migrations
- [ ] Run `add_anticheat_configuration_system.sql` in Supabase SQL Editor
- [ ] Verify tables created: `SELECT * FROM anticheat_config LIMIT 1;`
- [ ] Run `enable_rls_policies_for_anticheat.sql` (if not already done)
- [ ] Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename LIKE 'anticheat%';`
- [ ] Test config function: `SELECT get_anticheat_config('velocity_check_enabled');`

**Result:** ☐ Success  ☐ Failed (rollback)

---

### 2. Edge Function Deployment ⚡

- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login to Supabase: `supabase login`
- [ ] Link project: `supabase link --project-ref YOUR_PROJECT_ID`
- [ ] Deploy function: `supabase functions deploy anticheat-detection`
- [ ] Test function manually:
  ```bash
  curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/anticheat-detection' \
    -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
    -d '{"test": true}'
  ```
- [ ] Check function logs: `supabase functions logs anticheat-detection`

**Result:** ☐ Success  ☐ Failed (check logs)

---

### 3. Environment Variables 🔐

- [ ] Generate strong REQUEST_SIGNING_KEY (32 characters):
  ```javascript
  require('crypto').randomBytes(16).toString('hex')
  ```
- [ ] Add to `.env.local`:
  ```env
  VITE_REQUEST_SIGNING_KEY=your_generated_key
  ```
- [ ] Add to Vercel environment variables (if using Vercel)
- [ ] Verify in code: `console.log(import.meta.env.VITE_REQUEST_SIGNING_KEY)`

**Result:** ☐ Success  ☐ Failed

---

### 4. Dependencies 📦

- [ ] Install crypto-js: `npm install crypto-js`
- [ ] Verify installation: `npm list crypto-js`
- [ ] Test import: Create test file that imports crypto-js
- [ ] Run build: `npm run build`
- [ ] Check for errors in build output

**Result:** ☐ Success  ☐ Failed

---

## Deployment

### 5. Code Deployment 🚀

- [ ] All changes committed: `git status`
- [ ] Push to repository: `git push origin main`
- [ ] Vercel deployment triggered automatically
- [ ] Wait for deployment to complete
- [ ] Check Vercel build logs for errors
- [ ] Note deployment URL: _________________________________

**Result:** ☐ Success  ☐ Failed (check logs)

---

## Post-Deployment Testing

### 6. Smoke Tests 🧪

#### A. Admin Panel Access
- [ ] Navigate to `https://yourdomain.com/anticheat`
- [ ] Verify "Anti-Cheat" button appears in sidebar (admin only)
- [ ] Dashboard loads without errors
- [ ] All 4 pages accessible (Dashboard, Alerts, Logs, Players)

#### B. Honeypot System
- [ ] Open browser console (F12)
- [ ] Type: `window.__isAdmin`
- [ ] Check if alert created in `/anticheat/alerts`
- [ ] Verify alert has correct details (honeypot_triggered)

#### C. Logging System
- [ ] Perform any game action (e.g., commit crime)
- [ ] Check `game_logs` table: `SELECT * FROM game_logs ORDER BY created_at DESC LIMIT 1;`
- [ ] Verify log entry created with correct data
- [ ] Check if timestamp is accurate

#### D. Detection Engine
- [ ] Manually trigger Edge Function (use curl or Postman)
- [ ] Check if alerts are created for violations
- [ ] Verify risk scores are updating
- [ ] Check Edge Function logs for errors

#### E. Investigation Page
- [ ] Go to `/anticheat/players`
- [ ] Click on any player
- [ ] Verify investigation page loads with data
- [ ] Test "Export Evidence" button
- [ ] Test "Flag" button (then unflag)

**All Tests Passed:** ☐ Yes  ☐ No (details below)

---

### 7. Configuration Verification ⚙️

- [ ] Check default config loaded:
  ```sql
  SELECT COUNT(*) FROM anticheat_config WHERE is_enabled = true;
  -- Should return ~30 rows
  ```
- [ ] Verify feature flags:
  ```sql
  SELECT * FROM anticheat_feature_flags WHERE is_enabled = true;
  ```
- [ ] Check thresholds:
  ```sql
  SELECT * FROM anticheat_thresholds;
  ```

**Result:** ☐ All configs present  ☐ Missing configs

---

### 8. Performance Check 📊

- [ ] Dashboard loads in <2 seconds
- [ ] Alerts page loads in <2 seconds
- [ ] Investigation page loads in <3 seconds
- [ ] Log queries complete in <1 second
- [ ] Edge Function responds in <500ms
- [ ] No console errors on any page

**Performance:** ☐ Acceptable  ☐ Needs optimization

---

## Security Verification

### 9. Security Checks 🔐

- [ ] RLS policies enabled on all anticheat tables
- [ ] Service role key NOT exposed in client code
- [ ] REQUEST_SIGNING_KEY stored securely (env vars only)
- [ ] Admin panel accessible only to admins
- [ ] Honeypots trigger alerts correctly
- [ ] DevTools detection working (check in incognito)
- [ ] Request signing headers present in network tab

**Security:** ☐ Pass  ☐ Concerns (document below)

---

### 10. Monitoring Setup 📈

- [ ] Supabase Dashboard bookmarked
- [ ] Edge Function logs accessible
- [ ] Database query performance monitored
- [ ] Alert notification system configured (email/Discord/Slack)
- [ ] Weekly metrics tracking spreadsheet created

**Monitoring:** ☐ Configured  ☐ Not configured

---

## Training & Documentation

### 11. Team Onboarding 🎓

- [ ] All admins have access to `/anticheat`
- [ ] Team has read ANTICHEAT_THREAT_MODEL.md
- [ ] Team has read ANTICHEAT_OPERATIONS_GUIDE.md
- [ ] Team has practiced investigation workflow
- [ ] Team knows how to respond to critical alerts
- [ ] Ban/unban process documented and understood
- [ ] Configuration change process documented

**Training:** ☐ Complete  ☐ In progress

---

## Rollback Plan

### 12. Emergency Rollback Procedure 🆘

If critical issues occur:

1. **Disable auto-ban immediately:**
   ```sql
   UPDATE anticheat_config 
   SET value = 'false' 
   WHERE key = 'auto_temp_ban_enabled';
   ```

2. **Disable critical detection rules:**
   ```sql
   UPDATE anticheat_feature_flags
   SET is_enabled = false
   WHERE feature_name IN ('honeypot_variables', 'aggressive_logging');
   ```

3. **Rollback deployment:**
   ```bash
   git revert HEAD
   git push origin main
   ```

4. **Restore database (if needed):**
   - Use Supabase backup from pre-deployment

**Rollback Plan:** ☐ Documented  ☐ Tested

---

## Sign-Off

### Final Checklist ✅

- [ ] All migrations successful
- [ ] Edge Function deployed and tested
- [ ] All smoke tests passed
- [ ] Configuration verified
- [ ] Security checks passed
- [ ] Performance acceptable
- [ ] Team trained
- [ ] Monitoring configured
- [ ] Rollback plan ready
- [ ] Documentation updated

---

### Deployment Status

☐ **APPROVED FOR PRODUCTION**  
☐ **NEEDS MORE TESTING**  
☐ **CRITICAL ISSUES - ROLLBACK**

---

### Signatures

**Deployed By:**  
Name: _____________  
Date: _____________  
Signature: _____________

**Verified By:**  
Name: _____________  
Date: _____________  
Signature: _____________

**Approved By (if production):**  
Name: _____________  
Date: _____________  
Signature: _____________

---

## Post-Deployment Notes

### Issues Encountered:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

### Resolutions Applied:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

### Follow-Up Tasks:
- [ ] _____________________________________________
- [ ] _____________________________________________
- [ ] _____________________________________________

---

## Week 1 Monitoring Plan

After deployment, monitor daily for first week:

**Day 1:**
- [ ] Check for critical alerts every 2 hours
- [ ] Review false positive rate
- [ ] Monitor system performance

**Day 2-3:**
- [ ] Review all alerts
- [ ] Adjust thresholds if needed
- [ ] Check player feedback

**Day 4-7:**
- [ ] Weekly metrics report
- [ ] Team feedback session
- [ ] Update documentation based on learnings

---

**Checklist Version:** 1.0  
**Last Updated:** February 14, 2026
