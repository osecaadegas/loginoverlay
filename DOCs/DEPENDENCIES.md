# Dependency Notes

This project currently builds around these main runtime packages:

- `react`, `react-dom`, `react-router-dom`
- `vite`
- `@supabase/supabase-js`
- `@tanstack/react-query`
- `@vercel/node`
- `lucide-react`, `recharts`, `canvas-confetti`
- `@react-three/fiber`, `@react-three/drei`, `three`

Tooling and automation packages currently present:

- `dotenv`
- `puppeteer`, `puppeteer-extra`, `puppeteer-extra-plugin-stealth`
- `tailwindcss`, `postcss`, `autoprefixer`

## Install

```bash
npm install
```

## Notes from the 2026-06-05 audit

- Stripe dependencies were removed from the active dependency list because the repository no longer has a live Stripe integration path.
- If a future payment flow is reintroduced, add its runtime packages together with the API handlers, migrations, legal text, and documentation in the same change.