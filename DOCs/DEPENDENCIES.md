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

- Stripe recurring billing is implemented through the Stripe REST API from Vercel functions, so there is no `stripe` npm package in the active dependency list.
- Payment-related changes should keep the API handlers, migrations, environment variables, legal text, and documentation in the same change.
