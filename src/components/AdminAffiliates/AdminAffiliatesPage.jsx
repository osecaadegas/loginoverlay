import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Link2,
  Plus,
  RefreshCw,
  ShieldOff,
  UserPlus,
} from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import {
  addAffiliateStats,
  affiliateRoleAction,
  commitAffiliateCsv,
  copyText,
  fetchAdminAffiliateOverview,
  formatMoneyMinor,
  previewAffiliateCsv,
  saveAffiliateBrand,
  saveAffiliateLink,
  saveAffiliateOffer,
} from '../../services/affiliateService';
import './AdminAffiliatesPage.css';

const blankBrand = {
  name: '',
  slug: '',
  logo_url: '',
  website_url: '',
  default_currency: 'EUR',
  status: 'active',
  reporting_mode: 'manual',
  parameter_mapping: '{"source_parameter":"utm_source","campaign_parameter":"utm_campaign","click_id_parameter":"click_id"}',
};

const blankOffer = {
  brand_id: '',
  name: '',
  slug: '',
  title: '',
  offer_type: 'hybrid',
  cpa_amount: '',
  revenue_share_percentage: '',
  minimum_deposit: '',
  currency: 'EUR',
  public_status: 'public',
  affiliate_status: 'active',
};

const blankLink = {
  affiliate_user_id: '',
  brand_id: '',
  offer_id: '',
  destination_url: '',
  short_code: '',
  campaign_name: '',
  source_name: 'website',
  status: 'active',
};

function today(offset = 0) {
  const value = new Date();
  value.setDate(value.getDate() + offset);
  return value.toISOString().slice(0, 10);
}

function hasAffiliateRole(user) {
  return (user.roles || []).some((role) => role.role === 'affiliate' && role.is_active);
}

