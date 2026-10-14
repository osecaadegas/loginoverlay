-- StreamersCenter Slot Capture stores configuration metadata only.
-- Live casino frames remain local to the streamer and are never persisted here.

create table if not exists public.slot_capture_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  enabled boolean not null default true,
  quality_preset text not null default 'balanced' check (quality_preset in ('performance', 'balanced', 'quality', 'ultra')),
  output_width integer not null default 1920 check (output_width between 160 and 7680),
  output_height integer not null default 1080 check (output_height between 90 and 4320),
  output_fps integer not null default 30 check (output_fps in (15, 24, 25, 30, 50, 60)),
  transform jsonb not null default '{"x":0,"y":0,"scaleX":1,"scaleY":1,"rotation":0,"crop":{"top":0,"right":0,"bottom":0,"left":0}}'::jsonb,
  transition jsonb not null default '{"type":"crossfade","durationMs":350}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.slot_capture_sources (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.slot_capture_profiles(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  device_id uuid references public.slot_detector_devices(id) on delete set null,
  source_type text not null check (source_type in ('iframe', 'canvas', 'container', 'manual')),
  page_domain text not null check (page_domain !~ '[/?#]' and char_length(page_domain) <= 160),
  page_title text not null default '' check (char_length(page_title) <= 160),
  element_fingerprint text not null check (char_length(element_fingerprint) between 3 and 160),
  path_hash text not null default '' check (char_length(path_hash) <= 160),
  normalized_bounds jsonb not null,
  aspect_ratio numeric(10,6),
  last_status text not null default 'disconnected' check (last_status in ('connected', 'disconnected', 'hidden', 'stale', 'error')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

create table if not exists public.slot_capture_masks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.slot_capture_profiles(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  mask_type text not null check (mask_type in ('rectangle', 'ellipse', 'polygon', 'freehand', 'image', 'luminance', 'chroma', 'gradient')),
  operation text not null default 'add' check (operation in ('add', 'subtract', 'intersect', 'invert', 'replace')),
  enabled boolean not null default true,
  locked boolean not null default false,
  opacity numeric(5,4) not null default 1 check (opacity between 0 and 1),
  feather numeric(7,4) not null default 0 check (feather between 0 and 1),
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.slot_capture_filters (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.slot_capture_profiles(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  filter_type text not null check (filter_type in ('brightness', 'contrast', 'saturation', 'gamma', 'exposure', 'temperature', 'tint', 'hue', 'rgb', 'sharpen', 'blur', 'pixelate', 'vignette', 'edge', 'glow', 'bloom', 'opacity', 'alpha', 'chroma', 'luminance')),
  enabled boolean not null default true,
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.slot_capture_outputs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.slot_capture_profiles(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  output_key uuid not null default gen_random_uuid() unique,
  name text not null check (char_length(name) between 1 and 100),
  transport text not null default 'obs_plugin' check (transport in ('obs_plugin', 'browser_local')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

create index if not exists slot_capture_profiles_user_idx on public.slot_capture_profiles(user_id, updated_at desc);
create index if not exists slot_capture_sources_user_idx on public.slot_capture_sources(user_id, last_seen_at desc);
create index if not exists slot_capture_masks_profile_idx on public.slot_capture_masks(profile_id, sort_order);
create index if not exists slot_capture_filters_profile_idx on public.slot_capture_filters(profile_id, sort_order);
create index if not exists slot_capture_outputs_user_idx on public.slot_capture_outputs(user_id, enabled);

drop trigger if exists slot_capture_profiles_updated_at on public.slot_capture_profiles;
create trigger slot_capture_profiles_updated_at before update on public.slot_capture_profiles
for each row execute function public.set_updated_at();
drop trigger if exists slot_capture_sources_updated_at on public.slot_capture_sources;
create trigger slot_capture_sources_updated_at before update on public.slot_capture_sources
for each row execute function public.set_updated_at();
drop trigger if exists slot_capture_masks_updated_at on public.slot_capture_masks;
create trigger slot_capture_masks_updated_at before update on public.slot_capture_masks
for each row execute function public.set_updated_at();
drop trigger if exists slot_capture_filters_updated_at on public.slot_capture_filters;
create trigger slot_capture_filters_updated_at before update on public.slot_capture_filters
for each row execute function public.set_updated_at();
drop trigger if exists slot_capture_outputs_updated_at on public.slot_capture_outputs;
create trigger slot_capture_outputs_updated_at before update on public.slot_capture_outputs
for each row execute function public.set_updated_at();

alter table public.slot_capture_profiles enable row level security;
alter table public.slot_capture_sources enable row level security;
alter table public.slot_capture_masks enable row level security;
alter table public.slot_capture_filters enable row level security;
alter table public.slot_capture_outputs enable row level security;

drop policy if exists "Owners manage capture profiles" on public.slot_capture_profiles;
create policy "Owners manage capture profiles" on public.slot_capture_profiles
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

do $$
declare table_name text;
begin
  foreach table_name in array array['slot_capture_sources','slot_capture_masks','slot_capture_filters','slot_capture_outputs']
  loop
    execute format('drop policy if exists "Owners manage %1$s" on public.%1$I', table_name);
    execute format(
      'create policy "Owners manage %1$s" on public.%1$I for all to authenticated '
      || 'using ((select auth.uid()) = user_id and exists (select 1 from public.slot_capture_profiles p where p.id = profile_id and p.user_id = (select auth.uid()))) '
      || 'with check ((select auth.uid()) = user_id and exists (select 1 from public.slot_capture_profiles p where p.id = profile_id and p.user_id = (select auth.uid())))',
      table_name
    );
  end loop;
end $$;

grant select, insert, update, delete on public.slot_capture_profiles to authenticated;
grant select, insert, update, delete on public.slot_capture_sources to authenticated;
grant select, insert, update, delete on public.slot_capture_masks to authenticated;
grant select, insert, update, delete on public.slot_capture_filters to authenticated;
grant select, insert, update, delete on public.slot_capture_outputs to authenticated;

comment on table public.slot_capture_profiles is 'User-owned metadata for local Slot Capture sessions; never stores video frames.';
comment on column public.slot_capture_sources.page_domain is 'Hostname only. Paths, queries, tokens and full iframe URLs are intentionally excluded.';
