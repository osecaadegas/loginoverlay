import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { supabase } from '../../../../config/supabaseClient';
import { getMySubmissions } from '../../../../services/pendingSlotService';
import { getAllProviders } from '../../../../utils/slotUtils';
import { SubmitDropdown } from '../../slots/SlotSubmissions';
import { buildCurrentGameResult, persistCurrentGameResult, readSlotResults } from '../../../../../shared/slotPersonalBest';
import CurrentSlotWidget from './CurrentSlotWidget';
import { currentGameSearchResults, currentSlotConfig, currentSlotIdentity, ownedPendingCurrentGameSlots, safeArtworkUrl } from './currentSlotModel';

export default function CurrentSlotConfig({ config, onChange, allWidgets = [], onSaveRelatedWidget }) {
  const { user } = useAuth();
  const c = currentSlotConfig(config), slot = currentSlotIdentity(c);
  const [search, setSearch] = useState(''), [matches, setMatches] = useState([]), [searching, setSearching] = useState(false);
  const [ownedPending, setOwnedPending] = useState([]), [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState(''), [pendingRevision, setPendingRevision] = useState(0);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [bet, setBet] = useState(''), [payout, setPayout] = useState(''), [busy, setBusy] = useState(false);
  const [huntBet, setHuntBet] = useState(''), [bonusType, setBonusType] = useState('normal'), [addingToHunt, setAddingToHunt] = useState(false);
  const [history, setHistory] = useState([]), [historyBusy, setHistoryBusy] = useState(false), [historyError, setHistoryError] = useState(''), [revision, setRevision] = useState(0);
  const attempt = useRef(null), saving = useRef(false);
  const [pending, setPending] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [providers, setProviders] = useState([]);
  const huntWidget = allWidgets.find(widget => widget.widget_type === 'bonus_hunt' && widget.config?.huntActive)
    || allWidgets.find(widget => widget.widget_type === 'bonus_hunt');
  const key = `${slot.id || ''}|${slot.name}|${slot.provider}`;
  useEffect(() => {
    let cancelled = false;
    setOwnedPending([]); setPendingError('');
    if (!user?.id) { setPendingLoading(false); return undefined; }
    setPendingLoading(true);
    getMySubmissions(user.id).then(rows => {
      if (!cancelled) setOwnedPending(ownedPendingCurrentGameSlots(rows, user.id));
    }).catch(() => {
      if (!cancelled) setPendingError('Could not load your pending submissions.');
    }).finally(() => { if (!cancelled) setPendingLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, pendingRevision]);
  useEffect(() => {
    let cancelled = false;
    setMatches([]);
    if (search.trim().length < 2) { setSearching(false); return undefined; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const literal = search.trim().replace(/[\\%_]/g, '\\$&');
        const [catalogResult, submissionsResult] = await Promise.allSettled([
          supabase.from('slots').select('id,name,provider,image,rtp,volatility,max_win_multiplier')
            .eq('status', 'live').is('deleted_at', null).ilike('name', `%${literal}%`).order('name').limit(25),
          user?.id ? getMySubmissions(user.id) : Promise.resolve([]),
        ]);
        const catalog = catalogResult.status === 'fulfilled' ? catalogResult.value : null;
        const catalogError = catalogResult.status === 'rejected' || catalog?.error;
        const pendingError = submissionsResult.status === 'rejected';
        if (catalogError && pendingError) throw new Error('Slot search unavailable');
        if (!cancelled) {
          setMatches(currentGameSearchResults(catalogError ? [] : catalog.data,
            pendingError ? [] : submissionsResult.value, user?.id, search));
          setError(pendingError ? 'Your pending submissions could not be loaded. Try searching again.'
            : catalogError ? 'Could not search the slot catalog. Your pending submissions are still available.' : '');
        }
      } catch { if (!cancelled) setError('Could not search the slot catalog. Try again.'); }
      finally { if (!cancelled) setSearching(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, user?.id]);
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
    setHuntBet(''); setBonusType('normal');
  };
  useEffect(() => {
    if (!showSubmit) return undefined;
    let cancelled = false;
    getAllProviders().then(items => { if (!cancelled) setProviders(items); });
    return () => { cancelled = true; };
  }, [showSubmit]);
  const handleSubmitted = submitted => {
    setPendingRevision(value => value + 1);
    const ownSlot = ownedPendingCurrentGameSlots([submitted], user?.id)[0];
    if (ownSlot) choose(ownSlot);
    setNotice('Slot submitted for approval. It is now available in your pending slots.');
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
  const addToHunt = async event => {
    event.preventDefault();
    if (addingToHunt || busy || pending) return;
    setError(''); setNotice('');
    const amount = Number(huntBet);
    if (!user?.id || !slot.id || !slot.name || !huntWidget || !onSaveRelatedWidget || !Number.isFinite(amount) || amount <= 0) {
      setError('Select a slot, enter a positive bet size, and enable Better Hunt before adding a bonus.');
      return;
    }
    setAddingToHunt(true);
    try {
      const bonus = {
        id: crypto.randomUUID(), slot, slotName: slot.name, betSize: amount,
        isSuperBonus: bonusType === 'super', isExtremeBonus: bonusType === 'extreme',
        opened: false, result: 0, payout: 0, requestedBy: null,
      };
      await onSaveRelatedWidget({
        ...huntWidget,
        config: { ...huntWidget.config, bonuses: [...(Array.isArray(huntWidget.config?.bonuses) ? huntWidget.config.bonuses : []), bonus], previewSlotName: '' },
      });
      setHuntBet(''); setBonusType('normal');
      setNotice(`${slot.name} added to Better Hunt.`);
    } catch (err) {
      setError(err?.message || 'Could not add this slot to Better Hunt. Please retry.');
    } finally { setAddingToHunt(false); }
  };
  const selectedPending = ownedPending.some(item => item.id === slot.id);
  const num = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const slotOption = item => <button type="button" key={`${item.pendingApproval ? 'pending' : 'live'}-${item.id}`} disabled={busy || pending} onClick={() => choose(item)}>{safeArtworkUrl(item.image || '') && <img src={item.image} alt="" />}<span><span translate="no" className="notranslate">{item.name}</span><small>{item.provider}{item.pendingApproval && <span className="cg-pending-badge">Pending approval · your submission</span>}</small></span></button>;
  return <div className="cg-page" data-tour="current-slot-page">
    <div className="cg-page-preview"><CurrentSlotWidget config={c} userId={user?.id} /></div>
    <p>Choose the game on screen, then record each payout once. Wins and multipliers share your Bonus Hunt result history. <Link to="/editor">Add or customise this widget in the editor →</Link></p>
    <section className="cg-setup-panel" aria-label="Current game setup">
      <div className="cg-setup-heading"><span className="cg-setup-chip">🎮 CURRENT GAME</span><span>Choose a slot and record its result</span></div>
      <div className="cg-page-grid cg-setup-grid">
      <section className="cg-panel"><div className="cg-panel-heading"><h2 className="cg-card-chip">SELECT SLOT</h2>{user?.id && <button type="button" onClick={() => setShowSubmit(value => !value)} disabled={busy || pending} aria-expanded={showSubmit} aria-controls="cg-slot-submission">{showSubmit ? 'Close' : '+ Add slot'}</button>}</div>
        {showSubmit && <div id="cg-slot-submission" className="slot-manager-v2 cg-slot-submit"><SubmitDropdown providers={providers} onClose={() => setShowSubmit(false)} onSubmitted={handleSubmitted} /></div>}
        <label>Search the slot catalog<input value={search} disabled={busy || pending} onChange={event => setSearch(event.target.value)} placeholder="Type a slot name…" /></label>
        {searching && <p role="status">Searching…</p>}
        {!searching && !error && search.length >= 2 && !matches.length && <p>No matching slots found.</p>}
        <div className="cg-search-results">{matches.map(slotOption)}</div>
        <form className="cg-add-hunt" onSubmit={addToHunt}>
          <label>Bet size ({huntWidget?.config?.currency || c.currency})<input name="hunt-bet" type="number" step="0.01" min="0.01" value={huntBet} onChange={event => setHuntBet(event.target.value)} disabled={busy || pending || addingToHunt} required placeholder="Bet size" /></label>
          <div className="cg-add-hunt-actions" role="group" aria-label="Bonus category">
            <button type="button" className="cg-hunt-tier cg-hunt-tier--super" aria-pressed={bonusType === 'super'} onClick={() => setBonusType(type => type === 'super' ? 'normal' : 'super')} disabled={addingToHunt}>★ Super</button>
            <button type="button" className="cg-hunt-tier cg-hunt-tier--extreme" aria-pressed={bonusType === 'extreme'} onClick={() => setBonusType(type => type === 'extreme' ? 'normal' : 'extreme')} disabled={addingToHunt}>⚡ Extreme</button>
            <button type="submit" className="cg-add-hunt-submit" disabled={!user?.id || !slot.id || !huntWidget || !onSaveRelatedWidget || busy || pending || addingToHunt || !Number.isFinite(Number(huntBet)) || Number(huntBet) <= 0}>{addingToHunt ? 'Adding…' : 'Add to Hunt'}</button>
          </div>
          {!huntWidget && <small><Link to="/overlay-center/widgets/bonus-hunt">Enable Better Hunt</Link> to add this slot.</small>}
        </form>
        {user?.id && <div className="cg-own-pending"><h3>My pending slots <button type="button" onClick={() => setPendingRevision(value => value + 1)} disabled={pendingLoading}>Refresh</button></h3>{pendingLoading ? <p role="status">Loading your submissions…</p> : pendingError ? <p role="alert">{pendingError}</p> : ownedPending.length ? <div className="cg-search-results">{ownedPending.map(slotOption)}</div> : <p>No slots awaiting approval.</p>}</div>}
        {slot.name && <p>Selected: <strong translate="no" className="notranslate">{slot.name}</strong> · {slot.provider}{selectedPending && <span className="cg-pending-badge">Pending approval</span>}</p>}
      </section>
      <section className="cg-panel"><div className="cg-panel-heading"><h2 className="cg-card-chip">💰 RECORD PAYOUT</h2></div><label className="cg-currency-field">Display currency<select value={c.currency} disabled={busy || pending} onChange={event => onChange({ ...c, currency: event.target.value })}>{['€', '$', '£', 'R$', 'kr', '¥', '₹', '₿', 'C$', 'A$', 'CHF', 'PLN', 'TRY'].map(symbol => <option key={symbol}>{symbol}</option>)}</select></label><form onSubmit={save}>
        <fieldset className="cg-payout-fields" disabled={busy || pending}>
          <label>Bet size ({c.currency})<input name="current-bet" type="number" step="0.01" min="0.01" value={bet} onChange={event => setBet(event.target.value)} required /></label>
          <label>Payout ({c.currency})<input name="current-payout" type="number" step="0.01" min="0" value={payout} onChange={event => setPayout(event.target.value)} required /></label>
        </fieldset>
        <div className="cg-save-row"><p>Multiplier: <strong>{bet > 0 && payout !== '' ? `${num(Number(payout) / Number(bet))}x` : '—'}</strong></p><button disabled={busy || !slot.id || !user} type="submit">{busy ? 'Saving…' : pending ? 'Retry this save' : 'Save result'}</button></div>
        <small>Include zero payouts for an accurate average. Results are recorded amounts, with no currency conversion.</small>
      </form></section>
      </div>
    </section>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <section className="cg-panel"><h2>Shared result history</h2><p>Current Game and Bonus Hunt payments for the selected slot. Average win includes every recorded payout, including zero.</p>
      {historyBusy ? <p role="status">Loading results…</p> : historyError ? <p role="alert">{historyError} <button onClick={() => setRevision(value => value + 1)}>Retry</button></p> : history.length ? <div className="cg-history-scroll"><table><thead><tr><th>Date</th><th>Source / hunt</th><th>Bet</th><th>Payout</th><th>Multiplier</th></tr></thead><tbody>{history.slice(0, 100).map(result => <tr key={result.id}><td>{new Date(result.created_at).toLocaleString()}</td><td>{result.hunt_name || 'Bonus Hunt'}</td><td>{num(result.bet_size)}</td><td>{num(result.payout)}</td><td>{num(result.multiplier)}x</td></tr>)}</tbody></table>{history.length > 100 && <p>Showing the latest 100 of {history.length} results. All results contribute to your records.</p>}</div> : <p>No recorded results for this slot yet.</p>}
    </section>
  </div>;
}
