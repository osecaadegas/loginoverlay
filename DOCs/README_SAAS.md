# 🎮 SaaS Overlay Platform for Streamers

> **Production-ready subscription-based platform** providing interactive OBS overlays for Twitch streamers. Built with React, Supabase, and Stripe.

[![License](https://img.shields.io/badge/license-Commercial-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.x-green.svg)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Integrated-purple.svg)](https://stripe.com/)

---

## ✨ Features

### For Streamers
- 🎨 **Customizable Widgets** - Drag, drop, and style overlay widgets
- 📊 **Real-Time Updates** - Changes appear instantly in OBS
- 🎯 **Professional Themes** - Pre-built themes or create your own
- 💾 **Preset System** - Save and share overlay configurations
- 🔄 **Auto-Sync** - No manual refresh needed
- 📱 **Mobile Dashboard** - Control overlay from anywhere

### For You (Platform Owner)
- 💰 **Subscription Revenue** - Monthly recurring revenue from streamers
- 🔐 **Secure & Scalable** - Built on Supabase with RLS
- 🎫 **Stripe Integration** - Automatic billing & webhooks
- 📈 **Analytics Ready** - Track MRR, churn, widget usage
- 🔧 **Easy to Extend** - Add new widgets and features
- 🌐 **Multi-Tenant** - Isolated data per user

---

## 🚀 Quick Start

### 1. Installation

```bash
cd websiteV3
npm install
npm install stripe micro
```

### 2. Setup Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# App
VITE_APP_URL=http://localhost:5173
```

### 3. Database Setup

Run migrations in Supabase SQL Editor:
1. `migrations/create_saas_overlay_system.sql`
2. `migrations/create_stripe_integration.sql`

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:5173

📖 **Full Setup Guide**: [DOCs/QUICK_SETUP_GUIDE.md](DOCs/QUICK_SETUP_GUIDE.md)

---

## 📚 Documentation

- [Complete Platform Guide](DOCs/SAAS_OVERLAY_COMPLETE_GUIDE.md) - Full documentation
- [Quick Setup Guide](DOCs/QUICK_SETUP_GUIDE.md) - Step-by-step setup
- [Architecture Overview](#system-architecture) - How it works
- [API Reference](#api-routes) - API endpoints

---

## 🏗️ System Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   React UI   │────▶│ API Routes   │────▶│  Supabase    │
│  Dashboard   │     │  (Vercel)    │     │  PostgreSQL  │
└──────────────┘     └──────────────┘     └──────────────┘
       │                     │                     │
       │                     ▼                     │
       │              ┌──────────────┐            │
       └─────────────▶│    Stripe    │            │
                      │   Payments   │            │
                      └──────────────┘            │
                             │                     │
       ┌─────────────────────┴─────────────────────┘
       │
       ▼
┌──────────────┐
│ OBS Overlay  │
│  (Browser)   │
└──────────────┘
```

### Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Payments**: Stripe (Subscriptions + Webhooks)
- **Deployment**: Vercel (Serverless Functions)
- **Auth**: Twitch OAuth via Supabase

---

## 📦 Project Structure

```
websiteV3/
├── api/                    # Vercel serverless functions
│   ├── overlay/
│   │   ├── get.js         # Get user's overlay
│   │   ├── create.js      # Create new overlay
│   │   ├── update.js      # Update overlay settings
│   │   └── public.js      # Public overlay for OBS
│   └── stripe/
│       ├── webhook.js     # Stripe webhook handler
│       ├── create-checkout.js  # Start subscription
│       └── manage-subscription.js  # Billing portal
├── migrations/             # Database migrations
│   ├── create_saas_overlay_system.sql
│   └── create_stripe_integration.sql
├── src/
│   ├── components/
│   │   ├── Overlay/       # OBS overlay components
│   │   │   ├── OverlayV2.jsx
│   │   │   └── widgets/   # Widget components
│   │   ├── Dashboard/     # Control dashboard
│   │   │   ├── DashboardV2.jsx
│   │   │   └── tabs/      # Dashboard tabs
│   │   └── ...
│   ├── hooks/
│   │   └── useSubscription.js  # Subscription hook
│   ├── context/
│   │   └── AuthContext.jsx     # Auth context
│   └── ...
└── DOCs/                   # Documentation
    ├── SAAS_OVERLAY_COMPLETE_GUIDE.md
    └── QUICK_SETUP_GUIDE.md
```

---

## 🎨 Widget System

### Built-in Widgets

| Widget | Description | Free/Premium |
|--------|-------------|--------------|
| 💰 Balance Display | Shows current balance | Free |
| 🎲 Wager Counter | Tracks total wagered | Free |
| 📈 Profit Tracker | Shows profit/loss | Free |
| 📜 Bet History | Scrolling bet list | Free |
| 🎯 Goal Bar | Progress towards goals | Free |
| 🎉 Big Win Alert | Alert on big wins | Free |
| 😰 Loss Streak Alert | Alert on losing streaks | Premium |
| 🎰 Bonus Buy Alert | Alert on bonus buys | Premium |
| 📊 Session Stats | Session statistics | Free |
| 🏆 Recent Wins | Top wins display | Free |

### Adding Custom Widgets

```jsx
// 1. Create widget component
// src/components/Overlay/widgets/CustomWidget.jsx

export default function CustomWidget({ config, data, theme }) {
  return (
    <div style={{ color: theme.primaryColor }}>
      Custom Content: {data.value}
    </div>
  );
}

// 2. Register in database
INSERT INTO widget_types (name, display_name, icon, category)
VALUES ('custom_widget', 'Custom Widget', '✨', 'stats');

// 3. Add to overlay renderer
const widgetComponents = {
  'custom_widget': <CustomWidget {...props} />
};
```

---

## 💳 Subscription Plans

### Default Plans

**Starter - $9.99/month**
- 5 concurrent widgets
- Basic themes
- Standard support
- Perfect for new streamers

**Pro - $19.99/month** ⭐ Most Popular
- Unlimited widgets
- Custom themes
- Priority support
- Preset management
- Ideal for growing channels

**Business - $49.99/month**
- Everything in Pro
- White-label option
- Custom domain
- API access
- For agencies & large streamers

### Trial
- 7-day free trial
- No credit card required
- Full access during trial

---

## 🔧 API Routes

### Overlay Management

```
GET  /api/overlay/get          - Get user's overlay (auth required)
POST /api/overlay/create       - Create new overlay (auth required)
POST /api/overlay/update       - Update overlay settings (auth required)
GET  /api/overlay/public?id=x  - Get overlay for OBS (public, no auth)
```

### Subscription Management

```
POST /api/stripe/create-checkout      - Start subscription flow
POST /api/stripe/manage-subscription  - Open billing portal
POST /api/stripe/webhook              - Handle Stripe webhooks
```

---

## 🔐 Security

- ✅ **Row Level Security** - Supabase RLS on all tables
- ✅ **JWT Authentication** - Twitch OAuth via Supabase
- ✅ **Secure Tokens** - 64-char access tokens for overlays
- ✅ **Subscription Validation** - Checked at API and DB level
- ✅ **Webhook Verification** - Stripe signature validation
- ✅ **Service Role Protection** - Never exposed to client

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Set environment variables
4. Deploy!

### Environment Variables (Production)

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
STRIPE_SECRET_KEY=sk_live_xxx  # Use live key!
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
VITE_APP_URL=https://yourdomain.com
NODE_ENV=production
```

**📋 Full deployment checklist**: [DOCs/QUICK_SETUP_GUIDE.md](DOCs/QUICK_SETUP_GUIDE.md#step-7-deploy-to-production)

---

## 📊 Analytics & Monitoring

### Track These Metrics

- **MRR** (Monthly Recurring Revenue)
- **Active Subscriptions**
- **Churn Rate**
- **Trial Conversion Rate**
- **Widget Usage**
- **Payment Failures**

### Recommended Tools

- **Stripe Dashboard** - Revenue & subscriptions
- **Supabase Analytics** - Database performance
- **Mixpanel/Amplitude** - User behavior
- **Sentry** - Error tracking
- **LogRocket** - Session replay

---

## 🗺️ Roadmap

### ✅ Phase 1 - MVP (Complete)
- Twitch OAuth authentication
- Subscription system with Stripe
- Basic widgets (balance, wager, profit)
- Real-time sync via Supabase Realtime
- OBS overlay with transparent background
- Dashboard for widget management

### 🔨 Phase 2 - Enhanced Features
- [ ] Animated alerts (big wins, losses)
- [ ] Sound effects for alerts
- [ ] More widget types (chat, polls, timers)
- [ ] Preset marketplace
- [ ] Mobile app
- [ ] Advanced analytics dashboard

### 🎯 Phase 3 - Growth
- [ ] Affiliate program
- [ ] White-label for agencies
- [ ] Public API
- [ ] Multi-platform (YouTube, Facebook)
- [ ] Advanced animations & effects
- [ ] Widget marketplace

---

## 🤝 Contributing

This is a commercial SaaS product. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

**Commercial License** - All rights reserved.

This is a SaaS product intended to be sold to end users. Contact for licensing inquiries.

---

## 💬 Support

### For Developers
- 📖 [Documentation](DOCs/SAAS_OVERLAY_COMPLETE_GUIDE.md)
- 🐛 [Report Issues](https://github.com/yourusername/overlay-saas/issues)
- 💬 Discord: [your-discord]

### For End Users
- 📚 Knowledge Base: [your-kb]
- 💬 Live Chat: [your-chat]
- 📧 Email: support@yourdomain.com

---

## 🎉 Credits

Built with:
- [React](https://reactjs.org/)
- [Supabase](https://supabase.com/)
- [Stripe](https://stripe.com/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)

---

**Made with ❤️ for streamers worldwide**

⭐ Star this repo if you find it useful!
