-- ============================================
-- AUTO TRIAL SYSTEM
-- Automatically give new users a 10-day trial
-- ============================================

-- Create a trigger to auto-create trial subscription for new users
create or replace function create_trial_on_signup()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Create trial subscription
  insert into subscriptions (
    user_id,
    stripe_customer_id,
    status,
    trial_end,
    current_period_end
  )
  values (
    new.user_id,
    'trial_' || new.user_id,
    'trialing',
    now() + interval '10 days',
    now() + interval '10 days'
  )
  on conflict (user_id) do nothing;
  
  return new;
end;
$$;

-- Attach trigger to user_profiles
drop trigger if exists on_user_profile_trial on user_profiles;
create trigger on_user_profile_trial
  after insert on user_profiles
  for each row
  execute function create_trial_on_signup();

-- ==================== OPTIONAL: Give existing users a trial ====================
-- Uncomment the section below to give all existing users without a subscription a 10-day trial

/*
insert into subscriptions (user_id, stripe_customer_id, status, trial_end, current_period_end)
select 
  up.user_id,
  'trial_' || up.user_id,
  'trialing',
  now() + interval '10 days',
  now() + interval '10 days'
from user_profiles up
left join subscriptions s on s.user_id = up.user_id
where s.id is null
on conflict (user_id) do nothing;
*/
