import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  HelpCircle,
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

function InfoHint({ text }) {
  if (!text) return null;
  return (
    <span className="admin-affiliates-help" tabIndex={0}>
      <HelpCircle size={14} aria-hidden="true" />
      <span className="admin-affiliates-tooltip">{text}</span>
    </span>
  );
}

function Field({ label, help, children }) {
  return (
    <label className="admin-affiliates-field">
      <span className="admin-affiliates-field__label">
        {label}
        <InfoHint text={help} />
      </span>
      {children}
    </label>
  );
}

function FormInput({ label, help, value, onChange, ...props }) {
  return (
    <Field label={label} help={help}>
      <input value={value || ''} onChange={(event) => onChange(event.target.value)} {...props} />
    </Field>
  );
}

function FormSelect({ label, help, value, onChange, children }) {
  return (
    <Field label={label} help={help}>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </Field>
  );
}

function BrandOptions({ brands, publicBrands }) {
  return (
    <>
      {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
      {!!publicBrands.length && (
        <optgroup label="From /offers">
          {publicBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
        </optgroup>
      )}
    </>
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

function FlowStep({ number, title, detail }) {
  return (
    <article className="admin-affiliates-flow__step">
      <strong>{number}</strong>
      <div>
        <span>{title}</span>
        <small>{detail}</small>
      </div>
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
  const publicOfferBrands = data?.publicOfferBrands || [];
  const brandSlugs = new Set(brands.map((brand) => brand.slug));
  const importablePublicBrands = publicOfferBrands.filter((brand) => !brandSlugs.has(brand.slug));
  const offers = data?.offers || [];
  const links = data?.links || [];

  const updateForm = (setter) => (key, value) => setter((current) => ({ ...current, [key]: value }));
  const updateBrand = updateForm(setBrandForm);
  const updateOffer = updateForm(setOfferForm);
  const updateLink = updateForm(setLinkForm);
  const updateStats = updateForm(setStatsForm);
  const updateCsv = updateForm(setCsvForm);

  const applyPublicBrand = (publicBrandId) => {
    const publicBrand = publicOfferBrands.find((brand) => brand.id === publicBrandId);
    if (!publicBrand) return;
    setBrandForm((current) => ({
      ...current,
      name: publicBrand.name,
      slug: publicBrand.slug,
      logo_url: publicBrand.logoUrl || '',
      website_url: publicBrand.websiteUrl || '',
    }));
  };

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

      <section className="admin-affiliates-flow" aria-label="Affiliate setup order">
        <FlowStep number="1" title="Grant role" detail="Lets a user open /affiliate." />
        <FlowStep number="2" title="Create brand" detail="Casino or partner shown on links." />
        <FlowStep number="3" title="Create offer" detail="Commercial terms for that brand." />
        <FlowStep number="4" title="Create tracking link" detail="Public /go link the affiliate shares." />
        <FlowStep number="5" title="Add reports" detail="Partner stats shown beside tracked clicks." />
      </section>

      <section className="admin-affiliates-layout">
        <div className="admin-affiliates-panel admin-affiliates-panel--wide">
          <div className="admin-affiliates-panel__head">
            <div>
              <h2>Users</h2>
              <p className="admin-affiliates-panel__intro">Grant or suspend affiliate access. Use in link only fills the affiliate selector below.</p>
            </div>
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
                    <button type="button" title="Adds or removes the affiliate role and profile access." onClick={() => roleAction(user, affiliate ? 'remove' : 'grant')}>
                      {affiliate ? <ShieldOff size={15} /> : <UserPlus size={15} />}
                      {affiliate ? 'Remove' : 'Grant'}
                    </button>
                    <button type="button" title="Suspended users keep history, but cannot access the affiliate dashboard." onClick={() => roleAction(user, suspended ? 'reactivate' : 'suspend')}>
                      {suspended ? 'Reactivate' : 'Suspend'}
                    </button>
                    <button type="button" title="Prefills this user in the Tracking links form." onClick={() => setLinkForm((current) => ({ ...current, affiliate_user_id: user.id }))}>Use in link</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="admin-affiliates-panel">
          <h2>Brand</h2>
          <p className="admin-affiliates-panel__intro">The partner/casino identity. Brand name and logo appear on admin lists and affiliate link rows.</p>
          <div className="admin-affiliates-output-tags">
            <span>Displayed: brand name</span>
            <span>Displayed: logo</span>
            <span>Used by: /go brand slug</span>
          </div>
          <div className="admin-affiliates-form">
            <FormSelect
              label="Fetch brand from /offers"
              help="Loads the public brand name/logo used on https://streamerscenter.com/offers into this brand form."
              value=""
              onChange={applyPublicBrand}
            >
              <option value="">Choose public offer brand</option>
              {publicOfferBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </FormSelect>
            <FormInput label="Name" help="Shown as the brand label on admin tables and affiliate link rows." value={brandForm.name} onChange={(value) => updateBrand('name', value)} />
            <FormInput label="Slug" help="Used in public URLs: /go/brand-slug/short-code. Leave empty to auto-create from the name." value={brandForm.slug} onChange={(value) => updateBrand('slug', value)} placeholder="auto from name" />
            <FormInput label="Logo URL" help="Logo shown beside the brand in tracking link lists." value={brandForm.logo_url} onChange={(value) => updateBrand('logo_url', value)} />
            <FormInput label="Website URL" help="Reference website for admins. The actual redirect URL is set per tracking link." value={brandForm.website_url} onChange={(value) => updateBrand('website_url', value)} />
            <FormSelect label="Reporting" help="How this partner sends results: manual entry, CSV report, API sync, or postback." value={brandForm.reporting_mode} onChange={(value) => updateBrand('reporting_mode', value)}>
              <option value="manual">Manual</option>
              <option value="csv">CSV</option>
              <option value="api">API</option>
              <option value="postback">Postback</option>
            </FormSelect>
            <Field label="Parameter mapping" help="JSON names for URL parameters added during redirect. Example: click_id_parameter sends the generated click id to the partner.">
              <textarea value={brandForm.parameter_mapping} onChange={(event) => updateBrand('parameter_mapping', event.target.value)} rows={3} />
            </Field>
            <button type="button" onClick={submitBrand} disabled={busy}><Plus size={16} /> Save brand</button>
          </div>
        </div>

        <div className="admin-affiliates-panel">
          <h2>Offer</h2>
          <p className="admin-affiliates-panel__intro">The deal terms attached to a brand. Affiliates see this name next to their tracking link.</p>
          <div className="admin-affiliates-output-tags">
            <span>Displayed: offer name</span>
            <span>Reported: CPA/rev share</span>
          </div>
          <div className="admin-affiliates-form">
            <FormSelect label="Brand" help="Which partner owns this offer. Public /offers brands are imported automatically when saved." value={offerForm.brand_id} onChange={(value) => updateOffer('brand_id', value)}>
              <option value="">Choose brand</option>
              <BrandOptions brands={brands} publicBrands={importablePublicBrands} />
            </FormSelect>
            <FormInput label="Name" help="Short internal/display name shown beside affiliate links." value={offerForm.name} onChange={(value) => updateOffer('name', value)} />
            <FormInput label="Slug" help="Unique offer identifier inside this brand." value={offerForm.slug} onChange={(value) => updateOffer('slug', value)} />
            <FormInput label="Title" help="Optional longer title for reporting and future public display." value={offerForm.title} onChange={(value) => updateOffer('title', value)} />
            <FormSelect label="Type" help="Commercial model used when reading partner stats." value={offerForm.offer_type} onChange={(value) => updateOffer('offer_type', value)}>
              <option value="cpa">CPA</option>
              <option value="revenue_share">Rev share</option>
              <option value="hybrid">Hybrid</option>
              <option value="flat_fee">Flat fee</option>
            </FormSelect>
            <div className="admin-affiliates-form__split">
              <FormInput label="CPA" help="Expected CPA amount, entered in normal currency units." value={offerForm.cpa_amount} onChange={(value) => updateOffer('cpa_amount', value)} />
              <FormInput label="Rev share %" help="Expected revenue share percentage for this offer." value={offerForm.revenue_share_percentage} onChange={(value) => updateOffer('revenue_share_percentage', value)} />
            </div>
            <button type="button" onClick={submitOffer} disabled={busy}><Plus size={16} /> Save offer</button>
          </div>
        </div>

        <div className="admin-affiliates-panel admin-affiliates-panel--wide">
          <h2>Tracking links</h2>
          <p className="admin-affiliates-panel__intro">This is where the public affiliate URL is created. The generated tracking URL is what the affiliate copies and shares.</p>
          <div className="admin-affiliates-output-tags">
            <span>Creates: /go/brand/code</span>
            <span>Displayed: affiliate dashboard</span>
            <span>Tracks: first-party clicks</span>
          </div>
          <div className="admin-affiliates-form admin-affiliates-form--grid">
            <FormSelect label="Affiliate user" help="Who owns this link. This user sees it on /affiliate." value={linkForm.affiliate_user_id} onChange={(value) => updateLink('affiliate_user_id', value)}>
              <option value="">Choose user</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.displayName || user.email}</option>)}
            </FormSelect>
            <FormSelect label="Brand" help="The brand slug becomes the first part of the public tracking URL. Public /offers brands are imported automatically when saved." value={linkForm.brand_id} onChange={(value) => updateLink('brand_id', value)}>
              <option value="">Choose brand</option>
              <BrandOptions brands={brands} publicBrands={importablePublicBrands} />
            </FormSelect>
            <FormSelect label="Offer" help="Optional commercial offer attached to this link. Shown beside the link in dashboards." value={linkForm.offer_id} onChange={(value) => updateLink('offer_id', value)}>
              <option value="">Default offer</option>
              {offers.filter((offer) => !linkForm.brand_id || offer.brandId === linkForm.brand_id).map((offer) => <option key={offer.id} value={offer.id}>{offer.name}</option>)}
            </FormSelect>
            <FormInput label="Short code" help="Second part of the public URL. Leave empty to generate one automatically." value={linkForm.short_code} onChange={(value) => updateLink('short_code', value)} placeholder="optional" />
            <FormInput label="Campaign" help="Optional campaign label appended to partner URL using the brand parameter mapping." value={linkForm.campaign_name} onChange={(value) => updateLink('campaign_name', value)} />
            <FormInput label="Source" help="Traffic source label, such as twitch, youtube, website, discord, or other." value={linkForm.source_name} onChange={(value) => updateLink('source_name', value)} />
            <Field label="Destination URL" help="The final partner URL visitors are redirected to. It must start with https:// or http://.">
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
                <span title="First-party human clicks tracked before redirect.">{link.clickTotals?.humanClicks || 0} clicks</span>
                <button type="button" title="Copy the public tracking URL for the affiliate." onClick={() => copyText(link.trackingUrl)}><Copy size={15} /> Copy</button>
              </article>
            ))}
          </div>
        </div>

        <div className="admin-affiliates-panel">
          <h2>Manual partner stats</h2>
          <p className="admin-affiliates-panel__intro">Use this when a partner sends numbers manually. These values appear as partner-reported results beside Streamers Center tracked clicks.</p>
          <div className="admin-affiliates-output-tags">
            <span>Displayed: affiliate dashboard</span>
            <span>Source: partner report</span>
          </div>
          <div className="admin-affiliates-form">
            <FormSelect label="Affiliate user" help="The affiliate this partner report belongs to." value={statsForm.affiliate_user_id} onChange={(value) => updateStats('affiliate_user_id', value)}>
              <option value="">Choose user</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.displayName || user.email}</option>)}
            </FormSelect>
            <FormSelect label="Brand" help="Partner/casino that supplied this report. Public /offers brands are imported automatically when saved." value={statsForm.brand_id} onChange={(value) => updateStats('brand_id', value)}>
              <option value="">Choose brand</option>
              <BrandOptions brands={brands} publicBrands={importablePublicBrands} />
            </FormSelect>
            <FormSelect label="Tracking link" help="Optional. Choose a link when the partner report can be tied to a specific tracking URL." value={statsForm.tracking_link_id} onChange={(value) => updateStats('tracking_link_id', value)}>
              <option value="">No link</option>
              {links.filter((link) => !statsForm.affiliate_user_id || link.affiliateUserId === statsForm.affiliate_user_id).map((link) => <option key={link.id} value={link.id}>{link.brandName} · {link.shortCode}</option>)}
            </FormSelect>
            <div className="admin-affiliates-form__split">
              <FormInput label="Start" help="First date covered by the partner report." type="date" value={statsForm.reporting_period_start} onChange={(value) => updateStats('reporting_period_start', value)} />
              <FormInput label="End" help="Last date covered by the partner report." type="date" value={statsForm.reporting_period_end} onChange={(value) => updateStats('reporting_period_end', value)} />
            </div>
            <div className="admin-affiliates-form__split">
              <FormInput label="Partner clicks" help="Clicks reported by the partner. This can differ from Streamers Center tracked clicks." value={statsForm.partner_clicks} onChange={(value) => updateStats('partner_clicks', value)} />
              <FormInput label="Registrations" help="Signups reported by the partner." value={statsForm.registrations} onChange={(value) => updateStats('registrations', value)} />
              <FormInput label="FTDs" help="First-time deposits reported by the partner." value={statsForm.ftds} onChange={(value) => updateStats('ftds', value)} />
            </div>
            <div className="admin-affiliates-form__split">
              <FormInput label="Deposits" help="Total deposit amount in normal currency units." value={statsForm.deposit_amount} onChange={(value) => updateStats('deposit_amount', value)} />
              <FormInput label="CPA" help="CPA commission amount in normal currency units." value={statsForm.cpa_commission} onChange={(value) => updateStats('cpa_commission', value)} />
              <FormInput label="Rev share" help="Revenue-share commission amount in normal currency units." value={statsForm.revenue_share_commission} onChange={(value) => updateStats('revenue_share_commission', value)} />
            </div>
            <button type="button" onClick={submitStats} disabled={busy}><Plus size={16} /> Add stats</button>
          </div>
        </div>

        <div className="admin-affiliates-panel">
          <h2>CSV import</h2>
          <p className="admin-affiliates-panel__intro">Paste a partner CSV to preview matching before import. Rows can match by short code, tracking link id, or affiliate email.</p>
          <div className="admin-affiliates-output-tags">
            <span>Preview first</span>
            <span>Imports partner stats</span>
          </div>
          <div className="admin-affiliates-form">
            <FormSelect label="Brand" help="The partner/casino this CSV came from. Public /offers brands are imported automatically when the CSV is committed." value={csvForm.brandId} onChange={(value) => updateCsv('brandId', value)}>
              <option value="">Choose brand</option>
              <BrandOptions brands={brands} publicBrands={importablePublicBrands} />
            </FormSelect>
            <FormInput label="Filename" help="Reference name stored with the import audit." value={csvForm.filename} onChange={(value) => updateCsv('filename', value)} />
            <Field label="CSV content" help="Paste the full CSV. Use Preview to inspect parsed rows before Import.">
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
