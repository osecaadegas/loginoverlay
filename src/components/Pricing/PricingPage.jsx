import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../config/supabaseClient";
import { trackEvent } from "../../utils/analytics";
import "./PricingPage.css";

const STREAMER_PLAN_CARDS = [
  {
    id: "streamer_monthly",
    image: "/25.png",
    title: "Monthly",
    accent: "cyan",
  },
  {
    id: "streamer_6_months",
    image: "/130.png",
    title: "Half year",
    accent: "violet",
  },
  {
    id: "streamer_annual",
    image: "/250.png",
    title: "Full year",
    accent: "pink",
  },
];

const PLAYER_PLAN_CARDS = [
  {
    id: "player_monthly",
    image: "/player3eur.png",
    title: "Player monthly",
    accent: "cyan",
  },
  {
    id: "player_annual",
    image: "/player25eur.png",
    title: "Player annual",
    accent: "pink",
  },
];

const PRODUCT_COPY = {
  streamer: {
    kicker: "Streamers Center Premium",
    title: "Choose your creator toolkit.",
    description:
      "Unlock premium overlay widgets, full customization tools, Bonus Hunt tracking, community tools, and regular updates.",
    sectionTitle: "Streamer plans",
    sectionText:
      "Start with 7 days free without a card, then choose a paid plan only when you are ready.",
    cards: STREAMER_PLAN_CARDS,
  },
  player: {
    kicker: "Gambler access",
    title: "Choose your gambler toolkit.",
    description:
      "Get gambler-focused Bonus Hunt tools with secure Stripe billing and account-based access.",
    sectionTitle: "Gambler plans",
    sectionText:
      "Start with 7 days free without a card, then choose a paid plan only when you are ready.",
    cards: PLAYER_PLAN_CARDS,
  },
};

function normalizeProductType(value) {
  return value === "player" || value === "gambler" ? "player" : "streamer";
}

