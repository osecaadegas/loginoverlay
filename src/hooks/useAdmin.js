import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { accountQueryOptions } from "../config/queryClient";
import { getUserRoles } from "../utils/adminUtils";
import { getAccessTokenWithFallback } from "../utils/authSession";
import { fetchWithTimeout, withTimeout } from "../utils/asyncTimeout";

function buildAccessState({
  hasStreamerEntitlement,
  roles,
  serverRoleNames,
}) {
  const roleNames = new Set([
    ...roles.map((role) => role.role),
    ...serverRoleNames,
  ]);
  const hasAdminAccess = roleNames.has("admin") || roleNames.has("superadmin");

  return {
    userRoles: roles,
    isAdmin: hasAdminAccess,
    isModerator: roleNames.has("moderator") || hasAdminAccess,
    isSlotModder: roleNames.has("slot_modder") || hasAdminAccess,
    isPremium: hasStreamerEntitlement || roleNames.has("premium") || hasAdminAccess,
    isAffiliate: roleNames.has("affiliate") || hasAdminAccess,
  };
}

const NO_ACCESS = buildAccessState({
  hasStreamerEntitlement: false,
  roles: [],
  serverRoleNames: [],
});

async function loadRoleAccess(userId) {
  try {
    const result = await withTimeout(
      getUserRoles(userId),
      8000,
      "Role access check",
    );
    return {
      roles: result.data || [],
      rolesError: result.error || null,
    };
  } catch (error) {
    return { roles: [], rolesError: error };
  }
}

function shouldReplaceRolesWithServerRoles(roles, serverRoles) {
  return (
    Array.isArray(serverRoles) &&
    (!roles.length || roles.every((role) => role.role === "user"))
  );
}

async function loadPremiumAccess(roles) {
  try {
    const token = await getAccessTokenWithFallback({
      timeoutMs: 6000,
      label: "Premium session token check",
    });
    if (!token)
      return { hasStreamerEntitlement: false, roles, serverRoleNames: [] };

    const response = await fetchWithTimeout(
      "/api/premium?action=status",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      { timeoutMs: 8000, label: "Premium entitlement check" },
    );
    if (!response.ok)
      return { hasStreamerEntitlement: false, roles, serverRoleNames: [] };

    const payload = await response.json();
    const serverRoles = payload.access?.roles;
    return {
      hasStreamerEntitlement: !!payload.access?.hasStreamerAccess,
      roles: shouldReplaceRolesWithServerRoles(roles, serverRoles)
        ? serverRoles
        : roles,
      serverRoleNames: Array.isArray(payload.access?.roleNames)
        ? payload.access.roleNames
        : [],
    };
  } catch (error) {
    console.warn("Premium entitlement check failed:", error);
    return { hasStreamerEntitlement: false, roles, serverRoleNames: [] };
  }
}

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const access = useQuery({
    ...accountQueryOptions,
    queryKey: ['account', user?.id, 'roles'],
    enabled: !!user?.id && !authLoading,
    queryFn: async () => {
      const { roles, rolesError } = await loadRoleAccess(user.id);
      const premiumAccess = await loadPremiumAccess(roles);
      if (rolesError && !premiumAccess.hasStreamerEntitlement) throw rolesError;
      return buildAccessState(premiumAccess);
    },
  });

  return {
    ...(user && !access.isError ? access.data || NO_ACCESS : NO_ACCESS),
    loading: authLoading || (!!user && access.isPending),
  };
};
