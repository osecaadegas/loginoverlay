# SaaS Overlay Platform - Complete Documentation

## 📋 Overview

This is a **production-ready subscription-based SaaS platform** that provides interactive OBS overlays for streamers. Users pay monthly to access customizable overlay widgets that update in real-time.

### Key Features
- ✅ **Multi-tenant architecture** - Isolated data per user
- ✅ **Subscription-based** - Stripe integration with webhooks
- ✅ **Real-time updates** - WebSocket/Supabase Realtime
- ✅ **Twitch OAuth** - Seamless login for streamers
- ✅ **Customizable widgets** - Drag, drop, and style
- ✅ **Secure overlay URLs** - Token-based access
- ✅ **Theme system** - Pre-built and custom themes
- ✅ **Preset management** - Save and share configurations

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Dashboard   │  │   Overlay    │  │    Auth      │  │
│  │  Controls    │  │   Display    │  │   (Twitch)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓ ↑
┌─────────────────────────────────────────────────────────┐
│                    API ROUTES (Vercel)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Overlay    │  │    Stripe    │  │  Webhooks    │  │
│  │     API      │  │   Checkout   │  │   Handler    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓ ↑
┌─────────────────────────────────────────────────────────┐
│                  SUPABASE (Backend)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PostgreSQL  │  │   Realtime   │  │     Auth     │  │
│  │      DB      │  │  WebSockets  │  │   (OAuth)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓ ↑
┌─────────────────────────────────────────────────────────┐
│                    STRIPE (Payments)                     │
│           Subscriptions • Webhooks • Billing             │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Core Tables

#### `user_profiles`
Stores Twitch user data from OAuth.
```sql
- id (uuid, PK)
- twitch_id (text, unique)
- twitch_username (text)
- twitch_display_name (text)
- twitch_avatar_url (text)
- created_at, updated_at
```

#### `subscriptions`
Manages user subscription status synced with Stripe.
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- stripe_customer_id (text, unique)
- stripe_subscription_id (text, unique)
- plan_id (uuid, FK → subscription_plans)
- status (text) -- active, inactive, trialing, past_due, canceled
- current_period_start, current_period_end (timestamptz)
- trial_end (timestamptz, nullable)
```

#### `overlays`
One overlay per user with public URL and secret token.
```sql
- id (uuid, PK)
- user_id (uuid, FK, unique)
- public_id (text, unique) -- For OBS URL
- access_token (text, unique) -- Secret token
- settings (jsonb) -- Theme, layout, etc.
- active (boolean) -- Controlled by subscription status
```

#### `widgets`
Widget instances placed on user overlays.
```sql
- id (uuid, PK)
- overlay_id (uuid, FK → overlays)
- widget_type_id (uuid, FK → widget_types)
- name (text)
- enabled (boolean)
- position (jsonb) -- {x, y}
- size (jsonb) -- {width, height}
- config (jsonb) -- Widget-specific settings
- z_index (integer)
```

#### `widget_state`
Real-time data for each widget.
```sql
- id (uuid, PK)
- widget_id (uuid, FK, unique)
- data (jsonb) -- Balance, wager, profit, etc.
- updated_at (timestamptz)
```

### Security

**Row Level Security (RLS)** is enabled on all tables:
- Users can only access their own data
- Public overlay endpoint bypasses RLS with service key
- Subscription status checked before allowing overlay creation

---

## 🔐 Authentication Flow

### Twitch OAuth Setup

1. **Register app on Twitch Developers**
   - URL: https://dev.twitch.tv/console/apps
   - Redirect URL: `https://yourdomain.com/auth/callback`

2. **Configure Supabase Auth**
   ```
   Dashboard → Authentication → Providers → Twitch
   - Client ID: <from Twitch>
   - Client Secret: <from Twitch>
   - Redirect URL: https://<supabase-project>.supabase.co/auth/v1/callback
   ```

3. **Frontend Integration**
   ```javascript
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'twitch',
     options: {
       redirectTo: `${window.location.origin}/`
     }
   });
   ```

