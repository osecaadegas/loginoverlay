import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePremium } from '../../hooks/usePremium';
import { supabase } from '../../config/supabaseClient';
import './PricingPage.css';

const PLANS = [
  {
    id: 'monthly',
    months: 1,
    label: '1 Month',
    price: '15.00',
    perMonth: '15.00',
    badge: null,
  },
  {
    id: 'quarterly',
    months: 3,
    label: '3 Months',
    price: '40.00',
    perMonth: '13.33',
    badge: null,
  },
  {
    id: 'semiannual',
    months: 6,
    label: '6 Months',
    price: '60.00',
    perMonth: '10.00',
    badge: 'POPULAR',
  },
  {
    id: 'annual',
    months: 12,
    label: '12 Months',
    price: '120.00',
    perMonth: '10.00',
    badge: 'BEST VALUE',
  },
];

const FEATURES = [
  'Full Overlay Control Center access',
  'Custom widgets & themes',
  'Priority support',
  'All future premium features',
];

export default function PricingPage() {
  const { user } = useAuth();
  const { isPremium, premiumUntil, loading: premiumLoading } = usePremium();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const success = searchParams.get('success') === 'true';
  const canceled = searchParams.get('canceled') === 'true';

  useEffect(() => {
    if (success) {
      setMessage({
        type: 'success',
        text: 'Payment successful! Your premium access is now active. It may take a moment to reflect.',
      });
    } else if (canceled) {
      setMessage({
        type: 'canceled',
        text: 'Payment was canceled. No charges were made.',
      });
    }
  }, [success, canceled]);

  const getAccessToken = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session?.access_token || null;
  };

  const redirectToBillingPortal = async ({ silentNotFound = false } = {}) => {
    const token = await getAccessToken();
    if (!token) throw new Error('Please sign in before managing your subscription.');

    const response = await fetch('/api/create-billing-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (silentNotFound && response.status === 404) return false;
      throw new Error(data.error || 'Could not open the billing portal.');
    }

    if (!data.url) {
      throw new Error(data.message || 'No hosted billing portal is available for this subscription.');
    }

    window.location.href = data.url;
    return true;
  };

  const handleManageSubscription = async () => {
    if (!user) { navigate('/login'); return; }

    setManageLoading(true);
    setMessage(null);
    try {
      await redirectToBillingPortal();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setManageLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
    if (!user) { navigate('/login'); return; }

    setLoadingPlan(plan.id);
    setMessage(null);
    try {
      if (isPremium) {
        const openedPortal = await redirectToBillingPortal({ silentNotFound: true });
        if (openedPortal) return;
      }

      const token = await getAccessToken();
      if (!token) throw new Error('Please sign in again before subscribing.');

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not start checkout.');

      window.location.href = data.url;
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoadingPlan(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="pricing-page">
      <div className="pricing-container">
        {/* Header */}
        <div className="pricing-header">
          <h1 className="pricing-title">
            <span className="pricing-title-accent">Premium</span> Access
          </h1>
          <p className="pricing-subtitle">
            Unlock the full Overlay Control Center and take your stream to the next level
          </p>
        </div>

        {/* Status banner */}
        {message && (
          <div className={`pricing-message pricing-message--${message.type}`}>
            <span className="pricing-message-icon">
              {message.type === 'success' ? '✓' : message.type === 'canceled' ? '✕' : '⚠'}
            </span>
            {message.text}
          </div>
        )}

        {/* Active premium banner */}
        {!premiumLoading && isPremium && (
          <div className="pricing-active-banner">
            <div className="pricing-active-badge">ACTIVE</div>
            <div className="pricing-active-info">
              <span className="pricing-active-label">Premium Active</span>
              {premiumUntil && (
                <span className="pricing-active-expiry">
                  Expires {formatDate(premiumUntil)}
                </span>
              )}
            </div>
            <p className="pricing-active-extend">
              Manage billing, update payment details, or cancel from the customer portal.
            </p>
            <button
              type="button"
              className="pricing-manage-btn"
              onClick={handleManageSubscription}
              disabled={manageLoading || loadingPlan !== null}
            >
              {manageLoading ? 'Opening...' : 'Manage Subscription'}
            </button>
          </div>
        )}

        {/* Plan cards */}
        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`pricing-card ${plan.badge === 'BEST VALUE' ? 'pricing-card--featured' : ''}`}
            >
              {plan.badge && (
                <div className={`pricing-badge ${plan.badge === 'BEST VALUE' ? 'pricing-badge--gold' : ''}`}>
                  {plan.badge}
                </div>
              )}

              <div className="pricing-card-header">
                <h2 className="pricing-card-duration">{plan.label}</h2>
                <div className="pricing-card-price">
                  <span className="pricing-card-currency">€</span>
                  <span className="pricing-card-amount">{plan.price}</span>
                </div>
                <p className="pricing-card-permonth">
                  €{plan.perMonth} / month
                </p>
              </div>

              <div className="pricing-card-features">
                {FEATURES.map((feature, i) => (
                  <div key={i} className="pricing-card-feature">
                    <span className="pricing-feature-check">✓</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className={`pricing-card-btn ${plan.badge === 'BEST VALUE' ? 'pricing-card-btn--featured' : ''}`}
                onClick={() => handleSubscribe(plan)}
                disabled={loadingPlan !== null || manageLoading}
              >
                {loadingPlan === plan.id ? (
                  <span className="pricing-btn-loading">
                    <span className="pricing-spinner" />
                    Processing...
                  </span>
                ) : !user ? (
                  'Sign in to Subscribe'
                ) : isPremium ? (
                  'Manage or Change Plan'
                ) : (
                  'Get Premium'
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Info footer */}
        <div className="pricing-footer">
          <p className="pricing-footer-text">
            Secure recurring billing is handled by Mollie. Contact support to update payment details or cancel your subscription.
          </p>
        </div>
      </div>
    </div>
  );
}
