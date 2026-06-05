# osecaadegas.pt

Community streaming platform built with React, Vite, Supabase, and Vercel serverless APIs.

## Active scope

- Overlay Control Center and OBS-facing overlay renderer
- Slots, slot requests, betting, giveaways, tournaments, bonus hunt tracking
- StreamElements, Twitch auth, Spotify, analytics, shoutouts, admin tooling
- The Life systems and Twitch extension surfaces are still present in code and schema

## Development

```bash
npm install
npm run dev
```

Build production assets with:

```bash
npm run build
```

## Documentation

Start in [DOCs/README.md](./DOCs/README.md).

Most useful entry points:

- [DOCs/QUICK_SETUP_GUIDE.md](./DOCs/QUICK_SETUP_GUIDE.md)
- [DOCs/GO_LIVE_CHECKLIST.md](./DOCs/GO_LIVE_CHECKLIST.md)
- [DOCs/AUTHENTICATION_SETUP_GUIDE.md](./DOCs/AUTHENTICATION_SETUP_GUIDE.md)
- [DOCs/STREAMELEMENTS_INTEGRATION_GUIDE.md](./DOCs/STREAMELEMENTS_INTEGRATION_GUIDE.md)
- [migrations/README.md](./migrations/README.md)

## Migration status

The repository contains both active schema history and older legacy migrations. The current authoritative migration map is in [migrations/README.md](./migrations/README.md).

Legacy Stripe/subscription, old SaaS overlay, roulette, blackjack, and mines cleanup is consolidated in [migrations/20260605_remove_legacy_dead_schema.sql](./migrations/20260605_remove_legacy_dead_schema.sql).