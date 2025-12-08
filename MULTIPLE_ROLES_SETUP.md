# Multiple Roles System Setup Guide

## Overview
This guide explains how to enable and use the multiple roles per user feature in your admin panel.

## Database Migration

### Step 1: Run the Migration
You need to execute the SQL migration in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `migrations/enable_multiple_roles.sql`
5. Click **Run** to execute the migration

The migration will:
- Remove the unique constraint on `user_id` (allowing multiple roles per user)
- Add a composite unique constraint on `user_id + role` (preventing duplicate roles)
- Add an `id` column with UUID primary key for easier record management

### Step 2: Verify Migration
Run this query to check if the migration was successful:

```sql
SELECT * FROM information_schema.table_constraints 
WHERE table_name = 'user_roles' AND constraint_type = 'UNIQUE';
```

You should see a constraint named `user_roles_user_id_role_key`.

## Features

### Admin Panel Updates

1. **User Table Changes**
   - Users now display multiple role badges in the "Role" column
   - Each role badge is color-coded (admin, slot_modder, moderator, premium, user)
   - The "Access Expires" column shows expiry dates for each role separately

2. **Edit User Modal**
   - **Current Roles Section**: Shows all assigned roles with remove (✕) button
   - **Add New Role Section**: Dropdown to select a new role to add
   - **Role-Specific Settings**:
     - For moderator roles: Configure specific permissions
     - For any role: Set optional expiry date
   - **Add Role Button**: Adds the selected role to the user

3. **Statistics Dashboard**
   - Updated to count users with each role type correctly
   - New "Slot Modders" stat card
   - Stats now reflect multiple roles per user

### Role Management

#### Adding a Role to a User
1. Click the **✏️ Edit** button next to the user
2. In the "Add New Role" dropdown, select a role
3. (Optional) Set access duration in days
4. (For moderator) Configure specific permissions
5. Click **Add Role**

#### Removing a Role from a User
1. Click the **✏️ Edit** button next to the user
2. Find the role in the "Current Roles" section
3. Click the **✕** button next to the role
4. Confirm the removal

### Available Roles

- **User** (Default): No overlay access
- **Premium**: Overlay access only
- **Slot Modder**: Can manage slots in the Bonus Hunt panel
- **Moderator**: Overlay + custom admin permissions
- **Admin**: Full access to all features

### Role Priority System

When checking permissions, the system uses the highest priority role:
- Admin: Priority 5 (highest)
- Slot Modder: Priority 4
- Moderator: Priority 3
- Premium: Priority 2
- User: Priority 1 (lowest)

This means a user with both "premium" and "slot_modder" roles will have slot_modder permissions.

## Code Changes Summary

### Backend (`adminUtils.js`)
- `getAllUsers()`: Now groups roles by user_id and returns `roles` array
- `getUserRoles(userId)`: Returns array of all active roles for a user
- `getUserRole(userId)`: Returns highest priority role (backwards compatibility)
- `addUserRole(userId, role, expiresAt, moderatorPermissions)`: Add a new role
- `removeUserRole(userId, role)`: Remove a specific role
- `updateSpecificUserRole(userId, role, updates)`: Update a specific role's properties

### Frontend (`useAdmin.js`)
- Updated to call `getUserRoles()` instead of `getUserRole()`
- Returns array of role objects in `userRoles`
- Permission checks now use `roleNames.includes('role_name')`
- Added `isPremium` check

### UI (`AdminPanel.jsx`)
- Completely redesigned edit modal for multiple role management
- Updated stats to count users with each role correctly
- Table now displays multiple role badges per user
- Added functions: `handleAddRole()`, `handleRemoveRole()`

## Testing

### Test Scenarios

1. **Add Multiple Roles**
   - Add "premium" role to a user
   - Add "slot_modder" role to the same user
   - Verify both badges appear in the table
   - Verify user can access both features

2. **Remove a Role**
   - Remove one role from a user with multiple roles
   - Verify the role badge disappears
   - Verify user still has access to remaining role features

3. **Role Expiry**
   - Add a role with 7-day expiry
   - Verify expiry date displays correctly
   - Add another role with no expiry to same user
   - Verify one shows expiry date, other shows "No Limit"

4. **Moderator Permissions**
   - Add moderator role with specific permissions
   - Verify permissions are saved correctly
   - Add a second moderator role with different permissions
   - Verify both can coexist

## Migration Notes

- **Existing Users**: All existing single-role users will continue to work without changes
- **Backwards Compatibility**: `getUserRole()` function still works for legacy code
- **RLS Policies**: All existing RLS policies work with the new structure (they use `role IN ('admin', 'slot_modder')` which works with multiple records)

## Troubleshooting

### Issue: "duplicate key value violates unique constraint"
**Solution**: A user already has that role. Check the Current Roles list in the edit modal.

### Issue: Stats showing incorrect counts
**Solution**: Refresh the page. The stats are calculated from the current user list in state.

### Issue: Role not appearing after adding
**Solution**: Check the browser console for errors. Ensure the migration was run successfully.

### Issue: Cannot remove last role
**Solution**: This is intentional. Every user must have at least one role. Change the role instead of removing it.

## Future Enhancements

Potential improvements for the multiple roles system:
- Bulk role assignment (assign role to multiple users at once)
- Role templates (predefined permission sets)
- Role expiry notifications
- Audit log for role changes
- CSV export of users with their roles

## Support

If you encounter any issues:
1. Check browser console for errors
2. Verify the SQL migration ran successfully
3. Ensure you're using the latest version of the code
4. Check Supabase logs for any database errors
