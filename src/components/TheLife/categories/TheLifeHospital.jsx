import '../styles/TheLifeHospital.css';
import { supabase } from '../../../config/supabaseClient';

export default function TheLifeHospital({ 
  player,
  setPlayer,
  isInHospital,
  hospitalTimeRemaining,
  setMessage,
  initializePlayer,
  user
}) {
  // Secure emergency recovery using server-side RPC
  const emergencyRecovery = async () => {
    try {
      const { data, error } = await supabase.rpc('execute_hospital_recovery');
      
      if (error) {
        console.error('Recovery error:', error);
        setMessage({ type: 'error', text: error.message || 'Recovery failed!' });
        return;
      }
      
      if (data?.success) {
        // Refresh player data
        await initializePlayer();
        setMessage({ type: 'success', text: data.message || 'Fully recovered! You\'re back in action!' });
      } else {
        setMessage({ type: 'error', text: data?.error || 'Recovery failed!' });
      }
    } catch (err) {
      console.error('Recovery error:', err);
      setMessage({ type: 'error', text: 'Recovery failed - please try again' });
    }
  };

  const buyService = async (cost, hpRestore, serviceType) => {
    try {
      const { data, error } = await supabase.rpc('execute_hospital_service', {
        p_service_type: serviceType
      });
      
      if (error) {
        console.error('Service error:', error);
        setMessage({ type: 'error', text: error.message || 'Service failed!' });
        return;
      }
      
      if (data?.success) {
        await initializePlayer();
        setMessage({ type: 'success', text: data.message || `Restored ${data.hp_restored} HP!` });
      } else {
        setMessage({ type: 'error', text: data?.error || 'Service failed!' });
      }
    } catch (err) {
      console.error('Service error:', err);
      setMessage({ type: 'error', text: 'Service failed - please try again' });
    }
  };

  const buyFullRecovery = async () => {
    try {
      const { data, error } = await supabase.rpc('execute_hospital_service', {
        p_service_type: 'full'
      });
      
      if (error) {
        console.error('Full recovery error:', error);
        setMessage({ type: 'error', text: error.message || 'Recovery failed!' });
        return;
      }
      
      if (data?.success) {
        await initializePlayer();
        setMessage({ type: 'success', text: data.message || 'Fully restored!' });
      } else {
        setMessage({ type: 'error', text: data?.error || 'Recovery failed!' });
      }
    } catch (err) {
      console.error('Full recovery error:', err);
      setMessage({ type: 'error', text: 'Recovery failed - please try again' });
    }
  };

  // Calculate addiction cure cost
  // Base cost = level × addiction × 30 (expensive for high levels)
  // Stats give a discount up to 25% (higher stats = cheaper)
  // Minimum $100
  const calculateAddictionCureCost = () => {
    const addiction = player?.addiction || 0;
    if (addiction === 0) return 0;
    
    const level = player?.level || 1;
    const stats = (player?.power || 0) + (player?.intelligence || 0) + (player?.defense || 0);
    
    // Base cost scales with level and addiction
    const baseCost = level * addiction * 30;
    
    // Stats give up to 25% discount (every 4 stat points = 1% discount, capped at 25%)
    const statsDiscount = Math.min(stats / 400, 0.25);
    
    // Final cost with discount
    const finalCost = Math.floor(baseCost * (1 - statsDiscount));
    
    return Math.max(100, finalCost);
  };

  // Calculate INTENSE treatment cost for addiction at 100 (overdose)
  // EXTREMELY expensive - 50% of total wealth + level * 5000
  const calculateIntenseTreatmentCost = () => {
    const level = player?.level || 1;
    const totalWealth = (player?.cash || 0) + (player?.bank_balance || 0);
    
    // 50% of wealth + level * 5000 (minimum $50,000)
    const wealthCost = Math.floor(totalWealth * 0.5);
    const levelCost = level * 5000;
    
    return Math.max(50000, wealthCost + levelCost);
  };

  // Intense treatment for overdose patients (secure RPC)
  const intenseTreatment = async () => {
    try {
      const { data, error } = await supabase.rpc('execute_intense_treatment');
      
      if (error) {
        console.error('Intense treatment error:', error);
        setMessage({ type: 'error', text: error.message || 'Treatment failed!' });
        return;
      }
      
      if (data?.success) {
        await initializePlayer();
        setMessage({ type: 'success', text: data.message || '💊 Intense Treatment complete! You\'ve been fully rehabilitated. Stay clean!' });
      } else {
        setMessage({ type: 'error', text: data?.error || 'Treatment failed!' });
      }
    } catch (err) {
      console.error('Intense treatment error:', err);
      setMessage({ type: 'error', text: 'Treatment failed - please try again' });
    }
  };

  // Secure addiction cure using RPC
  const cureAddiction = async () => {
    try {
      const { data, error } = await supabase.rpc('execute_cure_addiction');
      
      if (error) {
        console.error('Cure addiction error:', error);
        setMessage({ type: 'error', text: error.message || 'Cure failed!' });
        return;
      }
      
      if (data?.success) {
        await initializePlayer();
        setMessage({ type: 'success', text: data.message || 'Addiction cured! You feel clean and refreshed!' });
      } else {
        setMessage({ type: 'error', text: data?.error || 'Cure failed!' });
      }
    } catch (err) {
      console.error('Cure addiction error:', err);
      setMessage({ type: 'error', text: 'Cure failed - please try again' });
    }
  };

  // Check if this is an OVERDOSE (addiction at 100 with HP at 0)
  const isOverdose = player?.hp === 0 && (player?.addiction || 0) >= 100;

  if (player?.hp === 0) {
    const recoveryCost = Math.floor((player.cash + player.bank_balance) * 0.15);
    const intenseCost = calculateIntenseTreatmentCost();
    
    return (
      <div className="hospital-section">
        <h2>🏥 Hospital</h2>
        <div className="hospital-emergency">
          {isOverdose ? (
            <>
              <div className="hospital-status overdose">
                <h3>☠️ OVERDOSE - CRITICAL!</h3>
                <p>Your addiction hit 100 and you collapsed! You need INTENSE TREATMENT to survive.</p>
                <p className="overdose-warning">⚠️ Regular recovery is not available for overdose patients!</p>
              </div>
              <div className="recovery-option intense">
                <h4>💉 INTENSE TREATMENT</h4>
                <p>Full medical rehabilitation including addiction cure and HP restoration</p>
                <div className="recovery-cost intense-cost">
                  Cost: ${intenseCost.toLocaleString()}
                </div>
                <p className="intense-note">50% of your total wealth + $5,000 × your level</p>
                <button 
                  className="recovery-btn intense-btn"
                  onClick={intenseTreatment}
                  disabled={player.cash + player.bank_balance < intenseCost}
                >
                  💊 Pay for Intense Treatment
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="hospital-status">
                <h3>💀 Critical Condition!</h3>
                <p>Your HP is at 0. You need immediate medical attention!</p>
              </div>
              <div className="recovery-option">
                <h4>🚑 Emergency Recovery</h4>
                <p>Restore to full HP instantly</p>
                <div className="recovery-cost">
                  Cost: ${recoveryCost.toLocaleString()} (15% of total wealth)
                </div>
                <button 
                  className="recovery-btn"
                  onClick={emergencyRecovery}
                  disabled={player.cash + player.bank_balance < recoveryCost}
                >
                  Pay for Recovery
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (isInHospital) {
    const recoveryCost = Math.floor((player.cash + player.bank_balance) * 0.15);
    
    return (
      <div className="hospital-section">
        <h2>🏥 Hospital</h2>
        <div className="hospital-active">
          <div className="hospital-status">
            <h3>🤕 You are recovering...</h3>
            <p>You lost all your HP and need time to recover</p>
            {hospitalTimeRemaining && (
              <div className="hospital-timer">
                <span className="timer-label">Recovery Time Remaining:</span>
                <span className="timer-value">
                  {hospitalTimeRemaining.minutes}m {hospitalTimeRemaining.seconds}s
                </span>
              </div>
            )}
            {!hospitalTimeRemaining && (
              <div className="hospital-timer">
                <span className="timer-label">Release Time:</span>
                <span className="timer-value">{new Date(player.hospital_until).toLocaleString()}</span>
              </div>
            )}
          </div>
          <div className="hospital-info">
            <p>💊 Rest up and recover your strength</p>
            <p>⏰ You'll be released automatically when the timer expires</p>
            <p>🚨 Or pay for early release below</p>
          </div>
          <div className="recovery-option">
            <h4>🚑 Emergency Early Release</h4>
            <p>Pay to leave hospital early and restore to full HP</p>
            <div className="recovery-cost">
              Cost: ${recoveryCost.toLocaleString()} (15% of total wealth)
            </div>
            <button 
              className="recovery-btn"
              onClick={emergencyRecovery}
              disabled={player.cash + player.bank_balance < recoveryCost}
            >
              Pay for Early Release
            </button>
          </div>
        </div>
      </div>
    );
  }

  const addictionCureCost = calculateAddictionCureCost();

  return (
    <div className="hospital-section">
      <h2>🏥 Hospital</h2>
      
      {/* Addiction Treatment Section */}
      {(player?.addiction || 0) > 0 && (
        <div className="hospital-addiction-section">
          <div className="addiction-header">
            <h3>💉 Addiction Treatment Center</h3>
            <p>Professional help to overcome your substance dependency</p>
          </div>
          <div className="addiction-status">
            <div className="addiction-bar-container">
              <div className="addiction-bar">
                <div 
                  className="addiction-bar-fill"
                  style={{ width: `${((player?.addiction || 0) / (player?.max_addiction || 100)) * 100}%` }}
                />
              </div>
              <span className="addiction-level">Addiction: {player?.addiction || 0} / {player?.max_addiction || 100}</span>
            </div>
            <div className="addiction-info">
              <p>Your Level: {player?.level || 1}</p>
              <p>Stats Bonus: {(player?.power || 0) + (player?.intelligence || 0) + (player?.defense || 0)} (PWR + INT + DEF)</p>
            </div>
          </div>
          <div className="addiction-treatment">
            <div className="treatment-cost">
              <span className="cost-label">Treatment Cost:</span>
              <span className="cost-value">${addictionCureCost.toLocaleString()}</span>
            </div>
            <p className="treatment-note">Higher stats reduce treatment costs!</p>
            <button 
              className="cure-addiction-btn"
              onClick={cureAddiction}
              disabled={player.cash < addictionCureCost}
            >
              🩺 Cure Addiction
            </button>
          </div>
        </div>
      )}

      {(player?.addiction || 0) === 0 && (
        <div className="hospital-clean">
          <div className="clean-status">
            <h3>✨ You're Clean!</h3>
            <p>No addiction detected. Stay healthy!</p>
          </div>
        </div>
      )}
    </div>
  );
}
