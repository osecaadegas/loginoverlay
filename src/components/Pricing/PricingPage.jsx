import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePremium } from '../../hooks/usePremium';
import './PricingPage.css';

const PLANS = [
  {
    id: 1,
    months: 1,
    label: '1 Month',
    price: '15.00',
    perMonth: '15.00',
    badge: null,
  },
  {
    id: 3,
    months: 3,
    label: '3 Months',
    price: '40.00',
    perMonth: '13.33',
    badge: null,
  },
  {
    id: 6,
    months: 6,
    label: '6 Months',
    price: '60.00',
    perMonth: '10.00',
    badge: 'POPULAR',
  },
  {
    id: 12,
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

  const handleSubscribe = async (plan) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoadingPlan(plan);
    setMessage(null);

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          plan,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: 'error', text: data.error || 'Something went wrong.' });
        setLoadingPlan(null);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setMessage({ type: 'error', text: 'Failed to start checkout. Please try again.' });
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
              Purchase again to extend your premium access
            </p>
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
                onClick={() => handleSubscribe(plan.months)}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === plan.months ? (
                  <span className="pricing-btn-loading">
                    <span className="pricing-spinner" />
                    Processing...
                  </span>
                ) : !user ? (
                  'Sign in to Subscribe'
                ) : isPremium ? (
                  'Extend Premium'
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
            Auto-renewing subscription — cancel anytime from your Stripe portal.
          </p>
          <p className="pricing-footer-secure">
            <svg className="pricing-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
