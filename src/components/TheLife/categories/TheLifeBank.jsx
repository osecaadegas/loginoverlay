import { supabase } from '../../../config/supabaseClient';
import { useState } from 'react';
import '../styles/TheLifeBank.css';

export default function TheLifeBank({ 
  player,
  setPlayer,
  setPlayerFromAction,
  depositAmount,
  setDepositAmount,
  withdrawAmount,
  setWithdrawAmount,
  setMessage,
  user
}) {
  const [loading, setLoading] = useState(false);

  // SECURE: Use server-side RPC for deposits
  const depositToBank = async (amount) => {
    if (loading) return;
    
    const parsedAmount = parseInt(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid amount' });
      return;
    }

    try {
      setLoading(true);
      
      // Call server-side function that validates everything
      const { data: result, error } = await supabase.rpc('execute_bank_transfer', {
        p_amount: parsedAmount,
        p_transfer_type: 'deposit'
      });

      if (error) throw error;

      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      // Update local state with server-validated values
      setPlayerFromAction(prev => ({
        ...prev,
        cash: result.new_cash,
        bank_balance: result.new_bank
      }));
      
      setMessage({ type: 'success', text: result.message });
      setDepositAmount('');
    } catch (err) {
      console.error('Error depositing:', err);
      setMessage({ type: 'error', text: 'Failed to deposit' });
    } finally {
      setLoading(false);
    }
  };

  // SECURE: Use server-side RPC for withdrawals
  const withdrawFromBank = async (amount) => {
    if (loading) return;
    
    const parsedAmount = parseInt(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid amount' });
      return;
    }

    try {
      setLoading(true);
      
      // Call server-side function that validates everything
      const { data: result, error } = await supabase.rpc('execute_bank_transfer', {
        p_amount: parsedAmount,
        p_transfer_type: 'withdraw'
      });

      if (error) throw error;

      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      // Update local state with server-validated values
      setPlayerFromAction(prev => ({
        ...prev,
        cash: result.new_cash,
        bank_balance: result.new_bank
      }));
      
      setMessage({ type: 'success', text: result.message });
      setWithdrawAmount('');
    } catch (err) {
      console.error('Error withdrawing:', err);
      setMessage({ type: 'error', text: 'Failed to withdraw' });
    } finally {
      setLoading(false);
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
              disabled={loading}
            />
          </div>
          <div className="quick-amounts">
            <button 
              className="quick-btn"
              onClick={() => setDepositAmount(Math.floor(player.cash * 0.25))}
              disabled={player?.cash === 0 || loading}
            >
              25%
            </button>
            <button 
              className="quick-btn"
              onClick={() => setDepositAmount(Math.floor(player.cash * 0.5))}
              disabled={player?.cash === 0 || loading}
            >
              50%
            </button>
            <button 
              className="quick-btn"
              onClick={() => setDepositAmount(Math.floor(player.cash * 0.75))}
              disabled={player?.cash === 0 || loading}
            >
              75%
            </button>
            <button 
              className="quick-btn"
              onClick={() => setDepositAmount(player.cash)}
              disabled={player?.cash === 0 || loading}
            >
              All
            </button>
          </div>
          <button 
            className="action-btn deposit-btn"
            onClick={() => depositToBank(parseInt(depositAmount))}
            disabled={!depositAmount || depositAmount <= 0 || depositAmount > player.cash || loading}
          >
            <span className="btn-icon">{loading ? '⏳' : '💸'}</span>
            {loading ? 'Processing...' : `Deposit $${depositAmount ? parseInt(depositAmount).toLocaleString() : '0'}`}
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
              disabled={player?.bank_balance === 0 || loading}
            >
              25%
            </button>
            <button 
              className="quick-btn"
              onClick={() => setWithdrawAmount(Math.floor(player.bank_balance * 0.5))}
              disabled={player?.bank_balance === 0 || loading}
            >
              50%
            </button>
            <button 
              className="quick-btn"
              onClick={() => setWithdrawAmount(Math.floor(player.bank_balance * 0.75))}
              disabled={player?.bank_balance === 0 || loading}
            >
              75%
            </button>
            <button 
              className="quick-btn"
              onClick={() => setWithdrawAmount(player.bank_balance)}
              disabled={player?.bank_balance === 0 || loading}
            >
              All
            </button>
          </div>
          <button 
            className="action-btn withdraw-btn"
            onClick={() => withdrawFromBank(parseInt(withdrawAmount))}
            disabled={!withdrawAmount || withdrawAmount <= 0 || withdrawAmount > player.bank_balance || loading}
          >
            <span className="btn-icon">{loading ? '⏳' : '💵'}</span>
            {loading ? 'Processing...' : `Withdraw $${withdrawAmount ? parseInt(withdrawAmount).toLocaleString() : '0'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
