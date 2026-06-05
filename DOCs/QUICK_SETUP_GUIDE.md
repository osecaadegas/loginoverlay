# Quick Setup Guide

## Prerequisites

- Node.js 18+
- npm
- Supabase project
- Twitch developer app for authentication
- StreamElements account if you want points/chat integrations
- Optional: Spotify credentials, Twitch extension secrets, Vercel deployment target

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment and third-party services

Before running the app, make sure the project has valid environment variables and provider setup for:

- Supabase URL, anon key, and service role key
- Twitch OAuth
- StreamElements integration
- Optional providers used by your deployment such as Spotify or Twitch extension secrets

Use these guides as needed:

- [AUTHENTICATION_SETUP_GUIDE.md](./AUTHENTICATION_SETUP_GUIDE.md)
- [OAUTH_SETUP_GUIDE.md](./OAUTH_SETUP_GUIDE.md)
- [STORAGE_SETUP.md](./STORAGE_SETUP.md)
- [GET_SERVICE_ROLE_KEY.md](./GET_SERVICE_ROLE_KEY.md)
- [STREAMELEMENTS_INTEGRATION_GUIDE.md](./STREAMELEMENTS_INTEGRATION_GUIDE.md)

## 3. Apply database migrations

Do not run the old broad drop scripts from older audits. They were removed because they conflicted with live systems.

Instead:

1. Use [../migrations/README.md](../migrations/README.md) to identify the active schema groups you need.
2. Apply the active migrations required for your environment.
3. Only run [../migrations/20260605_remove_legacy_dead_schema.sql](../migrations/20260605_remove_legacy_dead_schema.sql) if you intentionally want to remove dead Stripe/subscription, abandoned old overlay, roulette, blackjack, and mines tables from an existing database.

## 4. Start the app

```bash
npm run dev
```

## 5. Validate the main flows

- Sign in with Twitch
- Open the Overlay Control Center
- Confirm overlay widget reads/writes work against Supabase
- Validate StreamElements-linked surfaces if enabled
- Run a production build before deploying

```bash
npm run build
```

## 6. Optional system checks

- If you use The Life systems, validate those routes and admin panels explicitly.
- If you use the Twitch extension backend, validate its secrets and EBS endpoints explicitly.
- If you do not use those systems, leave them out of your rollout until their code is removed too.