function Field({ label, children }) {
  return (
    <label className="admin-affiliates-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function FormInput({ label, value, onChange, ...props }) {
  return (
    <Field label={label}>
      <input value={value || ''} onChange={(event) => onChange(event.target.value)} {...props} />
    </Field>
  );
}

function FormSelect({ label, value, onChange, children }) {
  return (
    <Field label={label}>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </Field>
  );
}

function StatBox({ label, value }) {
  return (
    <article className="admin-affiliates-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function AdminAffiliatesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [brandForm, setBrandForm] = useState(blankBrand);
  const [offerForm, setOfferForm] = useState(blankOffer);
  const [linkForm, setLinkForm] = useState(blankLink);
  const [statsForm, setStatsForm] = useState({
    affiliate_user_id: '',
    brand_id: '',
    tracking_link_id: '',
    partner_clicks: '',
    registrations: '',
    ftds: '',
    deposit_amount: '',
    cpa_commission: '',
    revenue_share_commission: '',
    currency: 'EUR',
    reporting_period_start: today(-30),
    reporting_period_end: today(),
    notes: '',
  });
  const [csvForm, setCsvForm] = useState({ brandId: '', filename: 'affiliate-import.csv', csv: '' });
  const [csvPreview, setCsvPreview] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchAdminAffiliateOverview());
    } catch (err) {
      setError(err.message || 'Could not load affiliate admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (task, message) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await task();
      setSuccess(message);
      await load();
    } catch (err) {
      setError(err.message || 'Affiliate action failed.');
    } finally {
      setBusy(false);
    }
  };

  const users = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.users || []).filter((user) => {
      if (!needle) return true;
      return [user.email, user.displayName, user.username].filter(Boolean).some((value) => value.toLowerCase().includes(needle));
    });
  }, [data, query]);

  const brands = data?.brands || [];
  const offers = data?.offers || [];
  const links = data?.links || [];

  const updateForm = (setter) => (key, value) => setter((current) => ({ ...current, [key]: value }));
  const updateBrand = updateForm(setBrandForm);
  const updateOffer = updateForm(setOfferForm);
  const updateLink = updateForm(setLinkForm);
  const updateStats = updateForm(setStatsForm);
  const updateCsv = updateForm(setCsvForm);

  const submitBrand = () => run(async () => {
    await saveAffiliateBrand({ values: brandForm });
    setBrandForm(blankBrand);
  }, 'Brand saved.');

  const submitOffer = () => run(async () => {
    await saveAffiliateOffer({ values: offerForm });
    setOfferForm(blankOffer);
  }, 'Offer saved.');

  const submitLink = () => run(async () => {
    const payload = { ...linkForm };
    if (!payload.offer_id) delete payload.offer_id;
    await saveAffiliateLink({ values: payload });
    setLinkForm(blankLink);
  }, 'Tracking link saved.');

  const submitStats = () => run(async () => {
    const payload = { ...statsForm };
    if (!payload.tracking_link_id) delete payload.tracking_link_id;
    await addAffiliateStats({ values: payload });
  }, 'Partner stats added.');

  const previewCsv = async () => {
    setBusy(true);
    setError('');
    setCsvPreview(null);
    try {
      setCsvPreview(await previewAffiliateCsv(csvForm));
    } catch (err) {
      setError(err.message || 'CSV preview failed.');
    } finally {
      setBusy(false);
    }
  };

  const importCsv = () => run(async () => {
    await commitAffiliateCsv(csvForm);
    setCsvPreview(null);
  }, 'CSV import stored for matching.');

  const roleAction = (user, action) => run(async () => {
    await affiliateRoleAction({ userId: user.id, action, displayName: user.displayName, reason: `Admin ${action}` });
  }, `Affiliate ${action} completed.`);

  if (loading) return <LoadingSpinner text="Loading affiliate admin..." fullPage />;

  return (
    <main className="admin-affiliates-page">
      <header className="admin-affiliates-hero">
        <div>
          <span>Admin</span>
          <h1>Affiliate management</h1>
          <p>Create safe tracking links, manage affiliate access, and reconcile partner reports without exposing visitor identities.</p>
        </div>
        <button type="button" onClick={load} disabled={busy}><RefreshCw size={16} /> Refresh</button>
      </header>

      {(error || success) && (
        <div className={`admin-affiliates-message ${error ? 'is-error' : ''}`}>
          {error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{error || success}</span>
        </div>
      )}

      <section className="admin-affiliates-stats">
        <StatBox label="Affiliate users" value={data?.totals?.affiliateUsers || 0} />
        <StatBox label="Active links" value={data?.totals?.activeLinks || 0} />
        <StatBox label="Human clicks" value={data?.totals?.humanClicks || 0} />
        <StatBox label="Registrations" value={data?.totals?.registrations || 0} />
        <StatBox label="FTDs" value={data?.totals?.ftds || 0} />
      </section>

      <section className="admin-affiliates-layout">
        <div className="admin-affiliates-panel admin-affiliates-panel--wide">
          <div className="admin-affiliates-panel__head">
            <h2>Users</h2>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" />
          </div>
          <div className="admin-affiliates-users">
            {users.slice(0, 80).map((user) => {
              const affiliate = hasAffiliateRole(user);
              const suspended = user.affiliateProfile?.status === 'suspended';
              return (
                <article key={user.id} className="admin-affiliates-user">
                  <div>
                    <strong>{user.displayName || user.email}</strong>
                    <span>{user.email}</span>
                    <small>{affiliate ? `Affiliate · ${user.activeLinkCount} active links` : user.accountType}</small>
                  </div>
                  <div className="admin-affiliates-user__metrics">
                    <span>{user.totalTrackedClicks}<small>Clicks</small></span>
                    <span>{user.totalRegistrations}<small>Regs</small></span>
                    <span>{user.totalFtds}<small>FTD</small></span>
                  </div>
                  <div className="admin-affiliates-actions">
                    <button type="button" onClick={() => roleAction(user, affiliate ? 'remove' : 'grant')}>
                      {affiliate ? <ShieldOff size={15} /> : <UserPlus size={15} />}
                      {affiliate ? 'Remove' : 'Grant'}
                    </button>
                    <button type="button" onClick={() => roleAction(user, suspended ? 'reactivate' : 'suspend')}>
                      {suspended ? 'Reactivate' : 'Suspend'}
                    </button>
                    <button type="button" onClick={() => setLinkForm((current) => ({ ...current, affiliate_user_id: user.id }))}>Use in link</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="admin-affiliates-panel">
          <h2>Brand</h2>
          <div className="admin-affiliates-form">
            <FormInput label="Name" value={brandForm.name} onChange={(value) => updateBrand('name', value)} />
            <FormInput label="Slug" value={brandForm.slug} onChange={(value) => updateBrand('slug', value)} placeholder="auto from name" />
            <FormInput label="Logo URL" value={brandForm.logo_url} onChange={(value) => updateBrand('logo_url', value)} />
            <FormInput label="Website URL" value={brandForm.website_url} onChange={(value) => updateBrand('website_url', value)} />
            <FormSelect label="Reporting" value={brandForm.reporting_mode} onChange={(value) => updateBrand('reporting_mode', value)}>
              <option value="manual">Manual</option>
              <option value="csv">CSV</option>
              <option value="api">API</option>
              <option value="postback">Postback</option>
            </FormSelect>
            <Field label="Parameter mapping">
              <textarea value={brandForm.parameter_mapping} onChange={(event) => updateBrand('parameter_mapping', event.target.value)} rows={3} />
            </Field>
            <button type="button" onClick={submitBrand} disabled={busy}><Plus size={16} /> Save brand</button>
          </div>
        </div>

        <div className="admin-affiliates-panel">
          <h2>Offer</h2>
          <div className="admin-affiliates-form">
            <FormSelect label="Brand" value={offerForm.brand_id} onChange={(value) => updateOffer('brand_id', value)}>
              <option value="">Choose brand</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </FormSelect>
            <FormInput label="Name" value={offerForm.name} onChange={(value) => updateOffer('name', value)} />
            <FormInput label="Slug" value={offerForm.slug} onChange={(value) => updateOffer('slug', value)} />
            <FormInput label="Title" value={offerForm.title} onChange={(value) => updateOffer('title', value)} />
            <FormSelect label="Type" value={offerForm.offer_type} onChange={(value) => updateOffer('offer_type', value)}>
              <option value="cpa">CPA</option>
              <option value="revenue_share">Rev share</option>
              <option value="hybrid">Hybrid</option>
              <option value="flat_fee">Flat fee</option>
            </FormSelect>
            <div className="admin-affiliates-form__split">
              <FormInput label="CPA" value={offerForm.cpa_amount} onChange={(value) => updateOffer('cpa_amount', value)} />
              <FormInput label="Rev share %" value={offerForm.revenue_share_percentage} onChange={(value) => updateOffer('revenue_share_percentage', value)} />
            </div>
            <button type="button" onClick={submitOffer} disabled={busy}><Plus size={16} /> Save offer</button>
          </div>
        </div>

        <div className="admin-affiliates-panel admin-affiliates-panel--wide">
          <h2>Tracking links</h2>
          <div className="admin-affiliates-form admin-affiliates-form--grid">
            <FormSelect label="Affiliate user" value={linkForm.affiliate_user_id} onChange={(value) => updateLink('affiliate_user_id', value)}>
              <option value="">Choose user</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.displayName || user.email}</option>)}
            </FormSelect>
            <FormSelect label="Brand" value={linkForm.brand_id} onChange={(value) => updateLink('brand_id', value)}>
              <option value="">Choose brand</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </FormSelect>
            <FormSelect label="Offer" value={linkForm.offer_id} onChange={(value) => updateLink('offer_id', value)}>
              <option value="">Default offer</option>
              {offers.filter((offer) => !linkForm.brand_id || offer.brandId === linkForm.brand_id).map((offer) => <option key={offer.id} value={offer.id}>{offer.name}</option>)}
            </FormSelect>
            <FormInput label="Short code" value={linkForm.short_code} onChange={(value) => updateLink('short_code', value)} placeholder="optional" />
            <FormInput label="Campaign" value={linkForm.campaign_name} onChange={(value) => updateLink('campaign_name', value)} />
            <FormInput label="Source" value={linkForm.source_name} onChange={(value) => updateLink('source_name', value)} />
            <Field label="Destination URL">
              <textarea value={linkForm.destination_url} onChange={(event) => updateLink('destination_url', event.target.value)} rows={2} />
            </Field>
            <button type="button" onClick={submitLink} disabled={busy}><Link2 size={16} /> Create safe link</button>
          </div>

          <div className="admin-affiliates-links">
            {links.slice(0, 40).map((link) => (
              <article key={link.id}>
                <div>
                  <strong>{link.brandName} · {link.affiliateDisplayName || link.affiliateEmail}</strong>
                  <code>{link.trackingUrl}</code>
                </div>
                <span>{link.clickTotals?.humanClicks || 0} clicks</span>
                <button type="button" onClick={() => copyText(link.trackingUrl)}><Copy size={15} /> Copy</button>
              </article>
            ))}
          </div>
        </div>

        <div className="admin-affiliates-panel">
          <h2>Manual partner stats</h2>
          <div className="admin-affiliates-form">
            <FormSelect label="Affiliate user" value={statsForm.affiliate_user_id} onChange={(value) => updateStats('affiliate_user_id', value)}>
              <option value="">Choose user</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.displayName || user.email}</option>)}
            </FormSelect>
            <FormSelect label="Brand" value={statsForm.brand_id} onChange={(value) => updateStats('brand_id', value)}>
              <option value="">Choose brand</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </FormSelect>
            <FormSelect label="Tracking link" value={statsForm.tracking_link_id} onChange={(value) => updateStats('tracking_link_id', value)}>
              <option value="">No link</option>
              {links.filter((link) => !statsForm.affiliate_user_id || link.affiliateUserId === statsForm.affiliate_user_id).map((link) => <option key={link.id} value={link.id}>{link.brandName} · {link.shortCode}</option>)}
            </FormSelect>
            <div className="admin-affiliates-form__split">
              <FormInput label="Start" type="date" value={statsForm.reporting_period_start} onChange={(value) => updateStats('reporting_period_start', value)} />
              <FormInput label="End" type="date" value={statsForm.reporting_period_end} onChange={(value) => updateStats('reporting_period_end', value)} />
            </div>
            <div className="admin-affiliates-form__split">
              <FormInput label="Partner clicks" value={statsForm.partner_clicks} onChange={(value) => updateStats('partner_clicks', value)} />
              <FormInput label="Registrations" value={statsForm.registrations} onChange={(value) => updateStats('registrations', value)} />
              <FormInput label="FTDs" value={statsForm.ftds} onChange={(value) => updateStats('ftds', value)} />
            </div>
            <div className="admin-affiliates-form__split">
              <FormInput label="Deposits" value={statsForm.deposit_amount} onChange={(value) => updateStats('deposit_amount', value)} />
              <FormInput label="CPA" value={statsForm.cpa_commission} onChange={(value) => updateStats('cpa_commission', value)} />
              <FormInput label="Rev share" value={statsForm.revenue_share_commission} onChange={(value) => updateStats('revenue_share_commission', value)} />
            </div>
            <button type="button" onClick={submitStats} disabled={busy}><Plus size={16} /> Add stats</button>
          </div>
        </div>

        <div className="admin-affiliates-panel">
          <h2>CSV import</h2>
          <div className="admin-affiliates-form">
            <FormSelect label="Brand" value={csvForm.brandId} onChange={(value) => updateCsv('brandId', value)}>
              <option value="">Choose brand</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </FormSelect>
            <FormInput label="Filename" value={csvForm.filename} onChange={(value) => updateCsv('filename', value)} />
            <Field label="CSV content">
              <textarea value={csvForm.csv} onChange={(event) => updateCsv('csv', event.target.value)} rows={8} placeholder="Paste partner CSV here" />
            </Field>
            <div className="admin-affiliates-button-row">
              <button type="button" onClick={previewCsv} disabled={busy}><FileSpreadsheet size={16} /> Preview</button>
              <button type="button" onClick={importCsv} disabled={busy || !csvPreview}>Import</button>
            </div>
            {csvPreview && (
              <div className="admin-affiliates-preview">
                <strong>{csvPreview.rowsTotal} rows detected</strong>
                <pre>{JSON.stringify(csvPreview.previewRows?.slice(0, 4), null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        <div className="admin-affiliates-panel admin-affiliates-panel--wide">
          <h2>Recent audit</h2>
          <div className="admin-affiliates-audit">
            {(data?.notes || []).slice(0, 12).map((note) => (
              <article key={note.id}>
                <strong>{note.note}</strong>
                <span>{new Date(note.created_at).toLocaleString()}</span>
              </article>
            ))}
            {!data?.notes?.length && <p>No notes yet. Audit rows are kept server-side for every admin action.</p>}
          </div>
        </div>
      </section>

      <section className="admin-affiliates-footnote">
        <AlertTriangle size={17} />
        <p>Commission is stored in minor units and treated as estimated until the affiliate partner approves the reporting period. Raw IP addresses and user agents are hashed before storage.</p>
      </section>
    </main>
  );
}
