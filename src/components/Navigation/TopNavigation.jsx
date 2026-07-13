import { NavLink, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const activeAudience = location.pathname.startsWith('/player') ? 'player' : 'streamer';

  return (
    <header className="topnav-shell">
      <div className="topnav-brand-zone">
        <Brand />
        <div className="topnav-audience-switch" aria-label="Switch experience">
          <NavLink
            to="/player/bonus-hunt"
            className={`topnav-audience-switch__option${activeAudience === 'player' ? ' topnav-audience-switch__option--active' : ''}`}
            aria-current={activeAudience === 'player' ? 'page' : undefined}
          >
            Player
          </NavLink>
          <NavLink
            to="/overlay-center"
            className={`topnav-audience-switch__option${activeAudience === 'streamer' ? ' topnav-audience-switch__option--active' : ''}`}
            aria-current={activeAudience === 'streamer' ? 'page' : undefined}
          >
            Streamer
          </NavLink>
        </div>
      </div>

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
