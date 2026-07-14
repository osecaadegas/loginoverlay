import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  BarChart3,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Gift,
  LayoutDashboard,
  LifeBuoy,
  Link,
  ListPlus,
  Loader2,
  MessagesSquare,
  MonitorPlay,
  Palette,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  UsersRound,
  WalletCards,
  Archive,
  Calculator,
  Gamepad2,
  TrendingUp,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import { trackEvent } from '../../utils/analytics';
import './PricingPage.css';

const ICONS = {
  Archive,
  BadgePercent,
  BarChart3,
  Calculator,
  CalendarDays,
  Check,
  Clock3,
  Gift,
  Gamepad2,
  LayoutDashboard,
  LifeBuoy,
  Link,
  ListPlus,
  MessagesSquare,
  MonitorPlay,
  Palette,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
};

function Icon({ name, size = 18 }) {
  const Component = ICONS[name] || Sparkles;
  return <Component size={size} strokeWidth={2} />;
}

function centsToMoney(cents, currency = 'EUR') {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    maximumFractionDigits: Number(cents) % 100 === 0 ? 0 : 2,
  }).format((Number(cents) || 0) / 100);
}

function formatDate(value) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function intervalLabel(plan) {
  if (!plan) return '';
  if (plan.billingInterval === 'year') return plan.intervalCount === 1 ? 'per year' : `every ${plan.intervalCount} years`;
  if (plan.intervalCount === 1) return 'per month';
  return `every ${plan.intervalCount} months`;
}

function compactInterval(plan) {
  if (plan?.billingInterval === 'year') return 'annual';
  if (plan?.intervalCount === 6) return '6 months';
  return 'monthly';
}

