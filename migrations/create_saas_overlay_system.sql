-- ============================================
-- SAAS OVERLAY SYSTEM - Complete Database Schema
-- Multi-tenant subscription-based overlay platform
-- ============================================

-- ==================== USERS & PROFILES ====================

-- Add Twitch columns to existing user_profiles table (if they don't exist)
alter table user_profiles 
  add column if not exists twitch_id text unique,
  add column if not exists twitch_username text,
  add column if not exists twitch_display_name text,
  add column if not exists twitch_avatar_url text,
  add column if not exists twitch_email text;

-- Update timestamp if it doesn't exist
alter table user_profiles 
  add column if not exists updated_at timestamptz not null default now();

-- Note: RLS already enabled and policies already exist from create_user_profiles.sql
-- If you need to update policies, drop and recreate them:

drop policy if exists "users can select own profile" on user_profiles;
create policy "users can select own profile"
on user_profiles for select
using (auth.uid() = user_id);

drop policy if exists "users can insert own profile" on user_profiles;
create policy "users can insert own profile"
on user_profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "users can update own profile" on user_profiles;
create policy "users can update own profile"
on user_profiles for update
using (auth.uid() = user_id);

-- ==================== SUBSCRIPTIONS ====================

-- Subscription plans
create table if not exists subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  stripe_price_id text unique not null,
  monthly_price integer not null, -- in cents
  features jsonb not null default '[]',
  widget_limit integer,
  custom_themes_enabled boolean default false,
  priority_support boolean default false,
  active boolean default true,
  created_at timestamptz not null default now()
);

-- User subscriptions
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  plan_id uuid references subscription_plans(id),
  status text not null default 'inactive', -- active, inactive, past_due, canceled, trialing
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint valid_status check (status in ('active', 'inactive', 'past_due', 'canceled', 'trialing', 'incomplete'))
);

-- Indexes
create unique index subscriptions_user_id_idx on subscriptions(user_id);
create index subscriptions_stripe_customer_idx on subscriptions(stripe_customer_id);
create index subscriptions_status_idx on subscriptions(status);

-- Enable RLS
alter table subscription_plans enable row level security;
alter table subscriptions enable row level security;

-- Policy: Everyone can read active plans
create policy "anyone can select active plans"
on subscription_plans for select
using (active = true);

-- Policy: Users can read their own subscription
create policy "users can select own subscription"
on subscriptions for select
using (auth.uid() = user_id);

-- ==================== OVERLAYS ====================

-- Upgrade existing overlays table or create if not exists
-- Add new columns to existing table (if they don't exist)
alter table overlays 
  add column if not exists access_token text unique, -- Secret token for validation
  add column if not exists active boolean default true;

-- Drop old indexes if they exist (to recreate with correct structure)
drop index if exists overlays_user_id_idx;
drop index if exists overlays_public_id_idx;

-- Add unique constraint to user_id if not exists
do $$ 
begin
  if not exists (
    select 1 from pg_constraint 
    where conname = 'overlays_user_id_key' 
    and conrelid = 'overlays'::regclass
  ) then
    alter table overlays add constraint overlays_user_id_key unique (user_id);
  end if;
end $$;

-- Recreate indexes
create unique index if not exists overlays_user_id_idx on overlays(user_id);
create unique index if not exists overlays_public_id_idx on overlays(public_id);
create unique index if not exists overlays_access_token_idx on overlays(access_token);

-- RLS already enabled from create_overlays_table.sql
-- Drop old premium-based policies and replace with subscription-based
drop policy if exists "premium users can select own overlays" on overlays;
drop policy if exists "premium users can insert overlays" on overlays;
drop policy if exists "premium users can update own overlays" on overlays;
drop policy if exists "premium users can delete own overlays" on overlays;

-- Policy: Users can read their own overlay
create policy "users can select own overlay"
on overlays for select
using (auth.uid() = user_id);

-- Policy: Users can insert their own overlay (only if subscribed)
create policy "subscribed users can insert overlay"
on overlays for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from subscriptions
    where subscriptions.user_id = auth.uid()
    and subscriptions.status in ('active', 'trialing')
  )
);

-- Policy: Users can update their own overlay
create policy "users can update own overlay"
on overlays for update
using (auth.uid() = user_id);

-- Policy: Users can delete their own overlay
create policy "users can delete own overlay"
on overlays for delete
using (auth.uid() = user_id);

-- ==================== WIDGETS ====================

