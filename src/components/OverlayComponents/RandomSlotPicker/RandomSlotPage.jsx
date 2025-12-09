import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { useEffect } from 'react';
import RandomSlotPicker from './RandomSlotPicker';
import '../CustomizationPanel/CustomizationPage.css';

const RandomSlotPage = () => {
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
        <h1>🎲 Random Slot Picker</h1>
        <p>Pick a random slot from the database</p>
      </div>
      <div className="overlay-page-content">
        <RandomSlotPicker onClose={() => navigate('/overlay')} />
      </div>
    </div>
  );
};

export default RandomSlotPage;