function remainingTrialTime(trial) {
  if (!trial?.expires_at) return 'No active trial';
  const ms = new Date(trial.expires_at).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.ceil(ms / 3600000);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} remaining`;
  const days = Math.ceil(ms / 86400000);
  return `${days} full day${days === 1 ? '' : 's'} remaining`;
}

function trialProgress(trial) {
  if (!trial?.started_at || !trial?.expires_at) return 0;
  const start = new Date(trial.started_at).getTime();
  const end = new Date(trial.expires_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
}

function accessDefaultType(access) {
  if (access?.paidProductType) return access.paidProductType;
  if (access?.activeTrial?.selected_product_type) return access.activeTrial.selected_product_type;
  return 'player';
}

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryType = searchParams.get('type');
  const [selectedType, setSelectedType] = useState(queryType === 'streamer' ? 'streamer' : 'player');
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const success = searchParams.get('success') === 'true';
  const canceled = searchParams.get('canceled') === 'true';

  const getAccessToken = async () => {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    return data.session?.access_token || null;
  };

  const loadPage = useCallback(async () => {
    setLoading(true);
    setSubscriptionLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/premium?action=page&type=${selectedType}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to load premium plans.');
      setPageData(payload);

      if (!queryType) {
        const defaultType = accessDefaultType(payload.access);
        setSelectedType(defaultType);
        const next = new URLSearchParams(searchParams);
        next.set('type', defaultType);
        setSearchParams(next, { replace: true });
      }
    } catch (loadError) {
      setError(loadError.message || 'Could not load premium content.');
    } finally {
      setLoading(false);
      setSubscriptionLoading(false);
    }
  }, [queryType, searchParams, selectedType, setSearchParams]);

  useEffect(() => {
    const nextType = queryType === 'streamer' ? 'streamer' : queryType === 'player' ? 'player' : null;
    if (nextType && nextType !== selectedType) setSelectedType(nextType);
  }, [queryType, selectedType]);

  useEffect(() => {
    loadPage();
  }, [loadPage, user]);

  useEffect(() => {
    trackEvent('premium_page_viewed', { product_type: selectedType, route: '/premium' });
  }, []);

  useEffect(() => {
    if (success) {
      setMessage({ type: 'success', text: 'Payment completed. Your account status is being verified from the billing server.' });
      trackEvent('subscription_started', { route: '/premium' });
    } else if (canceled) {
      setMessage({ type: 'warning', text: 'Checkout was cancelled. No charge was made.' });
    }
  }, [success, canceled]);

  const selectProductType = (type) => {
    setSelectedType(type);
    const next = new URLSearchParams(searchParams);
    next.set('type', type);
    setSearchParams(next);
    trackEvent('product_type_selected', { product_type: type });
  };

  const content = pageData?.content || {};
  const productTypes = pageData?.productTypes || [];
  const allPlans = pageData?.plans || [];
  const plans = allPlans.filter((plan) => plan.productType === selectedType);
  const features = pageData?.features || [];
  const access = pageData?.access || null;
  const activeTrial = access?.activeTrial || null;
  const trial = access?.trial || null;
  const paidProductType = access?.paidProductType || null;
  const currentSubscription = access?.currentSubscription || null;
  const selectedProduct = productTypes.find((item) => item.code === selectedType) || { title: selectedType === 'streamer' ? 'Streamer' : 'Player' };
  const currentPlan = allPlans.find((plan) => plan.id === currentSubscription?.planId);
  const isPaid = access?.level === 'player_paid' || access?.level === 'streamer_paid';
  const isPastDue = access?.level === 'past_due' || ['past_due', 'unpaid', 'payment_pending', 'incomplete'].includes(currentSubscription?.status) || ['failed', 'expired', 'canceled'].includes(currentSubscription?.paymentStatus);
  const canBrowsePlans = !isPaid && plans.length > 0;
  const selectedFeatures = features.filter((feature) => selectedType === 'player' ? feature.playerAvailable : feature.streamerAvailable);
  const playerFeatures = features.filter((feature) => feature.playerAvailable);
  const streamerFeatures = features.filter((feature) => feature.streamerAvailable && !feature.playerAvailable);
  const comparisonRows = content.comparison_rows || [];

  const loginForCurrentType = () => {
    navigate('/login', { state: { from: `${location.pathname}?type=${selectedType}` } });
  };

  const scrollToPlans = () => {
    document.getElementById('premium-plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const continueUrl = (type) => type === 'streamer' ? '/overlay-center' : '/player/bonus-hunt';

  const startTrial = async () => {
    if (!user) {
      loginForCurrentType();
      return;
    }

    const confirmed = window.confirm([
      `Start a ${selectedProduct.title} trial?`,
      '',
      'Duration: 15 days',
      'No card required',
      'No automatic billing',
      'This free trial cannot be restarted on this account.',
    ].join('\n'));
    if (!confirmed) return;

    setTrialLoading(true);
    setMessage(null);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/premium', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'start_trial', productType: selectedType }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not start your free trial.');
      trackEvent('free_trial_started', { product_type: selectedType });
      setMessage({ type: 'success', text: `Your ${selectedProduct.title} trial is active until ${formatDate(payload.trial?.expires_at)}.` });
      await loadPage();
    } catch (trialError) {
      trackEvent('free_trial_activation_failed', { product_type: selectedType, reason: trialError.message });
      setMessage({ type: 'error', text: trialError.message });
    } finally {
      setTrialLoading(false);
    }
  };

  const subscribe = async (plan) => {
    if (!user) {
      loginForCurrentType();
      return;
    }

    setCheckoutPlanId(plan.id);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Please sign in again before choosing a plan.');
      trackEvent('pricing_plan_selected', { plan_id: plan.id, product_type: plan.productType });
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: plan.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not start checkout.');
      trackEvent('checkout_started', { plan_id: plan.id, product_type: plan.productType });
      window.location.href = payload.url;
    } catch (checkoutError) {
      trackEvent('checkout_failed', { plan_id: plan.id, product_type: plan.productType, reason: checkoutError.message });
      setMessage({ type: 'error', text: checkoutError.message });
      setCheckoutPlanId(null);
    }
  };

  const openBillingPortal = async () => {
    if (!user) {
      loginForCurrentType();
      return;
    }
    setPortalLoading(true);
    setMessage(null);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/create-billing-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not open billing.');
      trackEvent('billing_portal_opened', { product_type: paidProductType });
      if (!payload.url) throw new Error(payload.message || 'No hosted billing portal is available for this subscription.');
      window.location.href = payload.url;
    } catch (portalError) {
      setMessage({ type: 'error', text: portalError.message });
    } finally {
      setPortalLoading(false);
    }
  };

  const planButtonLabel = (plan) => {
    if (currentSubscription?.planId === plan.id) return 'Current plan';
    if (paidProductType === 'player' && plan.productType === 'streamer') return 'Upgrade to Streamer';
    if (paidProductType === plan.productType) return 'Switch to this plan';
    if (plan.intervalCount === 6) return 'Choose 6 months';
    if (plan.billingInterval === 'year') return 'Choose annual';
    return 'Choose monthly';
  };

  const renderTrialCard = () => {
    if (isPaid) {
      return (
        <section className="premium-trial-card premium-trial-card--paid">
          <div>
            <span className="premium-kicker">Current access</span>
            <h2>Paid {paidProductType === 'streamer' ? 'Streamer' : 'Player'} access is active</h2>
            <p>Trials are not needed while your paid plan is active.</p>
          </div>
          <button type="button" className="premium-secondary-btn" onClick={openBillingPortal} disabled={portalLoading}>
            {portalLoading ? 'Opening...' : 'Manage billing'}
          </button>
        </section>
      );
    }

    if (!user) {
      return (
        <section className="premium-trial-card">
          <div>
            <span className="premium-kicker">No-card trial</span>
            <h2>Try it before paying anything</h2>
            <p>{content.trial_description}</p>
            <p className="premium-trial-support">{content.trial_supporting}</p>
          </div>
          <button type="button" className="premium-primary-btn" onClick={loginForCurrentType}>
            Sign in and start free trial
            <ArrowRight size={16} />
          </button>
        </section>
      );
    }

    if (activeTrial) {
      const progress = trialProgress(activeTrial);
      const typeTitle = activeTrial.selected_product_type === 'streamer' ? 'Streamer' : 'Player';
      return (
        <section className="premium-trial-card premium-trial-card--active">
          <div className="premium-trial-main">
            <span className="premium-kicker">Trial active</span>
            <h2>{typeTitle} trial access</h2>
            <p>{remainingTrialTime(activeTrial)}</p>
            <div className="premium-trial-dates">
              <span>Started {formatDate(activeTrial.started_at)}</span>
              <span>Expires {formatDate(activeTrial.expires_at)}</span>
            </div>
            <div className="premium-progress" aria-label="Trial progress">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="premium-trial-actions">
            <button type="button" className="premium-primary-btn" onClick={() => navigate(continueUrl(activeTrial.selected_product_type))}>
              Continue using my trial
              <ArrowRight size={16} />
            </button>
            <button type="button" className="premium-secondary-btn" onClick={scrollToPlans}>View paid plans</button>
          </div>
        </section>
      );
    }

    if (trial) {
      return (
        <section className="premium-trial-card premium-trial-card--expired">
          <div>
            <span className="premium-kicker">Trial used</span>
            <h2>Your free trial has ended</h2>
            <p>Your saved data remains attached to your account. Premium access resumes when you choose a plan.</p>
          </div>
          <button type="button" className="premium-primary-btn" onClick={scrollToPlans}>Choose a plan</button>
        </section>
      );
    }

    return (
      <section className="premium-trial-card">
        <div>
          <span className="premium-kicker">No-card trial</span>
          <h2>{content.trial_heading}</h2>
          <p>{content.trial_description}</p>
          <p className="premium-trial-support">{content.trial_supporting}</p>
        </div>
        <button type="button" className="premium-primary-btn" onClick={startTrial} disabled={trialLoading}>
          {trialLoading ? <Loader2 className="premium-spin" size={16} /> : null}
          {trialLoading ? 'Starting...' : `Start my ${selectedProduct.title} trial`}
        </button>
      </section>
    );
  };

  const renderStatusPanel = () => {
    if (!access || (!isPaid && !activeTrial && !trial && !isPastDue)) return null;
    const statusLabel = activeTrial ? 'Trial active' : currentSubscription?.status || access.level;
    const productType = activeTrial?.selected_product_type || paidProductType || currentSubscription?.productType || trial?.selected_product_type;
    return (
      <section className="premium-status-panel">
        <div className="premium-status-head">
          <div>
            <span className="premium-kicker">Account status</span>
            <h2>{productType === 'streamer' ? 'Streamer' : 'Player'} access</h2>
          </div>
          <span className={`premium-status-pill premium-status-pill--${isPastDue ? 'warning' : isPaid || activeTrial ? 'active' : 'expired'}`}>
            {statusLabel}
          </span>
        </div>
        <div className="premium-status-grid">
          <div><span>Product type</span><strong>{productType === 'streamer' ? 'Streamer' : 'Player'}</strong></div>
          <div><span>Plan</span><strong>{currentPlan?.title || currentSubscription?.planId || (activeTrial ? 'Free trial' : 'None')}</strong></div>
          <div><span>Billing period</span><strong>{currentPlan ? intervalLabel(currentPlan) : activeTrial ? '15 days' : 'Not active'}</strong></div>
          <div><span>Renewal date</span><strong>{formatDate(currentSubscription?.nextBillingAt || currentSubscription?.currentPeriodEnd)}</strong></div>
          {currentSubscription?.cancelAtPeriodEnd && <div><span>Ends at</span><strong>{formatDate(currentSubscription.currentPeriodEnd)}</strong></div>}
          {isPastDue && <div><span>Payment issue</span><strong>{currentSubscription?.paymentStatus || 'Past due'}</strong></div>}
          {activeTrial && <div><span>Trial ends</span><strong>{formatDate(activeTrial.expires_at)}</strong></div>}
        </div>
        <div className="premium-status-actions">
          {isPaid && <button type="button" className="premium-secondary-btn" onClick={openBillingPortal} disabled={portalLoading}>{portalLoading ? 'Opening...' : 'Manage billing'}</button>}
          {isPaid && <button type="button" className="premium-secondary-btn" onClick={scrollToPlans}>Change plan</button>}
          {paidProductType === 'player' && <button type="button" className="premium-primary-btn" onClick={() => selectProductType('streamer')}>Upgrade to Streamer</button>}
          {isPastDue && <button type="button" className="premium-primary-btn" onClick={openBillingPortal}>Resume subscription</button>}
          {isPaid && <button type="button" className="premium-secondary-btn" onClick={openBillingPortal}>Cancel renewal</button>}
        </div>
      </section>
    );
  };

  if (loading) {
    return (
      <main className="pricing-page pricing-page--center">
        <Loader2 className="premium-spin" size={28} />
        <p>Loading pricing content...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="pricing-page pricing-page--center">
        <AlertTriangle size={28} />
        <h1>Pricing could not load</h1>
        <p>{error}</p>
        <button type="button" className="premium-primary-btn" onClick={loadPage}>Try again</button>
      </main>
    );
  }

  return (
    <main className="pricing-page">
      <section className="premium-hero">
        <div className="premium-hero-copy">
          <span className="premium-kicker">Premium access</span>
          <h1>{content.hero_heading}</h1>
          <p>{content.hero_description}</p>
          <div className="premium-trust-list">
            {(content.trust_labels || []).map((label) => (
              <span key={label}><ShieldCheck size={15} />{label}</span>
            ))}
          </div>
        </div>
        <div className="premium-hero-actions">
          <button type="button" className="premium-primary-btn" onClick={startTrial} disabled={trialLoading || isPaid}>
            {content.primary_cta}
            <ArrowRight size={16} />
          </button>
          <button type="button" className="premium-secondary-btn" onClick={scrollToPlans}>{content.secondary_cta}</button>
        </div>
      </section>

      {message && (
        <div className={`premium-message premium-message--${message.type}`}>
          {message.type === 'error' ? <AlertTriangle size={17} /> : <Check size={17} />}
          <span>{message.text}</span>
        </div>
      )}

      <section className="premium-selector" aria-label="Choose product type" role="tablist">
        {productTypes.map((product) => (
          <button
            key={product.code}
            type="button"
            role="tab"
            aria-selected={selectedType === product.code}
            className={`premium-selector-option ${selectedType === product.code ? 'is-selected' : ''}`}
            onClick={() => selectProductType(product.code)}
          >
            <span className="premium-selector-icon"><Icon name={product.icon} /></span>
            <span>
              <strong>{product.title}</strong>
              <small>{product.description}</small>
            </span>
          </button>
        ))}
      </section>

      {subscriptionLoading ? (
        <div className="premium-inline-loading"><Loader2 className="premium-spin" size={18} /> Loading subscription status...</div>
      ) : renderStatusPanel()}

      {renderTrialCard()}

      <section id="premium-plans" className="premium-section">
        <div className="premium-section-head">
          <span className="premium-kicker">Paid plans</span>
          <h2>{selectedType === 'player' ? content.player_section_title : content.streamer_section_title}</h2>
          <p>{selectedType === 'player' ? content.player_section_description : content.streamer_section_description}</p>
        </div>

        {plans.length === 0 ? (
          <div className="premium-empty-state">
            <AlertTriangle size={20} />
            <p>No active {selectedProduct.title} plans are available right now.</p>
          </div>
        ) : (
          <div className={`premium-plan-grid premium-plan-grid--${plans.length}`}>
            {plans.map((plan) => {
              const isCurrent = currentSubscription?.planId === plan.id;
              const isUpgrade = paidProductType === 'player' && plan.productType === 'streamer';
              const monthlyEquivalent = plan.monthlyEquivalentCents || Math.round(plan.priceCents / Math.max(plan.intervalMonths || 1, 1));
              return (
                <article key={plan.id} className={`premium-plan-card ${plan.recommended ? 'is-recommended' : ''}`}>
                  {plan.badge && <span className="premium-plan-badge">{plan.badge}</span>}
                  <div className="premium-plan-top">
                    <h3>{plan.title}</h3>
                    <p>{plan.description}</p>
                  </div>
                  <div className="premium-price-row">
                    <strong>{centsToMoney(plan.priceCents, plan.currency)}</strong>
                    <span>{intervalLabel(plan)}</span>
                  </div>
                  <div className="premium-plan-meta">
                    <span>{centsToMoney(monthlyEquivalent, plan.currency)} / month equivalent</span>
                    {plan.savingsLabel && <span>{plan.savingsLabel}</span>}
                  </div>
                  <p className="premium-inclusion"><Check size={16} />{plan.inclusionText}</p>
                  <button
                    type="button"
                    className={`premium-plan-btn ${plan.recommended || isUpgrade ? 'premium-plan-btn--primary' : ''}`}
                    onClick={() => subscribe(plan)}
                    disabled={checkoutPlanId !== null || isCurrent}
                    title={isCurrent ? 'This is your current paid plan.' : undefined}
                  >
                    {checkoutPlanId === plan.id ? <Loader2 className="premium-spin" size={16} /> : null}
                    {checkoutPlanId === plan.id ? 'Starting checkout...' : planButtonLabel(plan)}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="premium-section premium-feature-section">
        <div className="premium-section-head">
          <span className="premium-kicker">Included tools</span>
          <h2>{selectedProduct.title} features</h2>
          <p>{selectedType === 'player' ? content.player_section_description : content.streamer_section_description}</p>
        </div>
        <div className="premium-feature-grid">
          {selectedFeatures.map((feature) => (
            <div key={feature.id || feature.code} className="premium-feature-item">
              <span><Icon name={feature.icon} size={17} /></span>
              <div>
                <strong>{feature.title}</strong>
                {feature.description && <p>{feature.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="premium-section premium-feature-section premium-feature-section--split">
        <div className="premium-mini-feature-card">
          <h3>Player</h3>
          <p>{content.player_section_description}</p>
          <ul>{playerFeatures.slice(0, 9).map((feature) => <li key={feature.code}><Check size={15} />{feature.title}</li>)}</ul>
        </div>
        <div className="premium-mini-feature-card">
          <h3>Streamer</h3>
          <p>{content.streamer_section_description}</p>
          <ul>{streamerFeatures.slice(0, 11).map((feature) => <li key={feature.code}><Check size={15} />{feature.title}</li>)}</ul>
        </div>
      </section>

      <section className="premium-section premium-comparison-section">
        <div className="premium-section-head">
          <span className="premium-kicker">Compare</span>
          <h2>{content.comparison_title}</h2>
          <p>{content.comparison_description}</p>
        </div>
        <div className="premium-comparison">
          <div className="premium-comparison-head">
            <span>Feature</span>
            <span>Player</span>
            <span>Streamer</span>
          </div>
          {(comparisonRows.length ? comparisonRows : features).map((row) => {
            const label = row.label || row.title;
            const playerIncluded = 'player' in row ? row.player : row.playerAvailable;
            const streamerIncluded = 'streamer' in row ? row.streamer : row.streamerAvailable;
            return (
              <div key={row.code || label} className="premium-comparison-row">
                <strong>{label}</strong>
                <span className={playerIncluded ? 'is-included' : 'is-missing'}>{playerIncluded ? <Check size={16} /> : <X size={15} />}{playerIncluded ? 'Included' : 'Not included'}</span>
                <span className={streamerIncluded ? 'is-included' : 'is-missing'}>{streamerIncluded ? <Check size={16} /> : <X size={15} />}{streamerIncluded ? 'Included' : 'Not included'}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="premium-section premium-faq-section">
        <div className="premium-section-head">
          <span className="premium-kicker">FAQ</span>
          <h2>{content.faq_title}</h2>
        </div>
        <div className="premium-faq-grid">
          {(content.faq || []).map((item) => (
            <details key={item.question} className="premium-faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="premium-footer-note">
        <CreditCard size={16} />
        <span>{content.legal_note}</span>
      </footer>

      {canBrowsePlans && (
        <div className="premium-sticky-cta">
          <div>
            <strong>{selectedProduct.title}</strong>
            <span>Start free or choose {compactInterval(plans[0])}</span>
          </div>
          <button type="button" className="premium-primary-btn" onClick={trial ? scrollToPlans : startTrial} disabled={trialLoading}>
            {trial ? 'Choose a plan' : 'Start free trial'}
          </button>
        </div>
      )}
    </main>
  );
}