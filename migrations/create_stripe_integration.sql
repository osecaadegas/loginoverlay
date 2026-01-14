-- ============================================
-- STRIPE WEBHOOK INTEGRATION
-- Functions and tables for Stripe webhook handling
-- ============================================

-- Webhook events log
create table if not exists stripe_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  stripe_event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  processed boolean default false,
  error text,
  created_at timestamptz not null default now()
);

-- Indexes
create index webhook_events_stripe_id_idx on stripe_webhook_events(stripe_event_id);
create index webhook_events_processed_idx on stripe_webhook_events(processed);
create index webhook_events_created_at_idx on stripe_webhook_events(created_at desc);

-- Payment history
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  stripe_payment_intent_id text unique not null,
  amount integer not null, -- in cents
  currency text not null default 'usd',
  status text not null, -- succeeded, pending, failed
  payment_method text,
  created_at timestamptz not null default now()
);

-- Indexes
create index payments_user_id_idx on payments(user_id);
create index payments_subscription_id_idx on payments(subscription_id);
create index payments_created_at_idx on payments(created_at desc);

-- Enable RLS
alter table stripe_webhook_events enable row level security;
alter table payments enable row level security;

-- Policy: Only service role can write webhook events
create policy "service role can manage webhook events"
on stripe_webhook_events for all
using (auth.jwt()->>'role' = 'service_role');

-- Policy: Users can read their own payment history
create policy "users can view own payments"
on payments for select
using (auth.uid() = user_id);

-- ==================== WEBHOOK HANDLER FUNCTION ====================

