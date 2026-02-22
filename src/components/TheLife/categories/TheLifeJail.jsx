import '../styles/TheLifeJail.css';
import { supabase } from '../../../config/supabaseClient';
import { calculateBribeAmount } from '../utils/gameUtils';
import { useState } from 'react';

export default function TheLifeJail({ 
  player,
  setPlayer,
  setPlayerFromAction,
  jailTimeRemaining,
  isInJail,
  theLifeInventory,
  setMessage,
  loadTheLifeInventory,
  user
}) {
  const [loading, setLoading] = useState(false);

  const useJailFreeCard = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const { data: playerData } = await supabase
        .from('the_life_players')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!playerData) return;

      const jailCard = theLifeInventory.find(inv => 
        inv.item?.name === 'Jail Free Card' && inv.quantity > 0
      );

      if (!jailCard) {
        setMessage({ type: 'error', text: 'You don\'t have a Jail Free Card!' });
        return;
      }

      if (jailCard.quantity === 1) {
        await supabase
          .from('the_life_player_inventory')
          .delete()
          .eq('id', jailCard.id);
      } else {
        await supabase
          .from('the_life_player_inventory')
          .update({ quantity: jailCard.quantity - 1 })
          .eq('id', jailCard.id);
      }

      const { data, error } = await supabase
        .from('the_life_players')
        .update({ jail_until: null })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      // Merge with current player state to preserve local values like stamina
      setPlayerFromAction(prev => ({ ...prev, ...data }));
      await loadTheLifeInventory();
      setMessage({ type: 'success', text: '🔓 You escaped jail using a Jail Free Card!' });
    } catch (err) {
      console.error('Error using jail free card:', err);
      setMessage({ type: 'error', text: 'Failed to use card!' });
    } finally {
      setLoading(false);
    }
  };

  // SECURE: Use server-side RPC for bribe calculation
  const payBribe = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      
      // Call secure server-side function
      const { data: result, error } = await supabase.rpc('execute_jail_bribe');

      if (error) throw error;

      if (!result.success) {
        // Show bribe amount if provided
        if (result.bribe_required) {
          setMessage({ 
            type: 'error', 
            text: `${result.error}. Bribe costs $${result.bribe_required.toLocaleString()}` 
          });
        } else {
          setMessage({ type: 'error', text: result.error });
        }
        return;
      }

      // Refresh player data
      const { data: updatedPlayer } = await supabase
        .from('the_life_players')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (updatedPlayer) {
        setPlayerFromAction(prev => ({ ...prev, ...updatedPlayer }));
      }

      setMessage({ 
        type: 'success', 
        text: `💰 ${result.message} Cost: $${result.bribe_paid?.toLocaleString()}` 
      });
    } catch (err) {
      console.error('Error paying bribe:', err);
      setMessage({ type: 'error', text: 'Failed to pay bribe!' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jail-info-section">
      <h2>🔒 Jail System</h2>
      <p>When you fail a crime, you might get sent to jail.</p>
      
      {isInJail ? (
        <div className="jail-active">
          <div className="jail-status">
            <h3>⚠️ YOU ARE IN JAIL</h3>
            <p>Time Remaining: {jailTimeRemaining ? `${jailTimeRemaining.minutes}m ${jailTimeRemaining.seconds}s` : 'Loading...'}</p>
          </div>
          
          <div className="jail-escape-options">
            {theLifeInventory.some(inv => inv.item?.name === 'Jail Free Card' && inv.quantity > 0) && (
              <div className="jail-escape-option">
                <h4>🔓 Jail Free Card</h4>
                <p>Use your legendary card to escape instantly!</p>
                <p className="escape-cost">Cost: 1 Jail Free Card</p>
                <button onClick={useJailFreeCard} className="escape-jail-btn card-btn" disabled={loading}>
                  {loading ? '⏳ Processing...' : 'Use Jail Free Card'}
                </button>
              </div>
            )}

            {(() => {
              const { bribeAmount, percentage } = calculateBribeAmount(player);
              const totalWealth = (player.cash || 0) + (player.bank_balance || 0);
              const canAfford = player.cash >= bribeAmount;
              const isMinimum = bribeAmount === 100 && totalWealth * (percentage / 100) < 100;
              
              return (
                <div className="jail-escape-option">
                  <h4>💰 Bribe the Cops</h4>
                  <p>Pay off the police to look the other way...</p>
                  <p className="escape-cost">
                    Cost: ${bribeAmount.toLocaleString()} {isMinimum ? '(minimum)' : `(${percentage}% of your wealth)`}
                  </p>
                  <p className="escape-info">
                    💡 Longer jail time = Higher bribe cost
                  </p>
                  <button 
                    onClick={payBribe} 
                    className={`escape-jail-btn bribe-btn ${!canAfford || loading ? 'disabled' : ''}`}
                    disabled={!canAfford || loading}
                  >
                    {loading ? '⏳ Processing...' : canAfford ? 'Pay Bribe' : 'Not Enough Cash'}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="jail-info">
          <div className="info-card">
            <h3>How Jail Works</h3>
            <ul>
              <li>🎲 Failing crimes can send you to jail</li>
              <li>⏰ Jail time varies by crime severity</li>
              <li>🚫 You can't do anything while in jail</li>
              <li>🔓 Two ways to escape early:</li>
              <ul>
                <li>💳 Use a Jail Free Card (instant)</li>
                <li>💰 Bribe the cops (costs % of wealth)</li>
              </ul>
            </ul>
          </div>

          <div className="info-card">
            <h3>💳 Jail Free Card</h3>
            <p>This legendary item instantly releases you from jail!</p>
            <p>You currently have: {theLifeInventory.find(inv => inv.item?.name === 'Jail Free Card')?.quantity || 0} cards</p>
            <p className="hint">💡 These are rare - use them wisely!</p>
          </div>

          <div className="info-card">
            <h3>💰 Bribe System</h3>
            <p>You can always pay a bribe to escape jail early.</p>
            <p>💸 Cost: 5% - 50% of your total wealth (cash + bank)</p>
            <p>💵 Minimum bribe: $100</p>
            <p>⏱️ Longer sentences require higher bribes</p>
            <p className="hint">💡 Formula: 5% base + 2% per 30 minutes (max 50%)</p>
          </div>
        </div>
      )}
    </div>
  );
}
