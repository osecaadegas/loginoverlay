export function mergeUserRole(user, savedRole) {
  if (!user || !savedRole?.role) return user;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return {
    ...user,
    roles: [...roles.filter((role) => role.role !== savedRole.role), savedRole],
  };
}

export function removeUserRoleFromState(user, roleName) {
  if (!user || !roleName) return user;
  return {
    ...user,
    roles: (Array.isArray(user.roles) ? user.roles : []).filter(
      (role) => role.role !== roleName,
    ),
  };
}

export function reconcileEditingUser(current, refreshedUsers) {
  if (!current || !Array.isArray(refreshedUsers)) return current;
  const refreshed = refreshedUsers.find((user) => user.id === current.id);
  if (!refreshed) return current;
  return {
    ...refreshed,
    newRole: current.newRole || "",
    newRoleExpiryDays: current.newRoleExpiryDays || "",
    newRoleModeratorPermissions: current.newRoleModeratorPermissions || {},
  };
}
