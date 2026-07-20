import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';

export default function ProtectedAdminRoute({
  children,
  allowPremium = false,
  allowModerator = false,
  allowSlotModder = false,
  allowAffiliate = false,
  redirectTo = '/premium',
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { isAdmin, isModerator, isSlotModder, isPremium, isAffiliate, loading: adminLoading } = useAdmin();

  if (loading || adminLoading) {
    return <LoadingSpinner text="Loading..." fullPage />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  const hasAccess =
    isAdmin ||
    (allowPremium && isPremium) ||
    (allowModerator && isModerator) ||
    (allowSlotModder && isSlotModder) ||
    (allowAffiliate && isAffiliate);

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return children;
}
