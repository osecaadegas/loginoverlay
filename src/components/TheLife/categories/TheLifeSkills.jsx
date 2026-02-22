import '../styles/TheLifeSkills.css';
import { upgradePlayerSkill } from '../utils/safeRpc';

/**
 * Skills Category Component
 * Handles player skill upgrades and progression
 */
export default function TheLifeSkills({ 
  player,
  setPlayer,
  setPlayerFromAction,
  setMessage,
  isInHospital,
  user
}) {
  
  const upgradeSkill = async (skillName) => {
    const skillKey = skillName.toLowerCase();

    try {
      // Use server-side RPC to upgrade skill (with fallback if RPC not yet created)
      const result = await upgradePlayerSkill(skillKey, player, user.id);
      
      if (!result.success) {
        setMessage({ type: 'error', text: result.error || 'Failed to upgrade' });
        return;
      }

      console.log('Skill upgraded:', result.skill, 'to level', result.new_level, 'cost:', result.cost);
      if (result.player) setPlayerFromAction(result.player);
      setMessage({ type: 'success', text: `${skillName} upgraded to level ${result.new_level}! (-$${(result.cost || 0).toLocaleString()})` });
    } catch (err) {
      console.error('Error upgrading skill:', err);
      setMessage({ type: 'error', text: `Failed to upgrade: ${err.message || 'Unknown error'}` });
    }
  };

  const getSkillCost = (skillKey) => {
    // Use player value as display (may include equipment bonus), 
    // but actual cost is calculated from fresh DB value on upgrade
    const currentLevel = player[skillKey] || 0;
    return Math.floor(500 * Math.pow(1.15, currentLevel));
  };

  return (
    <div className="skills-section">
      {isInHospital && (
        <div className="hospital-warning-box">
          <span className="warning-icon">🏥</span>
          <p>You cannot upgrade skills while in hospital!</p>
        </div>
      )}

      <div className="skills-grid">
        <div className="skill-card">
          <div className="skill-icon">💪</div>
          <h3>Power</h3>
          <p>Increase damage in PvP battles and crime success</p>
          <div className="skill-level">Level: {player?.power || 0}</div>
          <div className="skill-progress-bar">
            <div 
              className="skill-progress-fill"
              style={{width: `${Math.min(((player?.power || 0) / 100) * 100, 100)}%`}}
            ></div>
          </div>
          <button 
            onClick={() => upgradeSkill('Power')}
            disabled={isInHospital}
            className="upgrade-btn"
          >
            Upgrade - ${getSkillCost('power').toLocaleString()}
          </button>
        </div>

        <div className="skill-card">
          <div className="skill-icon">🧠</div>
          <h3>Intelligence</h3>
          <p>Gain more XP and better business profits</p>
          <div className="skill-level">Level: {player?.intelligence || 0}</div>
          <div className="skill-progress-bar">
            <div 
              className="skill-progress-fill"
              style={{width: `${Math.min(((player?.intelligence || 0) / 100) * 100, 100)}%`}}
            ></div>
          </div>
          <button 
            onClick={() => upgradeSkill('Intelligence')}
            disabled={isInHospital}
            className="upgrade-btn"
          >
            Upgrade - ${getSkillCost('intelligence').toLocaleString()}
          </button>
        </div>

        <div className="skill-card">
          <div className="skill-icon">🛡️</div>
          <h3>Defense</h3>
          <p>Reduce damage taken in combat and jail time</p>
          <div className="skill-level">Level: {player?.defense || 0}</div>
          <div className="skill-progress-bar">
            <div 
              className="skill-progress-fill"
              style={{width: `${Math.min(((player?.defense || 0) / 100) * 100, 100)}%`}}
            ></div>
          </div>
          <button 
            onClick={() => upgradeSkill('Defense')}
            disabled={isInHospital}
            className="upgrade-btn"
          >
            Upgrade - ${getSkillCost('defense').toLocaleString()}
          </button>
        </div>
      </div>

      <div className="skills-info">
        <h3>📈 Skill System</h3>
        <ul>
          <li>Skills permanently improve your character</li>
          <li>Each upgrade costs $1,000 more than the previous level</li>
          <li>Skills stack with equipment and level bonuses</li>
          <li>Max skill level: 100</li>
        </ul>
      </div>
    </div>
  );
}
