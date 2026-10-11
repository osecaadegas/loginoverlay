import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../config/supabaseClient';
import { refreshOverlayAssetAccess } from '../../hooks/useOverlayAssetAccess';
import { WIDGET_COLOUR_THEMES } from '../OverlayCenter/widgets/shared/colourThemePalettes';
import { BACKGROUND_IMAGE_LIBRARY, BACKGROUND_VIDEO_LIBRARY } from '../OverlayCenter/widgets/background/backgroundLibrary';
import { BRUTUS_VIDEO_LIBRARY } from '../OverlayCenter/widgets/slideshow-frame/brutusVideoLibrary';
import './OverlayRolesAdmin.css';

const catalog = [
  ...WIDGET_COLOUR_THEMES.map(t => ({ kind: 'theme', key: t.key, label: t.name, mediaType: 'image' })),
  ...[...BACKGROUND_IMAGE_LIBRARY, ...BACKGROUND_VIDEO_LIBRARY].map(b => ({ kind: 'background', key: b.url, label: b.label, mediaType: b.type })),
  ...BRUTUS_VIDEO_LIBRARY.map(b => ({ kind: 'banner', key: b.url, label: b.label, mediaType: 'video' })),
];
async function checked(query) { const { data, error } = await query; if (error) throw error; return data; }

export function OverlayRoleAssignments({ userId }) {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [r, m] = await Promise.all([
        checked(supabase.from('overlay_access_roles').select('*').order('name')),
        checked(supabase.from('overlay_access_members').select('role_id').eq('user_id', userId)),
      ]);
      setRoles(r); setMembers(m.map(row => row.role_id));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }, [userId]);
  useEffect(() => { reload(); }, [reload]);
  const toggle = async roleId => {
    setBusy(true); setError('');
    try {
      await checked(members.includes(roleId)
        ? supabase.from('overlay_access_members').delete().eq('user_id', userId).eq('role_id', roleId)
        : supabase.from('overlay_access_members').insert({ user_id: userId, role_id: roleId }));
      await refreshOverlayAssetAccess(); await reload();
    } catch (e) { setError(e.message); setBusy(false); }
  };
  return <section className="overlay-role-admin panel-section">
    <h4>Exclusive overlay roles</h4>
    <p>These roles unlock themes and media only. Changes save immediately.</p>
    {error && <p role="alert">{error} <button onClick={reload}>Retry</button></p>}
    {!busy && !roles.length && <p>Create a role in Admin → Overlay roles first.</p>}
    {roles.map(role => <label className="ora-choice" key={role.id}>
      <input type="checkbox" checked={members.includes(role.id)} disabled={busy} onChange={() => toggle(role.id)} />
      <span><strong>{role.name}</strong><small>{role.description}</small></span>
    </label>)}
    {busy && <p role="status">Updating overlay roles…</p>}
  </section>;
}

