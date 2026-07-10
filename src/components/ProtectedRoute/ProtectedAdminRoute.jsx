import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';

export default function ProtectedAdminRoute({
  children,
  allowPremium = false,
  allowModerator = false,
  allowSlotModder = false,
  redirectTo = '/premium',
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { isAdmin, isModerator, isSlotModder, isPremium, loading: adminLoading } = useAdmin();

  if (loading || adminLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'var(--theme-text-primary)'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  const hasAccess =
    isAdmin ||
    (allowPremium && isPremium) ||
    (allowModerator && isModerator) ||
    (allowSlotModder && isSlotModder);

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return children;
}
