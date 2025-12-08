import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';
import { getAllUsers, updateUserRole, revokeUserAccess, deleteUser, MODERATOR_PERMISSIONS, getUserRoles, addUserRole, removeUserRole } from '../../utils/adminUtils';
import { supabase } from '../../config/supabaseClient';
import { DEPOSIT_METHODS } from '../../utils/depositMethods';
import './AdminPanel.css';

export default function AdminPanel() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  
  // Offer Card Builder State
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'offers'
  const [offers, setOffers] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerFormData, setOfferFormData] = useState({
    casino_name: '',
    title: '',
    image_url: '',
    bonus_link: '',
    badge: '',
    badge_class: '',
    min_deposit: '',
    cashback: '',
    bonus_value: '',
    free_spins: '',
    deposit_methods: '',
    vpn_friendly: false,
    is_premium: false,
    details: '',
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    loadUsers();
    loadOffers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await getAllUsers();
    
    if (error) {
      setError('Failed to load users: ' + error.message);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId, role, expiresAt, moderatorPermissions = null) => {
    setError('');
    setSuccess('');
    
    const { error } = await updateUserRole(userId, role, expiresAt, moderatorPermissions);
    
    if (error) {
      setError('Failed to update role: ' + error.message);
    } else {
      setSuccess('User role updated successfully!');
      setEditingUser(null);
      loadUsers();
    }
  };

  const handleRevokeAccess = async (userId) => {
    if (!confirm('Are you sure you want to revoke access for this user?')) return;
    
    setError('');
    setSuccess('');
    
    const { error } = await revokeUserAccess(userId);
    
    if (error) {
      setError('Failed to revoke access: ' + error.message);
    } else {
      setSuccess('User access revoked successfully!');
      loadUsers();
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to DELETE this user? This cannot be undone!')) return;
    
    setError('');
    setSuccess('');
    
    const { error } = await deleteUser(userId);
    
    if (error) {
      setError('Failed to delete user: ' + error.message);
    } else {
      setSuccess('User deleted successfully!');
      loadUsers();
    }
  };

  const openEditModal = (user) => {
    setEditingUser({
      ...user,
      newRole: '',
      newRoleExpiryDays: '',
      newRoleModeratorPermissions: {}
    });
  };

  const handleAddRole = async () => {
    if (!editingUser || !editingUser.newRole) return;
    
    setError('');
    setSuccess('');
    
    let expiresAt = null;
    if (editingUser.newRoleExpiryDays && editingUser.newRoleExpiryDays > 0) {
      const date = new Date();
      date.setDate(date.getDate() + parseInt(editingUser.newRoleExpiryDays));
      expiresAt = date.toISOString();
    }
    
    const moderatorPerms = editingUser.newRole === 'moderator' ? editingUser.newRoleModeratorPermissions : null;
    
    const { error } = await addUserRole(editingUser.id, editingUser.newRole, expiresAt, moderatorPerms);
    
    if (error) {
      setError('Failed to add role: ' + error.message);
    } else {
      setSuccess('Role added successfully!');
      loadUsers();
      setEditingUser({
        ...editingUser,
        newRole: '',
        newRoleExpiryDays: '',
        newRoleModeratorPermissions: {}
      });
    }
  };

  const handleRemoveRole = async (roleToRemove) => {
    if (!editingUser) return;
    if (!confirm(`Are you sure you want to remove the ${roleToRemove} role from this user?`)) return;
    
    setError('');
    setSuccess('');
    
    const { error } = await removeUserRole(editingUser.id, roleToRemove);
    
    if (error) {
      setError('Failed to remove role: ' + error.message);
    } else {
      setSuccess('Role removed successfully!');
      loadUsers();
    }
  };

  const toggleModeratorPermission = (permission) => {
    if (!editingUser) return;
    
    setEditingUser({
      ...editingUser,
      newRoleModeratorPermissions: {
        ...editingUser.newRoleModeratorPermissions,
        [permission]: !editingUser.newRoleModeratorPermissions[permission]
      }
    });
  };

  // ===== OFFER CARD MANAGEMENT FUNCTIONS =====
  
  const loadOffers = async () => {
    const { data, error } = await supabase
      .from('casino_offers')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Error loading offers:', error);
    } else {
      setOffers(data || []);
    }
  };

  const openOfferModal = (offer = null) => {
    if (offer) {
      setOfferFormData(offer);
      setEditingOffer(offer);
    } else {
      setOfferFormData({
        casino_name: '',
        title: '',
        image_url: '',
        bonus_link: '',
        badge: '',
        badge_class: '',
        min_deposit: '',
        cashback: '',
        bonus_value: '',
        free_spins: '',
        is_premium: false,
        details: '',
        is_active: true,
        display_order: offers.length
      });
      setEditingOffer(null);
    }
    setShowOfferModal(true);
  };

  const closeOfferModal = () => {
    setShowOfferModal(false);
    setEditingOffer(null);
    setOfferFormData({
      casino_name: '',
      title: '',
      image_url: '',
      bonus_link: '',
      badge: '',
      badge_class: '',
      min_deposit: '',
      cashback: '',
      bonus_value: '',
      free_spins: '',
      deposit_methods: '',
      vpn_friendly: false,
      is_premium: false,
      details: '',
      is_active: true,
      display_order: 0
    });
  };

  const handleOfferFormChange = (field, value) => {
    setOfferFormData({ ...offerFormData, [field]: value });
  };

  const saveOffer = async () => {
    setError('');
    setSuccess('');

    if (!offerFormData.casino_name || !offerFormData.title || !offerFormData.image_url) {
      setError('Please fill in required fields: Casino Name, Title, and Image URL');
      return;
    }

    try {
      if (editingOffer) {
        // Update existing offer
        const { error } = await supabase
          .from('casino_offers')
          .update(offerFormData)
          .eq('id', editingOffer.id);

        if (error) throw error;
        setSuccess('Offer updated successfully!');
      } else {
        // Create new offer
        const { error } = await supabase
          .from('casino_offers')
          .insert([{ ...offerFormData, created_by: (await supabase.auth.getUser()).data.user?.id }]);

        if (error) throw error;
        setSuccess('Offer created successfully!');
      }

      closeOfferModal();
      loadOffers();
    } catch (err) {
      setError('Failed to save offer: ' + err.message);
    }
  };

  const deleteOffer = async (offerId) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;

    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('casino_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      setSuccess('Offer deleted successfully!');
      loadOffers();
    } catch (err) {
      setError('Failed to delete offer: ' + err.message);
    }
  };

  const toggleOfferActive = async (offerId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('casino_offers')
        .update({ is_active: !currentStatus })
        .eq('id', offerId);

      if (error) throw error;
      loadOffers();
    } catch (err) {
      setError('Failed to toggle offer status: ' + err.message);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="admin-panel-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin panel...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🛡️ Admin Panel</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User Management
        </button>
        <button 
          className={`admin-tab ${activeTab === 'offers' ? 'active' : ''}`}
          onClick={() => setActiveTab('offers')}
        >
          🎰 Casino Offers
        </button>
      </div>

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <>
          <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.roles?.some(r => r.role === 'admin')).length}</div>
          <div className="stat-label">Admins</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.roles?.some(r => r.role === 'slot_modder')).length}</div>
          <div className="stat-label">Slot Modders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.roles?.some(r => r.role === 'moderator')).length}</div>
          <div className="stat-label">Moderators</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.roles?.some(r => r.role === 'premium')).length}</div>
          <div className="stat-label">Premium</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.is_active).length}</div>
          <div className="stat-label">Active Users</div>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Provider</th>
              <th>Role</th>
              <th>Status</th>
              <th>Access Expires</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={!user.is_active ? 'inactive-user' : ''}>
                <td>{user.email}</td>
                <td>
                  <div className="provider-info">
                    <span className={`provider-badge provider-${user.provider?.toLowerCase()}`}>
                      {user.provider || 'Email'}
                    </span>
                    {user.provider_username && (
                      <span className="provider-username">@{user.provider_username}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="user-roles-container">
                    {(user.roles || []).map((roleObj, idx) => (
                      <span key={idx} className={`role-badge role-${roleObj.role}`}>
                        {roleObj.role}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? '✓ Active' : '✗ Inactive'}
                  </span>
                </td>
                <td>
                  {user.roles?.some(r => r.access_expires_at) ? (
                    <div className="expiry-dates-container">
                      {user.roles.filter(r => r.access_expires_at).map((roleObj, idx) => (
                        <span key={idx} className="expiry-date">
                          {roleObj.role}: {new Date(roleObj.access_expires_at).toLocaleDateString()}
                          {new Date(roleObj.access_expires_at) < new Date() && ' (Expired)'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="no-expiry">No Limit</span>
                  )}
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => openEditModal(user)} 
                      className="btn-edit"
                      title="Edit user"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleRevokeAccess(user.id)} 
                      className="btn-revoke"
                      title="Revoke access"
                      disabled={!user.is_active}
                    >
                      🚫
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id)} 
                      className="btn-delete"
                      title="Delete user"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Manage User Roles</h2>
            <div className="modal-body">
              <div className="form-group">
                <label>Email</label>
                <input type="text" value={editingUser.email} disabled />
              </div>

              {/* Current Roles */}
              <div className="form-group">
                <label>Current Roles</label>
                <div className="current-roles-list">
                  {(editingUser.roles || []).map((roleObj, idx) => (
                    <div key={idx} className="current-role-item">
                      <span className={`role-badge role-${roleObj.role}`}>
                        {roleObj.role}
                      </span>
                      {roleObj.access_expires_at && (
                        <span className="role-expiry">
                          Expires: {new Date(roleObj.access_expires_at).toLocaleDateString()}
                        </span>
                      )}
                      <button 
                        onClick={() => handleRemoveRole(roleObj.role)} 
                        className="btn-remove-role"
                        title="Remove role"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {(!editingUser.roles || editingUser.roles.length === 0) && (
                    <span className="no-roles">No roles assigned</span>
                  )}
                </div>
              </div>

              {/* Add New Role */}
              <div className="form-group add-role-section">
                <label>Add New Role</label>
                <select 
                  value={editingUser.newRole}
                  onChange={(e) => setEditingUser({...editingUser, newRole: e.target.value, newRoleModeratorPermissions: {}})}
                >
                  <option value="">-- Select Role --</option>
                  <option value="user">User (No Overlay Access)</option>
                  <option value="premium">Premium (Overlay Only)</option>
                  <option value="slot_modder">Slot Modder (Slot Management)</option>
                  <option value="moderator">Moderator (Overlay + Custom Admin)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>

              {/* Moderator Permissions for new moderator role */}
              {editingUser.newRole === 'moderator' && (
                <div className="form-group moderator-permissions">
                  <label>Moderator Permissions</label>
                  <div className="permissions-grid">
                    {Object.entries(MODERATOR_PERMISSIONS).map(([key, description]) => (
                      <label key={key} className="permission-checkbox">
                        <input
                          type="checkbox"
                          checked={!!editingUser.newRoleModeratorPermissions[key]}
                          onChange={() => toggleModeratorPermission(key)}
                        />
                        <div className="permission-info">
                          <span className="permission-name">{key.replace(/_/g, ' ').toUpperCase()}</span>
                          <span className="permission-desc">{description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {editingUser.newRole && (
                <div className="form-group">
                  <label>Access Duration (days)</label>
                  <input 
                    type="number" 
                    placeholder="Leave empty for unlimited"
                    value={editingUser.newRoleExpiryDays}
                    onChange={(e) => setEditingUser({...editingUser, newRoleExpiryDays: e.target.value})}
                    min="0"
                  />
                  <small>Set how many days from today the access expires. Leave empty for unlimited.</small>
                </div>
              )}

              {editingUser.newRole && (
                <button onClick={handleAddRole} className="btn-add-role">
                  Add Role
                </button>
              )}

              <div className="modal-actions">
                <button onClick={() => setEditingUser(null)} className="btn-cancel">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Casino Offers Tab */}
      {activeTab === 'offers' && (
        <div className="offers-management">
          <div className="offers-header">
            <h2>Casino Offer Cards</h2>
            <button onClick={() => openOfferModal()} className="btn-create-offer">
              ➕ Create New Offer
            </button>
          </div>

          <div className="offers-grid">
            {offers.map((offer) => (
              <div key={offer.id} className={`offer-admin-card ${!offer.is_active ? 'inactive' : ''}`}>
                <div className="offer-admin-image">
                  <img src={offer.image_url} alt={offer.casino_name} />
                  {offer.badge && (
                    <span className={`offer-badge ${offer.badge_class}`}>{offer.badge}</span>
                  )}
                  {!offer.is_active && (
                    <div className="inactive-overlay">INACTIVE</div>
                  )}
                </div>
                <div className="offer-admin-content">
                  <h3>{offer.casino_name}</h3>
                  <p className="offer-title">{offer.title}</p>
                  <div className="offer-stats">
                    <span>💰 {offer.min_deposit}</span>
                    <span>💸 {offer.cashback}</span>
                    <span>🎁 {offer.bonus_value}</span>
                  </div>
                  <div className="offer-admin-actions">
                    <button 
                      onClick={() => openOfferModal(offer)}
                      className="btn-edit-offer"
                      title="Edit offer"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => toggleOfferActive(offer.id, offer.is_active)}
                      className={`btn-toggle-offer ${offer.is_active ? 'active' : ''}`}
                      title={offer.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {offer.is_active ? '👁️ Active' : '🚫 Inactive'}
                    </button>
                    <button 
                      onClick={() => deleteOffer(offer.id)}
                      className="btn-delete-offer"
                      title="Delete offer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {offers.length === 0 && (
            <div className="no-offers">
              <p>No casino offers yet. Create your first offer!</p>
            </div>
          )}
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="modal-overlay" onClick={closeOfferModal}>
          <div className="modal-content offer-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingOffer ? 'Edit Casino Offer' : 'Create New Casino Offer'}</h2>
            <div className="modal-body offer-form">
              <div className="offer-form-split">
                <div className="offer-form-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Casino Name *</label>
                      <input
                        type="text"
                        value={offerFormData.casino_name}
                        onChange={(e) => handleOfferFormChange('casino_name', e.target.value)}
                        placeholder="e.g., Ignibet"
                      />
                    </div>

                    <div className="form-group">
                      <label>Bonus Link *</label>
                      <input
                        type="text"
                        value={offerFormData.bonus_link}
                        onChange={(e) => handleOfferFormChange('bonus_link', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Title *</label>
                    <input
                      type="text"
                      value={offerFormData.title}
                      onChange={(e) => handleOfferFormChange('title', e.target.value)}
                      placeholder="e.g., 665% Bonus & 750 FS up to €6250"
                    />
                  </div>

                  <div className="form-group">
                    <label>Image URL *</label>
                    <input
                      type="text"
                      value={offerFormData.image_url}
                      onChange={(e) => handleOfferFormChange('image_url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Badge Text</label>
                      <input
                        type="text"
                        value={offerFormData.badge}
                        onChange={(e) => handleOfferFormChange('badge', e.target.value)}
                        placeholder="HOT, NEW, etc."
                      />
                    </div>

                    <div className="form-group">
                      <label>Badge Class</label>
                      <select
                        value={offerFormData.badge_class}
                        onChange={(e) => handleOfferFormChange('badge_class', e.target.value)}
                      >
                        <option value="">None</option>
                        <option value="hot">Hot</option>
                        <option value="new">New</option>
                        <option value="exclusive">Exclusive</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row form-row-4">
                    <div className="form-group">
                      <label>Min Deposit</label>
                      <input
                        type="text"
                        value={offerFormData.min_deposit}
                        onChange={(e) => handleOfferFormChange('min_deposit', e.target.value)}
                        placeholder="20€"
                      />
                    </div>

                    <div className="form-group">
                      <label>Cashback</label>
                      <input
                        type="text"
                        value={offerFormData.cashback}
                        onChange={(e) => handleOfferFormChange('cashback', e.target.value)}
                        placeholder="30%"
                      />
                    </div>

                    <div className="form-group">
                      <label>Bonus Value</label>
                      <input
                        type="text"
                        value={offerFormData.bonus_value}
                        onChange={(e) => handleOfferFormChange('bonus_value', e.target.value)}
                        placeholder="665%"
                      />
                    </div>

                    <div className="form-group">
                      <label>Free Spins</label>
                      <input
                        type="text"
                        value={offerFormData.free_spins}
                        onChange={(e) => handleOfferFormChange('free_spins', e.target.value)}
                        placeholder="Up to 750"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Details / Terms</label>
                      <textarea
                        value={offerFormData.details}
                        onChange={(e) => handleOfferFormChange('details', e.target.value)}
                        placeholder="+18 | T&C APPLY&#10;&#10;Enter full terms and conditions..."
                        rows="2"
                      />
                    </div>

                    <div className="form-group">
                      <label>Deposit Methods</label>
                      <div className="deposit-methods-grid">
                        {DEPOSIT_METHODS.map(method => {
                          const selectedMethods = offerFormData.deposit_methods ? offerFormData.deposit_methods.split(',').map(m => m.trim()) : [];
                          const isSelected = selectedMethods.includes(method.id);
                          
                          return (
                            <label key={method.id} className="deposit-method-checkbox">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  let methods = selectedMethods.filter(m => m);
                                  if (e.target.checked) {
                                    methods.push(method.id);
                                  } else {
                                    methods = methods.filter(m => m !== method.id);
                                  }
                                  handleOfferFormChange('deposit_methods', methods.join(','));
                                }}
                              />
                              <span className="method-icon">{method.icon}</span>
                              <span className="method-name">{method.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Display Order</label>
                      <input
                        type="number"
                        value={offerFormData.display_order}
                        onChange={(e) => handleOfferFormChange('display_order', parseInt(e.target.value))}
                        min="0"
                        style={{marginBottom: '8px'}}
                      />
                      <div className="checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={offerFormData.is_premium}
                            onChange={(e) => handleOfferFormChange('is_premium', e.target.checked)}
                          />
                          Premium
                        </label>

                        <label>
                          <input
                            type="checkbox"
                            checked={offerFormData.vpn_friendly}
                            onChange={(e) => handleOfferFormChange('vpn_friendly', e.target.checked)}
                          />
                          ✅ VPN Friendly
                        </label>

                        <label>
                          <input
                            type="checkbox"
                            checked={offerFormData.is_active}
                            onChange={(e) => handleOfferFormChange('is_active', e.target.checked)}
                          />
                          Active
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="offer-preview">
                  <h3>Live Preview</h3>
                  <div className="casino-card preview">
                    <div className="casino-image-container">
                      {offerFormData.badge && (
                        <span className={`casino-badge ${offerFormData.badge_class}`}>
                          {offerFormData.badge}
                        </span>
                      )}
                      <img 
                        src={offerFormData.image_url || 'https://via.placeholder.com/400x300'} 
                        alt={offerFormData.casino_name || 'Preview'} 
                        className="casino-image"
                      />
                    </div>
                    <div className="casino-content">
                      <h3 className="casino-name">{offerFormData.casino_name || 'Casino Name'}</h3>
                      <p className="casino-offer">{offerFormData.title || 'Offer Title'}</p>
                      <div className="casino-details">
                        <div className="detail-item">
                          <span className="detail-label">Min Deposit</span>
                          <span className="detail-value">{offerFormData.min_deposit || '-'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Cashback</span>
                          <span className="detail-value">{offerFormData.cashback || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={saveOffer} className="btn-save">
                  {editingOffer ? 'Update Offer' : 'Create Offer'}
                </button>
                <button onClick={closeOfferModal} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
