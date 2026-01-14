# 📦 Required Dependencies Installation

## New Dependencies for SaaS Platform

The SaaS overlay platform requires two additional packages:

### 1. Stripe
For subscription payment processing.

```bash
npm install stripe
```

### 2. Micro
For parsing webhook payloads in Vercel functions.

```bash
npm install micro
```

## Full Installation Command

```bash
npm install stripe micro
```

## Updated package.json

Your `package.json` dependencies should include:

```json
{
  "dependencies": {
    "@octokit/rest": "^22.0.1",
    "@supabase/supabase-js": "^2.87.1",
    "@vercel/node": "^5.5.15",
    "@vercel/speed-insights": "^1.3.1",
    "canvas-confetti": "^1.9.4",
    "dotenv": "^17.2.3",
    "micro": "^10.0.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^7.10.1",
    "stripe": "^14.10.0",
    "three": "^0.182.0"
  }
}
```

## Verification

After installation, verify packages are installed:

```bash
npm list stripe micro
```

Should output:
```
streaming-overlay@1.0.0
├── micro@10.0.1
└── stripe@14.10.0
```

## What Each Package Does

### Stripe
- **Purpose**: Official Stripe Node.js library
- **Used in**: 
  - `/api/stripe/webhook.js` - Verifying webhook signatures
  - `/api/stripe/create-checkout.js` - Creating checkout sessions
  - `/api/stripe/manage-subscription.js` - Creating portal sessions
- **Documentation**: https://stripe.com/docs/api

### Micro
- **Purpose**: Lightweight HTTP microservices
- **Used in**: 
  - `/api/stripe/webhook.js` - Parsing raw request body for signature verification
- **Why needed**: Stripe webhooks require the raw request body for signature verification, which requires special handling in Vercel
- **Documentation**: https://github.com/vercel/micro

## Already Installed

These packages are already in your project:

- ✅ `@supabase/supabase-js` - Supabase client
- ✅ `react` - UI framework
- ✅ `react-router-dom` - Routing
- ✅ `vite` - Build tool
- ✅ `tailwindcss` - Styling

## Development vs Production

All packages work in both environments. No additional production dependencies needed.

## Troubleshooting

### Issue: `Cannot find module 'stripe'`
**Solution**: Run `npm install stripe`

### Issue: `Cannot find module 'micro'`
**Solution**: Run `npm install micro`

### Issue: Vercel build fails
**Solution**: 
1. Ensure `package.json` includes both packages
2. Check Vercel build logs
3. Verify `node_modules` is in `.gitignore` (Vercel installs fresh)

## Next Steps

After installing dependencies:
1. Set up environment variables
2. Run database migrations
3. Configure Stripe & Twitch OAuth
4. Test locally with `npm run dev`

See [QUICK_SETUP_GUIDE.md](QUICK_SETUP_GUIDE.md) for full setup instructions.
