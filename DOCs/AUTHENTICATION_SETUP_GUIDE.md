# Authentication Setup Guide

## Overview
This guide will walk you through setting up Supabase authentication and deploying to a new Vercel project.

---

## Part 1: Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign In"** (create account if needed)
3. Click **"New Project"**
4. Fill in the details:
   - **Name**: Choose a name (e.g., "reactoverlay-auth")
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click **"Create new project"**
6. Wait 2-3 minutes for setup to complete

### Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click **"Settings"** (gear icon in sidebar)
2. Click **"API"** in the settings menu
3. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
4. **Copy these values** - you'll need them next!

### Step 3: Configure Email Authentication

1. In Supabase, go to **"Authentication"** > **"Providers"**
2. Find **"Email"** and ensure it's **enabled**
3. Under **"Email"** settings:
   - **Enable email confirmations**: ON (recommended) or OFF (for testing)
   - If OFF, users can login immediately after signup
   - If ON, users must verify email before login

### Step 4: Add Environment Variables Locally

1. Create a `.env` file in your project root (if it doesn't exist):
   ```
   VITE_SUPABASE_URL=your_actual_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
   ```

2. Replace the values with your actual credentials from Step 2

3. **IMPORTANT**: Add `.env` to your `.gitignore` file:
   ```
   .env
   .env.local
   ```

### Step 5: Test Locally

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser and try to register a new account
3. You should see the login/register page
4. Create an account and verify it works!

---

## Part 2: Vercel Deployment

### Step 1: Prepare Your Project

1. Make sure all changes are committed to Git:
   ```bash
   git add .
   git commit -m "Add Supabase authentication"
   git push
   ```

### Step 2: Create New Vercel Project

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Add New..."** > **"Project"**
3. Import your GitHub repository:
   - Click **"Import"** next to your `overlayV2` repository
   - If you don't see it, click **"Adjust GitHub App Permissions"**

### Step 3: Configure Build Settings

1. **Framework Preset**: Vite (should auto-detect)
2. **Root Directory**: `./` (keep as is)
3. **Build Command**: `npm run build` (default is fine)
4. **Output Directory**: `dist` (default is fine)

### Step 4: Add Environment Variables in Vercel

**CRITICAL STEP - Don't skip this!**

1. Before clicking "Deploy", expand **"Environment Variables"**
2. Add these two variables:
   - **Name**: `VITE_SUPABASE_URL`
     **Value**: Your Supabase URL from Part 1, Step 2
   
   - **Name**: `VITE_SUPABASE_ANON_KEY`
     **Value**: Your Supabase anon key from Part 1, Step 2

3. Make sure both variables are for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

### Step 5: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. You'll get a URL like: `https://your-project-name.vercel.app`

### Step 6: Update Supabase Site URL (Important!)

1. Go back to your **Supabase dashboard**
2. Navigate to **"Authentication"** > **"URL Configuration"**
3. Update **"Site URL"** to your Vercel URL:
   ```
   https://your-project-name.vercel.app
   ```
4. Click **"Save"**

### Step 7: Test Production Site

1. Visit your Vercel URL
2. Try registering a new account
3. Test login/logout functionality
4. Everything should work!

---

## Part 3: Managing Users

### View Registered Users

1. In Supabase dashboard, go to **"Authentication"** > **"Users"**
2. You'll see all registered users
3. You can manually:
   - Verify email addresses
   - Delete users
   - Reset passwords

### Manual User Verification (if email confirmation is ON)

1. Go to **"Authentication"** > **"Users"**
2. Find the user
3. Click the **"..."** menu
4. Select **"Confirm email"**

---

## Part 4: Troubleshooting

### Issue: "Invalid project URL or key"
- Double-check your `.env` file has the correct credentials
- Restart your dev server after adding `.env`
- In Vercel, verify environment variables are set correctly

### Issue: "Email confirmation required"
- In Supabase > Authentication > Providers > Email
- Turn OFF "Enable email confirmations" for easier testing
- Or manually verify users in the dashboard

### Issue: Can't see login page
- Clear browser cache
- Check browser console for errors
- Verify all files were created correctly

### Issue: Works locally but not on Vercel
- Verify environment variables are set in Vercel
- Check Vercel build logs for errors
- Redeploy: Vercel Dashboard > Deployments > "..." > Redeploy

---

## Part 5: Optional Enhancements

### Add Password Reset

You can add password reset functionality by using Supabase's built-in method:
```javascript
const { data, error } = await supabase.auth.resetPasswordForEmail(email);
```

### Add Social Logins

In Supabase dashboard:
1. Go to **"Authentication"** > **"Providers"**
2. Enable Google, GitHub, Discord, etc.
3. Follow provider-specific setup instructions

### Restrict Access to Specific Emails

You can add email domain restrictions in your registration logic or use Supabase's Row Level Security policies.

---

## Summary Checklist

- [ ] Created Supabase project
- [ ] Copied Supabase URL and anon key
- [ ] Created `.env` file locally with credentials
- [ ] Tested authentication locally
- [ ] Pushed code to GitHub
- [ ] Created new Vercel project
- [ ] Added environment variables in Vercel
- [ ] Deployed to Vercel
- [ ] Updated Supabase Site URL with Vercel URL
- [ ] Tested authentication on production site

---

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard > Logs
2. Check Vercel logs: Project > Deployments > Click deployment > View logs
3. Check browser console for errors (F12)

**Your old version is safe!** This is a completely separate deployment.
