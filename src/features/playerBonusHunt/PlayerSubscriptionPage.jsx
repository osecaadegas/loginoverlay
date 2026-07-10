import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { CreditCard, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { openPlayerBillingPortal, startPlayerCheckout } from './playerBonusHuntService';
import usePlayerSubscription from './usePlayerSubscription';
import { formatDate, statusLabel } from './format';
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
      setMessage('Checkout complete. Stripe may take a moment to confirm your trial or subscription.');
      refresh();
    }
    if (searchParams.get('canceled') === 'true') {
      setMessage('Checkout was cancelled. No charge was made.');
    }
  }, [searchParams, refresh]);

  if (authLoading) return <main className="pbh-page pbh-page--center"><div className="pbh-loader">Loading...</div></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: '/player/subscription' }} />;

  const startCheckout = async () => {
    setBusy('checkout');
    setMessage('');
    try {
      const result = await startPlayerCheckout();
      window.location.href = result.url;
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
      window.location.href = result.url;
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy('');
    }
  };

  const status = subscription?.status || 'expired';
  const reason = location.state?.reason;
  const trialEndingSoon = subscription?.status === 'trialing'
    && subscription?.trial_ends_at
    && new Date(subscription.trial_ends_at).getTime() - Date.now() < 4 * 24 * 60 * 60 * 1000;

  return (
    <main className="pbh-page">
      <header className="pbh-header">
        <div>
          <span className="pbh-eyebrow">Player plan</span>
          <h1>Player Bonus Hunt Subscription</h1>
          <p>Private bonus hunt tracking for regular casino players. No OBS, stream chat, or streamer controls.</p>
        </div>
        <Link to="/player/bonus-hunt" className="pbh-btn pbh-btn--ghost">Bonus Hunt</Link>
      </header>

      {reason && !entitled && <div className="pbh-alert pbh-alert--error">{reason}</div>}
      {message && <div className="pbh-alert">{message}</div>}
      {error && <div className="pbh-alert pbh-alert--error">{error}</div>}

      <section className="pbh-subscription-hero">
        <div>
          <span className="pbh-pill pbh-pill--active">Player</span>
          <h2>€3 per month</h2>
          <p>Start with 30 days free after authorizing recurring billing through Stripe.</p>
          <ul>
            <li>Manual casino session and Bonus Hunt tracker</li>
            <li>Bonus list, multipliers, profit/loss, and library stats</li>
            <li>CSV exports for hunts and bonus results</li>
            <li>Your data stays stored if you cancel and returns when you resubscribe</li>
          </ul>
        </div>
        <div className="pbh-subscription-card">
          {loading ? (
            <div className="pbh-skeleton" />
          ) : (
            <>
              <span className={`pbh-pill pbh-pill--${status}`}>{trialEndingSoon ? 'Trial ending soon' : statusLabel(status)}</span>
              <dl>
                <div><dt>Current plan</dt><dd>{plan?.planName || 'Player'}</dd></div>
                <div><dt>Monthly price</dt><dd>€{Number(plan?.monthlyPrice || 3).toFixed(2)}</dd></div>
                <div><dt>Trial start</dt><dd>{formatDate(subscription?.trial_started_at)}</dd></div>
                <div><dt>Trial end</dt><dd>{formatDate(subscription?.trial_ends_at)}</dd></div>
                <div><dt>Next billing date</dt><dd>{formatDate(subscription?.next_billing_at || subscription?.current_period_end)}</dd></div>
                <div><dt>Cancel at period end</dt><dd>{subscription?.cancel_at_period_end ? 'Yes' : 'No'}</dd></div>
              </dl>
              <div className="pbh-subscription-card__actions">
                {entitled ? (
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
                    <CreditCard size={17} /> {busy === 'checkout' ? 'Opening Stripe...' : 'Start 30-day trial'}
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
            <h2>Billing safety</h2>
            <p>Recurring billing is handled by Stripe checkout and Stripe webhooks. The frontend never stores card data and never grants access by itself.</p>
          </div>
        </div>
        <div className="pbh-grid pbh-grid--three">
          <div className="pbh-note"><strong>No early charge</strong><span>You only renew at €3/month after Stripe authorization and the 30-day trial.</span></div>
          <div className="pbh-note"><strong>Trial is account-bound</strong><span>Trial use is stored server-side, so cancelling does not reset eligibility.</span></div>
          <div className="pbh-note"><strong>Data retained</strong><span>Expired or cancelled users keep stored hunts and regain access after resubscribing.</span></div>
        </div>
      </section>
    </main>
  );
}