-- Function to handle subscription updates from Stripe
create or replace function handle_stripe_subscription_update(
  p_stripe_subscription_id text,
  p_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_trial_end timestamptz default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_subscription_id uuid;
begin
  -- Update subscription
  update subscriptions
  set 
    status = p_status,
    current_period_start = p_current_period_start,
    current_period_end = p_current_period_end,
    cancel_at_period_end = p_cancel_at_period_end,
    trial_end = p_trial_end,
    updated_at = now()
  where stripe_subscription_id = p_stripe_subscription_id
  returning id into v_subscription_id;
  
  -- If subscription is no longer active, deactivate overlay
  if p_status not in ('active', 'trialing') then
    update overlays
    set active = false
    where user_id = (
      select user_id from subscriptions where id = v_subscription_id
    );
  else
    -- Reactivate overlay if subscription becomes active again
    update overlays
    set active = true
    where user_id = (
      select user_id from subscriptions where id = v_subscription_id
    );
  end if;
end;
$$;

-- Function to create/update customer from Stripe
create or replace function handle_stripe_customer_update(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_plan_name text,
  p_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_subscription_id uuid;
  v_plan_id uuid;
begin
  -- Get plan ID
  select id into v_plan_id
  from subscription_plans
  where name = p_plan_name;
  
  -- Upsert subscription
  insert into subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    plan_id,
    status,
    current_period_start,
    current_period_end
  )
  values (
    p_user_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    v_plan_id,
    p_status,
    p_current_period_start,
    p_current_period_end
  )
  on conflict (user_id) do update
  set
    stripe_subscription_id = excluded.stripe_subscription_id,
    plan_id = excluded.plan_id,
    status = excluded.status,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    updated_at = now()
  returning id into v_subscription_id;
  
  return v_subscription_id;
end;
$$;

-- Function to log payment
create or replace function log_payment(
  p_user_id uuid,
  p_subscription_id uuid,
  p_payment_intent_id text,
  p_amount integer,
  p_currency text,
  p_status text,
  p_payment_method text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_payment_id uuid;
begin
  insert into payments (
    user_id,
    subscription_id,
    stripe_payment_intent_id,
    amount,
    currency,
    status,
    payment_method
  )
  values (
    p_user_id,
    p_subscription_id,
    p_payment_intent_id,
    p_amount,
    p_currency,
    p_status,
    p_payment_method
  )
  on conflict (stripe_payment_intent_id) do update
  set
    status = excluded.status,
    updated_at = now()
  returning id into v_payment_id;
  
  return v_payment_id;
end;
$$;

-- ==================== SUBSCRIPTION LIFECYCLE ====================

-- Function to cancel subscription
create or replace function cancel_subscription(p_user_id uuid, p_cancel_immediately boolean default false)
returns void
language plpgsql
security definer
as $$
begin
  -- Check authorization
  if p_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;
  
  if p_cancel_immediately then
    update subscriptions
    set 
      status = 'canceled',
      cancel_at_period_end = false,
      updated_at = now()
    where user_id = p_user_id;
    
    -- Deactivate overlay immediately
    update overlays
    set active = false
    where user_id = p_user_id;
  else
    update subscriptions
    set 
      cancel_at_period_end = true,
      updated_at = now()
    where user_id = p_user_id;
  end if;
end;
$$;

-- Function to reactivate subscription
create or replace function reactivate_subscription(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Check authorization
  if p_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;
  
  update subscriptions
  set 
    cancel_at_period_end = false,
    updated_at = now()
  where user_id = p_user_id;
end;
$$;

-- ==================== TRIAL MANAGEMENT ====================

-- Function to start trial
create or replace function start_trial(p_user_id uuid, p_days integer default 7)
returns uuid
language plpgsql
security definer
as $$
declare
  v_subscription_id uuid;
  v_trial_end timestamptz;
begin
  -- Check authorization
  if p_user_id != auth.uid() then
    raise exception 'Unauthorized';
  end if;
  
  -- Check if user already had a trial
  if exists (
    select 1 from subscriptions 
    where user_id = p_user_id 
    and trial_end is not null
  ) then
    raise exception 'User already had a trial';
  end if;
  
  v_trial_end := now() + (p_days || ' days')::interval;
  
  -- Create trial subscription
  insert into subscriptions (
    user_id,
    stripe_customer_id,
    status,
    trial_end
  )
  values (
    p_user_id,
    'trial_' || p_user_id, -- Temporary customer ID for trial
    'trialing',
    v_trial_end
  )
  returning id into v_subscription_id;
  
  return v_subscription_id;
end;
$$;

-- ==================== USAGE TRACKING ====================

-- Widget usage statistics
create table if not exists widget_usage_stats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  widget_type_id uuid not null references widget_types(id) on delete cascade,
  views integer default 0,
  interactions integer default 0,
  total_display_time interval default '0 seconds',
  date date not null default current_date,
  unique(user_id, widget_type_id, date)
);

-- Indexes
create index usage_stats_user_date_idx on widget_usage_stats(user_id, date desc);

-- Enable RLS
alter table widget_usage_stats enable row level security;

-- Policy: Users can view their own usage stats
create policy "users can view own usage stats"
on widget_usage_stats for select
using (auth.uid() = user_id);

-- Function to track widget view
create or replace function track_widget_view(p_widget_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_widget_type_id uuid;
begin
  -- Get widget info
  select 
    o.user_id,
    w.widget_type_id
  into v_user_id, v_widget_type_id
  from widgets w
  join overlays o on o.id = w.overlay_id
  where w.id = p_widget_id;
  
  -- Update stats
  insert into widget_usage_stats (user_id, widget_type_id, views)
  values (v_user_id, v_widget_type_id, 1)
  on conflict (user_id, widget_type_id, date)
  do update set views = widget_usage_stats.views + 1;
end;
$$;

-- ==================== COMMENTS ====================

comment on table stripe_webhook_events is 'Log of all Stripe webhook events for debugging';
comment on table payments is 'Payment history for users';
comment on function handle_stripe_subscription_update is 'Process subscription status updates from Stripe webhooks';
comment on function handle_stripe_customer_update is 'Create or update customer subscription from Stripe';
comment on function start_trial is 'Activate free trial for new users';
comment on function cancel_subscription is 'Cancel user subscription immediately or at period end';