function formatStatus(value) {
  if (!value) return "No active subscription";
  return String(value).replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [trialStarting, setTrialStarting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";
  const productType = normalizeProductType(searchParams.get("type"));
  const activeCopy = PRODUCT_COPY[productType];
  const productCards = activeCopy.cards;

  const getAccessToken = async () => {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    return data.session?.access_token || null;
  };

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `/api/premium?action=page&type=${productType}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error || "Failed to load premium plans.");
      setPageData(payload);
    } catch (loadError) {
      setError(loadError.message || "Could not load premium content.");
    } finally {
      setLoading(false);
    }
  }, [productType]);

  useEffect(() => {
    loadPage();
  }, [loadPage, user]);

  useEffect(() => {
    trackEvent("premium_page_viewed", {
      product_type: productType,
      route: "/premium",
    });
  }, [productType]);

  useEffect(() => {
    if (success) {
      setMessage({
        type: "success",
        text: "Checkout complete. Stripe is confirming your subscription now.",
      });
      trackEvent("subscription_started", {
        route: "/premium",
        product_type: productType,
      });
    } else if (canceled) {
      setMessage({
        type: "warning",
        text: "Checkout was cancelled. No charge was made.",
      });
    }
  }, [success, canceled, productType]);

  const access = pageData?.access || null;
  const subscription = access?.currentSubscription || null;
  const activeTrial = access?.activeTrial || null;
  const hasAccess =
    productType === "streamer"
      ? access?.hasStreamerAccess
      : access?.hasPlayerAccess;
  const hasPaidAccess =
    productType === "streamer"
      ? access?.paidProductType === "streamer"
      : ["player", "streamer"].includes(access?.paidProductType);

  const loginForCheckout = () => {
    navigate("/login", {
      state: { from: `${location.pathname}${location.search}` },
    });
  };

  const selectProductType = (type) => {
    const nextType = normalizeProductType(type);
    setMessage(null);
    navigate(`/premium?type=${nextType}`, { replace: true });
  };

  const startTrial = async () => {
    if (!user) {
      loginForCheckout();
      return;
    }

    setTrialStarting(true);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Please sign in again to start your trial.");
      const response = await fetch("/api/premium?action=start_trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productType }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error || "Could not start your free trial.");
      setPageData((current) => ({
        ...current,
        access: payload.access,
        trialEligible: false,
      }));
      setMessage({
        type: "success",
        text: "Your 7-day free trial is active. No card was added and you will not be charged automatically.",
      });
      trackEvent("cardless_trial_started", {
        product_type: productType,
        route: "/premium",
      });
    } catch (trialError) {
      setMessage({ type: "error", text: trialError.message });
    } finally {
      setTrialStarting(false);
    }
  };

  const subscribe = async (card) => {
    if (!user) {
      loginForCheckout();
      return;
    }

    setCheckoutPlanId(card.id);
    setMessage(null);
    try {
      const token = await getAccessToken();
      if (!token)
        throw new Error("Please sign in again before choosing a plan.");
      trackEvent("pricing_plan_selected", {
        plan_id: card.id,
        product_type: productType,
      });
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: card.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error || "Could not start checkout.");
      trackEvent("checkout_started", {
        plan_id: card.id,
        product_type: productType,
      });
      window.location.href = payload.url;
    } catch (checkoutError) {
      setMessage({ type: "error", text: checkoutError.message });
      trackEvent("checkout_failed", {
        plan_id: card.id,
        product_type: productType,
        reason: checkoutError.message,
      });
      setCheckoutPlanId(null);
    }
  };

  const openBillingPortal = async () => {
    if (!user) {
      loginForCheckout();
      return;
    }
    setPortalLoading(true);
    setMessage(null);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/create-billing-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error || "Could not open billing.");
      if (!payload.url)
        throw new Error(
          payload.message || "No hosted billing portal is available.",
        );
      trackEvent("billing_portal_opened", { product_type: productType });
      window.location.href = payload.url;
    } catch (portalError) {
      setMessage({ type: "error", text: portalError.message });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="pricing-page pricing-page--center">
        <Loader2 className="premium-spin" size={30} />
        <p>Loading premium plans...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="pricing-page pricing-page--center">
        <AlertTriangle size={30} />
        <h1>Premium could not load</h1>
        <p>{error}</p>
        <button
          type="button"
          className="premium-action premium-action--primary"
          onClick={loadPage}
        >
          Try again
        </button>
      </main>
    );
  }

  return (
    <main className="pricing-page">
      <section className="premium-hero" aria-label="Streamers Center premium">
        <div className="premium-hero-copy">
          <span className="premium-kicker">
            <Sparkles size={15} /> {activeCopy.kicker}
          </span>
          <h1>{activeCopy.title}</h1>
          <p>{activeCopy.description}</p>
          <div className="premium-trust-list">
            <span>
              <Sparkles size={15} /> No card for the free trial
            </span>
            <span>
              <CheckCircle2 size={15} /> No automatic renewal
            </span>
            <span>
              <ShieldCheck size={15} /> Stripe only for paid plans
            </span>
          </div>
        </div>
        <div className="premium-hero-controls">
          <div
            className="premium-product-toggle"
            aria-label="Choose payment type"
          >
            {["player", "streamer"].map((type) => (
              <button
                key={type}
                type="button"
                className={productType === type ? "is-active" : ""}
                onClick={() => selectProductType(type)}
                disabled={checkoutPlanId !== null}
              >
                {type === "streamer" ? "Streamers" : "Gambler"}
              </button>
            ))}
          </div>
          {!hasAccess && pageData?.trialEligible !== false && (
            <button
              type="button"
              className="premium-action premium-action--primary"
              onClick={startTrial}
              disabled={trialStarting || checkoutPlanId !== null}
            >
              {trialStarting ? (
                <Loader2 className="premium-spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              {trialStarting ? "Starting..." : "Start 7-day free trial"}
            </button>
          )}
          {hasPaidAccess && (
            <button
              type="button"
              className="premium-action premium-action--secondary"
              onClick={openBillingPortal}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="premium-spin" size={16} />
              ) : (
                <CreditCard size={16} />
              )}
              {portalLoading ? "Opening..." : "Manage billing"}
            </button>
          )}
        </div>
      </section>

      {message && (
        <div className={`premium-message premium-message--${message.type}`}>
          {message.type === "error" ? (
            <AlertTriangle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {subscription && (
        <section className="premium-status">
          <div>
            <span>Current subscription</span>
            <strong>{formatStatus(subscription.status)}</strong>
          </div>
          <div>
            <span>Plan</span>
            <strong>{subscription.planId || "Not set"}</strong>
          </div>
          <button
            type="button"
            className="premium-action premium-action--secondary"
            onClick={openBillingPortal}
            disabled={portalLoading}
          >
            {portalLoading ? "Opening billing..." : "Manage subscription"}
          </button>
        </section>
      )}

      {activeTrial && (
        <section className="premium-status" aria-label="Free trial status">
          <div>
            <span>Free trial</span>
            <strong>{formatStatus(activeTrial.status)}</strong>
          </div>
          <div>
            <span>Access ends</span>
            <strong>{formatDate(activeTrial.expires_at)}</strong>
          </div>
        </section>
      )}

      <section className="premium-plan-section" aria-label="Premium plans">
        <div className="premium-section-head">
          <span className="premium-kicker">Pick a plan</span>
          <h2>{activeCopy.sectionTitle}</h2>
          <p>{activeCopy.sectionText}</p>
          <p>Plan cards below open paid Stripe checkout and are separate from the free trial.</p>
        </div>

        <div className={`premium-card-grid premium-card-grid--${productType}`}>
          {productCards.map((card) => {
            return (
              <button
                key={card.id}
                type="button"
                className={`premium-image-card premium-image-card--${card.accent}`}
                onClick={() => subscribe(card)}
                disabled={checkoutPlanId !== null}
                aria-label={`Start ${card.title} checkout`}
              >
                <span className="premium-card-frame">
                  <img src={card.image} alt={`${card.title} premium plan`} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <footer className="premium-footer-note">
        The free trial requires no card and never converts automatically. Stripe
        handles checkout only when you choose a paid plan. Prices shown are
        before 23% VAT.
      </footer>
    </main>
  );
}