4. **User Profile Creation**
   - After login, Twitch user data is stored in `user_profiles`
   - User gets 7-day trial automatically (optional)

---

## 💳 Stripe Integration

### Setup Steps

1. **Create Stripe Account**
   - URL: https://dashboard.stripe.com/register

2. **Create Products & Prices**
   ```
   Products:
   - Starter ($9.99/month)
   - Pro ($19.99/month)
   - Business ($49.99/month)
   ```

3. **Get API Keys**
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Set up Webhooks**
   - Endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

5. **Update Database**
   ```sql
   INSERT INTO subscription_plans (name, stripe_price_id, monthly_price)
   VALUES ('Pro', 'price_xxxxx', 1999);
   ```

### Subscription Flow

1. User clicks "Subscribe" → `/api/stripe/create-checkout`
2. Stripe Checkout opens
3. User completes payment
4. Stripe webhook fires → `/api/stripe/webhook`
5. Database updated with subscription status
6. Overlay activated automatically

---

## 🎨 Widget System

### Available Widgets

| Widget | Description | Premium |
|--------|-------------|---------|
| Balance Display | Shows current balance | No |
| Wager Counter | Tracks total wagered | No |
| Profit Tracker | Shows profit/loss | No |
| Bet History | Scrolling bet list | No |
| Goal Bar | Progress towards goals | No |
| Big Win Alert | Alert on big wins | No |
| Loss Streak Alert | Alert on losing streaks | Yes |
| Bonus Buy Alert | Alert on bonus buys | Yes |
| Session Stats | Current session data | No |
| Recent Wins | Top wins display | No |

### Adding New Widgets

1. **Create Widget Component**
   ```jsx
   // src/components/Overlay/widgets/MyWidget.jsx
   export default function MyWidget({ config, data, theme }) {
     return (
       <div style={{ color: theme.primaryColor }}>
         {data.value}
       </div>
     );
   }
   ```

2. **Add to Widget Types**
   ```sql
   INSERT INTO widget_types (name, display_name, icon, category)
   VALUES ('my_widget', 'My Widget', '🎯', 'stats');
   ```

3. **Register in Overlay**
   ```jsx
   const widgetComponents = {
     'my_widget': <MyWidget {...widgetProps} />
   };
   ```

---

## 🔄 Real-Time Sync

### How It Works

1. **Dashboard updates widget state**:
   ```javascript
   await supabase
     .from('widget_state')
     .update({ data: { balance: 1000 } })
     .eq('widget_id', widgetId);
   ```

2. **Supabase Realtime broadcasts change**:
   - All listeners on that channel receive the update
   - Overlay subscribes to: `overlay_${overlayId}`

3. **Overlay receives update < 100ms**:
   ```javascript
   supabase
     .channel(`overlay_${overlayId}`)
     .on('postgres_changes', { ... }, (payload) => {
       updateWidget(payload.new);
     })
     .subscribe();
   ```

### Performance Optimization

- Widget state updates are batched
- Only enabled widgets are rendered
- GPU-accelerated CSS transforms
- Efficient JSON diffing for updates

---

## 📡 OBS Setup Instructions

### For End Users

1. **Copy Overlay URL**
   - Dashboard → Copy URL button
   - Format: `https://yourdomain.com/premium/overlay?id=xxxxxxxx`

2. **Add to OBS**
   - Source → Browser Source
   - URL: Paste your overlay URL
   - Width: 2560
   - Height: 1440
   - FPS: 30
   - ✅ Shutdown source when not visible
   - ✅ Refresh browser when scene becomes active

3. **Position & Test**
   - Drag widgets in dashboard
   - Changes appear live in OBS
   - Use preview mode to test

### Recommended OBS Settings

```
Browser Source Settings:
- Width: 2560
- Height: 1440
- FPS: 30
- CSS: (leave blank)
- Shutdown when not visible: YES
- Refresh on active: YES

Advanced:
- Reroute audio: NO
```

---

