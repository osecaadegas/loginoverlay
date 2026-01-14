import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import './VoucherManager.css';

function VoucherManager() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    points: '',
    maxUses: '1',
    expiresAt: ''
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from('voucher_codes')
        .select(`
          *,
          voucher_redemptions(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVouchers(data || []);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleCreateVoucher = async (e) => {
    e.preventDefault();

    if (!formData.code || !formData.points) {
      alert('Please fill in code and points');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('voucher_codes')
        .insert([{
          code: formData.code.toUpperCase(),
          points: parseInt(formData.points),
          max_uses: parseInt(formData.maxUses),
          expires_at: formData.expiresAt || null,
          created_by: userData.user.id
        }]);

      if (error) throw error;

      alert('Voucher created successfully!');
      setFormData({ code: '', points: '', maxUses: '1', expiresAt: '' });
      setShowCreateForm(false);
      fetchVouchers();
    } catch (error) {
      console.error('Error creating voucher:', error);
      alert(error.message || 'Failed to create voucher');
    }
  };

  const toggleVoucherStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('voucher_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchVouchers();
    } catch (error) {
      console.error('Error toggling voucher:', error);
    }
  };

  const deleteVoucher = async (id) => {
    if (!confirm('Are you sure you want to delete this voucher?')) return;

    try {
      const { error } = await supabase
        .from('voucher_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchVouchers();
    } catch (error) {
      console.error('Error deleting voucher:', error);
    }
  };

  if (loading) {
    return <div className="voucher-manager"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="voucher-manager">
      <div className="voucher-header">
        <h1>Voucher Manager</h1>
        <button 
          className="create-voucher-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Create Voucher'}
        </button>
      </div>

      {showCreateForm && (
        <div className="voucher-form-card">
          <h2>Create New Voucher</h2>
          <form onSubmit={handleCreateVoucher}>
            <div className="form-row">
              <div className="form-group">
                <label>Voucher Code</label>
                <div className="code-input-group">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Enter code"
                    maxLength="20"
                    required
                  />
                  <button type="button" onClick={generateRandomCode} className="generate-btn">
                    🎲 Generate
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Points Value</label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                  placeholder="Enter points"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Max Uses (0 = unlimited)</label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label>Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="submit-btn">Create Voucher</button>
          </form>
        </div>
      )}

      <div className="vouchers-list">
        <h2>Active Vouchers ({vouchers.filter(v => v.is_active).length})</h2>
        <div className="vouchers-grid">
          {vouchers.map((voucher) => (
            <div key={voucher.id} className={`voucher-card ${!voucher.is_active ? 'inactive' : ''}`}>
              <div className="voucher-code-display">{voucher.code}</div>
              <div className="voucher-details">
                <div className="voucher-stat">
                  <span className="label">Points:</span>
                  <span className="value">{voucher.points.toLocaleString()}</span>
                </div>
                <div className="voucher-stat">
                  <span className="label">Uses:</span>
                  <span className="value">
                    {voucher.current_uses} / {voucher.max_uses === 0 ? '∞' : voucher.max_uses}
                  </span>
                </div>
                {voucher.expires_at && (
                  <div className="voucher-stat">
                    <span className="label">Expires:</span>
                    <span className="value">
                      {new Date(voucher.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="voucher-stat">
                  <span className="label">Status:</span>
                  <span className={`status ${voucher.is_active ? 'active' : 'inactive'}`}>
                    {voucher.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="voucher-actions">
                <button 
                  onClick={() => toggleVoucherStatus(voucher.id, voucher.is_active)}
                  className="toggle-btn"
                >
                  {voucher.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button 
                  onClick={() => deleteVoucher(voucher.id)}
                  className="delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VoucherManager;
