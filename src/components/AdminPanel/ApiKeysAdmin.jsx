import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../config/supabaseClient';

export default function ApiKeysAdmin() {
  const [accessList, setAccessList] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantSearch, setGrantSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Load all API access grants
      const { data: access, error: accessErr } = await supabase
        .from('streamer_api_access')
        .select('*')
        .order('granted_at', { ascending: false });

      if (accessErr) {
        console.error('Access error:', accessErr);
        // Table might not exist yet - ignore
      }

      // Load all API keys
      const { data: keys, error: keysErr } = await supabase
        .from('streamer_api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (keysErr) {
        console.error('Keys error:', keysErr);
        // Table might not exist yet - ignore
      }

      // Load user profiles for display names
      const userIds = [...new Set([
        ...(access || []).map(a => a.user_id),
        ...(keys || []).map(k => k.user_id),
      ])].filter(Boolean);

      let profiles = {};
      if (userIds.length > 0) {
        try {
          const { data: profs, error: profErr } = await supabase
            .from('user_profiles')
            .select('user_id, twitch_username, avatar_url')
            .in('user_id', userIds);
          
          if (!profErr && profs) {
            profs.forEach(p => {
              profiles[p.user_id] = p;
            });
          }
        } catch (e) {
          console.error('Profile fetch error:', e);
        }
      }

      setAccessList((access || []).map(a => ({
        ...a,
        profile: profiles[a.user_id] || { twitch_username: 'Unknown' },
        key: (keys || []).find(k => k.user_id === a.user_id) || null,
      })));
      setApiKeys(keys || []);
    } catch (err) {
      console.error('loadData error:', err);
      setError('Failed to load API data. Make sure the migration has been run.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Search users to grant access — only premium users
  const searchUsers = async (query) => {
    setGrantSearch(query);
    if (query.length < 2) { setSearchResults([]); return; }

    try {
      // Get premium user IDs first
      const { data: premiumRoles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'premium')
        .eq('is_active', true);

      if (rolesErr) {
        console.error('Roles query error:', rolesErr);
        setError('Failed to search premium users');
        return;
      }

      const premiumIds = (premiumRoles || []).map(r => r.user_id);
      if (premiumIds.length === 0) { 
        setSearchResults([]);
        setError('No premium users found. Users need the "premium" role first.');
        setTimeout(() => setError(''), 5000);
        return; 
      }

      // Fetch all premium user profiles
      const { data, error: profErr } = await supabase
        .from('user_profiles')
        .select('user_id, twitch_username, avatar_url')
        .in('user_id', premiumIds);

      if (profErr) {
        console.error('Profiles query error:', profErr);
        setError('Failed to load user profiles');
        return;
      }

      // Filter in JS (PostgREST can't combine .in() with .or())
      const lowerQuery = query.toLowerCase();
      const filtered = (data || []).filter(u => 
        u.twitch_username?.toLowerCase().includes(lowerQuery)
      ).slice(0, 8);

      setSearchResults(filtered);
      
      if (filtered.length === 0 && query.length >= 2) {
        setError('No premium users found matching that search');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Grant API access to a user
  const grantAccess = async (userId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from('streamer_api_access')
      .upsert({
        user_id: userId,
        granted_by: user.id,
        is_active: true,
        granted_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (err) { setError(err.message); return; }
    setSuccess('API access granted!');
    setGrantSearch('');
    setSearchResults([]);
    setTimeout(() => setSuccess(''), 3000);
    loadData();
  };

  // Revoke access
  const revokeAccess = async (userId) => {
    await supabase
      .from('streamer_api_access')
      .update({ is_active: false })
      .eq('user_id', userId);

    // Also deactivate their key
    await supabase
      .from('streamer_api_keys')
      .update({ is_active: false })
      .eq('user_id', userId);

    setSuccess('Access revoked');
    setTimeout(() => setSuccess(''), 3000);
    loadData();
  };

  // Re-enable access
  const enableAccess = async (userId) => {
    await supabase
      .from('streamer_api_access')
      .update({ is_active: true })
      .eq('user_id', userId);
    setSuccess('Access re-enabled');
    setTimeout(() => setSuccess(''), 3000);
    loadData();
  };

  // Toggle key active/inactive
  const toggleKey = async (keyId, isActive) => {
    await supabase
      .from('streamer_api_keys')
      .update({ is_active: !isActive })
      .eq('id', keyId);
    loadData();
  };

  // Copy API key
  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const siteUrl = window.location.origin;

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ margin: '0 0 0.5rem', color: '#e5e7eb' }}>🔑 Streamer API Keys</h2>
      <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Control which streamers can sync their bonus hunt data to external websites.
      </p>

      {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.5rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ background: '#14532d', color: '#86efac', padding: '0.5rem 1rem', borderRadius: 8, marginBottom: '1rem' }}>{success}</div>}

      {/* ─── Grant Access ─── */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem', border: '1px solid #334155' }}>
        <h3 style={{ margin: '0 0 0.75rem', color: '#e5e7eb', fontSize: '1rem' }}>Grant API Access</h3>
        <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          💡 Only users with the <strong style={{ color: '#a78bfa' }}>premium</strong> role can be granted API access. 
          Assign the premium role in User Management first.
        </p>
        <input
          type="text"
          placeholder="Search premium users by Twitch username..."
          value={grantSearch}
          onChange={(e) => searchUsers(e.target.value)}
          style={{
            width: '100%', padding: '0.5rem 0.75rem', background: '#0f172a',
            border: '1px solid #475569', borderRadius: 8, color: '#e5e7eb',
            fontSize: '0.9rem', boxSizing: 'border-box',
          }}
        />
        {searchResults.length > 0 && (
          <div style={{ marginTop: '0.5rem', maxHeight: 200, overflowY: 'auto' }}>
            {searchResults.map(u => (
              <div key={u.user_id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem', borderRadius: 6, background: '#0f172a', marginBottom: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {u.avatar_url && <img src={u.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />}
                  <span style={{ color: '#e5e7eb' }}>{u.twitch_username || 'Unknown'}</span>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>@{u.twitch_username || 'unknown'}</span>
                </div>
                <button
                  onClick={() => grantAccess(u.user_id)}
                  style={{
                    background: '#059669', color: 'white', border: 'none',
                    padding: '0.25rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem',
                  }}
                >
                  Grant
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Access List ─── */}
      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      ) : accessList.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No API access granted yet. Search for a user above to get started.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {accessList.map(entry => {
            const p = entry.profile;
            const k = entry.key;
            return (
              <div key={entry.id} style={{
                background: '#1e293b', borderRadius: 12, padding: '1rem',
                border: `1px solid ${entry.is_active ? '#334155' : '#7f1d1d'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {p.avatar_url && <img src={p.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />}
                    <div>
                      <div style={{ color: '#e5e7eb', fontWeight: 600 }}>{p.twitch_username || 'Unknown'}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                        Granted {new Date(entry.granted_at).toLocaleDateString()}
                        {k?.last_used_at && ` • Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {entry.is_active ? (
                      <button onClick={() => revokeAccess(entry.user_id)} style={{
                        background: '#dc2626', color: 'white', border: 'none',
                        padding: '0.25rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem',
                      }}>Revoke</button>
                    ) : (
                      <button onClick={() => enableAccess(entry.user_id)} style={{
                        background: '#059669', color: 'white', border: 'none',
                        padding: '0.25rem 0.75rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem',
                      }}>Re-enable</button>
                    )}
                  </div>
                </div>

                {/* API Key display */}
                {k ? (
                  <div style={{
                    background: '#0f172a', borderRadius: 8, padding: '0.5rem 0.75rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontFamily: 'monospace', fontSize: '0.8rem',
                  }}>
                    <span style={{ color: k.is_active ? '#86efac' : '#fca5a5' }}>
                      {k.api_key.slice(0, 8)}...{k.api_key.slice(-8)}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => copyKey(k.api_key)} style={{
                        background: 'none', border: '1px solid #475569', color: '#e5e7eb',
                        padding: '0.15rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem',
                      }}>
                        {copiedKey === k.api_key ? '✓ Copied' : 'Copy'}
                      </button>
                      <button onClick={() => toggleKey(k.id, k.is_active)} style={{
                        background: 'none', border: `1px solid ${k.is_active ? '#dc2626' : '#059669'}`,
                        color: k.is_active ? '#fca5a5' : '#86efac',
                        padding: '0.15rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem',
                      }}>
                        {k.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: 0 }}>
                    No API key generated yet. User needs to visit their profile to generate one.
                  </p>
                )}

                {k && (
                  <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.75rem' }}>
                    Label: {k.label || 'My Website'} • Status: {k.is_active && entry.is_active ? '🟢 Active' : '🔴 Inactive'}
                    {k.allowed_origins?.length > 0 && ` • Origins: ${k.allowed_origins.join(', ')}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Embed Instructions ─── */}
      <div style={{
        background: '#1e293b', borderRadius: 12, padding: '1rem', marginTop: '1.5rem',
        border: '1px solid #334155',
      }}>
        <h3 style={{ margin: '0 0 0.75rem', color: '#e5e7eb', fontSize: '1rem' }}>📋 Embed Instructions</h3>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          Streamers add this to their website to show live bonus hunt data:
        </p>
        <pre style={{
          background: '#0f172a', padding: '0.75rem', borderRadius: 8,
          color: '#86efac', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap',
        }}>{`<div id="bonus-hunt-widget"></div>
<script src="${siteUrl}/bonus-hunt-embed.js"></script>
<script>
  BonusHuntEmbed.init({
    apiKey: 'YOUR_API_KEY',
    target: '#bonus-hunt-widget',
    theme: 'dark',        // 'dark' | 'light'
    autoRefresh: true,     // polls every 5s
    showBonusList: true,   // show individual bonuses
  });
</script>`}</pre>

        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
          Or use the raw API directly:
        </p>
        <pre style={{
          background: '#0f172a', padding: '0.75rem', borderRadius: 8,
          color: '#93c5fd', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap',
        }}>{`GET ${siteUrl}/api/streamer-data?key=YOUR_API_KEY&action=bonus_hunt

Actions: bonus_hunt | bonus_hunt_history | overlay_state | widgets | profile`}</pre>

        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
          Response format includes rich slot data:
        </p>
        <pre style={{
          background: '#0f172a', padding: '0.75rem', borderRadius: 8,
          color: '#a5b4fc', fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'pre-wrap',
        }}>{`{
  "hunt_name": "Bonus Hunt #42",
  "phase": "opening",  // "hunting" | "opening" | "completed"
  "currency": "€",
  "hunt_date": "2026-04-19",
  "start_money": 1000.00,
  "stop_loss": 350.00,
  "total_win": 4200.00,
  "profit": 3200.00,
  "bonus_count": 50,
  "bonuses_opened": 50,
  "avg_multi": 62.41,
  "best_multi": 312.0,
  "best_slot_name": "Gates of Olympus",
  "bonuses": [{
    "slotName": "Gates of Olympus",
    "betSize": 7.47,
    "opened": true,
    "result": 2312.00,
    "payout": 2312.00,
    "isSuperBonus": false,
    "isExtremeBonus": false,
    "slot": {
      "name": "Gates of Olympus",
      "image": "https://...",
      "provider": "Pragmatic Play",
      "rtp": 96.5,
      "volatility": "High",
      "max_win_multiplier": 5000
    }
  }]
}`}</pre>
      </div>
    </div>
  );
}
