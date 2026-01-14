import { supabase } from '../../../config/supabaseClient';
import '../styles/TheLifeBank.css';

export default function TheLifeBank({ 
  player,
  setPlayer,
  depositAmount,
  setDepositAmount,
  withdrawAmount,
  setWithdrawAmount,
  setMessage,
  user
}) {
  // Props include setDepositAmount and setWithdrawAmount for clearing inputs
  const depositToBank = async (amount) => {
    if (amount > player.cash) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('the_life_players')
        .update({
          cash: player.cash - amount,
          bank_balance: player.bank_balance + amount
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      setMessage({ type: 'success', text: `Deposited $${amount.toLocaleString()}` });
      setDepositAmount('');
    } catch (err) {
      console.error('Error depositing:', err);
    }
  };

  const withdrawFromBank = async (amount) => {
    if (amount > player.bank_balance) {
      setMessage({ type: 'error', text: 'Not enough in bank!' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('the_life_players')
        .update({
          cash: player.cash + amount,
          bank_balance: player.bank_balance - amount
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setPlayer(data);
      setMessage({ type: 'success', text: `Withdrew $${amount.toLocaleString()}` });
      setWithdrawAmount('');
    } catch (err) {
      console.error('Error withdrawing:', err);
    }
  };

  return (
    <div className="bank-section">
      <div className="bank-header">
        <h2>🏦 The Life Bank</h2>
        <p>Keep your money safe from other players!</p>
      </div>

      <div className="bank-balance-display">
        <div className="balance-card cash">
          <div className="balance-icon">💵</div>
          <div className="balance-info">
            <span className="balance-label">Cash on Hand</span>
            <span className="balance-amount">${player?.cash?.toLocaleString() || 0}</span>
          </div>
        </div>
        <div className="balance-card bank">
          <div className="balance-icon">🏦</div>
          <div className="balance-info">
            <span className="balance-label">Bank Balance</span>
            <span className="balance-amount">${player?.bank_balance?.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>

      <div className="bank-actions">
        <div className="bank-action-card deposit-card">
          <h3>💰 Deposit Cash</h3>
          <div className="input-wrapper">
            <span className="input-prefix">$</span>
            <input 
              type="number" 
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Enter amount"
              className="bank-input"
            />
          </div>
          <div className="quick-amounts">
            <button 
              className="quick-btn"
              onClick={() => setDepositAmount(Math.floor(player.cash * 0.25))}
              disabled={player?.cash === 0}
            >
              25%
            </button>
            <button 
              className="quick-btn"
              onClick={() => setDepositAmount(Math.floor(player.cash * 0.5))}
              disabled={player?.cash === 0}
            >
              50%
            </button>
            <button 
              className="quick-btn"
              onClick={() => setDepositAmount(Math.floor(player.cash * 0.75))}
              disabled={player?.cash === 0}
            >
              75%
            </button>
            <button 
              className="quick-btn"
              onClick={() => setDepositAmount(player.cash)}
              disabled={player?.cash === 0}
            >
              All
            </button>
          </div>
          <button 
            className="action-btn deposit-btn"
            onClick={() => depositToBank(parseInt(depositAmount))}
            disabled={!depositAmount || depositAmount <= 0 || depositAmount > player.cash}
          >
            <span className="btn-icon">💸</span>
            Deposit ${depositAmount ? parseInt(depositAmount).toLocaleString() : '0'}
          </button>
        </div>

        <div className="bank-action-card withdraw-card">
          <h3>🏦 Withdraw Cash</h3>
          <div className="input-wrapper">
            <span className="input-prefix">$</span>
            <input 
              type="number" 
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Enter amount"
              className="bank-input"
            />
          </div>
          <div className="quick-amounts">
            <button 
              className="quick-btn"
              onClick={() => setWithdrawAmount(Math.floor(player.bank_balance * 0.25))}
              disabled={player?.bank_balance === 0}
            >
              25%
            </button>
            <button 
              className="quick-btn"
              onClick={() => setWithdrawAmount(Math.floor(player.bank_balance * 0.5))}
              disabled={player?.bank_balance === 0}
            >
              50%
            </button>
            <button 
              className="quick-btn"
              onClick={() => setWithdrawAmount(Math.floor(player.bank_balance * 0.75))}
              disabled={player?.bank_balance === 0}
            >
              75%
            </button>
            <button 
              className="quick-btn"
              onClick={() => setWithdrawAmount(player.bank_balance)}
              disabled={player?.bank_balance === 0}
            >
              All
            </button>
          </div>
          <button 
            className="action-btn withdraw-btn"
            onClick={() => withdrawFromBank(parseInt(withdrawAmount))}
            disabled={!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > player.bank_balance}
          >
            <span className="btn-icon">💵</span>
            Withdraw ${withdrawAmount ? parseInt(withdrawAmount).toLocaleString() : '0'}
          </button>
        </div>
      </div>
    </div>
  );
}