export default function OverlayRolesAdmin() {
  const [roles, setRoles] = useState([]);
  const [assets, setAssets] = useState([]);
  const [grants, setGrants] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingRole, setEditingRole] = useState(null);
  const [asset, setAsset] = useState(null);
  const [roleIds, setRoleIds] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('theme');
  const reload = useCallback(async () => {
    const [r, a, g] = await Promise.all([
      checked(supabase.from('overlay_access_roles').select('*').order('name')),
      checked(supabase.from('overlay_access_assets').select('*').order('label')),
      checked(supabase.from('overlay_access_grants').select('*')),
    ]);
    setRoles(r); setAssets(a); setGrants(g);
  }, []);
  const perform = async (action, message) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); await reload(); await refreshOverlayAssetAccess(); setNotice(message); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { let live = true; reload().catch(e => live && setError(e.message)).finally(() => live && setBusy(false)); return () => { live = false; }; }, [reload]);
  const entries = [...catalog];
  assets.forEach(row => { if (!entries.some(a => a.kind === row.kind && a.key === row.asset_key)) entries.push({ kind: row.kind, key: row.asset_key, label: row.label, mediaType: row.media_type }); });
  const selectAsset = item => {
    const saved = assets.find(a => a.kind === item.kind && a.asset_key === item.key);
    setAsset({ ...item, label: saved?.label || item.label, restricted: saved?.restricted ?? false, existing: true });
    setRoleIds(grants.filter(g => g.asset_id === saved?.id).map(g => g.role_id));
  };
  return <section className="overlay-role-admin">
    <h2>Exclusive overlays</h2>
    <p>Create overlay roles, restrict selected assets, then assign roles from User Management. Multiple roles combine their access. Existing assets stay public until you restrict them.</p>
    {error && <p className="ora-error" role="alert">{error} <button onClick={() => perform(async () => {}, '')}>Retry</button></p>}
    {notice && <p role="status">{notice}</p>}
    <div className="ora-columns">
      <section><h3>Overlay roles</h3>
        <form onSubmit={e => { e.preventDefault(); perform(async () => {
          await checked(editingRole ? supabase.from('overlay_access_roles').update({ name: name.trim(), description: description.trim() }).eq('id', editingRole)
            : supabase.from('overlay_access_roles').insert({ name: name.trim(), description: description.trim() }));
          setName(''); setDescription(''); setEditingRole(null);
        }, 'Role saved. Assign it in User Management.'); }}>
          <label>Role name<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Partner streamers" /></label>
          <label>Description<textarea maxLength={500} value={description} onChange={e => setDescription(e.target.value)} /></label>
          <button disabled={busy || !name.trim()}>{editingRole ? 'Save role' : 'Create role'}</button>
          {editingRole && <button type="button" onClick={() => { setEditingRole(null); setName(''); setDescription(''); }}>Cancel</button>}
        </form>
        {roles.map(role => <article key={role.id} className="ora-role"><strong>{role.name}</strong><p>{role.description}</p>
          <small>{grants.filter(g => g.role_id === role.id).length} assigned assets</small>
          <div><button disabled={busy} onClick={() => { setEditingRole(role.id); setName(role.name); setDescription(role.description); }}>Edit</button>
            <button disabled={busy} onClick={() => {
              if (window.confirm(`Delete "${role.name}" and remove its user assignments? Its exclusive assets will stay restricted.`)) perform(async () => {
                await checked(supabase.from('overlay_access_roles').delete().eq('id', role.id));
                setRoleIds(ids => ids.filter(id => id !== role.id));
                if (editingRole === role.id) { setEditingRole(null); setName(''); setDescription(''); }
              }, 'Role removed. Assets remain restricted.');
            }}>Delete</button></div>
        </article>)}
      </section>
      <section><h3>Themes and media access</h3>
        <label>Asset category<select value={filter} onChange={e => setFilter(e.target.value)}><option value="theme">Colour themes</option><option value="background">Backgrounds</option><option value="banner">Banners / slideshow media</option></select></label>
        <div className="ora-assets">{entries.filter(a => a.kind === filter).map(item => {
          const saved = assets.find(a => a.kind === item.kind && a.asset_key === item.key);
          return <button disabled={busy} key={item.kind + item.key} onClick={() => selectAsset(item)} aria-pressed={asset?.kind === item.kind && asset?.key === item.key}>
            <strong>{saved?.label || item.label}</strong><small>{saved?.restricted ? 'Exclusive' : item.kind === 'banner' && !saved ? 'Existing Brutus access' : 'Public'}</small>
          </button>;
        })}</div>
        <button disabled={busy} onClick={() => { setAsset({ kind: 'banner', key: '', label: '', mediaType: 'image', restricted: true }); setRoleIds([]); }}>Add banner or background URL</button>
        {asset && <form className="ora-asset-editor" onSubmit={e => { e.preventDefault(); perform(async () => {
          await checked(supabase.rpc('save_overlay_access_asset', { p_asset: asset, p_roles: roleIds }));
          setAsset(current => ({ ...current, existing: true }));
        }, 'Asset access saved. Active overlays refresh within 15 seconds.'); }}>
          <h4>{asset.existing ? 'Manage asset access' : 'Add media'}</h4>
          {asset.existing && asset.kind !== 'theme' && <div className="ora-media-preview">
            {asset.mediaType === 'video' ? <video src={asset.key} controls muted playsInline preload="none" aria-label={asset.label} />
              : <img src={asset.key} alt={asset.label} loading="lazy" />}
          </div>}
          <label>Name<input required maxLength={120} value={asset.label} onChange={e => setAsset({ ...asset, label: e.target.value })} /></label>
          {!asset.existing && <>
            <label>Use as<select value={asset.kind} onChange={e => setAsset({ ...asset, kind: e.target.value })}><option value="banner">Banner / slideshow</option><option value="background">Background</option></select></label>
            <label>Media type<select value={asset.mediaType} onChange={e => setAsset({ ...asset, mediaType: e.target.value })}><option value="image">Image</option><option value="video">Video</option></select></label>
            <label>Media URL<input required pattern="(https://|/[^/]).*" value={asset.key} onChange={e => setAsset({ ...asset, key: e.target.value.trim() })} placeholder="https://… or /backgrounds/…" /></label>
          </>}
          <label className="ora-choice"><input type="checkbox" checked={asset.restricted} onChange={e => setAsset({ ...asset, restricted: e.target.checked })} />Exclusive to selected roles</label>
          {asset.restricted && <><p>Only these roles and administrators may use this asset. No roles selected means administrators only.</p>
            {roles.map(role => <label className="ora-choice" key={role.id}><input type="checkbox" checked={roleIds.includes(role.id)} onChange={e => setRoleIds(e.target.checked ? [...roleIds, role.id] : roleIds.filter(id => id !== role.id))} />{role.name}</label>)}
          </>}
          <button disabled={busy}>Save asset access</button>
        </form>}
      </section>
    </div>
  </section>;
}
