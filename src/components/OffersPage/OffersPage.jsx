import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeEuro,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Flame,
  GitCompareArrows,
  Globe2,
  LockKeyhole,
  MonitorPlay,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import trackOfferClick from '../../utils/trackOfferClick';
import './OffersPage.css';

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All Deals' },
  { id: 'casino', label: 'Casino' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'streaming_tools', label: 'Streaming Tools' },
  { id: 'creator_services', label: 'Creator Services' },
];

const DEAL_MODELS = ['CPA', 'Revenue Share', 'Hybrid', 'Sponsorship', 'Affiliate', 'Fixed Fee'];
const PLATFORM_OPTIONS = ['Twitch', 'Kick', 'YouTube', 'TikTok', 'Website', 'Social Media'];
const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'highest_cpa', label: 'Highest CPA' },
  { value: 'highest_revshare', label: 'Highest Revenue Share' },
  { value: 'recently_updated', label: 'Recently Updated' },
  { value: 'alphabetical', label: 'Alphabetical' },
];

const EMPTY_FILTERS = {
  search: '',
  geo: '',
  dealModel: '',
  platform: '',
  category: '',
  verifiedOnly: false,
  exclusiveOnly: false,
  openOnly: false,
};

const SAVED_STORAGE_KEY = 'streamerscenter:savedPartnerships';

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    } catch {
      return trimmed.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
    }
    return trimmed.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(amount, currency = 'EUR') {
  if (amount === null || amount === undefined || amount === '') return '';
  const parsed = parseNumber(amount);
  if (parsed === null) return String(amount);
  return `${currency || 'EUR'} ${parsed.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function normalizeCategory(value) {
  const normalized = String(value || 'casino').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (CATEGORY_OPTIONS.some((category) => category.id === normalized)) return normalized;
  return 'casino';
}

function normalizeDealModel(value) {
  if (!value) return 'Affiliate';
  const match = DEAL_MODELS.find((model) => model.toLowerCase() === String(value).trim().toLowerCase());
  return match || String(value).trim();
}

function getDealWeight(model) {
  const normalized = String(model || '').toLowerCase();
  if (normalized.includes('hybrid')) return 5;
  if (normalized.includes('cpa')) return 4;
  if (normalized.includes('revenue')) return 3;
  if (normalized.includes('sponsor') || normalized.includes('fixed')) return 2;
  return 1;
}

function buildMainTerms(raw) {
  const cpa = parseNumber(raw.cpa_amount);
  const revShare = parseNumber(raw.revenue_share_percent);
  const fixedFee = parseNumber(raw.fixed_fee_amount);
  const currency = raw.cpa_currency || raw.fixed_fee_currency || 'EUR';
  const model = normalizeDealModel(raw.deal_model || raw.landing_model);

  if (cpa && revShare) return `${formatMoney(cpa, currency)} CPA + ${revShare}% RevShare`;
  if (cpa) return `${formatMoney(cpa, currency)} CPA`;
  if (revShare) return `${revShare}% Revenue Share`;
  if (fixedFee) return `${formatMoney(fixedFee, raw.fixed_fee_currency || currency)} Fixed Sponsorship`;
  if (raw.hybrid_terms) return raw.hybrid_terms;
  if (raw.landing_model) return raw.landing_model;
  if (raw.welcome_bonus) return raw.welcome_bonus;
  if (raw.cashback) return `${raw.cashback} Cashback`;
  if (raw.bonus_value) return `${raw.bonus_value} Player Promo`;
  if (model === 'Hybrid') return 'Custom Hybrid Deal';
  return model;
}

function getImage(offer) {
  return offer.cover_image_url || offer.list_image_url || offer.image_url || '';
}

function getLogo(offer) {
  return offer.partner_logo_url || offer.image_url || offer.list_image_url || '';
}

function deriveBadges(raw) {
  const badgeText = String(raw.badge || '').toLowerCase();
  const badgeClass = String(raw.badge_class || '').toLowerCase();
  return {
    featured: Boolean(raw.is_featured || badgeClass.includes('featured') || badgeText.includes('featured')),
    exclusive: Boolean(raw.is_exclusive || badgeClass.includes('exclusive') || badgeText.includes('exclusive')),
    new: Boolean(raw.is_new || badgeClass.includes('new') || badgeText.includes('new')),
    hot: Boolean(raw.is_hot || badgeClass.includes('hot') || badgeText.includes('hot')),
  };
}

function normalizeOffer(raw) {
  const badges = deriveBadges(raw);
  const supportedGeos = parseList(raw.supported_geos);
  const supportedPlatforms = parseList(raw.supported_platforms);
  const paymentMethods = parseList(raw.payment_methods);
  const landingBadges = parseList(raw.landing_badges);
  const category = normalizeCategory(raw.partnership_category || raw.category);
  const dealModel = normalizeDealModel(raw.deal_model || raw.landing_model);
  const applicationStatus = String(raw.application_status || 'open').toLowerCase();

  return {
    id: raw.id,
    slug: raw.slug || raw.id,
    partnerName: raw.casino_name || 'Unnamed partner',
    title: raw.title || raw.short_description || '',
    shortDescription:
      raw.short_description ||
      raw.title ||
      raw.details ||
      'Partnership details are being prepared by the Streamers Center team.',
    coverImage: getImage(raw),
    logo: getLogo(raw),
    category,
    categoryLabel: CATEGORY_OPTIONS.find((item) => item.id === category)?.label || 'Casino',
    dealModel,
    mainTerms: buildMainTerms(raw),
    cpaAmount: parseNumber(raw.cpa_amount),
    cpaCurrency: raw.cpa_currency || 'EUR',
    revenueSharePercent: parseNumber(raw.revenue_share_percent),
    fixedFeeAmount: parseNumber(raw.fixed_fee_amount),
    fixedFeeCurrency: raw.fixed_fee_currency || 'EUR',
    hybridTerms: raw.hybrid_terms || '',
    minimumDeposit: parseNumber(raw.minimum_deposit) ?? raw.min_deposit ?? '',
    minimumDepositCurrency: raw.minimum_deposit_currency || 'EUR',
    minFtdRequirement: raw.min_ftd_requirement || '',
    cookieDurationDays: raw.cookie_duration_days || '',
    paymentFrequency: raw.payment_frequency || raw.withdrawal_time || '',
    paymentMethods,
    playerPromotion: raw.player_promotion || raw.welcome_bonus || raw.bonus_value || '',
    streamerBalanceAvailable: Boolean(raw.streamer_balance_available),
    directManager: Boolean(raw.has_direct_manager),
    trafficRequirements: raw.traffic_requirements || '',
    restrictions: raw.restrictions || raw.details || '',
    promoCode: raw.promo_code || '',
    license: raw.license || raw.licence || raw.casino_license || raw.gaming_license || raw.regulator || raw.licensed_by || '',
    termsUrl: raw.terms_url || raw.bonus_link || '',
    applicationUrl: raw.application_url || raw.bonus_link || '',
    applicationStatus,
    applicationsCloseAt: raw.applications_close_at || '',
    supportedGeos: supportedGeos.length ? supportedGeos : ['PT', 'EU'],
    supportedPlatforms: supportedPlatforms.length ? supportedPlatforms : ['Twitch', 'Kick', 'YouTube'],
    visibility: raw.visibility || (raw.is_premium ? 'premium' : 'public'),
    isActive: raw.is_active !== false,
    isVerified: raw.is_verified !== false,
    isFeatured: badges.featured,
    isExclusive: badges.exclusive,
    isNew: badges.new,
    isHot: badges.hot,
    displayOrder: raw.display_order ?? 999,
    lastUpdatedAt: raw.last_updated_at || raw.updated_at || raw.created_at || '',
    createdAt: raw.created_at || '',
    rawBadge: raw.badge || '',
    highlights: landingBadges.length
      ? landingBadges
      : [
          raw.cookie_duration_days ? `${raw.cookie_duration_days}-day cookie` : '',
          raw.payment_frequency || raw.withdrawal_time || '',
          raw.has_direct_manager ? 'Direct account manager' : '',
          raw.streamer_balance_available ? 'Streamer balance available' : '',
        ].filter(Boolean),
    archivedAt: raw.archived_at || null,
  };
}

function isClosed(offer) {
  if (offer.applicationStatus === 'closed') return true;
  if (!offer.applicationsCloseAt) return false;
  const closing = new Date(offer.applicationsCloseAt);
  if (Number.isNaN(closing.getTime())) return false;
  return closing < new Date();
}

function canViewOffer(offer, user, adminState) {
  if (!offer.isActive || offer.archivedAt || offer.visibility === 'hidden') return false;
  if (offer.visibility === 'admin') return adminState.isAdmin;
  if (offer.visibility === 'premium') return adminState.isAdmin || adminState.isPremium;
  if (offer.visibility === 'registered') return Boolean(user) || adminState.isAdmin;
  return true;
}

function categoryMatches(offer, activeCategory, filterCategory) {
  const selected = filterCategory || activeCategory;
  return selected === 'all' || !selected || offer.category === selected;
}

function getApplicationsLabel(offer) {
  if (isClosed(offer)) return 'Applications Closed';
  if (offer.applicationStatus === 'limited') return 'Limited Availability';
  if (offer.applicationStatus === 'draft') return 'Draft';
  return 'Applications Open';
}

function getPrimaryDetailItems(offer) {
  return [
    offer.cookieDurationDays ? `${offer.cookieDurationDays}-day cookie` : '',
    offer.directManager ? 'Direct account manager' : '',
    offer.streamerBalanceAvailable ? 'Streamer balance available' : '',
    offer.paymentFrequency ? `${offer.paymentFrequency} payments` : '',
    offer.minFtdRequirement ? `${offer.minFtdRequirement} min. FTD` : '',
  ].filter(Boolean).slice(0, 3);
}

function findFreeSpinsLabel(offer) {
  const text = `${offer.playerPromotion || ''} ${offer.mainTerms || ''} ${offer.shortDescription || ''}`;
  const match = text.match(/(?:up to\s*)?\d+[\s-]*(?:free\s*)?spins?/i);
  if (!match) return '-';
  return match[0].replace(/\s+/g, ' ');
}

function getDepositLabel(offer) {
  if (offer.minimumDeposit === '' || offer.minimumDeposit === null || offer.minimumDeposit === undefined) return '-';
  if (typeof offer.minimumDeposit === 'number') return formatMoney(offer.minimumDeposit, offer.minimumDepositCurrency);
  return String(offer.minimumDeposit);
}

function getCardBonusLabel(offer) {
  const percentage = `${offer.playerPromotion || ''} ${offer.mainTerms || ''}`.match(/[+]?\d+%/);
  if (percentage) return percentage[0];
  return offer.mainTerms || offer.playerPromotion || '-';
}

function getOfferStatItems(offer) {
  return [
    { label: 'Min deposit', value: getDepositLabel(offer), icon: BadgeEuro },
    { label: 'Bonus', value: getCardBonusLabel(offer), icon: Sparkles },
    { label: 'Free spins', value: findFreeSpinsLabel(offer), icon: Star },
    { label: 'Withdraw', value: offer.paymentFrequency || '-', icon: CalendarClock },
    { label: 'License', value: offer.license || 'Not listed', icon: ShieldCheck },
    { label: 'Code', value: offer.promoCode || '-', icon: Bookmark },
  ];
}

function openExternal(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function OfferImage({ offer, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!offer.coverImage || failed) {
    return (
      <div className={`offer-image-fallback ${className}`} aria-label={`${offer.partnerName} visual fallback`}>
        <Sparkles size={28} aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={offer.coverImage}
      alt={`${offer.partnerName} partnership cover`}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function PartnerLogo({ offer }) {
  const [failed, setFailed] = useState(false);
  if (!offer.logo || failed) {
    return (
      <div className="partner-logo-fallback" aria-hidden="true">
        {offer.partnerName.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  return <img src={offer.logo} alt={`${offer.partnerName} logo`} loading="lazy" onError={() => setFailed(true)} />;
}

function OfferBadges({ offer, compact = false }) {
  const badges = [
    offer.isVerified && { label: 'Verified Partner', className: 'verified', icon: ShieldCheck },
    offer.isFeatured && { label: 'Featured', className: 'featured', icon: Star },
    offer.isExclusive && { label: 'Exclusive', className: 'exclusive', icon: Sparkles },
    offer.isNew && { label: 'New', className: 'new', icon: CheckCircle2 },
    offer.isHot && { label: 'Hot', className: 'hot', icon: Flame },
    !isClosed(offer) && { label: getApplicationsLabel(offer), className: offer.applicationStatus === 'limited' ? 'limited' : 'open', icon: CalendarClock },
    offer.directManager && { label: 'Direct Manager', className: 'manager', icon: Users },
  ].filter(Boolean);

  return (
    <div className={`offer-badges ${compact ? 'compact' : ''}`} aria-label="Partnership badges">
      {badges.map((badge) => {
        const Icon = badge.icon;
        return (
          <span key={`${offer.id}-${badge.label}`} className={`offer-badge ${badge.className}`}>
            <Icon size={compact ? 12 : 14} aria-hidden="true" />
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}

function OffersHero({ offers }) {
  const activeCount = offers.length;
  const exclusiveCount = offers.filter((offer) => offer.isExclusive).length;
  const verifiedCount = offers.filter((offer) => offer.isVerified).length;

  return (
    <header className="offers-hero">
      <div className="offers-hero-grid" aria-hidden="true" />
      <div className="offers-hero-glow hero-glow-cyan" aria-hidden="true" />
      <div className="offers-hero-glow hero-glow-purple" aria-hidden="true" />
      <div className="offers-hero-content">
        <div className="offers-kicker">Creator marketplace</div>
        <h1>Streamer Partnerships</h1>
        <p>Discover verified casino, gaming and creator deals available through Streamers Center.</p>
      </div>
      <dl className="offers-hero-stats" aria-label="Marketplace statistics">
        <div>
          <dt>{activeCount}</dt>
          <dd>Active partnerships</dd>
        </div>
        <div>
          <dt>{exclusiveCount}</dt>
          <dd>Exclusive deals</dd>
        </div>
        <div>
          <dt>{verifiedCount}</dt>
          <dd>Verified partners</dd>
        </div>
      </dl>
    </header>
  );
}

function OfferCategoryTabs({ activeCategory, onChange, counts }) {
  const tabRefs = useRef([]);

  const handleKeyDown = (event, index) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % CATEGORY_OPTIONS.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + CATEGORY_OPTIONS.length) % CATEGORY_OPTIONS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = CATEGORY_OPTIONS.length - 1;
    const nextCategory = CATEGORY_OPTIONS[nextIndex];
    onChange(nextCategory.id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <nav className="offer-category-tabs" role="tablist" aria-label="Partnership categories">
      {CATEGORY_OPTIONS.map((category, index) => {
        const active = activeCategory === category.id;
        return (
          <button
            key={category.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={active ? 'active' : ''}
            onClick={() => onChange(category.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span>{category.label}</span>
            <strong>{counts[category.id] || 0}</strong>
          </button>
        );
      })}
    </nav>
  );
}

function FilterFields({ filters, onFilterChange, sort, onSortChange, geoOptions, idPrefix = 'offers' }) {
  return (
    <>
      <label className="offer-filter-field search-field" htmlFor={`${idPrefix}-search`}>
        <span>Search</span>
        <div className="offer-search-input">
          <Search size={16} aria-hidden="true" />
          <input
            id={`${idPrefix}-search`}
            type="search"
            value={filters.search}
            onChange={(event) => onFilterChange('search', event.target.value)}
            placeholder="Partner name"
          />
        </div>
      </label>

      <label className="offer-filter-field" htmlFor={`${idPrefix}-geo`}>
        <span>Country or GEO</span>
        <select id={`${idPrefix}-geo`} value={filters.geo} onChange={(event) => onFilterChange('geo', event.target.value)}>
          <option value="">Any GEO</option>
          {geoOptions.map((geo) => (
            <option value={geo} key={geo}>{geo}</option>
          ))}
        </select>
      </label>

      <label className="offer-filter-field" htmlFor={`${idPrefix}-deal-model`}>
        <span>Deal model</span>
        <select id={`${idPrefix}-deal-model`} value={filters.dealModel} onChange={(event) => onFilterChange('dealModel', event.target.value)}>
          <option value="">Any model</option>
          {DEAL_MODELS.map((model) => (
            <option value={model} key={model}>{model}</option>
          ))}
        </select>
      </label>

      <label className="offer-filter-field" htmlFor={`${idPrefix}-platform`}>
        <span>Platform</span>
        <select id={`${idPrefix}-platform`} value={filters.platform} onChange={(event) => onFilterChange('platform', event.target.value)}>
          <option value="">Any platform</option>
          {PLATFORM_OPTIONS.map((platform) => (
            <option value={platform} key={platform}>{platform}</option>
          ))}
        </select>
      </label>

      <label className="offer-filter-field" htmlFor={`${idPrefix}-category`}>
        <span>Category</span>
        <select id={`${idPrefix}-category`} value={filters.category} onChange={(event) => onFilterChange('category', event.target.value)}>
          <option value="">Any category</option>
          {CATEGORY_OPTIONS.filter((category) => category.id !== 'all').map((category) => (
            <option value={category.id} key={category.id}>{category.label}</option>
          ))}
        </select>
      </label>

      <label className="offer-filter-field" htmlFor={`${idPrefix}-sort`}>
        <span>Sort</span>
        <select id={`${idPrefix}-sort`} value={sort} onChange={(event) => onSortChange(event.target.value)}>
          {SORT_OPTIONS.map((option) => (
            <option value={option.value} key={option.value}>{option.label}</option>
          ))}
        </select>
      </label>

      <div className="offer-filter-toggles" aria-label="Quick filters">
        <label>
          <input type="checkbox" checked={filters.verifiedOnly} onChange={(event) => onFilterChange('verifiedOnly', event.target.checked)} />
          Verified only
        </label>
        <label>
          <input type="checkbox" checked={filters.exclusiveOnly} onChange={(event) => onFilterChange('exclusiveOnly', event.target.checked)} />
          Exclusive only
        </label>
        <label>
          <input type="checkbox" checked={filters.openOnly} onChange={(event) => onFilterChange('openOnly', event.target.checked)} />
          Applications open
        </label>
      </div>
    </>
  );
}

function OfferFilterBar({
  filters,
  onFilterChange,
  sort,
  onSortChange,
  onClear,
  activeChips,
  geoOptions,
  mobileOpen,
  setMobileOpen,
}) {
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, setMobileOpen]);

  return (
    <section className="offer-filter-shell" aria-label="Search and filters">
      <div className="offer-filter-toolbar">
        <FilterFields
          filters={filters}
          onFilterChange={onFilterChange}
          sort={sort}
          onSortChange={onSortChange}
          geoOptions={geoOptions}
        />
      </div>

      <button type="button" className="mobile-filter-button" onClick={() => setMobileOpen(true)}>
        <SlidersHorizontal size={18} aria-hidden="true" />
        Filters
      </button>

      {activeChips.length > 0 && (
        <div className="active-filter-row" aria-label="Active filters">
          {activeChips.map((chip) => (
            <button key={chip.key} type="button" className="active-filter-chip" onClick={chip.onRemove}>
              {chip.label}
              <X size={13} aria-hidden="true" />
            </button>
          ))}
          <button type="button" className="clear-filter-button" onClick={onClear}>
            Clear filters
          </button>
        </div>
      )}

      {mobileOpen && (
        <div className="mobile-filter-backdrop" role="presentation" onMouseDown={() => setMobileOpen(false)}>
          <div
            className="mobile-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Partnership filters"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mobile-filter-header">
              <h2>Filters</h2>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close filters">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="mobile-filter-fields">
              <FilterFields
                filters={filters}
                onFilterChange={onFilterChange}
                sort={sort}
                onSortChange={onSortChange}
                geoOptions={geoOptions}
                idPrefix="mobile-offers"
              />
            </div>
            <div className="mobile-filter-actions">
              <button type="button" className="secondary-action" onClick={onClear}>Clear filters</button>
              <button type="button" className="primary-action" onClick={() => setMobileOpen(false)}>Show deals</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function OfferTerms({ offer }) {
  return (
    <div className="offer-terms-block">
      <span className="offer-terms-label">{offer.dealModel}</span>
      <strong>{offer.mainTerms}</strong>
    </div>
  );
}

function ApplyButton({ offer, application, onApply, className = '', isAuthenticated = true }) {
  const closed = isClosed(offer);
  const submitted = Boolean(application);
  let label = 'Apply for Deal';
  if (closed) label = 'Applications Closed';
  else if (!isAuthenticated) label = 'Sign in to Apply';
  else if (submitted) label = application.status ? `Application ${application.status}` : 'Application Submitted';

  return (
    <button
      type="button"
      className={`apply-button ${className}`}
      onClick={() => onApply(offer)}
      disabled={closed || submitted}
      aria-disabled={closed || submitted}
    >
      {label}
      {!closed && !submitted && offer.applicationUrl && <ExternalLink size={15} aria-hidden="true" />}
    </button>
  );
}

function FeaturedOffer({ offer, applications, onView, onApply, isAuthenticated }) {
  if (!offer) return null;

  return (
    <section className="featured-offer" aria-labelledby="featured-offer-heading">
      <div className="featured-offer-media">
        <OfferImage offer={offer} />
        <div className="featured-offer-logo">
          <PartnerLogo offer={offer} />
        </div>
      </div>
      <div className="featured-offer-content">
        <div className="featured-eyebrow">Featured partnership</div>
        <div className="featured-title-row">
          <div>
            <h2 id="featured-offer-heading">{offer.partnerName}</h2>
            <OfferBadges offer={offer} compact />
          </div>
          <OfferTerms offer={offer} />
        </div>
        <p>{offer.shortDescription}</p>
        <div className="featured-meta">
          <span><Globe2 size={15} aria-hidden="true" /> {offer.supportedGeos.slice(0, 4).join(' · ')}</span>
          <span><MonitorPlay size={15} aria-hidden="true" /> {offer.supportedPlatforms.slice(0, 4).join(' · ')}</span>
          <span><CalendarClock size={15} aria-hidden="true" /> {getApplicationsLabel(offer)}</span>
        </div>
        <div className="featured-actions">
          <button type="button" className="primary-action" onClick={() => onView(offer)}>
            View Partnership
            <ChevronRight size={16} aria-hidden="true" />
          </button>
          <ApplyButton offer={offer} application={applications[offer.id]} onApply={onApply} isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </section>
  );
}

function OfferCard({
  offer,
  application,
  isSaved,
  isCompared,
  compareDisabled,
  onView,
  onApply,
  onToggleSave,
  onToggleCompare,
  isAuthenticated,
}) {
  const detailItems = getPrimaryDetailItems(offer);
  const statItems = getOfferStatItems(offer);
  const heroSubtitle = offer.playerPromotion || offer.shortDescription;

  return (
    <article className="offer-card">
      <div className="offer-card-media">
        <OfferImage offer={offer} />
        <OfferBadges offer={offer} compact />
        <div className="offer-card-logo offer-card-logo--media">
          <PartnerLogo offer={offer} />
        </div>
        <div className="offer-card-hero-copy">
          <span>Claim the</span>
          <strong>{offer.partnerName} boost</strong>
          <b>{offer.mainTerms}</b>
          {heroSubtitle && <small>{heroSubtitle}</small>}
          <div className="offer-card-hero-actions">
            <ApplyButton offer={offer} application={application} onApply={onApply} className="offer-card-claim" isAuthenticated={isAuthenticated} />
            <button type="button" className="offer-card-more" onClick={() => onView(offer)}>
              More info
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="offer-card-body">
        <div className="offer-card-head">
          <div className="offer-card-logo">
            <PartnerLogo offer={offer} />
          </div>
          <div>
            <p className="offer-card-category">{offer.categoryLabel}</p>
            <h2>{offer.partnerName}</h2>
          </div>
          {offer.isVerified && <CheckCircle2 className="offer-verified-icon" size={18} aria-label="Verified partner" />}
        </div>

        <div className="offer-stat-grid" aria-label={`${offer.partnerName} partnership details`}>
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={`${offer.id}-${item.label}`} className="offer-stat-tile">
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            );
          })}
        </div>

        <div className="offer-chip-row">
          {offer.supportedGeos.slice(0, 2).map((geo) => <span key={`${offer.id}-geo-${geo}`}>{geo}</span>)}
          {offer.supportedPlatforms.slice(0, 3).map((platform) => <span key={`${offer.id}-platform-${platform}`}>{platform}</span>)}
          {detailItems.slice(0, 1).map((item) => <span key={`${offer.id}-${item}`}>{item}</span>)}
        </div>

        <div className="offer-card-footer">
          <span>{offer.lastUpdatedAt ? `Updated ${formatDate(offer.lastUpdatedAt)}` : getApplicationsLabel(offer)}</span>
          {offer.applicationsCloseAt && !isClosed(offer) && <span>Closes {formatDate(offer.applicationsCloseAt)}</span>}
        </div>
      </div>

      <div className="offer-card-actions">
        <div className="offer-utility-actions">
          <button type="button" onClick={() => onToggleSave(offer.id)} aria-label={isSaved ? `Remove ${offer.partnerName} from saved partnerships` : `Save ${offer.partnerName}`}>
            {isSaved ? <BookmarkCheck size={17} aria-hidden="true" /> : <Bookmark size={17} aria-hidden="true" />}
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => onToggleCompare(offer.id)}
            disabled={compareDisabled && !isCompared}
            aria-label={isCompared ? `Remove ${offer.partnerName} from comparison` : `Compare ${offer.partnerName}`}
          >
            <GitCompareArrows size={17} aria-hidden="true" />
            {isCompared ? 'Comparing' : 'Compare'}
          </button>
        </div>
      </div>
    </article>
  );
}

function OfferGrid({ offers, applications, savedIds, compareIds, onView, onApply, onToggleSave, onToggleCompare, isAuthenticated }) {
  if (!offers.length) {
    return (
      <div className="offer-empty-state">
        <Search size={34} aria-hidden="true" />
        <h2>No partnerships match your filters</h2>
        <p>Try widening the GEO, platform or deal model filters to see more opportunities.</p>
      </div>
    );
  }

  return (
    <div className="offer-grid" aria-live="polite">
      {offers.map((offer) => (
        <OfferCard
          key={offer.id}
          offer={offer}
          application={applications[offer.id]}
          isSaved={savedIds.includes(offer.id)}
          isCompared={compareIds.includes(offer.id)}
          compareDisabled={compareIds.length >= 3}
          onView={onView}
          onApply={onApply}
          onToggleSave={onToggleSave}
          onToggleCompare={onToggleCompare}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}

function OfferCardSkeleton() {
  return (
    <article className="offer-card skeleton-card" aria-hidden="true">
      <div className="skeleton-block skeleton-media" />
      <div className="offer-card-body">
        <div className="skeleton-line wide" />
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
        <div className="skeleton-chip-row">
          <span />
          <span />
          <span />
        </div>
      </div>
    </article>
  );
}

function OffersLoadingState() {
  return (
    <div className="offers-loading-state" aria-label="Loading partnerships">
      {Array.from({ length: 6 }).map((_, index) => <OfferCardSkeleton key={index} />)}
    </div>
  );
}

function OffersErrorState({ onRetry }) {
  return (
    <div className="offer-empty-state error-state" role="alert">
      <AlertTriangle size={34} aria-hidden="true" />
      <h2>Partnerships could not be loaded</h2>
      <p>We could not retrieve the marketplace right now. Please try again shortly.</p>
      <button type="button" className="primary-action" onClick={onRetry}>Retry</button>
    </div>
  );
}

function MarketplaceEmptyState() {
  return (
    <div className="offer-empty-state">
      <Sparkles size={34} aria-hidden="true" />
      <h2>No active partnerships available</h2>
      <p>The Streamers Center team is preparing new opportunities. Enabled admin records will appear here automatically.</p>
    </div>
  );
}

function DetailSection({ title, icon: Icon, children }) {
  if (!children) return null;
  return (
    <section className="detail-section">
      <h3>{Icon && <Icon size={16} aria-hidden="true" />} {title}</h3>
      {children}
    </section>
  );
}

function OfferDetailPanel({ offer, application, onClose, onApply, isSaved, onToggleSave, isAuthenticated }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!offer) return undefined;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.classList.add('offer-panel-open');
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('offer-panel-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [offer, onClose]);

  if (!offer) return null;

  const requirements = [
    offer.trafficRequirements,
    offer.minFtdRequirement ? `Minimum FTD requirement: ${offer.minFtdRequirement}` : '',
    offer.minimumDeposit ? `Minimum deposit: ${typeof offer.minimumDeposit === 'number' ? formatMoney(offer.minimumDeposit, offer.minimumDepositCurrency) : offer.minimumDeposit}` : '',
  ].filter(Boolean);

  return (
    <div className="offer-detail-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="offer-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="offer-detail-hero">
          <OfferImage offer={offer} />
          <button ref={closeButtonRef} type="button" className="offer-detail-close" onClick={onClose} aria-label="Close partnership details">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="offer-detail-content">
          <div className="offer-detail-title-row">
            <div className="offer-card-logo large">
              <PartnerLogo offer={offer} />
            </div>
            <div>
              <p className="offer-card-category">{offer.categoryLabel}</p>
              <h2 id="offer-detail-title">{offer.partnerName}</h2>
            </div>
          </div>

          <OfferBadges offer={offer} />
          <p className="offer-detail-intro">{offer.shortDescription}</p>

          <div className="detail-main-terms">
            <OfferTerms offer={offer} />
            <span>{getApplicationsLabel(offer)}</span>
          </div>

          <DetailSection title="Partner Overview" icon={Sparkles}>
            <p>{offer.title || offer.shortDescription}</p>
          </DetailSection>

          <DetailSection title="Main Commercial Terms" icon={BadgeEuro}>
            <dl className="detail-grid">
              <div><dt>Deal model</dt><dd>{offer.dealModel}</dd></div>
              <div><dt>CPA</dt><dd>{offer.cpaAmount ? formatMoney(offer.cpaAmount, offer.cpaCurrency) : 'Not listed'}</dd></div>
              <div><dt>Revenue share</dt><dd>{offer.revenueSharePercent ? `${offer.revenueSharePercent}%` : 'Not listed'}</dd></div>
              <div><dt>Fixed fee</dt><dd>{offer.fixedFeeAmount ? formatMoney(offer.fixedFeeAmount, offer.fixedFeeCurrency) : 'Not listed'}</dd></div>
            </dl>
            {offer.hybridTerms && <p>{offer.hybridTerms}</p>}
          </DetailSection>

          <DetailSection title="Supported Traffic Sources" icon={MonitorPlay}>
            <div className="offer-chip-row detail-chip-row">
              {offer.supportedPlatforms.map((platform) => <span key={`${offer.id}-detail-platform-${platform}`}>{platform}</span>)}
            </div>
          </DetailSection>

          <DetailSection title="Supported GEOs" icon={Globe2}>
            <div className="offer-chip-row detail-chip-row">
              {offer.supportedGeos.map((geo) => <span key={`${offer.id}-detail-geo-${geo}`}>{geo}</span>)}
            </div>
          </DetailSection>

          {requirements.length > 0 && (
            <DetailSection title="Streamer Requirements" icon={Users}>
              <ul className="detail-list">{requirements.map((item) => <li key={item}>{item}</li>)}</ul>
            </DetailSection>
          )}

          <DetailSection title="Payment Information" icon={CalendarClock}>
            <dl className="detail-grid">
              <div><dt>Frequency</dt><dd>{offer.paymentFrequency || 'Not listed'}</dd></div>
              <div><dt>Cookie period</dt><dd>{offer.cookieDurationDays ? `${offer.cookieDurationDays} days` : 'Not listed'}</dd></div>
              <div><dt>Methods</dt><dd>{offer.paymentMethods.length ? offer.paymentMethods.join(', ') : 'Not listed'}</dd></div>
              <div><dt>Manager</dt><dd>{offer.directManager ? 'Available' : 'Not listed'}</dd></div>
            </dl>
          </DetailSection>

          {offer.playerPromotion && (
            <DetailSection title="Player Promotion" icon={Star}>
              <p>{offer.playerPromotion}</p>
            </DetailSection>
          )}

          {offer.restrictions && (
            <DetailSection title="Restrictions" icon={LockKeyhole}>
              <p>{offer.restrictions}</p>
            </DetailSection>
          )}

          <DetailSection title="Application Process" icon={CheckCircle2}>
            <p>
              {offer.applicationUrl
                ? 'Applications continue through the partner application link. Streamers Center tracks the outgoing request and keeps the marketplace status visible.'
                : 'Submit an internal application request and the Streamers Center team will review your account.'}
            </p>
            {offer.applicationsCloseAt && <p>Applications close on {formatDate(offer.applicationsCloseAt)}.</p>}
          </DetailSection>

          <div className="offer-detail-footer">
            <span>{offer.lastUpdatedAt ? `Last updated ${formatDate(offer.lastUpdatedAt)}` : 'Last updated date not listed'}</span>
            {offer.termsUrl && (
              <button type="button" className="text-link-button" onClick={() => openExternal(offer.termsUrl)}>
                Terms and conditions
                <ExternalLink size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="offer-detail-actions">
          <button type="button" className="secondary-action" onClick={() => onToggleSave(offer.id)}>
            {isSaved ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
            {isSaved ? 'Saved' : 'Save partnership'}
          </button>
          <ApplyButton offer={offer} application={application} onApply={onApply} className="detail-apply" isAuthenticated={isAuthenticated} />
        </div>
      </aside>
    </div>
  );
}

function OfferComparison({ compareOffers, onRemove }) {
  if (compareOffers.length < 2) return null;

  return (
    <section className="offer-comparison" aria-label="Partnership comparison">
      <div className="comparison-header">
        <div>
          <p>Compare partnerships</p>
          <h2>{compareOffers.length} selected</h2>
        </div>
        <span>Limit 3</span>
      </div>
      <div className="comparison-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Partner</th>
              {compareOffers.map((offer) => (
                <th key={`${offer.id}-compare-head`}>
                  {offer.partnerName}
                  <button type="button" onClick={() => onRemove(offer.id)} aria-label={`Remove ${offer.partnerName} from comparison`}>
                    <X size={14} aria-hidden="true" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr><th>Terms</th>{compareOffers.map((offer) => <td key={`${offer.id}-terms`}>{offer.mainTerms}</td>)}</tr>
            <tr><th>Deal model</th>{compareOffers.map((offer) => <td key={`${offer.id}-model`}>{offer.dealModel}</td>)}</tr>
            <tr><th>GEO</th>{compareOffers.map((offer) => <td key={`${offer.id}-geo`}>{offer.supportedGeos.join(', ')}</td>)}</tr>
            <tr><th>Platforms</th>{compareOffers.map((offer) => <td key={`${offer.id}-platforms`}>{offer.supportedPlatforms.join(', ')}</td>)}</tr>
            <tr><th>Payments</th>{compareOffers.map((offer) => <td key={`${offer.id}-payments`}>{offer.paymentFrequency || 'Not listed'}</td>)}</tr>
            <tr><th>Cookie</th>{compareOffers.map((offer) => <td key={`${offer.id}-cookie`}>{offer.cookieDurationDays ? `${offer.cookieDurationDays} days` : 'Not listed'}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function OffersPage() {
  const { user, signInWithTwitch } = useAuth();
  const { isAdmin, isPremium } = useAdmin();
  const [rawOffers, setRawOffers] = useState([]);
  const [applications, setApplications] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState('featured');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [savedIds, setSavedIds] = useState([]);
  const [compareIds, setCompareIds] = useState([]);
  const [notice, setNotice] = useState('');

  const adminState = useMemo(() => ({ isAdmin, isPremium }), [isAdmin, isPremium]);

  const loadOffers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: requestError } = await supabase
        .from('casino_offers')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (requestError) throw requestError;
      setRawOffers(data || []);
    } catch (requestError) {
      console.error('Error loading partnership offers:', requestError);
      setError('Partnerships could not be loaded.');
      setRawOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) setSavedIds(saved.map(String));
    } catch {
      setSavedIds([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    const loadApplications = async () => {
      if (!user) {
        setApplications({});
        return;
      }
      try {
        const { data, error: requestError } = await supabase
          .from('partnership_applications')
          .select('offer_id,status,created_at')
          .eq('user_id', user.id);
        if (requestError) throw requestError;
        const mapped = {};
        (data || []).forEach((application) => {
          mapped[application.offer_id] = application;
        });
        setApplications(mapped);
      } catch (requestError) {
        console.warn('Partnership applications unavailable:', requestError);
        setApplications({});
      }
    };
    loadApplications();
  }, [user]);

  const offers = useMemo(() => (
    rawOffers
      .map(normalizeOffer)
      .filter((offer) => canViewOffer(offer, user, adminState))
  ), [rawOffers, user, adminState]);

  const categoryCounts = useMemo(() => {
    const counts = { all: offers.length };
    CATEGORY_OPTIONS.forEach((category) => {
      if (category.id !== 'all') counts[category.id] = offers.filter((offer) => offer.category === category.id).length;
    });
    return counts;
  }, [offers]);

  const geoOptions = useMemo(() => {
    const geos = new Set();
    offers.forEach((offer) => offer.supportedGeos.forEach((geo) => geos.add(geo)));
    return Array.from(geos).sort((a, b) => a.localeCompare(b));
  }, [offers]);

  const sortedAndFilteredOffers = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const filtered = offers.filter((offer) => {
      if (!categoryMatches(offer, activeCategory, filters.category)) return false;
      if (search && !`${offer.partnerName} ${offer.shortDescription} ${offer.mainTerms}`.toLowerCase().includes(search)) return false;
      if (filters.geo && !offer.supportedGeos.some((geo) => geo.toLowerCase() === filters.geo.toLowerCase())) return false;
      if (filters.dealModel && offer.dealModel.toLowerCase() !== filters.dealModel.toLowerCase()) return false;
      if (filters.platform && !offer.supportedPlatforms.some((platform) => platform.toLowerCase() === filters.platform.toLowerCase())) return false;
      if (filters.verifiedOnly && !offer.isVerified) return false;
      if (filters.exclusiveOnly && !offer.isExclusive) return false;
      if (filters.openOnly && isClosed(offer)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'alphabetical') return a.partnerName.localeCompare(b.partnerName);
      if (sort === 'highest_cpa') return (b.cpaAmount || 0) - (a.cpaAmount || 0);
      if (sort === 'highest_revshare') return (b.revenueSharePercent || 0) - (a.revenueSharePercent || 0);
      if (sort === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sort === 'recently_updated') return new Date(b.lastUpdatedAt || 0) - new Date(a.lastUpdatedAt || 0);
      return (
        Number(b.isFeatured) - Number(a.isFeatured) ||
        getDealWeight(b.dealModel) - getDealWeight(a.dealModel) ||
        a.displayOrder - b.displayOrder ||
        a.partnerName.localeCompare(b.partnerName)
      );
    });
  }, [offers, activeCategory, filters, sort]);

  const featuredOffer = useMemo(() => (
    sortedAndFilteredOffers.find((offer) => offer.isFeatured) || null
  ), [sortedAndFilteredOffers]);

  const gridOffers = useMemo(() => (
    featuredOffer
      ? sortedAndFilteredOffers.filter((offer) => offer.id !== featuredOffer.id)
      : sortedAndFilteredOffers
  ), [sortedAndFilteredOffers, featuredOffer]);

  const compareOffers = useMemo(() => (
    compareIds.map((id) => offers.find((offer) => offer.id === id)).filter(Boolean)
  ), [compareIds, offers]);

  const activeChips = useMemo(() => {
    const chips = [];
    const addChip = (key, label, reset) => chips.push({ key, label, onRemove: reset });
    if (filters.search) addChip('search', `Search: ${filters.search}`, () => setFilters((prev) => ({ ...prev, search: '' })));
    if (filters.geo) addChip('geo', `GEO: ${filters.geo}`, () => setFilters((prev) => ({ ...prev, geo: '' })));
    if (filters.dealModel) addChip('deal', filters.dealModel, () => setFilters((prev) => ({ ...prev, dealModel: '' })));
    if (filters.platform) addChip('platform', filters.platform, () => setFilters((prev) => ({ ...prev, platform: '' })));
    if (filters.category) {
      const label = CATEGORY_OPTIONS.find((category) => category.id === filters.category)?.label || filters.category;
      addChip('category', label, () => setFilters((prev) => ({ ...prev, category: '' })));
    }
    if (filters.verifiedOnly) addChip('verified', 'Verified only', () => setFilters((prev) => ({ ...prev, verifiedOnly: false })));
    if (filters.exclusiveOnly) addChip('exclusive', 'Exclusive only', () => setFilters((prev) => ({ ...prev, exclusiveOnly: false })));
    if (filters.openOnly) addChip('open', 'Applications open', () => setFilters((prev) => ({ ...prev, openOnly: false })));
    return chips;
  }, [filters]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setActiveCategory('all');
  };

  const toggleSave = (offerId) => {
    setSavedIds((prev) => (prev.includes(offerId) ? prev.filter((id) => id !== offerId) : [...prev, offerId]));
  };

  const toggleCompare = (offerId) => {
    setCompareIds((prev) => {
      if (prev.includes(offerId)) return prev.filter((id) => id !== offerId);
      if (prev.length >= 3) return prev;
      return [...prev, offerId];
    });
  };

  const handleApply = async (offer) => {
    setNotice('');
    if (isClosed(offer)) return;

    if (!user) {
      setNotice('Sign in with Twitch to apply for partnerships.');
      signInWithTwitch('/offers');
      return;
    }

    if (applications[offer.id]) {
      setNotice('You already have an application for this partnership.');
      return;
    }

    if (offer.applicationUrl) {
      trackOfferClick({ offerId: offer.id, casinoName: offer.partnerName, pageSource: 'offers_application' });
      openExternal(offer.applicationUrl);
      return;
    }

    try {
      const { data, error: requestError } = await supabase
        .from('partnership_applications')
        .insert([{ offer_id: offer.id, user_id: user.id, status: 'submitted' }])
        .select('offer_id,status,created_at')
        .single();

      if (requestError) throw requestError;
      setApplications((prev) => ({ ...prev, [offer.id]: data }));
      setNotice('Application submitted. The Streamers Center team will review it shortly.');
    } catch (requestError) {
      console.error('Error submitting partnership application:', requestError);
      setNotice('Application could not be submitted right now. Please try again shortly.');
    }
  };

  return (
    <main className="offers-page">
      <div className="offers-container">
        <OffersHero offers={offers} />

        <OfferCategoryTabs activeCategory={activeCategory} onChange={setActiveCategory} counts={categoryCounts} />

        <OfferFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          sort={sort}
          onSortChange={setSort}
          onClear={clearFilters}
          activeChips={activeChips}
          geoOptions={geoOptions}
          mobileOpen={mobileFiltersOpen}
          setMobileOpen={setMobileFiltersOpen}
        />

        {notice && (
          <div className="offer-notice" role="status">
            {notice}
            <button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={14} aria-hidden="true" /></button>
          </div>
        )}

        {loading && <OffersLoadingState />}
        {!loading && error && <OffersErrorState onRetry={loadOffers} />}
        {!loading && !error && offers.length === 0 && <MarketplaceEmptyState />}
        {!loading && !error && offers.length > 0 && (
          <>
            <FeaturedOffer offer={featuredOffer} applications={applications} onView={setSelectedOffer} onApply={handleApply} isAuthenticated={Boolean(user)} />
            <OfferGrid
              offers={gridOffers}
              applications={applications}
              savedIds={savedIds}
              compareIds={compareIds}
              onView={setSelectedOffer}
              onApply={handleApply}
              onToggleSave={toggleSave}
              onToggleCompare={toggleCompare}
              isAuthenticated={Boolean(user)}
            />
          </>
        )}
      </div>

      <OfferComparison compareOffers={compareOffers} onRemove={toggleCompare} />

      <OfferDetailPanel
        offer={selectedOffer}
        application={selectedOffer ? applications[selectedOffer.id] : null}
        onClose={() => setSelectedOffer(null)}
        onApply={handleApply}
        isSaved={selectedOffer ? savedIds.includes(selectedOffer.id) : false}
        onToggleSave={toggleSave}
        isAuthenticated={Boolean(user)}
      />
    </main>
  );
}
