# 🚀 Quick Setup Guide - SaaS Overlay Platform

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- Supabase account (free tier works)
- Stripe account
- Twitch Developer account
- Domain name (for production)

---

## Step 1: Clone & Install

```bash
cd websiteV3
npm install
```

### Additional Dependencies

```bash
npm install stripe micro
```

---

## Step 2: Supabase Setup

### Create Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `overlay-saas`
4. Database Password: (save this!)
5. Region: Choose closest to users

### Run Migrations

1. Open Supabase SQL Editor
2. Copy & paste each migration file in order:
   - `migrations/create_saas_overlay_system.sql`
   - `migrations/create_stripe_integration.sql`
3. Click "RUN"
4. Verify tables created: `overlays`, `subscriptions`, `widgets`, etc.

### Enable Realtime

```sql
-- Run this in SQL Editor
alter publication supabase_realtime add table overlays;
alter publication supabase_realtime add table widgets;
alter publication supabase_realtime add table widget_state;
```

### Get API Keys

1. Dashboard → Settings → API
2. Copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon/public key` → `VITE_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

---

## Step 3: Twitch OAuth Setup

### Register Application

1. Go to https://dev.twitch.tv/console/apps
2. Click "Register Your Application"
3. Fill in:
   - Name: `Your Overlay Platform`
   - OAuth Redirect URLs: 
     - `http://localhost:5173/auth/callback` (development)
     - `https://yourdomain.com/auth/callback` (production)
     - `https://[supabase-project].supabase.co/auth/v1/callback`
   - Category: `Broadcasting Suite`
4. Click "Create"
5. Copy `Client ID` and generate `Client Secret`

### Configure Supabase Auth

1. Supabase Dashboard → Authentication → Providers
2. Find "Twitch"
3. Enable it
4. Paste:
   - Client ID (from Twitch)
   - Client Secret (from Twitch)
5. Copy the Redirect URL shown
6. Save

---

## Step 4: Stripe Setup

### Create Account & Products

1. Go to https://dashboard.stripe.com
2. **Create Products**:

   **Starter Plan**
   - Name: `Starter`
   - Price: `$9.99/month`
   - Copy Price ID (e.g., `price_xxxxx`)

   **Pro Plan**
   - Name: `Pro`
   - Price: `$19.99/month`
   - Copy Price ID

   **Business Plan**
   - Name: `Business`
   - Price: `$49.99/month`
   - Copy Price ID

3. **Insert into Database**:
   ```sql
   INSERT INTO subscription_plans (name, stripe_price_id, monthly_price, features, widget_limit, custom_themes_enabled)
   VALUES 
     ('Starter', 'price_starter_id', 999, '["5 widgets", "Basic themes"]'::jsonb, 5, false),
     ('Pro', 'price_pro_id', 1999, '["Unlimited widgets", "Custom themes", "Priority support"]'::jsonb, null, true),
     ('Business', 'price_business_id', 4999, '["Everything in Pro", "White-label", "API access"]'::jsonb, null, true);
   ```

### Get API Keys

1. Dashboard → Developers → API Keys
2. Copy:
   - `Publishable key` → `STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → `STRIPE_SECRET_KEY`

### Set Up Webhook (for production)

1. Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.created`
5. Copy `Signing secret` → `STRIPE_WEBHOOK_SECRET`

---

## Step 5: Environment Variables

Create `.env` file in project root:

```bash
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# App
VITE_APP_URL=http://localhost:5173
NODE_ENV=development
```

⚠️ **Never commit `.env` to git!**

---

## Step 6: Run Locally

```bash
npm run dev
```

Open http://localhost:5173

### Test Flow

1. Click "Login with Twitch"
2. Authorize the app
3. You're redirected back
4. Go to `/premium` or subscription page
5. (In test mode, you can manually set subscription status in database)

### Test Overlay

1. Create overlay (will get created automatically)
2. Copy overlay URL from dashboard
3. Open in new browser tab
4. Should see empty overlay or your widgets

---

## Step 7: Deploy to Production

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/overlay-saas.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com
   - Click "Import Project"
   - Select your repo
   - Framework: Vite
   - Build: `npm run build`
   - Output: `dist`

3. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env`
   - Change `VITE_APP_URL` to your domain
   - Use production Stripe keys

4. **Configure Domain**
   - Settings → Domains
   - Add your domain
   - Update DNS records

5. **Update Stripe Webhook**
   - Change endpoint to: `https://yourdomain.com/api/stripe/webhook`
   - Test webhook with Stripe CLI:
     ```bash
     stripe listen --forward-to https://yourdomain.com/api/stripe/webhook
     ```

6. **Update Twitch Redirect**
   - Twitch Dev Console → Your App → OAuth Redirect URLs
   - Add: `https://yourdomain.com/auth/callback`

---

## Step 8: Test Everything

### Checklist

- [ ] Login with Twitch works
- [ ] Subscription checkout works (use test card: `4242 4242 4242 4242`)
- [ ] Overlay is created automatically
- [ ] Overlay URL is accessible
- [ ] Widgets appear on overlay
- [ ] Dashboard can update widget positions
- [ ] Changes appear in overlay in real-time (< 1 sec)
- [ ] Webhook updates subscription status
- [ ] Expired subscription deactivates overlay

### Test Cards (Stripe)

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Authentication Required**: `4000 0025 0000 3155`

---

## Common Issues

### Issue: "Overlay not found"
**Solution**: Check that overlay was created in database. Look in `overlays` table.

### Issue: Real-time not working
**Solution**: 
1. Check Supabase Realtime is enabled
2. Verify tables are in `supabase_realtime` publication
3. Check browser console for WebSocket errors

### Issue: Subscription webhook not firing
**Solution**:
1. Check webhook URL is correct
2. Verify endpoint is accessible (test with curl)
3. Check Stripe dashboard for webhook delivery failures
4. Ensure `STRIPE_WEBHOOK_SECRET` is correct

### Issue: Twitch OAuth fails
**Solution**:
1. Check redirect URL matches exactly
2. Verify Client ID and Secret are correct
3. Check Supabase Auth provider is enabled
4. Look in Supabase Auth logs

---

## Next Steps

1. **Customize Widgets**
   - Edit `src/components/Overlay/widgets/`
   - Add your own widget types
   - Style to match your brand

2. **Add More Features**
   - Alerts with animations
   - Sound effects
   - Preset marketplace
   - Analytics dashboard

3. **Marketing**
   - Create landing page
   - Add demo video
   - Set up affiliate program
   - Create documentation site

4. **Optimize**
   - Add caching (Redis)
   - Implement rate limiting
   - Set up monitoring (Sentry)
   - Add CDN for assets

---

## Support

If you need help:
1. Check the [Complete Guide](./SAAS_OVERLAY_COMPLETE_GUIDE.md)
2. Search existing issues
3. Ask in Discord
4. Email: support@yourdomain.com

---

**You're all set! 🎉**

Your SaaS overlay platform is ready to serve streamers. Now go get those customers! 💰
