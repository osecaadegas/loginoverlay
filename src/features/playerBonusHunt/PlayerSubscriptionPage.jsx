import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { openPlayerBillingPortal, startPlayerCheckout } from './playerBonusHuntService';
import usePlayerSubscription from './usePlayerSubscription';
import { formatDate, statusLabel } from './format';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import './PlayerBonusHunt.css';

export default function PlayerSubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { loading, entitled, subscription, plan, error, refresh } = usePlayerSubscription();
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setMessage('Checkout complete. Mollie may take a moment to confirm your subscription.');
      refresh();
    }
    if (searchParams.get('canceled') === 'true') {
      setMessage('Checkout was cancelled. No charge was made.');
    }
  }, [searchParams, refresh]);

  if (authLoading) return <main className="pbh-page pbh-page--center"><LoadingSpinner text="Loading..." /></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: '/player/subscription' }} />;

  const startCheckout = async () => {
    setBusy('checkout');
    setMessage('');
    try {
      const result = await startPlayerCheckout();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setMessage(result.message || 'Player Bonus Hunt access is already enabled.');
      refresh();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy('');
    }
  };

  const openPortal = async () => {
    setBusy('portal');
    setMessage('');
    try {
      const result = await openPlayerBillingPortal();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setMessage(result.message || 'No billing portal is needed right now.');
      refresh();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy('');
    }
  };

  const freeAccess = !loading && (plan?.freeAccess || plan?.subscriptionRequired === false);
  const status = freeAccess ? 'active' : subscription?.status || 'expired';
  const reason = location.state?.reason;
  const visibleReason = !loading && reason && reason !== error && !entitled ? reason : '';
  const trialEndingSoon = !freeAccess
    && subscription?.status === 'trialing'
    && subscription?.trial_ends_at
    && new Date(subscription.trial_ends_at).getTime() - Date.now() < 4 * 24 * 60 * 60 * 1000;

  return (
    <main className="pbh-page">
      <header className="pbh-header">
        <div>
          <span className="pbh-eyebrow">Player plan</span>
          <h1>Player Bonus Hunt Access</h1>
          <p>Private bonus hunt tracking for regular casino players. No OBS, stream chat, or streamer controls.</p>
        </div>
        <Link to="/player/bonus-hunt" className="pbh-btn pbh-btn--ghost">Bonus Hunt</Link>
      </header>

      {visibleReason && <div className="pbh-alert pbh-alert--error">{visibleReason}</div>}
      {message && <div className="pbh-alert">{message}</div>}
      {error && <div className="pbh-alert pbh-alert--error">{error}</div>}

      <section className="pbh-subscription-hero">
        <div>
          <span className="pbh-pill pbh-pill--active">Player</span>
          <h2>{loading ? 'Checking access...' : (freeAccess ? 'Free access enabled' : 'EUR 3 per month')}</h2>
          <p>
            {loading
              ? 'Confirming your Player Bonus Hunt access.'
              : freeAccess
              ? 'Subscription checks are disabled for now, so every signed-in account can use Player Bonus Hunt.'
              : 'Start recurring billing securely through Mollie.'}
          </p>
          <ul>
            <li>Manual casino session and Bonus Hunt tracker</li>
            <li>Bonus list, multipliers, profit/loss, and library stats</li>
            <li>CSV exports for hunts and bonus results</li>
            <li>Your data stays stored if paid access is enabled later</li>
          </ul>
        </div>
        <div className="pbh-subscription-card">
          {loading ? (
            <div className="pbh-skeleton" />
          ) : (
            <>
              <span className={`pbh-pill pbh-pill--${status}`}>
                {freeAccess ? 'Free access enabled' : (trialEndingSoon ? 'Trial ending soon' : statusLabel(status))}
              </span>
              <dl>
                <div><dt>Current plan</dt><dd>{plan?.planName || 'Player Bonus Hunt'}</dd></div>
                <div><dt>Monthly price</dt><dd>{freeAccess ? 'Free for now' : `EUR ${Number(plan?.monthlyPrice || 3).toFixed(2)}`}</dd></div>
                <div><dt>Access mode</dt><dd>{freeAccess ? 'Authenticated account' : 'Mollie subscription'}</dd></div>
                {!freeAccess && (
                  <>
                    <div><dt>Trial start</dt><dd>{formatDate(subscription?.trial_started_at)}</dd></div>
                    <div><dt>Trial end</dt><dd>{formatDate(subscription?.trial_ends_at)}</dd></div>
                    <div><dt>Next billing date</dt><dd>{formatDate(subscription?.next_billing_at || subscription?.current_period_end)}</dd></div>
                    <div><dt>Cancel at period end</dt><dd>{subscription?.cancel_at_period_end ? 'Yes' : 'No'}</dd></div>
                  </>
                )}
              </dl>
              <div className="pbh-subscription-card__actions">
                {freeAccess ? (
                  <>
                    <Link className="pbh-btn pbh-btn--primary" to="/player/bonus-hunt">
                      <CheckCircle2 size={17} /> Open Bonus Hunt
                    </Link>
                    <button className="pbh-btn pbh-btn--ghost" onClick={refresh}>
                      <RefreshCw size={17} /> Refresh
                    </button>
                  </>
                ) : entitled ? (
                  <>
                    <button className="pbh-btn pbh-btn--primary" onClick={openPortal} disabled={busy === 'portal'}>
                      <CreditCard size={17} /> {busy === 'portal' ? 'Opening...' : 'Update payment / cancel'}
                    </button>
                    <button className="pbh-btn pbh-btn--ghost" onClick={refresh}>
                      <RefreshCw size={17} /> Refresh
                    </button>
                  </>
                ) : (
                  <button className="pbh-btn pbh-btn--primary" onClick={startCheckout} disabled={busy === 'checkout'}>
                    <CreditCard size={17} /> {busy === 'checkout' ? 'Opening Mollie...' : 'Start subscription'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="pbh-panel">
        <div className="pbh-section-head">
          <div>
            <h2>{freeAccess ? 'Access for now' : 'Billing safety'}</h2>
            <p>
              {freeAccess
                ? 'The billing path is not required while free access is enabled.'
                : 'Recurring billing is handled by Mollie checkout and Mollie webhooks. The frontend never stores card data and never grants access by itself.'}
            </p>
          </div>
        </div>
        <div className="pbh-grid pbh-grid--three">
          {freeAccess ? (
            <>
              <div className="pbh-note"><strong>No checkout required</strong><span>Signed-in users can open and use Player Bonus Hunt immediately.</span></div>
              <div className="pbh-note"><strong>Server-side access</strong><span>The API grants access before billing tables or checkout sessions are touched.</span></div>
              <div className="pbh-note"><strong>Paid access can return later</strong><span>Set PLAYER_BONUS_HUNT_REQUIRE_SUBSCRIPTION=true to enforce the paid plan again.</span></div>
            </>
          ) : (
            <>
              <div className="pbh-note"><strong>Secure billing</strong><span>Mollie handles recurring EUR 3/month payments after checkout confirmation.</span></div>
              <div className="pbh-note"><strong>Trial is account-bound</strong><span>Trial use is stored server-side, so cancelling does not reset eligibility.</span></div>
              <div className="pbh-note"><strong>Data retained</strong><span>Expired or cancelled users keep stored hunts and regain access after resubscribing.</span></div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