## 🚀 Deployment Checklist

### Prerequisites

- [ ] Supabase project created
- [ ] Stripe account configured
- [ ] Twitch OAuth app registered
- [ ] Domain name ready

### Environment Variables

Create `.env` file:
```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App
VITE_APP_URL=https://yourdomain.com
```

### Database Setup

```bash
# Run migrations in order
1. create_saas_overlay_system.sql
2. create_stripe_integration.sql
```

### Vercel Deployment

1. **Connect GitHub repo**
2. **Set environment variables** (all from above)
3. **Deploy**
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

4. **Configure domain**
5. **Test webhook** with Stripe CLI

---

## 💰 Pricing Strategy

### Suggested Plans

**Starter - $9.99/month**
- 5 widgets
- Basic themes
- Standard support
- Target: New streamers

**Pro - $19.99/month** (Most Popular)
- Unlimited widgets
- Custom themes
- Priority support
- Presets
- Target: Growing channels

**Business - $49.99/month**
- Everything in Pro
- White-label option
- Custom domain
- API access
- Target: Agencies, large streamers

### Trial Strategy

- 7-day free trial (no credit card required)
- Full access during trial
- Email reminders on day 5 and day 7
- One-click upgrade

---

## 🔒 Security Considerations

### Best Practices Implemented

1. **Access Control**
   - RLS policies on all tables
   - JWT validation on API routes
   - Service role key never exposed to client

2. **Subscription Enforcement**
   - Checked at API level
   - Overlay deactivated if subscription lapses
   - Webhooks update status immediately

3. **Token Security**
   - `public_id` for URL (non-sensitive)
   - `access_token` for validation (secret, 64 chars)
   - Token rotation available via API

4. **Rate Limiting** (TODO)
   - Implement at API layer
   - Per-user limits based on plan

5. **CORS** (TODO)
   - Restrict to your domain
   - Allow OBS user agents

---

## 📊 Analytics & Monitoring

### Track These Metrics

- **MRR** (Monthly Recurring Revenue)
- **Churn Rate**
- **Trial conversion rate**
- **Widget usage** (most popular widgets)
- **Active overlays** (daily/monthly active)
- **Payment failures**

### Tools to Integrate

- **Stripe Dashboard** - Revenue, churn
- **Supabase Analytics** - Database performance
- **Mixpanel/Amplitude** - User behavior
- **Sentry** - Error tracking
- **LogRocket** - Session replay

---

## 🐛 Troubleshooting

### Overlay Not Loading

1. Check subscription status
2. Verify public_id in URL
3. Check browser console for errors
4. Ensure OBS has internet access

### Real-time Not Working

1. Check Supabase Realtime is enabled
2. Verify table is in `supabase_realtime` publication
3. Check RLS policies
4. Look for WebSocket connection errors

### Payment Issues

1. Test with Stripe test cards
2. Check webhook signatures
3. Verify webhook events are being received
4. Check subscription status in database

---

## 🎯 Roadmap

### Phase 1 (MVP) - ✅ Complete
- Twitch OAuth
- Subscription system
- Basic widgets
- Real-time sync
- OBS overlay

### Phase 2 (Next)
- [ ] More widget types (alerts, animations)
- [ ] Widget marketplace
- [ ] Preset sharing
- [ ] Mobile app
- [ ] Analytics dashboard

### Phase 3 (Future)
- [ ] Affiliate program
- [ ] White-label for agencies
- [ ] API for third-party integrations
- [ ] Multi-platform (YouTube, Facebook)
- [ ] Advanced animations & effects

---

## 📞 Support

### For Developers

- GitHub Issues: [your-repo]
- Documentation: [your-docs-site]
- Email: dev@yourdomain.com

### For Users

- Knowledge Base: [your-kb-site]
- Discord: [your-discord]
- Email: support@yourdomain.com
- Live Chat: (integrate Intercom/Crisp)

---

## 📄 License

This is a commercial SaaS product. All rights reserved.

---

**Built with ❤️ for streamers worldwide**
