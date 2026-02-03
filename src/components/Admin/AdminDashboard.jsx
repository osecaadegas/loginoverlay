// Admin Dashboard - Main Layout Component
import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({
    gameContent: true,
    security: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="admin-dashboard">
      {/* Top Bar */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-logo">🎮 THE LIFE ADMIN</h1>
        </div>
        
        <div className="admin-header-center">
          <input 
            type="search" 
            className="admin-search" 
            placeholder="Search players, items, crimes..."
          />
        </div>
        
        <div className="admin-header-right">
          <button className="admin-notifications">
            🔔 <span className="notification-badge">5</span>
          </button>
          <div className="admin-user">
            👤 Admin User
          </div>
        </div>
      </header>

      <div className="admin-body">
        {/* Sidebar Navigation */}
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            <Link 
              to="/admin" 
              className={`nav-item ${isActive('/admin') && !isActive('/admin/') ? 'active' : ''}`}
            >
              🏠 Dashboard
            </Link>

            {/* Game Content Section */}
            <div className="nav-section">
              <button 
                className="nav-section-header"
                onClick={() => toggleSection('gameContent')}
              >
                🎯 Game Content {expandedSections.gameContent ? '▼' : '▶'}
              </button>
              {expandedSections.gameContent && (
                <div className="nav-section-items">
                  <Link to="/admin/crimes" className={`nav-item sub-item ${isActive('/admin/crimes') ? 'active' : ''}`}>
                    Crimes
                  </Link>
                  <Link to="/admin/businesses" className={`nav-item sub-item ${isActive('/admin/businesses') ? 'active' : ''}`}>
                    Businesses
                  </Link>
                  <Link to="/admin/items" className={`nav-item sub-item ${isActive('/admin/items') ? 'active' : ''}`}>
                    Items
                  </Link>
                  <Link to="/admin/economy" className={`nav-item sub-item ${isActive('/admin/economy') ? 'active' : ''}`}>
                    Economy
                  </Link>
                </div>
              )}
            </div>

            <Link to="/admin/players" className={`nav-item ${isActive('/admin/players') ? 'active' : ''}`}>
              👥 Players
            </Link>

            {/* Security Section */}
            <div className="nav-section">
              <button 
                className="nav-section-header"
                onClick={() => toggleSection('security')}
              >
                🔒 Security {expandedSections.security ? '▼' : '▶'}
              </button>
              {expandedSections.security && (
                <div className="nav-section-items">
                  <Link to="/admin/alerts" className={`nav-item sub-item ${isActive('/admin/alerts') ? 'active' : ''}`}>
                    Alerts
                  </Link>
                  <Link to="/admin/logs" className={`nav-item sub-item ${isActive('/admin/logs') ? 'active' : ''}`}>
                    Logs
                  </Link>
                  <Link to="/admin/rules" className={`nav-item sub-item ${isActive('/admin/rules') ? 'active' : ''}`}>
                    Rules
                  </Link>
                  <Link to="/admin/investigations" className={`nav-item sub-item ${isActive('/admin/investigations') ? 'active' : ''}`}>
                    Investigations
                  </Link>
                </div>
              )}
            </div>

            <Link to="/admin/settings" className={`nav-item ${isActive('/admin/settings') ? 'active' : ''}`}>
              ⚙️ Settings
            </Link>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
