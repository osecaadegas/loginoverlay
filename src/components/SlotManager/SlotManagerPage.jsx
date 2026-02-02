import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { useEffect } from 'react';
import SlotManagerV2 from './SlotManagerV2';
import './SlotManagerPage.css';

const SlotManagerPage = () => {
  const { isSlotModder, loading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isSlotModder) {
      navigate('/');
    }
  }, [isSlotModder, loading, navigate]);

  if (loading) {
    return (
      <div className="slot-manager-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isSlotModder) {
    return null;
  }

  return (
    <div className="slot-manager-page">
      <div className="slot-manager-page-header">
        <h1>🎰 Slot Database Manager</h1>
        <p>Add, edit, and manage slots in the database</p>
      </div>
      <div className="slot-manager-page-content">
        <SlotManagerV2 />
      </div>
    </div>
  );
};

export default SlotManagerPage;
