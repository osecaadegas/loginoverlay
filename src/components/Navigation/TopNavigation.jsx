import { Link, NavLink, useLocation } from 'react-router-dom';
import { Grid3X3 } from 'lucide-react';
import './TopNavigation.css';

const AUDIENCE_OPTIONS = [
  { audience: 'player', label: 'Gamblers', defaultTo: '/player' },
  { audience: 'streamer', label: 'Streamers', defaultTo: '/streamer' },
];

export function AudienceToggle({
  activeAudience,
  onSelect,
  playerTo = '/player',
  streamerTo = '/streamer',
}) {
  const destinations = { player: playerTo, streamer: streamerTo };

  return (
    <div className="audience-toggle" aria-label="Choose your experience">
      {AUDIENCE_OPTIONS.map(({ audience, label, defaultTo }) => {
        const className = `audience-toggle__option${activeAudience === audience ? ` audience-toggle__option--active audience-toggle__option--${audience}` : ''}`;

        if (onSelect) {
          return (
            <button
              key={audience}
              type="button"
              className={className}
              aria-current={activeAudience === audience ? 'page' : undefined}
              onClick={() => onSelect(audience)}
            >
              {label}
            </button>
          );
        }

        return (
          <Link
            key={audience}
            to={destinations[audience] || defaultTo}
            className={className}
            aria-current={activeAudience === audience ? 'page' : undefined}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

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
        <AudienceToggle
          activeAudience={activeAudience}
          playerTo="/player/bonus-hunt"
          streamerTo="/overlay-center"
        />
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
