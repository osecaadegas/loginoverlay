# Admin Panel Setup Guide

## Overview
The admin panel allows you to manage users, assign roles, and control access duration to your overlay.

---

## Step 1: Create the Database Table in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**
5. Paste the following SQL code:

```sql
-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  access_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  moderator_permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles table
-- Allow users to read their own role
CREATE POLICY "Users can view own role"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins to do everything
CREATE POLICY "Admins can do everything"
  ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

6. Click **"Run"** or press `Ctrl+Enter`
7. You should see "Success. No rows returned"

---

## Step 2: Make Yourself an Admin

Since you're the first user, you need to manually set yourself as admin:

1. Go to **"Authentication"** → **"Users"** in Supabase dashboard
2. Find your user and **copy your User ID** (UUID format)
3. Go back to **"SQL Editor"**
4. Run this query (replace `YOUR_USER_ID` with your actual user ID):

```sql
INSERT INTO user_roles (user_id, role, is_active)
VALUES ('YOUR_USER_ID', 'admin', true)
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin', is_active = true;
```

5. Click **"Run"**

---

## Step 3: Enable Supabase Service Role (For Admin Functions)

The admin panel needs elevated permissions to list and manage users. You need to configure this:

### Option A: Using Supabase Management API (Recommended)

Your current setup uses `supabase.auth.admin.*` functions which require the service role key. 

**⚠️ IMPORTANT: Never expose your service role key in client-side code!**

Since we're calling admin functions from the client, we need to create a Supabase Edge Function or use the anon key with RLS policies. For now, let's update the code to work with what we have.

### Temporary Solution (For Testing):

The admin panel will work for viewing and managing roles, but won't be able to delete users through the admin API. This is actually safer for production.

---

## Step 4: Test Your Admin Panel

1. Visit your site: https://loginoverlay.vercel.app
2. Login with your account
3. You should now see an **"🛡️ Admin"** button in the header
4. Click it to access `/admin`
5. You'll see all registered users and can:
   - Change user roles (user, admin, premium, trial)
   - Set access expiration dates
   - Revoke user access
   - View user statistics

---

## Available Roles

- **admin**: Full access to website and admin panel - can manage all users
- **moderator**: Access to overlay + customizable admin permissions (set by admin)
- **premium**: Access to overlay only (no admin panel)
- **user**: No overlay access (default for new registrations)

### Moderator Permissions

When assigning the **moderator** role, admins can choose which permissions the moderator has:

- **view_users**: Can view the user list in admin panel
- **edit_user_roles**: Can change user roles and access settings
- **revoke_access**: Can revoke user access
- **view_statistics**: Can view user statistics

These permissions are customizable per moderator and can be toggled in the edit user modal.

---

## Setting Access Duration

When editing a user:
1. Click the **✏️** edit button
2. Set **"Access Duration (days)"**
   - Example: `30` = Access expires in 30 days
   - Leave empty = Unlimited access
3. Click **"Save Changes"**

The system will automatically block access when the expiration date is reached.

---

## User Access Flow

1. User registers → Gets `user` role by default
2. Admin assigns role and expiration
3. When user tries to access `/overlay`:
   - System checks if account is active
   - System checks if access has expired
   - If either fails, shows "Access Denied" message

---

## Troubleshooting

### "Failed to load users"
- Check if the `user_roles` table was created successfully
- Verify your user has admin role in the database
- Check browser console for errors

### "Failed to update role"
- Make sure RLS policies are set up correctly
- Verify you're logged in as an admin

### Admin button not showing
- Confirm your user has `role = 'admin'` in the `user_roles` table
- Try refreshing the page
- Check browser console for errors

---

## Security Notes

1. **Never commit your service role key** to git
2. Admin functions should ideally be in Supabase Edge Functions (server-side)
3. Always use RLS policies to protect your data
4. Regularly audit who has admin access
5. Set expiration dates for trial users

---

## Next Steps

- **Automate**: Create a sign-up flow that automatically creates user_roles entries
- **Notifications**: Add email notifications when access is about to expire
- **Analytics**: Track user activity and engagement
- **Billing Integration**: Connect with Stripe or other payment processors

---

## SQL Queries for Common Tasks

### List all admins:
```sql
SELECT u.email, ur.* 
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

### Find expired users:
```sql
SELECT u.email, ur.* 
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.access_expires_at < NOW();
```

### Remove expired access:
```sql
UPDATE user_roles
SET is_active = false
WHERE access_expires_at < NOW() AND is_active = true;
```

---

Your admin panel is now ready to use! 🎉