-- Available widget types
create table if not exists widget_types (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  display_name text not null,
  description text,
  icon text,
  category text, -- balance, wager, alerts, etc.
  default_config jsonb not null default '{}',
  premium_only boolean default false,
  active boolean default true,
  created_at timestamptz not null default now()
);

-- User widget instances
create table if not exists widgets (
  id uuid primary key default uuid_generate_v4(),
  overlay_id uuid not null references overlays(id) on delete cascade,
  widget_type_id uuid not null references widget_types(id),
  name text not null, -- User-given name
  enabled boolean default true,
  position jsonb not null default '{"x": 0, "y": 0}',
  size jsonb not null default '{"width": 300, "height": 200}',
  config jsonb not null default '{}', -- Widget-specific configuration
  z_index integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index widgets_overlay_id_idx on widgets(overlay_id);
create index widgets_enabled_idx on widgets(enabled);

-- Enable RLS
alter table widget_types enable row level security;
alter table widgets enable row level security;

-- Policy: Everyone can read active widget types
create policy "anyone can select active widget types"
on widget_types for select
using (active = true);

-- Policy: Users can manage widgets on their overlay
create policy "users can manage own widgets"
on widgets for all
using (
  exists (
    select 1 from overlays
    where overlays.id = widgets.overlay_id
    and overlays.user_id = auth.uid()
  )
);

-- ==================== WIDGET STATE ====================

-- Real-time widget data
create table if not exists widget_state (
  id uuid primary key default uuid_generate_v4(),
  widget_id uuid not null unique references widgets(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Indexes
create unique index widget_state_widget_id_idx on widget_state(widget_id);

-- Enable RLS
alter table widget_state enable row level security;

-- Policy: Users can manage state for their widgets
create policy "users can manage own widget state"
on widget_state for all
using (
  exists (
    select 1 from widgets
    join overlays on overlays.id = widgets.overlay_id
    where widgets.id = widget_state.widget_id
    and overlays.user_id = auth.uid()
  )
);

-- ==================== PRESETS ====================

-- Saved overlay presets
create table if not exists overlay_presets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  thumbnail_url text,
  preset_data jsonb not null, -- Complete overlay configuration
  is_public boolean default false, -- Allow others to use this preset
  downloads integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index presets_user_id_idx on overlay_presets(user_id);
create index presets_public_idx on overlay_presets(is_public) where is_public = true;

-- Enable RLS
alter table overlay_presets enable row level security;

-- Policy: Users can manage their own presets
create policy "users can manage own presets"
on overlay_presets for all
using (auth.uid() = user_id);

-- Policy: Anyone can view public presets
create policy "anyone can view public presets"
on overlay_presets for select
using (is_public = true);

-- ==================== THEMES ====================

-- Custom themes
create table if not exists custom_themes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  colors jsonb not null, -- primary, secondary, accent, background, text
  fonts jsonb not null, -- heading, body
  effects jsonb not null default '{}', -- shadows, glows, animations
  is_active boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index themes_user_id_idx on custom_themes(user_id);
create index themes_active_idx on custom_themes(user_id, is_active) where is_active = true;

-- Enable RLS
alter table custom_themes enable row level security;

-- Policy: Users can manage their own themes
create policy "users can manage own themes"
on custom_themes for all
using (auth.uid() = user_id);

-- ==================== AUDIT LOG ====================

-- Activity tracking
create table if not exists overlay_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  overlay_id uuid references overlays(id) on delete cascade,
  event_type text not null, -- widget_added, widget_removed, settings_changed, etc.
  event_data jsonb not null default '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Indexes
create index events_user_id_idx on overlay_events(user_id);
create index events_created_at_idx on overlay_events(created_at desc);

-- Enable RLS
alter table overlay_events enable row level security;

-- Policy: Users can read their own events
create policy "users can select own events"
on overlay_events for select
using (auth.uid() = user_id);

-- ==================== FUNCTIONS ====================

-- Function to check if user has active subscription
create or replace function has_active_subscription(user_uuid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from subscriptions
    where user_id = user_uuid
    and status in ('active', 'trialing')
    and (current_period_end is null or current_period_end > now())
  );
$$;

-- Function to generate secure token
create or replace function generate_secure_token()
returns text
language plpgsql
security definer
as $$
declare
  token text;
begin
  token := encode(gen_random_bytes(32), 'hex');
  return token;
end;
$$;

-- Function to rotate overlay access token
create or replace function rotate_overlay_token(overlay_uuid uuid)
returns text
language plpgsql
security definer
as $$
declare
  new_token text;
  overlay_user_id uuid;
begin
  -- Get overlay user
  select user_id into overlay_user_id
  from overlays
  where id = overlay_uuid;
  
  -- Check authorization
  if overlay_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;
  
  -- Generate new token
  new_token := generate_secure_token();
  
  -- Update overlay
  update overlays
  set access_token = new_token,
      updated_at = now()
  where id = overlay_uuid;
  
  return new_token;
end;
$$;

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ==================== TRIGGERS ====================

-- Auto-update updated_at for overlays
create trigger update_overlays_updated_at before update on overlays
  for each row execute function update_updated_at_column();

-- Auto-update updated_at for widgets
create trigger update_widgets_updated_at before update on widgets
  for each row execute function update_updated_at_column();

-- Auto-update updated_at for subscriptions
create trigger update_subscriptions_updated_at before update on subscriptions
  for each row execute function update_updated_at_column();

-- Auto-update updated_at for user_profiles
create trigger update_user_profiles_updated_at before update on user_profiles
  for each row execute function update_updated_at_column();

-- ==================== REALTIME ====================

-- Enable realtime for critical tables
alter publication supabase_realtime add table overlays;
alter publication supabase_realtime add table widgets;
alter publication supabase_realtime add table widget_state;
alter publication supabase_realtime add table subscriptions;

-- ==================== SEED DATA ====================

-- Insert default subscription plans
insert into subscription_plans (name, stripe_price_id, monthly_price, features, widget_limit, custom_themes_enabled, priority_support)
values 
  ('Starter', 'price_starter', 999, '["5 widgets", "Basic themes", "Standard support"]'::jsonb, 5, false, false),
  ('Pro', 'price_pro', 1999, '["Unlimited widgets", "Custom themes", "Priority support", "Presets"]'::jsonb, null, true, true),
  ('Business', 'price_business', 4999, '["Everything in Pro", "White-label", "Custom domain", "API access"]'::jsonb, null, true, true)
on conflict do nothing;

-- Insert default widget types
insert into widget_types (name, display_name, description, icon, category, default_config, premium_only)
values
  ('balance_display', 'Balance Display', 'Shows current balance', '💰', 'stats', '{"fontSize": 24, "showCurrency": true}'::jsonb, false),
  ('wager_counter', 'Wager Counter', 'Tracks total wagered', '🎲', 'stats', '{"fontSize": 20, "showGoal": true}'::jsonb, false),
  ('profit_tracker', 'Profit/Loss Tracker', 'Shows profit or loss', '📊', 'stats', '{"fontSize": 22, "showPercentage": true}'::jsonb, false),
  ('bet_history', 'Bet History Ticker', 'Scrolling bet history', '📜', 'history', '{"maxItems": 10, "scrollSpeed": 2}'::jsonb, false),
  ('goal_bar', 'Goal Bar', 'Progress towards goals', '🎯', 'goals', '{"goal": 10000, "showPercentage": true}'::jsonb, false),
  ('big_win_alert', 'Big Win Alert', 'Alert on big wins', '🎉', 'alerts', '{"threshold": 100, "duration": 5}'::jsonb, false),
  ('loss_streak_alert', 'Loss Streak Alert', 'Alert on losing streaks', '😰', 'alerts', '{"threshold": 5, "duration": 4}'::jsonb, true),
  ('bonus_buy_alert', 'Bonus Buy Alert', 'Alert on bonus buys', '🎰', 'alerts', '{"duration": 6}'::jsonb, true),
  ('session_stats', 'Session Stats', 'Current session statistics', '📈', 'stats', '{"showTime": true, "showSpins": true}'::jsonb, false),
  ('recent_wins', 'Recent Wins', 'Shows recent big wins', '🏆', 'history', '{"maxWins": 5, "minMultiplier": 10}'::jsonb, false)
on conflict do nothing;

-- ==================== COMMENTS ====================

comment on table subscriptions is 'User subscription management with Stripe integration';
comment on table overlays is 'User overlay instances with public URLs and access tokens';
comment on table widgets is 'Widget instances placed on user overlays';
comment on table widget_state is 'Real-time data for each widget';
comment on table overlay_presets is 'Saved overlay configurations for quick setup';
comment on function has_active_subscription is 'Check if user has an active paid subscription';
comment on function rotate_overlay_token is 'Generate a new access token for overlay security';
