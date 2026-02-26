import { supabase } from '../config/supabaseClient';

// Get all users with their roles
export const getAllUsers = async () => {
  try {
    // 1. Fetch ALL auth users in one call (no N+1 queries)
    const { data: authUsers, error: authError } = await supabase
      .rpc('get_all_auth_users');

    if (authError) throw authError;

    // 2. Fetch all user roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) throw rolesError;

    // Group roles by user_id
    const userRolesMap = {};
    (rolesData || []).forEach(roleInfo => {
      if (!userRolesMap[roleInfo.user_id]) {
        userRolesMap[roleInfo.user_id] = [];
      }
      userRolesMap[roleInfo.user_id].push(roleInfo);
    });

    // 3. Merge auth users with their roles
    const usersWithRoles = (authUsers || []).map(user => {
      const rolesForUser = userRolesMap[user.id] || [];

      let provider = 'email';
      let providerUsername = null;

      // Extract provider from app_metadata or identities
      if (user.app_metadata?.provider) {
        provider = user.app_metadata.provider;
      } else if (user.identities && user.identities.length > 0) {
        provider = user.identities[0].provider;
      }

      // Get provider username
      if (provider === 'twitch' && user.user_metadata?.full_name) {
        providerUsername = user.user_metadata.full_name;
      } else if (provider === 'twitch' && user.user_metadata?.preferred_username) {
        providerUsername = user.user_metadata.preferred_username;
      } else if (provider === 'discord' && user.user_metadata?.full_name) {
        providerUsername = user.user_metadata.full_name;
      } else if (provider === 'google' && user.user_metadata?.full_name) {
        providerUsername = user.user_metadata.full_name;
      }

      const isActive = rolesForUser.length > 0
        ? rolesForUser.some(role => role.is_active)
        : true; // auth-only users are considered active

      return {
        id: user.id,
        email: user.email || `User ${user.id.substring(0, 8)}...`,
        created_at: user.created_at,
        roles: rolesForUser.length > 0 ? rolesForUser : [{ role: 'user', is_active: true }],
        is_active: isActive,
        provider: provider.charAt(0).toUpperCase() + provider.slice(1),
        provider_username: providerUsername,
      };
    });

    return { data: usersWithRoles, error: null };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { data: null, error };
  }
};

// Get user roles by user ID (returns all roles for a user)
export const getUserRoles = async (userId) => {
  try {
    const { data, error} = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist yet or no record found
      return { data: [{ role: 'user', is_active: true, moderator_permissions: {} }], error: null };
    }

    if (error) throw error;

    // If no roles found, return default user role
    if (!data || data.length === 0) {
      return { data: [{ role: 'user', is_active: true, moderator_permissions: {} }], error: null };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Get user role by user ID (backwards compatibility - returns primary/highest role)
export const getUserRole = async (userId) => {
  const { data, error } = await getUserRoles(userId);
  
  if (error) return { data: null, error };
  
  if (!data || data.length === 0) {
    return { data: { role: 'user', is_active: true, moderator_permissions: {} }, error: null };
  }
  
  // Priority: admin > slot_modder > moderator > premium > user
  const rolePriority = { admin: 5, slot_modder: 4, moderator: 3, premium: 2, user: 1 };
  const highestRole = data.reduce((highest, current) => {
    const currentPriority = rolePriority[current.role] || 0;
    const highestPriority = rolePriority[highest.role] || 0;
    return currentPriority > highestPriority ? current : highest;
  }, data[0]);
  
  return { data: highestRole, error: null };
};

// Update user role and permissions
export const updateUserRole = async (userId, role, accessExpiresAt = null, moderatorPermissions = null) => {
  try {
    const updateData = {
      role: role,
      access_expires_at: accessExpiresAt,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    // Only include moderator_permissions if provided and role is moderator
    if (role === 'moderator' && moderatorPermissions !== null) {
      updateData.moderator_permissions = moderatorPermissions;
    } else if (role !== 'moderator') {
      // Clear moderator permissions if changing to non-moderator role
      updateData.moderator_permissions = {};
    }

    const { data, error } = await supabase
      .from('user_roles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Revoke user access
export const revokeUserAccess = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Check if user has admin access
export const isAdmin = async (userId) => {
  try {
    const { data, error } = await getUserRole(userId);
    if (error) return false;
    return data?.role === 'admin';
  } catch {
    return false;
  }
};

// Check if user has moderator access
export const isModerator = async (userId) => {
  try {
    const { data, error } = await getUserRole(userId);
    if (error) return false;
    return data?.role === 'moderator';
  } catch {
    return false;
  }
};

// Check if user has admin or moderator access
export const isAdminOrModerator = async (userId) => {
  try {
    const { data, error } = await getUserRole(userId);
    if (error) return false;
    return data?.role === 'admin' || data?.role === 'moderator';
  } catch {
    return false;
  }
};

// Check if user has specific moderator permission
export const hasModeratorPermission = async (userId, permission) => {
  try {
    const { data, error } = await getUserRole(userId);
    if (error) return false;
    if (data?.role === 'admin') return true; // Admins have all permissions
    if (data?.role !== 'moderator') return false;
    return data?.moderator_permissions?.[permission] === true;
  } catch {
    return false;
  }
};

// Check if user access is valid
export const checkUserAccess = async (userId) => {
  try {
    const { data, error } = await getUserRole(userId);
    
    if (error) return { hasAccess: true, reason: null }; // Default allow if table doesn't exist

    // Check if role allows overlay access
    const allowedRoles = ['admin', 'moderator', 'premium'];
    if (!allowedRoles.includes(data.role)) {
      return { hasAccess: false, reason: 'Your account does not have overlay access. Please upgrade to Premium or contact an admin.' };
    }

    if (!data.is_active) {
      return { hasAccess: false, reason: 'Account has been deactivated' };
    }

    if (data.access_expires_at) {
      const expiryDate = new Date(data.access_expires_at);
      const now = new Date();
      
      if (now > expiryDate) {
        return { hasAccess: false, reason: 'Access has expired' };
      }
    }

    return { hasAccess: true, reason: null };
  } catch (error) {
    return { hasAccess: true, reason: null }; // Default allow on error
  }
};

// Delete user (admin only)
export const deleteUser = async (userId) => {
  try {
    // First delete from user_roles
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Then delete from auth
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
};

// Add a role to a user
export const addUserRole = async (userId, role, accessExpiresAt = null, moderatorPermissions = null) => {
  try {
    const insertData = {
      user_id: userId,
      role: role,
      access_expires_at: accessExpiresAt,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Only include moderator_permissions if role is moderator
    if (role === 'moderator' && moderatorPermissions !== null) {
      insertData.moderator_permissions = moderatorPermissions;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Remove a specific role from a user
export const removeUserRole = async (userId, role) => {
  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
};

// Update a specific role for a user
export const updateSpecificUserRole = async (userId, role, updates) => {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_roles')
      .update(updateData)
      .eq('user_id', userId)
      .eq('role', role)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Available moderator permissions
export const MODERATOR_PERMISSIONS = {
  view_users: 'View Users',
  edit_user_roles: 'Edit User Roles (Premium only)',
  revoke_access: 'Revoke User Access',
  view_statistics: 'View Statistics',
};
