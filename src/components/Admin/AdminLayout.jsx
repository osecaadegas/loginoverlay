import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  Home, Shield, ScrollText, Users, Search as SearchIcon, 
  Settings, Sliders, Book, Bell, User, Menu, X 
} from 'lucide-react';
import './AdminLayout.css';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(';');

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/anticheat', exact: true },
    { icon: Shield, label: 'Alerts', path: '/anticheat/alerts', badge: 3 },
    { icon: ScrollText, label: 'Logs', path: '/anticheat/logs' },
    { icon: Users, label: 'Players', path: '/anticheat/players' },
    { icon: SearchIcon, label: 'Investigations', path: '/anticheat/investigations' },
    { icon: Sliders, label: 'Rules', path: '/anticheat/rules' },
  ];

  const utilityItems = [
    { icon: Settings, label: 'Settings', path: '/anticheat/settings' },
    { icon: Book, label: 'Documentation', path: '/anticheat/docs' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/anticheat/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  return (
    <div className="admin-layout">
      {/* Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="admin-sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Shield className="logo-icon" />
            <span className="logo-text">The Life Admin</span>
          </div>
          <button 
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              
              return (
                <button
                  key={item.path}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  title={item.label}
                >
                  <Icon className="nav-icon" size={20} />
                  <span className="nav-label">{item.label}</span>
                  {item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="nav-divider"></div>

          <div className="nav-section">
            {utilityItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <button
                  key={item.path}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  title={item.label}
                >
                  <Icon className="nav-icon" size={20} />
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="admin-main full-width">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button 
              className="sidebar-toggle menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Open navigation panel"
            >
              <Menu size={20} />
              <span className="menu-label">Menu</span>
            </button>
            <span className="topbar-title">The Life Admin</span>
          </div>

          <div className="topbar-center">
            <button 
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon size={16} />
              <span>Search...</span>
              <kbd>⌘K</kbd>
            </button>
          </div>

          <div className="topbar-right">
            <button className="topbar-icon-btn" title="Notifications">
              <Bell size={20} />
              <span className="notification-dot">2</span>
            </button>
            <button className="topbar-profile" title="Admin Profile">
              <User size={20} />
              <span>JM</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="search-modal-overlay" onClick={() => setSearchOpen(false)}>
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearch}>
              <div className="search-input-wrapper">
                <SearchIcon className="search-icon" size={20} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search players, logs, alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button type="button" className="search-close" onClick={() => setSearchOpen(false)}>
                  <X size={16} />
                </button>
              </div>
            </form>
            <div className="search-hints">
              <span>Press <kbd>Esc</kbd> to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
