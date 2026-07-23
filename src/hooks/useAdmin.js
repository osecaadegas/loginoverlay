import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserRoles } from "../utils/adminUtils";
import { getAccessTokenWithFallback } from "../utils/authSession";
import { fetchWithTimeout, withTimeout } from "../utils/asyncTimeout";

function resetAccessState({
  setIsAdmin,
  setIsAffiliate,
  setIsModerator,
  setIsPremium,
  setIsSlotModder,
  setUserRoles,
}) {
  setIsAdmin(false);
  setIsModerator(false);
  setIsSlotModder(false);
  setIsPremium(false);
  setIsAffiliate(false);
  setUserRoles([]);
}

function applyAccessState({
  hasStreamerEntitlement,
  roles,
  serverRoleNames,
  setIsAdmin,
  setIsAffiliate,
  setIsModerator,
  setIsPremium,
  setIsSlotModder,
  setUserRoles,
}) {
  const roleNames = new Set([
    ...roles.map((role) => role.role),
    ...serverRoleNames,
  ]);
  const hasAdminAccess = roleNames.has("admin") || roleNames.has("superadmin");

  setUserRoles(roles);
  setIsAdmin(hasAdminAccess);
  setIsModerator(roleNames.has("moderator") || hasAdminAccess);
  setIsSlotModder(roleNames.has("slot_modder") || hasAdminAccess);
  setIsPremium(
    hasStreamerEntitlement || roleNames.has("premium") || hasAdminAccess,
  );
  setIsAffiliate(roleNames.has("affiliate") || hasAdminAccess);
}

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
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isSlotModder, setIsSlotModder] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        resetAccessState({
          setIsAdmin,
          setIsAffiliate,
          setIsModerator,
          setIsPremium,
          setIsSlotModder,
          setUserRoles,
        });
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { roles, rolesError } = await loadRoleAccess(user.id);
        const premiumAccess = await loadPremiumAccess(roles);

        if (rolesError && !premiumAccess.hasStreamerEntitlement) {
          console.error("Error checking admin status:", rolesError);
          resetAccessState({
            setIsAdmin,
            setIsAffiliate,
            setIsModerator,
            setIsPremium,
            setIsSlotModder,
            setUserRoles,
          });
        } else {
          applyAccessState({
            hasStreamerEntitlement: premiumAccess.hasStreamerEntitlement,
            roles: premiumAccess.roles,
            serverRoleNames: premiumAccess.serverRoleNames,
            setIsAdmin,
            setIsAffiliate,
            setIsModerator,
            setIsPremium,
            setIsSlotModder,
            setUserRoles,
          });
        }
      } catch (error) {
        console.error("Error in useAdmin:", error);
        resetAccessState({
          setIsAdmin,
          setIsAffiliate,
          setIsModerator,
          setIsPremium,
          setIsSlotModder,
          setUserRoles,
        });
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return {
    isAdmin,
    isModerator,
    isSlotModder,
    isPremium,
    isAffiliate,
    userRoles,
    loading,
  };
};
