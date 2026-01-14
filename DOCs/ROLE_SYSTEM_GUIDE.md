# 4-Tier Role System Guide

## Overview
This application uses a hierarchical 4-tier role system to control access to the overlay and admin panel.

---

## Role Hierarchy

```
Admin > Moderator > Premium > User
```

### 1. **Admin Role** 🛡️
- **Full Access**: Complete control over the application
- **Admin Panel**: Full access to all admin features
- **Overlay Access**: ✅ Yes
- **Permissions**:
  - View all users
  - Edit user roles
  - Assign/revoke access
  - View statistics
  - Manage moderator permissions
  - Delete users

### 2. **Moderator Role** 🔧
- **Overlay Access**: ✅ Yes
- **Admin Panel**: Customizable access (set by admin)
- **Permissions**: Configured per moderator by admins
  - ☑️ **view_users**: Can view user list in admin panel
  - ☑️ **edit_user_roles**: Can change user roles and access expiration
  - ☑️ **revoke_access**: Can revoke user access
  - ☑️ **view_statistics**: Can view user statistics dashboard

**Note**: Moderators can have any combination of these permissions. Admins choose which permissions each moderator has.

### 3. **Premium Role** ⭐
- **Overlay Access**: ✅ Yes
- **Admin Panel**: ❌ No access
- **Purpose**: Paid subscribers or VIP users who need overlay access only

### 4. **User Role** 👤
- **Overlay Access**: ❌ No
- **Admin Panel**: ❌ No access
- **Purpose**: Default role for new registrations. Users must be upgraded to access the overlay.

---

## Access Control Logic

### Overlay Access (`/overlay` route)
Only the following roles can access the overlay:
- ✅ Admin
- ✅ Moderator (with any permissions)
- ✅ Premium
- ❌ User (blocked)

### Admin Panel Access (`/admin` route)
- ✅ Admin (full access to everything)
- ✅ Moderator (limited access based on assigned permissions)
- ❌ Premium (blocked)
- ❌ User (blocked)

---

## Setting Up Roles

### Making Someone an Admin

1. Run this SQL in Supabase SQL Editor:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR-USER-ID-HERE', 'admin')
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';
```

### Assigning Moderator with Permissions

1. Login as an admin
2. Go to `/admin`
3. Click **✏️** edit button on a user
4. Select **"Moderator (Overlay + Custom Admin)"** role
5. Check the permissions you want to grant:
   - ☑️ View Users
   - ☑️ Edit User Roles
   - ☑️ Revoke Access
   - ☑️ View Statistics
6. Set access duration if needed
7. Click **"Save Changes"**

### Granting Premium Access

1. Login as an admin
2. Go to `/admin`
3. Click **✏️** edit button on a user
4. Select **"Premium (Overlay Only)"** role
5. Optionally set expiration (e.g., 30 days)
6. Click **"Save Changes"**

---

## Code Implementation

### Database Schema

The `user_roles` table includes:

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'user',
  access_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  moderator_permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Moderator Permissions Structure

```javascript
// Example moderator_permissions JSON
{
  "view_users": true,
  "edit_user_roles": false,
  "revoke_access": true,
  "view_statistics": true
}
```

### Checking Permissions in Code

```javascript
import { hasModeratorPermission, isModerator, isAdminOrModerator } from './utils/adminUtils';

// Check if user is a moderator
const moderator = await isModerator(userId);

// Check if user is admin or moderator
const canAccess = await isAdminOrModerator(userId);

// Check specific moderator permission
const canEdit = await hasModeratorPermission(userId, 'edit_user_roles');
```

### Available Helper Functions

In `src/utils/adminUtils.js`:

- `getUserRole(userId)` - Get user's role and permissions
- `isModerator(userId)` - Check if user is moderator
- `isAdminOrModerator(userId)` - Check if user is admin or moderator
- `hasModeratorPermission(userId, permission)` - Check specific moderator permission
- `updateUserRole(userId, role, expiresAt, moderatorPermissions)` - Update role and permissions
- `checkUserAccess(userId)` - Check if user can access overlay

---

## Access Expiration

All roles except `admin` can have time-limited access:

- **Unlimited**: Leave "Access Duration" empty
- **Time-Limited**: Set days (e.g., `30` for 30 days from today)
- **Expired**: Users with expired access are automatically blocked

The system checks expiration on every overlay access attempt.

---

## User Flow Examples

### Example 1: New User Registers
1. User signs up → Assigned **user** role
2. User tries `/overlay` → **Access Denied** (insufficient role)
3. Admin upgrades to **premium** role
4. User can now access `/overlay` ✅

### Example 2: Promoting to Moderator
1. User has **premium** role (overlay access only)
2. Admin promotes to **moderator** role
3. Admin grants permissions: `view_users` and `view_statistics`
4. Moderator can now:
   - Access `/overlay` ✅
   - Access `/admin` ✅ (limited view)
   - View user list ✅
   - View statistics ✅
   - Edit users ❌ (not granted)

### Example 3: Trial Access
1. Admin gives user **premium** role with 7-day expiration
2. User has overlay access for 7 days
3. After 7 days → **Access Denied** (expired)
4. Admin can extend by editing expiration date

---

## Security Notes

1. **Default Role**: All new users get `user` role (no overlay access)
2. **Admin Required**: Only admins can change roles and permissions
3. **Moderator Limits**: Moderators can only perform actions they're granted
4. **Expiration Checks**: Automatic on every protected route access
5. **RLS Policies**: Supabase Row Level Security enforces database-level permissions

---

## Troubleshooting

### User can't access overlay
- Check their role: Must be `admin`, `moderator`, or `premium`
- Check expiration: `access_expires_at` must be null or future date
- Check active status: `is_active` must be true

### Moderator can't see admin panel
- Check if they have `view_users` permission
- Verify role is exactly `'moderator'` (case-sensitive)
- Check if access has expired

### Can't edit moderator permissions
- Only `admin` role can assign/edit permissions
- Moderator permissions only apply when role is `moderator`
- Permissions are stored in `moderator_permissions` JSONB field

---

## Migration from Old Roles

If you had the old role system (`trial` role), update users:

```sql
-- Convert trial users to premium with 30-day expiration
UPDATE user_roles
SET 
  role = 'premium',
  access_expires_at = NOW() + INTERVAL '30 days'
WHERE role = 'trial';
```

---

## Future Enhancements

Possible additions to the role system:

1. **Custom Roles**: Add more roles as needed
2. **Permission Presets**: Create templates for common moderator setups
3. **Role History**: Track role changes over time
4. **Bulk Actions**: Assign roles to multiple users at once
5. **Auto-Expiry Notifications**: Email users before access expires

---

## Summary

| Role | Overlay | Admin Panel | Customizable | Default |
|------|---------|-------------|--------------|---------|
| Admin | ✅ | ✅ Full | N/A | No |
| Moderator | ✅ | ✅ Custom | Yes | No |
| Premium | ✅ | ❌ | No | No |
| User | ❌ | ❌ | No | **Yes** |

The 4-tier system provides granular control while remaining simple to manage. Admins have full control, moderators get customizable access, premium users get overlay-only access, and regular users must be upgraded to access anything.
