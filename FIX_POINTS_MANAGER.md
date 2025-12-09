# Fix Points Manager - Add Missing Database Function

## Problem
The Points Manager is showing an error: "Could not find the function public.get_all_user_emails without parameters in the schema cache"

## Solution
You need to create the `get_all_user_emails` function in your Supabase database.

## Steps to Fix:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste this SQL code:

```sql
-- Create function to get all user emails and IDs for admin purposes
CREATE OR REPLACE FUNCTION get_all_user_emails()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.users.id as user_id,
    auth.users.email as email,
    auth.users.created_at as created_at
  FROM auth.users
  ORDER BY auth.users.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_user_emails() TO authenticated;

COMMENT ON FUNCTION get_all_user_emails IS 'Returns all user emails and IDs for admin/moderator use in Points Manager';
```

6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned"
8. Refresh your Points Manager page - all users should now appear!

### Option 2: Using Local Migration File

If you have Supabase CLI set up:

```bash
# The migration file is already created at:
# migrations/create_get_all_user_emails_function.sql

# Run it with:
supabase db push
```

## What This Does

- Creates a database function that returns all registered users (user_id, email, created_at)
- Allows the Points Manager to display ALL users, not just those with StreamElements connections
- Shows which users have connected SE and which haven't
- Helps you track user registrations and SE connection status

## Security Note

This function is granted to all authenticated users. In a production environment with sensitive data, you may want to restrict this to admin users only by modifying the GRANT statement.
