/**
 * SettingsTab.jsx — Analytics configuration and GDPR management.
 */
import React, { useState, useEffect } from 'react';

export default function SettingsTab({ analytics }) {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gdprEmail, setGdprEmail] = useState('');
  const [gdprFingerprint, setGdprFingerprint] = useState('');
  const [gdprStatus, setGdprStatus] = useState(null);

  useEffect(() => {
    analytics.fetchConfig().then(setConfig);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await analytics.updateConfig(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleGdprDelete = async () => {
    if (!gdprEmail && !gdprFingerprint) {
      setGdprStatus('Provide email or fingerprint to delete data');
      return;
    }
    if (!window.confirm('This will permanently delete all analytics data for this user. Continue?')) return;
    const result = await analytics.deleteData({
      email: gdprEmail || undefined,
      fingerprint: gdprFingerprint || undefined,
    });
    if (result) {
      setGdprStatus(`Deleted data for ${result.deleted_count || 0} visitors`);
      setGdprEmail('');
      setGdprFingerprint('');
    }
    setTimeout(() => setGdprStatus(null), 5000);
  };

  if (!config) return <div className="an-tab__loading">Loading config...</div>;

  return (
    <div className="an-tab">
      {/* Fraud Detection Settings */}
      <div className="an-card">
        <h3 className="an-card__title">🛡️ Fraud Detection Rules</h3>
        <div className="an-settings-grid">
          <SettingsField
            label="Rapid Click Threshold"
            description="Max clicks within 10 seconds before flagging"
            type="number"
            value={config.rapid_click_threshold || 15}
            onChange={v => handleChange('rapid_click_threshold', parseInt(v))}
          />
          <SettingsField
            label="Multi-Session IP Threshold"
            description="Max sessions from same IP within 1 hour"
            type="number"
            value={config.multi_session_ip_threshold || 10}
            onChange={v => handleChange('multi_session_ip_threshold', parseInt(v))}
          />
          <SettingsField
            label="Suspicious Risk Threshold"
            description="Risk score to mark session as suspicious (0-100)"
            type="number"
            value={config.risk_threshold || 50}
            onChange={v => handleChange('risk_threshold', parseInt(v))}
          />
        </div>
      </div>

      {/* Tracking Settings */}
      <div className="an-card">
        <h3 className="an-card__title">📊 Tracking Settings</h3>
        <div className="an-settings-grid">
          <SettingsField
            label="Enable Tracking"
            description="Master toggle for the analytics system"
            type="toggle"
            value={config.tracking_enabled !== false}
            onChange={v => handleChange('tracking_enabled', v)}
          />
          <SettingsField
            label="Track Geo Location"
            description="Lookup visitor IP for country/city info"
            type="toggle"
            value={config.geo_enabled !== false}
            onChange={v => handleChange('geo_enabled', v)}
          />
          <SettingsField
            label="Data Retention (days)"
            description="Auto-purge events older than this"
            type="number"
            value={config.retention_days || 365}
            onChange={v => handleChange('retention_days', parseInt(v))}
          />
        </div>
      </div>

      <div className="an-settings-actions">
        <button className="an-btn an-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>

      {/* GDPR Section */}
      <div className="an-card an-card--danger-border">
        <h3 className="an-card__title">🔒 GDPR Data Deletion</h3>
        <p className="an-card__description">
          Delete all analytics data for a specific user by email or fingerprint.
          This action is permanent and cannot be undone.
        </p>
        <div className="an-gdpr-form">
          <div className="an-form-group">
            <label>Email</label>
            <input
              className="an-input"
              placeholder="user@example.com"
              value={gdprEmail}
              onChange={e => setGdprEmail(e.target.value)}
            />
          </div>
          <div className="an-form-group">
            <label>Or Fingerprint</label>
            <input
              className="an-input"
              placeholder="Visitor fingerprint hash"
              value={gdprFingerprint}
              onChange={e => setGdprFingerprint(e.target.value)}
            />
          </div>
          <button className="an-btn an-btn--danger" onClick={handleGdprDelete}>
            🗑️ Delete All Data
          </button>
          {gdprStatus && <p className="an-gdpr-status">{gdprStatus}</p>}
        </div>
      </div>
    </div>
  );
}

function SettingsField({ label, description, type, value, onChange }) {
  if (type === 'toggle') {
    return (
      <div className="an-setting">
        <div className="an-setting__info">
          <span className="an-setting__label">{label}</span>
          <span className="an-setting__desc">{description}</span>
        </div>
        <label className="an-toggle">
          <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
          <span className="an-toggle__slider" />
        </label>
      </div>
    );
  }
  return (
    <div className="an-setting">
      <div className="an-setting__info">
        <span className="an-setting__label">{label}</span>
        <span className="an-setting__desc">{description}</span>
      </div>
      <input
        className="an-input an-input--sm"
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={0}
      />
    </div>
  );
}
