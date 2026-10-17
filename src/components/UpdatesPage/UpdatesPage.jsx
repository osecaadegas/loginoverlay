import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowLeft, BellRing, Crown, Globe, Layers, Monitor, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { getAccessTokenWithFallback } from '../../utils/authSession';
import { fetchWithTimeout } from '../../utils/asyncTimeout';
import './UpdatesPage.css';

const PRODUCTS = [
  { id: 'all', label: 'All updates', icon: BellRing },
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'overlays', label: 'Overlays', icon: Layers },
  { id: 'browser', label: 'ScreenSplit Browser', icon: Monitor },
];

export default function UpdatesPage() {
  const { user } = useAuth();
  const { isPremium, loading } = useAdmin();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const updates = useQuery({
    queryKey: ['account', user?.id, 'updates'],
    enabled: !!user && isPremium && !loading,
    staleTime: 60000, gcTime: 0, retry: false,
    queryFn: async () => {
      const token = await getAccessTokenWithFallback({ timeoutMs: 6000, label: 'Updates session check' });
      if (!token) throw Object.assign(new Error('Please sign in again.'), { status: 401 });
      const response = await fetchWithTimeout('/api/updates', { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }, { timeoutMs: 10000, label: 'Product updates' });
      const payload = await response.json();
      if (!response.ok) throw Object.assign(new Error(payload.error || 'Could not load updates.'), { status: response.status });
      if (!Array.isArray(payload.updates)) throw new Error('Could not load updates. Please try again.');
      return payload.updates;
    },
  });
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (updates.data || []).filter(entry =>
      (category === 'all' || entry.category === category) &&
      (!term || [entry.title, entry.summary, entry.version, entry.action, ...entry.changes].filter(Boolean).join(' ').toLowerCase().includes(term)),
    );
  }, [updates.data, category, search]);

  if (updates.error?.status === 401) return <Navigate to="/login" replace state={{ from: '/updates' }} />;
  if (updates.error?.status === 403) return <Navigate to="/premium" replace />;

  return (
    <main className="product-updates">
      <Link to="/apps" className="product-updates__back"><ArrowLeft size={15} /> Back to Apps</Link>
      <header className="product-updates__hero">
        <div><span className="product-updates__eyebrow"><Crown size={14} /> PREMIUM RELEASE NOTES</span><h1>What’s new</h1><p>The latest improvements to your streaming setup.<br />Website, overlays and browser — all in one place.</p></div>
        <div className="product-updates__hero-icon" aria-hidden="true"><BellRing size={48} /></div>
      </header>
      <section className="product-updates__toolbar" aria-label="Filter updates">
        <div className="product-updates__filters">{PRODUCTS.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}><Icon size={16} />{label}</button>)}</div>
        <label className="product-updates__search"><Search size={17} /><input type="search" aria-label="Search updates" placeholder="Search updates…" value={search} onChange={event => setSearch(event.target.value)} /></label>
      </section>
      {updates.isPending ? <p className="product-updates__status" role="status">Loading updates…</p> : updates.isError ? <div className="product-updates__status" role="alert"><p>{updates.error.message}</p><button type="button" onClick={() => updates.refetch()}>Try again</button></div> : <>
        <p className="product-updates__count" role="status">{visible.length} {visible.length === 1 ? 'update' : 'updates'}</p>
        <div className="product-updates__timeline">{visible.map(entry => {
          const product = PRODUCTS.find(item => item.id === entry.category);
          const Icon = product?.icon || BellRing;
          return <article className="product-updates__entry" key={entry.id}>
            <div className="product-updates__date"><time dateTime={entry.date}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Lisbon' }).format(new Date(`${entry.date}T12:00:00Z`))}</time></div>
            <div className="product-updates__card"><div className="product-updates__meta"><span data-product={entry.category}><Icon size={14} />{product?.label}</span>{entry.version && <span>{entry.version}</span>}</div><h2>{entry.title}</h2><p>{entry.summary}</p><ul>{entry.changes.map(change => <li key={change}>{change}</li>)}</ul>{entry.action && <aside><strong>How to use it</strong><p>{entry.action}</p></aside>}{entry.link && <a className="product-updates__download" href={entry.link.url} target="_blank" rel="noopener noreferrer"><ArrowDownToLine size={16} />{entry.link.label}</a>}</div>
          </article>;
        })}</div>
        {!visible.length && <div className="product-updates__status"><Search size={24} /><h2>No matching updates</h2><p>Try another search or choose a different product.</p><button type="button" onClick={() => { setCategory('all'); setSearch(''); }}>Clear filters</button></div>}
      </>}
    </main>
  );
}
