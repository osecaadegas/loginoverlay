import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { useEffect } from 'react';
import TournamentPanel from './TournamentPanel';
import '../CustomizationPanel/CustomizationPage.css';

const TournamentPage = () => {
  const { isAdmin, isModerator, isPremium, loading } = useAdmin();
  const navigate = useNavigate();
  const hasAccess = isAdmin || isModerator || isPremium;

  useEffect(() => {
    if (!loading && !hasAccess) {
      navigate('/');
    }
  }, [hasAccess, loading, navigate]);

  if (loading) {
    return (
      <div className="overlay-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="overlay-page">
      <div className="overlay-page-header">
        <h1>🏆 Tournament Manager</h1>
        <p>Create and manage slot tournaments</p>
      </div>
      <div className="overlay-page-content">
        <TournamentPanel onClose={() => navigate('/overlay')} />
      </div>
    </div>
  );
};

export default TournamentPage;
