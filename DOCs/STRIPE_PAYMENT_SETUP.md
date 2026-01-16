# 🎯 STRIPE PAYMENT SETUP - DUMMY PROOF TUTORIAL

## This guide will walk you through setting up Stripe payments for the Season Pass Premium track.

---

## 📋 STEP 1: Create a Stripe Account

1. Go to **https://stripe.com**
2. Click **"Start now"** or **"Sign up"**
3. Fill in:
   - Email address
   - Full name
   - Password
4. Verify your email
5. Complete account setup (you can skip some steps for testing)

---

## 🔑 STEP 2: Get Your API Keys

1. Log into **https://dashboard.stripe.com**
2. In the left sidebar, click **"Developers"**
3. Click **"API keys"**
4. You'll see two sets of keys:

### FOR TESTING (use these first!):
- **Publishable key**: starts with `pk_test_...`
- **Secret key**: starts with `sk_test_...`

### FOR PRODUCTION (use when going live):
- **Publishable key**: starts with `pk_live_...`
- **Secret key**: starts with `sk_live_...`

⚠️ **IMPORTANT**: Never share your SECRET key! Never put it in frontend code!

---

## 💰 STEP 3: Create a Product and Price (Optional)

If you want to use Stripe's pricing system:

1. Go to **"Products"** in the Stripe dashboard
2. Click **"+ Add product"**
3. Fill in:
   - **Name**: "Season Pass Premium"
   - **Description**: "Unlock the Premium track with exclusive rewards!"
4. Under **"Pricing"**:
   - **Price**: Enter your amount (e.g., 9.99)
   - **Currency**: Select your currency (EUR, USD, etc.)
   - **Billing**: One time
5. Click **"Save product"**
6. After saving, click on the product
7. Under **"Pricing"**, find the **Price ID** (starts with `price_...`)
8. Copy this - you'll need it!

---

## 🌐 STEP 4: Set Up Webhook (CRITICAL!)

The webhook tells your server when a payment succeeds!

### 4.1 - For Local Testing (with Stripe CLI):

1. Install Stripe CLI:
   - Windows: Download from https://github.com/stripe/stripe-cli/releases
   - Or use: `winget install stripe.cli`

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the webhook signing secret it gives you (starts with `whsec_...`)

### 4.2 - For Production (Vercel):

1. Go to **https://dashboard.stripe.com/webhooks**
2. Click **"+ Add endpoint"**
3. Enter your endpoint URL:
   ```
   https://YOUR-DOMAIN.vercel.app/api/stripe/webhook
   ```
4. Under **"Select events to listen to"**:
   - Click **"Select events"**
   - Search for and select: `checkout.session.completed`
   - Optional: `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Click **"Add endpoint"**
6. Click on your new endpoint
7. Under **"Signing secret"**, click **"Reveal"**
8. Copy this secret (starts with `whsec_...`)

---

## ⚙️ STEP 5: Add Environment Variables

### 5.1 - For Local Development:

Create a file called `.env.local` in your project root:

```env
# Stripe Keys (TEST MODE)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
VITE_STRIPE_PREMIUM_PRICE_ID=price_YOUR_PRICE_ID_HERE

# For production, replace with:
# STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
```

### 5.2 - For Vercel:

1. Go to your project on **https://vercel.com**
2. Click **"Settings"** → **"Environment Variables"**
3. Add these variables:

| NAME | VALUE |
|------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_XXXX...` or `sk_live_XXXX...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_XXXX...` |
| `VITE_STRIPE_PREMIUM_PRICE_ID` | `price_XXXX...` (optional) |

4. Click **"Save"** for each one
5. **REDEPLOY** your project for changes to take effect!

---

## 🧪 STEP 6: Test the Payment Flow

### Test Card Numbers:

Use these test cards in TEST mode:

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

### Testing Locally:

1. Make sure Stripe CLI is forwarding webhooks:
   ```bash
   stripe listen --forward-to localhost:5173/api/stripe/webhook
   ```

2. Start your dev server:
   ```bash
   npm run dev
   ```

3. Go to the Season Pass page
4. Click "Get Premium" button
5. Enter test card: `4242 4242 4242 4242`
6. Complete checkout
7. Check your terminal - you should see webhook logs
8. Check Supabase - `season_pass_progress` should show `has_premium = true`

---

## 🚀 STEP 7: Go Live Checklist

Before accepting real payments:

- [ ] Replace `sk_test_...` with `sk_live_...` in Vercel environment variables
- [ ] Update webhook endpoint URL to production domain
- [ ] Create production webhook and get new `whsec_...` secret
- [ ] Complete Stripe account verification (business details, bank account)
- [ ] Test with a real card (you can refund yourself)
- [ ] Set up email notifications in Stripe dashboard

---

## 🔧 TROUBLESHOOTING

### "No such product" error
- Make sure you're using the correct API key (test vs live)
- Verify the price ID exists in your Stripe dashboard

### Webhook not receiving events
- Check the webhook URL is correct
- Make sure you're using the correct webhook secret
- Check Stripe dashboard → Webhooks → Recent deliveries for errors

### Payment succeeds but Premium not activated
1. Check Supabase logs for errors
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
3. Check that the webhook secret matches

### "Amount required" error
- The checkout API needs a valid amount
- Either pass a priceId or make sure the hardcoded amount is correct

---

## 📁 Files Created/Modified

| File | Purpose |
|------|---------|
| `api/stripe/create-checkout.js` | Creates Stripe checkout session |
| `api/stripe/webhook.js` | Handles payment confirmations |
| `src/components/SeasonPass/SeasonPass.jsx` | Frontend with payment button |

---

## 🎉 You're Done!

Your Stripe payment integration is now complete. The flow is:

1. User clicks "Get Premium" → Calls `/api/stripe/create-checkout`
2. User is redirected to Stripe Checkout
3. User pays with card
4. Stripe sends webhook to `/api/stripe/webhook`
5. Webhook updates `has_premium = true` in Supabase
6. User returns to Season Pass with Premium active!

---

## ❓ Need Help?

- Stripe Docs: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Test Mode Dashboard: https://dashboard.stripe.com/test/
