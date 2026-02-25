import { memo, useState, useMemo, useCallback } from 'react';
import './TournamentBracket.css';

/**
 * Parse bracket_structure_json into rounds.
 * Expected format: { rounds: [ { name, matches: [ { id, player1, player2, winner, score1, score2 } ] } ] }
 * Also supports flat array of matches grouped by round_number.
 */
function parseBracket(json, maxPlayers = 32) {
  if (!json) return [];

  // Already in rounds format
  if (json.rounds && Array.isArray(json.rounds)) return json.rounds;

  // Flat array of matches — group by round
  if (Array.isArray(json)) {
    const map = {};
    json.forEach(m => {
      const r = m.round || m.round_number || 1;
      if (!map[r]) map[r] = { name: `Round ${r}`, matches: [] };
      map[r].matches.push(m);
    });
    return Object.values(map).sort((a, b) => {
      const rA = parseInt(a.name.replace(/\D/g, '')) || 0;
      const rB = parseInt(b.name.replace(/\D/g, '')) || 0;
      return rA - rB;
    });
  }

  return [];
}

/**
 * Single match component
 */
const BracketMatch = memo(function BracketMatch({ match, onHover, onLeave, isHighlighted }) {
  const { player1, player2, winner, score1, score2 } = match;

  return (
    <div
      className={`tb-match ${isHighlighted ? 'tb-match--highlighted' : ''}`}
      onMouseEnter={() => onHover?.(match)}
      onMouseLeave={() => onLeave?.()}
    >
      {/* Player 1 */}
      <div className={`tb-player ${winner === player1 ? 'tb-player--winner' : ''} ${winner && winner !== player1 ? 'tb-player--loser' : ''}`}>
        <span className="tb-player-name">{player1 || 'TBD'}</span>
        <span className="tb-player-score">{score1 ?? '—'}</span>
      </div>

      <div className="tb-match-divider" />

      {/* Player 2 */}
      <div className={`tb-player ${winner === player2 ? 'tb-player--winner' : ''} ${winner && winner !== player2 ? 'tb-player--loser' : ''}`}>
        <span className="tb-player-name">{player2 || 'TBD'}</span>
        <span className="tb-player-score">{score2 ?? '—'}</span>
      </div>
    </div>
  );
});

/**
 * TournamentBracket — Renders dynamic bracket from bracket_structure_json.
 * Supports 8, 16, 32 players. Responsive collapse for mobile.
 */
const TournamentBracket = memo(function TournamentBracket({
  tournament,
  className = '',
}) {
  const [hoveredMatch, setHoveredMatch] = useState(null);
  const [mobileRound, setMobileRound] = useState(0);

  const rounds = useMemo(
    () => parseBracket(tournament?.bracket_structure_json, tournament?.max_players),
    [tournament]
  );

  const handleHover = useCallback((match) => setHoveredMatch(match), []);
  const handleLeave = useCallback(() => setHoveredMatch(null), []);

  if (!tournament || rounds.length === 0) {
    return (
      <div className={`tb-empty ${className}`}>
        <div className="tb-empty-icon">🏆</div>
        <p>Bracket not available yet</p>
      </div>
    );
  }

  const totalPlayers = rounds[0]?.matches?.length * 2 || 0;
  const bracketSize = totalPlayers <= 8 ? 'sm' : totalPlayers <= 16 ? 'md' : 'lg';

  return (
    <div className={`tb-container ${className}`}>
      {/* Desktop: full bracket view */}
      <div className={`tb-bracket tb-bracket--${bracketSize}`}>
        {rounds.map((round, rIdx) => (
          <div key={rIdx} className="tb-round">
            <div className="tb-round-header">{round.name || `Round ${rIdx + 1}`}</div>
            <div className="tb-round-matches">
              {round.matches.map((match, mIdx) => (
                <BracketMatch
                  key={match.id || `${rIdx}-${mIdx}`}
                  match={match}
                  onHover={handleHover}
                  onLeave={handleLeave}
                  isHighlighted={hoveredMatch?.id === match.id}
                />
              ))}
            </div>
            {/* Connector lines */}
            {rIdx < rounds.length - 1 && (
              <div className="tb-connectors" aria-hidden="true">
                {round.matches.map((_, mIdx) => (
                  <div key={mIdx} className="tb-connector" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: round selector */}
      <div className="tb-mobile">
        <div className="tb-mobile-tabs">
          {rounds.map((round, idx) => (
            <button
              key={idx}
              className={`tb-mobile-tab ${mobileRound === idx ? 'tb-mobile-tab--active' : ''}`}
              onClick={() => setMobileRound(idx)}
            >
              {round.name || `R${idx + 1}`}
            </button>
          ))}
        </div>
        <div className="tb-mobile-matches">
          {rounds[mobileRound]?.matches.map((match, mIdx) => (
            <BracketMatch
              key={match.id || `m-${mIdx}`}
              match={match}
              onHover={handleHover}
              onLeave={handleLeave}
              isHighlighted={hoveredMatch?.id === match.id}
            />
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredMatch && (
        <div className="tb-tooltip" role="tooltip">
          <div className="tb-tooltip-title">
            {hoveredMatch.player1 || 'TBD'} vs {hoveredMatch.player2 || 'TBD'}
          </div>
          {hoveredMatch.winner && (
            <div className="tb-tooltip-winner">
              🏆 Winner: {hoveredMatch.winner}
            </div>
          )}
          {hoveredMatch.score1 != null && hoveredMatch.score2 != null && (
            <div className="tb-tooltip-score">
              Score: {hoveredMatch.score1} — {hoveredMatch.score2}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * TournamentCard — summary card for tournament listings
 */
export const TournamentCard = memo(function TournamentCard({ tournament, onClick }) {
  if (!tournament) return null;

  const { name, prize_pool, start_date, end_date, status, max_players, game } = tournament;
  const isActive = status === 'active';
  const isUpcoming = status === 'upcoming';

  const startStr = start_date ? new Date(start_date).toLocaleDateString() : '—';
  const endStr = end_date ? new Date(end_date).toLocaleDateString() : '—';

  return (
    <div
      className={`tb-tour-card ${isActive ? 'tb-tour-card--active' : ''}`}
      onClick={() => onClick?.(tournament)}
      role="button"
      tabIndex={0}
    >
      <div className="tb-tour-status">
        <span className={`tb-tour-badge tb-tour-badge--${status}`}>
          {status?.toUpperCase()}
        </span>
      </div>
      <h3 className="tb-tour-name">{name}</h3>
      <div className="tb-tour-meta">
        {game && <span className="tb-tour-game">{game.name}</span>}
        <span className="tb-tour-dates">{startStr} — {endStr}</span>
      </div>
      <div className="tb-tour-footer">
        <div className="tb-tour-prize">
          <span className="tb-tour-prize-label">Prize Pool</span>
          <span className="tb-tour-prize-value">
            {prize_pool ? `€${Number(prize_pool).toLocaleString()}` : 'TBD'}
          </span>
        </div>
        <div className="tb-tour-players">
          <span className="tb-tour-players-label">Players</span>
          <span className="tb-tour-players-value">{max_players || 32}</span>
        </div>
      </div>
    </div>
  );
});

export default TournamentBracket;
