# OAuth Login Setup Guide (Google & Twitch)

## ✅ Code is Ready!

The login modal now has "Continue with Google" and "Continue with Twitch" buttons. Now you need to configure the OAuth providers in Supabase.

---

## 🔧 Part 1: Enable OAuth in Supabase

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"Authentication"** in the left sidebar
4. Click **"Providers"** tab

---

## 🔴 Part 2: Setup Google OAuth

### Step 1: Create Google OAuth App

1. Go to **Google Cloud Console**: https://console.cloud.google.com
2. Create a new project (or select existing one)
   - Click dropdown at top → **"New Project"**
   - Name it: `Stream Overlay Login`
   - Click **"Create"**

### Step 2: Enable Google+ API

1. In the left menu, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"**
3. Click on it and click **"Enable"**

### Step 3: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. If prompted, configure consent screen first:
   - Click **"CONFIGURE CONSENT SCREEN"**
   - Choose **"External"** → Click **"Create"**
   - Fill in:
     - App name: `Stream Overlay`
     - User support email: Your email
     - Developer contact: Your email
   - Click **"Save and Continue"** (skip scopes, test users)
   - Click **"Back to Dashboard"**

4. Now create OAuth Client ID:
   - Application type: **"Web application"**
   - Name: `Stream Overlay Login`
   - **Authorized JavaScript origins**: Add these:
     ```
     https://loginoverlay.vercel.app
     http://localhost:5173
     ```
   - **Authorized redirect URIs**: Add this (GET IT FROM SUPABASE):
     ```
     https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback
     ```
   - Click **"Create"**

5. **COPY** your:
   - Client ID (looks like: `123456789-abc.apps.googleusercontent.com`)
   - Client Secret (looks like: `GOCSPX-abc123`)

### Step 4: Configure in Supabase

1. Back in Supabase → **Authentication** → **Providers**
2. Find **"Google"** in the list
3. Toggle it **ON**
4. Paste:
   - **Client ID**: Your Google Client ID
   - **Client Secret**: Your Google Client Secret
5. Copy the **"Callback URL"** shown (you need this for Step 3 above)
6. Click **"Save"**

---

## 🟣 Part 3: Setup Twitch OAuth

### Step 1: Create Twitch App

1. Go to **Twitch Developer Console**: https://dev.twitch.tv/console
2. Log in with your Twitch account
3. Click **"Register Your Application"**

### Step 2: Fill Application Details

1. **Name**: `Stream Overlay Login`
2. **OAuth Redirect URLs**: Add these (one at a time):
   ```
   https://dkfllpjfrhdfvtbltrsy.supabase.co/auth/v1/callback
   https://loginoverlay.vercel.app
   ```
3. **Category**: Choose **"Website Integration"**
4. **Client Type**: **"Confidential"**
5. Click **"Create"**

### Step 3: Get Credentials

1. After creating, click **"Manage"** on your app
2. **COPY** your:
   - **Client ID** (visible immediately)
3. Click **"New Secret"** to generate Client Secret
4. **COPY** the **Client Secret** (you can only see this once!)

### Step 4: Configure in Supabase

1. Back in Supabase → **Authentication** → **Providers**
2. Find **"Twitch"** in the list
3. Toggle it **ON**
4. Paste:
   - **Client ID**: Your Twitch Client ID
   - **Client Secret**: Your Twitch Client Secret
5. Click **"Save"**

---

## ✅ Testing

### 1. Wait for Vercel Deployment
- The code is already pushed
- Wait 1-2 minutes for deployment
- Check: https://vercel.com/dashboard

### 2. Test Google Login
1. Go to https://loginoverlay.vercel.app
2. Click **"Login / Sign Up"**
3. Click **"Continue with Google"**
4. You should be redirected to Google
5. Select your Google account
6. You'll be redirected back and logged in!

### 3. Test Twitch Login
1. Same process but click **"Continue with Twitch"**
2. Authorize with Twitch
3. Redirected back logged in!

---

## 🔍 Troubleshooting

### Error: "Redirect URI mismatch"
- Make sure you added the EXACT redirect URI in Google/Twitch console
- Supabase callback URL format: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

### Error: "Invalid client"
- Double-check Client ID and Secret in Supabase
- Make sure you copied them correctly (no extra spaces)

### Users not appearing in admin panel
- OAuth users are auto-created in `auth.users`
- The trigger we created earlier should add them to `user_roles` automatically
- If not, run this SQL:
  ```sql
  INSERT INTO user_roles (user_id, role, is_active, moderator_permissions)
  SELECT id, 'user', true, '{}'::jsonb
  FROM auth.users
  WHERE id NOT IN (SELECT user_id FROM user_roles);
  ```

---

## 📋 Quick Checklist

- [ ] Create Google OAuth app
- [ ] Copy Google Client ID & Secret
- [ ] Enable Google in Supabase
- [ ] Create Twitch OAuth app  
- [ ] Copy Twitch Client ID & Secret
- [ ] Enable Twitch in Supabase
- [ ] Test Google login
- [ ] Test Twitch login
- [ ] Verify users appear in admin panel

---

## 🎉 Done!

Once configured, users can:
- ✅ Sign in with Google (one click)
- ✅ Sign in with Twitch (one click)
- ✅ Still use email/password (fallback)

All OAuth users will have the same `user` role by default and can be upgraded to `premium`/`moderator`/`admin` from the admin panel!
