# Twitch Login Fix Guide

## Problem
Getting 522 Connection Timed Out when trying to login with Twitch.

## Root Cause
Twitch OAuth provider is not properly configured in Supabase.

---

## COMPLETE FIX STEPS

### Step 1: Configure Twitch Application

1. Go to **Twitch Developer Console**: https://dev.twitch.tv/console/apps
2. Find your existing app OR click **"Register Your Application"**

#### If creating new app:
- **Name**: `osecaadegas Stream Overlay`
- **OAuth Redirect URLs**: Add BOTH of these:
  ```
  https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback
  https://osecaadegas.pt/
  ```
- **Category**: `Website Integration`
- **Client Type**: `Confidential`
- Click **"Create"**

#### If updating existing app:
- Click **"Manage"** on your app
- Under **"OAuth Redirect URLs"**, make sure you have:
  ```
  https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback
  https://osecaadegas.pt/
  ```
- If missing, click **"+ Add URL"** for each one
- Click **"Save"**

### Step 2: Get Twitch Credentials

1. On your Twitch app page, **COPY** your:
   - **Client ID** (visible immediately)
2. Click **"New Secret"** to generate Client Secret
3. **COPY** the **Client Secret** immediately (shown only once!)

### Step 3: Configure Supabase

1. Go to https://supabase.com/dashboard/project/dkfllpjfrhdfvtbltrsy
2. Click **"Authentication"** in left sidebar
3. Click **"Providers"** tab
4. Scroll down and find **"Twitch"**
5. Toggle it **ON** (if not already)
6. Paste your credentials:
   - **Client ID**: [paste from Twitch]
   - **Client Secret**: [paste from Twitch]
7. **IMPORTANT**: Copy the "Redirect URL" shown (should be `https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback`)
8. Click **"Save"**

### Step 4: Verify Redirect URLs Match

Make sure these URLs are IDENTICAL in both places:

**In Twitch App:**
```
https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback
```

**In Supabase Provider Settings:**
```
https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback
```

### Step 5: Update Your Website Redirect

Your current code redirects to: `https://osecaadegas.pt/`

Make sure this URL is also added to Twitch OAuth Redirect URLs (already in Step 1).

---

## Testing

1. Clear your browser cache/cookies
2. Go to https://osecaadegas.pt/login
3. Click **"Continue with Twitch"**
4. You should be redirected to Twitch
5. Authorize the app
6. You should be redirected back and logged in

---

## Common Issues

### "Invalid redirect URI"
- The redirect URL in Twitch app doesn't match exactly
- Make sure there are no trailing slashes differences
- URLs are case-sensitive

### "Invalid client"
- Client ID or Secret was copied incorrectly
- Check for extra spaces
- Try regenerating the secret

### Still getting 522
- Wait 2-3 minutes after saving Supabase settings
- Check if your Supabase project is on free tier and paused (restart it)
- Try in incognito/private browser window

---

## Quick Checklist

- [ ] Twitch app created/updated with correct redirect URLs
- [ ] Twitch Client ID copied
- [ ] Twitch Client Secret generated and copied
- [ ] Supabase Twitch provider enabled (toggle ON)
- [ ] Credentials pasted in Supabase
- [ ] Redirect URLs match exactly
- [ ] Saved settings in Supabase
- [ ] Tested login in browser

---

## Current Configuration

**Supabase URL:** `https://dkfllpjfrhdfvtbltrsy.supabase.co`
**Your Website:** `https://osecaadegas.pt`
**Required Callback:** `https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback`

**Auth Code Location:** `src/context/AuthContext.jsx` (lines 74-81)
**Login Page:** `src/components/Login/LoginPage.jsx`
