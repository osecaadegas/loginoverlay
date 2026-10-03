import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../config/supabaseClient';
import { buildCurrentGameResult, persistCurrentGameResult, readSlotResults } from '../../../../../shared/slotPersonalBest';
import CurrentSlotWidget from './CurrentSlotWidget';
import { currentSlotConfig, currentSlotIdentity, safeArtworkUrl } from './currentSlotModel';

export default function CurrentSlotConfig({ config, onChange }) {
  const { user } = useAuth();
  const c = currentSlotConfig(config), slot = currentSlotIdentity(c);
  const [search, setSearch] = useState(''), [matches, setMatches] = useState([]), [searching, setSearching] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [bet, setBet] = useState(''), [payout, setPayout] = useState(''), [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]), [historyBusy, setHistoryBusy] = useState(false), [historyError, setHistoryError] = useState(''), [revision, setRevision] = useState(0);
  const attempt = useRef(null), saving = useRef(false);
  const [pending, setPending] = useState(false);
  const key = `${slot.id || ''}|${slot.name}|${slot.provider}`;
  useEffect(() => {
    let cancelled = false;
    setMatches([]);
    if (search.trim().length < 2) { setSearching(false); return undefined; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const literal = search.trim().replace(/[\\%_]/g, '\\$&');
        const { data, error: queryError } = await supabase.from('slots').select('id,name,provider,image,rtp,volatility,max_win_multiplier')
          .eq('status', 'live').is('deleted_at', null).ilike('name', `%${literal}%`).order('name').limit(25);
        if (queryError) throw queryError;
        if (!cancelled) { setMatches(data || []); setError(''); }
      } catch { if (!cancelled) setError('Could not search the slot catalog. Try again.'); }
      finally { if (!cancelled) setSearching(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search]);
  useEffect(() => {
    let cancelled = false;
    setHistory([]); setHistoryError('');
    if (!user?.id || !slot.name) { setHistoryBusy(false); return undefined; }
    setHistoryBusy(true);
    readSlotResults(supabase, user.id, slot).then(rows => { if (!cancelled) setHistory(rows); })
      .catch(() => { if (!cancelled) setHistoryError('Could not load result history.'); })
      .finally(() => { if (!cancelled) setHistoryBusy(false); });
    return () => { cancelled = true; };
  }, [user?.id, key, revision]);
  const choose = selected => {
    if (pending || busy) return;
    onChange({ ...c, slot: selected, slotId: selected.id, slotName: selected.name, provider: selected.provider, imageUrl: selected.image });
    setSearch(''); setMatches([]); setNotice(''); setError(''); setBet(''); setPayout('');
  };
  const save = async event => {
    event.preventDefault();
    if (saving.current) return;
    setError(''); setNotice('');
    try {
      if (!user?.id) throw new Error('Sign in before recording a result.');
      if (!attempt.current) attempt.current = buildCurrentGameResult(user.id, slot, bet, payout, crypto.randomUUID());
      saving.current = true; setBusy(true); setPending(true);
      await persistCurrentGameResult(supabase, attempt.current);
      attempt.current = null; setPending(false); setPayout(''); setRevision(value => value + 1);
      window.dispatchEvent(new Event('slot-result-saved'));
      setNotice('Result saved to your shared slot history. Personal records include Bonus Hunt and Current Game.');
    } catch (err) { setError(err.message || 'Could not save the result. Retry to safely finish this save.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const artwork = c.artworkBySlot?.[slot.id] || {};
  const setArtwork = (field, value) => onChange({ ...c, artworkBySlot: { ...c.artworkBySlot, [slot.id]: { ...artwork, [field]: value } } });
  const num = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return <div className="cg-page" data-tour="current-slot-page">
    <div className="cg-page-preview"><CurrentSlotWidget config={c} userId={user?.id} /></div>
    <p>Choose the game on screen, then record each payout once. Wins and multipliers share your Bonus Hunt result history. <Link to="/editor">Add or customise this widget in the editor →</Link></p>
    <div className="cg-page-grid">
      <section className="cg-panel"><h2>Current game</h2>
        <label>Search the slot catalog<input value={search} disabled={busy || pending} onChange={event => setSearch(event.target.value)} placeholder="Type a slot name…" /></label>
        {searching && <p role="status">Searching…</p>}
        {!searching && search.length >= 2 && !matches.length && <p>No matching slots found.</p>}
        <div className="cg-search-results">{matches.map(item => <button type="button" key={item.id} disabled={busy || pending} onClick={() => choose(item)}>{safeArtworkUrl(item.image || '') && <img src={item.image} alt="" />}<span>{item.name}<small>{item.provider}</small></span></button>)}</div>
        {slot.name && <p>Selected: <strong>{slot.name}</strong> · {slot.provider}</p>}
      </section>
      <section className="cg-panel"><h2>Record a payout</h2><label>Display currency<select value={c.currency} disabled={busy || pending} onChange={event => onChange({ ...c, currency: event.target.value })}>{['€', '$', '£', 'R$', 'kr', '¥', '₹', '₿', 'C$', 'A$', 'CHF', 'PLN', 'TRY'].map(symbol => <option key={symbol}>{symbol}</option>)}</select></label><form onSubmit={save}>
        <fieldset disabled={busy || pending} style={{ border: 0, padding: 0, margin: 0 }}>
          <label>Bet size ({c.currency})<input name="current-bet" type="number" step="0.01" min="0.01" value={bet} onChange={event => setBet(event.target.value)} required /></label>
          <label>Payout ({c.currency})<input name="current-payout" type="number" step="0.01" min="0" value={payout} onChange={event => setPayout(event.target.value)} required /></label>
        </fieldset>
        <p>Multiplier: <strong>{bet > 0 && payout !== '' ? `${num(Number(payout) / Number(bet))}x` : '—'}</strong></p>
        <button disabled={busy || !slot.id || !user} type="submit">{busy ? 'Saving…' : pending ? 'Retry this save' : 'Save result'}</button>
        <small> Include zero payouts for an accurate average. Results are recorded amounts, with no currency conversion.</small>
      </form></section>
    </div>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {slot.id && <section className="cg-panel"><h2>Artwork for {slot.name}</h2><p>The catalog cover is used automatically. A separate title image or clean background is optional; these overrides stay with this slot.</p><div className="cg-page-grid">{[['coverUrl', 'Cover image URL'], ['titleUrl', 'Transparent title image URL'], ['backgroundUrl', 'Background image URL']].map(([field, label]) => <label key={field}>{label}<input type="url" value={artwork[field] || ''} onChange={event => setArtwork(field, event.target.value)} placeholder="https://… (optional)" />{artwork[field] && !safeArtworkUrl(artwork[field]) && <small>Enter a valid image URL.</small>}</label>)}</div></section>}
    <section className="cg-panel"><h2>Shared result history</h2><p>Current Game and Bonus Hunt payments for the selected slot. Average win includes every recorded payout, including zero.</p>
      {historyBusy ? <p role="status">Loading results…</p> : historyError ? <p role="alert">{historyError} <button onClick={() => setRevision(value => value + 1)}>Retry</button></p> : history.length ? <div className="cg-history-scroll"><table><thead><tr><th>Date</th><th>Source / hunt</th><th>Bet</th><th>Payout</th><th>Multiplier</th></tr></thead><tbody>{history.slice(0, 100).map(result => <tr key={result.id}><td>{new Date(result.created_at).toLocaleString()}</td><td>{result.hunt_name || 'Bonus Hunt'}</td><td>{num(result.bet_size)}</td><td>{num(result.payout)}</td><td>{num(result.multiplier)}x</td></tr>)}</tbody></table>{history.length > 100 && <p>Showing the latest 100 of {history.length} results. All results contribute to your records.</p>}</div> : <p>No recorded results for this slot yet.</p>}
    </section>
  </div>;
}
