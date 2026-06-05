# Quick Setup Guide

## Prerequisites

- Node.js 18+
- npm
- Supabase project
- Twitch developer app for authentication
- StreamElements account if you want points/chat integrations
- Optional: Spotify credentials and your deployment target

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment and third-party services

Before running the app, make sure the project has valid environment variables and provider setup for:

- Supabase URL, anon key, and service role key
- Twitch OAuth
- StreamElements integration
- Optional providers used by your deployment such as Spotify

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
4. Only run [../migrations/20260605_remove_thelife_and_twitch_extension_schema.sql](../migrations/20260605_remove_thelife_and_twitch_extension_schema.sql) if your database still contains retired The Life or Twitch extension schema.

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

- Validate only the active systems in your release scope.
- Keep retired The Life and Twitch extension schema, routes, and secrets out of fresh environments unless you are migrating an older database for cleanup.