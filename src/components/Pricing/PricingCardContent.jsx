import { ArrowRight, CheckCircle2, CreditCard, Loader2, Sparkles } from 'lucide-react';
import './PricingPage.css';

export const STREAMER_PLAN_CARDS = [
  {
    id: "streamer_monthly",
    title: "Monthly",
    badge: "Most flexible",
    accent: "cyan",
  },
  {
    id: "streamer_6_months",
    title: "Half year",
    badge: "Better value",
    accent: "violet",
  },
  {
    id: "streamer_annual",
    title: "Full year",
    badge: "Best value",
    accent: "pink",
  },
];

export const PLAYER_PLAN_CARDS = [
  {
    id: "player_monthly",
    title: "Player monthly",
    badge: "Flexible",
    accent: "cyan",
  },
  {
    id: "player_annual",
    title: "Player annual",
    badge: "Best value",
    accent: "pink",
  },
];

export function getPlanFeatures(features, productType) {
  return (features || [])
    .filter(feature => feature.active !== false && (productType === 'streamer' ? feature.streamerAvailable : feature.playerAvailable))
    .sort((a, b) => productType === 'streamer' ? Number(a.playerAvailable) - Number(b.playerAvailable) : 0)
    .map(feature => feature.title)
    .filter(Boolean)
    .slice(0, 6);
}

function formatPlanPrice(plan) {
  if (!Number.isFinite(Number(plan?.priceCents))) return "Price unavailable";
  const amount = Number(plan.priceCents) / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: plan.currency || "EUR",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPlanPeriod(plan) {
  const months = Number(plan?.intervalMonths || 1);
  if (months === 1) return "month";
  if (months === 12) return "year";
  return `${months} months`;
}

function formatBillingLine(plan) {
  const months = Number(plan?.intervalMonths || 1);
  if (months === 1) return "Billed monthly";
  if (months === 12) return "Billed every 12 months";
  return `Billed every ${months} months`;
}


export default function PricingCardContent({ card, planFeatures, loading = false, actionLabel = 'Get started', frameSrc = '/pricing/streamer-plan-frame.webp' }) {
  return (
    <span className="premium-card-frame">
      <img
        className="premium-card-art"
        src={frameSrc}
        alt=""
        aria-hidden="true"
      />
      <span className="premium-card-content">
        <span className="premium-card-brand" aria-hidden="true">
          <span className="premium-card-monogram">SC</span>
          <span>
            <strong>Streamers</strong>
            <small>Center</small>
          </span>
        </span>
        <span className="premium-card-badge">
          <Sparkles aria-hidden="true" />
          {card.badge || card.presentationBadge || "Premium"}
        </span>
        <span className="premium-card-title">
          {card.displayTitle}
        </span>
        <span className="premium-card-price-row">
          <strong>{formatPlanPrice(card)}</strong>
          <span>/ {formatPlanPeriod(card)}</span>
        </span>
        <span className="premium-card-billing">
          {formatBillingLine(card)}
        </span>
        {card.savingsLabel && (
          <span className="premium-card-saving">
            {card.savingsLabel}
          </span>
        )}
        <span className="premium-card-features">
          {planFeatures.map((feature) => (
            <span className="premium-card-feature" key={feature}>
              <CheckCircle2 aria-hidden="true" />
              <span>{feature}</span>
            </span>
          ))}
        </span>
        <span className="premium-card-cta">
          {loading ? (
            <Loader2 className="premium-spin" aria-hidden="true" />
          ) : (
            <CreditCard aria-hidden="true" />
          )}
          {loading
            ? "Opening checkout..."
            : actionLabel}
          {!loading && (
            <ArrowRight aria-hidden="true" />
          )}
        </span>
      </span>
    </span>
  );
}
