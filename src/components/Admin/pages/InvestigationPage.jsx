import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, AlertTriangle, Clock, MapPin } from 'lucide-react';
import './InvestigationPage.css';

const InvestigationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get('player');
  const alertId = searchParams.get('alert');

  return (
    <div className="investigation-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="header-content">
          <h1 className="page-title">Investigation</h1>
          <p className="page-description">
            Player ID: {playerId || 'Not specified'} {alertId && `• Alert ID: ${alertId}`}
          </p>
        </div>
      </div>

      <div className="coming-soon">
        <div className="coming-soon-icon">🔍</div>
        <h2 className="coming-soon-title">Investigation Page Coming Soon</h2>
        <p className="coming-soon-description">
          This page will feature a comprehensive 3-panel investigation interface with:
        </p>
        <ul className="feature-list">
          <li>
            <User size={16} />
            Player profile with stats and risk history
          </li>
          <li>
            <Clock size={16} />
            Complete timeline of all player actions
          </li>
          <li>
            <AlertTriangle size={16} />
            All security alerts and flags
          </li>
          <li>
            <MapPin size={16} />
            Session tracking with IP/device analysis
          </li>
        </ul>
        <button className="back-home-btn" onClick={() => navigate('/admin/dashboard')}>
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default InvestigationPage;
