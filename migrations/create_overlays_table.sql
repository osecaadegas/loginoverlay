-- Create overlays table for premium users
create table overlays (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  public_id text unique not null,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add index for faster lookups
create index overlays_user_id_idx on overlays(user_id);
create index overlays_public_id_idx on overlays(public_id);

-- Enable Row Level Security
alter table overlays enable row level security;

-- Policy: Premium users can read their own overlays
create policy "premium users can select own overlays"
on overlays
for select
using (
  auth.uid() = user_id
  and exists (
    select 1 from user_roles
    where user_roles.user_id = auth.uid()
    and user_roles.role = 'premium'
  )
);

-- Policy: Premium users can insert their own overlays
create policy "premium users can insert overlays"
on overlays
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from user_roles
    where user_roles.user_id = auth.uid()
    and user_roles.role = 'premium'
  )
);

-- Policy: Premium users can update their own overlays
create policy "premium users can update own overlays"
on overlays
for update
using (
  auth.uid() = user_id
  and exists (
    select 1 from user_roles
    where user_roles.user_id = auth.uid()
    and user_roles.role = 'premium'
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from user_roles
    where user_roles.user_id = auth.uid()
    and user_roles.role = 'premium'
  )
);

-- Policy: Premium users can delete their own overlays
create policy "premium users can delete own overlays"
on overlays
for delete
using (
  auth.uid() = user_id
  and exists (
    select 1 from user_roles
    where user_roles.user_id = auth.uid()
    and user_roles.role = 'premium'
  )
);

-- Note: Public read access (for OBS) will be handled via service key in API route
-- This keeps the overlay data secure while allowing public display
