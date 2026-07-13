import { NavLink } from 'react-router-dom';
import { Grid3X3 } from 'lucide-react';
import './TopNavigation.css';

function Brand() {
  return (
    <a href="https://streamerscenter.com/" className="topnav-brand" aria-label="Streamers Center home">
      <span className="topnav-brand__mark">
        <img src="/StreamerCenterLogo.png" alt="" />
      </span>
    </a>
  );
}

export default function TopNavigation() {
  return (
    <header className="topnav-shell">
      <Brand />

      <div className="topnav-actions">
        <NavLink
          to="/apps"
          className={({ isActive }) => `topnav-account${isActive ? ' topnav-account--active' : ''}`}
        >
          <Grid3X3 size={17} />
          <span>Apps</span>
        </NavLink>
      </div>
    </header>
  );
}
