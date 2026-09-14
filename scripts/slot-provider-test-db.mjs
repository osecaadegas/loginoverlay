import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const providerTestId = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export async function createProviderTestDatabase() {
  if (!process.env.PGLITE_MODULE) throw new Error('Set PGLITE_MODULE to @electric-sql/pglite/dist/index.js. Tests never connect to production.');
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    CREATE TABLE auth.users(id UUID PRIMARY KEY);
    CREATE TABLE public.user_roles(user_id UUID, role TEXT, is_active BOOLEAN, access_expires_at TIMESTAMPTZ);
    CREATE TABLE public.slot_providers(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL, logo_url TEXT, website_url TEXT, is_active BOOLEAN DEFAULT true,
      slot_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE public.slots(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL,
      provider TEXT NOT NULL, image TEXT NOT NULL, status TEXT DEFAULT 'live', is_featured BOOLEAN DEFAULT false,
      rtp NUMERIC, volatility TEXT, updated_by UUID, updated_at TIMESTAMPTZ DEFAULT now());
    ALTER TABLE public.slot_providers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY read_providers ON public.slot_providers FOR SELECT USING (true);
    CREATE POLICY read_slots ON public.slots FOR SELECT USING (true);
    CREATE POLICY own_roles ON public.user_roles FOR SELECT TO authenticated USING(user_id = auth.uid());
    GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
    GRANT SELECT ON public.user_roles TO authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.slots TO authenticated;
    GRANT SELECT ON public.slots TO anon;
  `);
  for (const [n, role, expires] of [[1, 'admin', null], [2, 'slot_modder', null], [3, 'user', null], [4, 'admin', '2000-01-01'], [5, 'superadmin', null]]) {
    await db.query('INSERT INTO auth.users VALUES($1)', [providerTestId(n)]);
    await db.query('INSERT INTO user_roles VALUES($1,$2,true,$3)', [providerTestId(n), role, expires]);
  }
  await db.exec(readFileSync(new URL('../migrations/20260914074432_slot_provider_management.sql', import.meta.url), 'utf8'));
  await db.exec('SET ROLE authenticated;');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [providerTestId(1)]);
  return db;
}
