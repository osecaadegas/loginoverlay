-- ============================================
-- ROLLBACK SAAS OVERLAY SYSTEM
-- Use this to completely remove all SaaS overlay tables and changes
-- WARNING: This will delete ALL overlay data permanently!
-- ============================================

-- ==================== DISABLE REALTIME ====================
alter publication supabase_realtime drop table if exists overlays;
alter publication supabase_realtime drop table if exists widgets;
alter publication supabase_realtime drop table if exists widget_state;
alter publication supabase_realtime drop table if exists subscriptions;

-- ==================== DROP TRIGGERS ====================
drop trigger if exists update_overlays_updated_at on overlays;
drop trigger if exists update_widgets_updated_at on widgets;
drop trigger if exists update_subscriptions_updated_at on subscriptions;
drop trigger if exists update_user_profiles_updated_at on user_profiles;

-- ==================== DROP FUNCTIONS ====================
drop function if exists has_active_subscription(uuid);
drop function if exists generate_secure_token();
drop function if exists rotate_overlay_token(uuid);
drop function if exists update_updated_at_column();

-- ==================== DROP TABLES (in reverse dependency order) ====================

-- Drop audit log
drop table if exists overlay_events cascade;

-- Drop themes
drop table if exists custom_themes cascade;

-- Drop presets
drop table if exists overlay_presets cascade;

-- Drop widget state
drop table if exists widget_state cascade;

-- Drop widgets
drop table if exists widgets cascade;

-- Drop widget types
drop table if exists widget_types cascade;

-- Drop overlays
drop table if exists overlays cascade;

-- Drop subscriptions
drop table if exists subscriptions cascade;

-- Drop subscription plans
drop table if exists subscription_plans cascade;

-- ==================== REMOVE TWITCH COLUMNS FROM USER_PROFILES ====================
-- Only remove columns that were added by the SaaS system
-- Keep original columns: id, user_id, avatar_url, created_at

alter table user_profiles 
  drop column if exists twitch_id,
  drop column if exists twitch_username,
  drop column if exists twitch_display_name,
  drop column if exists twitch_avatar_url,
  drop column if exists twitch_email,
  drop column if exists updated_at;

-- Restore original policies (if they were changed)
drop policy if exists "users can select own profile" on user_profiles;
create policy "Users can view own profile"
  on user_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert own profile" on user_profiles;
create policy "Users can insert own profile"
  on user_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update own profile" on user_profiles;
create policy "Users can update own profile"
  on user_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==================== COMPLETE ====================
-- All SaaS overlay system changes have been rolled back
-- Your database is restored to its previous state
