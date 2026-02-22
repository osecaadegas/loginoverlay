import '../styles/TheLifeSkills.css';
import { supabase } from '../../../config/supabaseClient';

/**
 * Skills Category Component
 * Handles player skill upgrades and progression
 */
export default function TheLifeSkills({ 
  player,
  setPlayer,
  setMessage,
  isInHospital,
  user
}) {
  
  const upgradeSkill = async (skillName) => {
    const skillKey = skillName.toLowerCase();

    try {
      // Fetch raw DB value to avoid equipment bonus inflation
      const { data: freshPlayer, error: fetchError } = await supabase
        .from('the_life_players')
        .select('id, cash, power, intelligence, defense')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const currentLevel = freshPlayer[skillKey] || 0;

      // Cost increases by 1000 each level
      const cost = (currentLevel + 1) * 1000;
      
      if (freshPlayer.cash < cost) {
        setMessage({ type: 'error', text: `Need $${cost.toLocaleString()} to upgrade ${skillName}!` });
        return;
      }

      if (currentLevel >= 100) {
        setMessage({ type: 'error', text: `${skillName} is already at max level (100)!` });
        return;
      }

      const updates = {
        cash: freshPlayer.cash - cost,
        [skillKey]: currentLevel + 1
      };

      console.log('Upgrading skill:', skillName, 'to level', currentLevel + 1);
      console.log('Updates:', updates);

      const { data, error } = await supabase
        .from('the_life_players')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Updated player data:', data);
      setPlayer(data);
      setMessage({ type: 'success', text: `${skillName} upgraded to level ${currentLevel + 1}!` });
    } catch (err) {
      console.error('Error upgrading skill:', err);
      setMessage({ type: 'error', text: `Failed to upgrade: ${err.message || 'Unknown error'}` });
    }
  };

  const getSkillCost = (skillKey) => {
    // Use player value as display (may include equipment bonus), 
    // but actual cost is calculated from fresh DB value on upgrade
    const currentLevel = player[skillKey] || 0;
    return (currentLevel + 1) * 1000;
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
