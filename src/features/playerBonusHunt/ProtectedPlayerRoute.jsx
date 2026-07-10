import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import usePlayerSubscription from './usePlayerSubscription';

export default function ProtectedPlayerRoute({ children }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { loading, entitled, error } = usePlayerSubscription();

  if (authLoading || loading) {
    return (
      <div className="pbh-page pbh-page--center">
        <div className="pbh-loader">Loading Bonus Hunt...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (!entitled) {
    return (
      <Navigate
        to="/player/subscription"
        replace
        state={{ from: `${location.pathname}${location.search}`, reason: error || 'Player Bonus Hunt access is required.' }}
      />
    );
  }

  return children;
}
