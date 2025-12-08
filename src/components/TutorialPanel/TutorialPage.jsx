import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { useEffect } from 'react';
import TutorialPanel from './TutorialPanel';
import '../CustomizationPanel/CustomizationPage.css';

const TutorialPage = () => {
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
        <h1>📚 Overlay Tutorial</h1>
        <p>Learn how to use all overlay features</p>
      </div>
      <div className="overlay-page-content">
        <TutorialPanel onClose={() => navigate('/overlay')} />
      </div>
    </div>
  );
};

export default TutorialPage;
