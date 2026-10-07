import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import PricingCardContent, { STREAMER_PLAN_CARDS, PLAYER_PLAN_CARDS, getPlanFeatures } from '../Pricing/PricingCardContent';
import useLandingSubscriptions from './useLandingSubscriptions';
import { formatCurrency, planSavings } from './pricingPresentation';

export default function LandingPlans() {
  const { data, isPending, isError, refetch } = useLandingSubscriptions();
  const [type, setType] = useState('streamer');
  const product = data?.productTypes.find(item => item.code === type);
  const presentations = type === 'streamer' ? STREAMER_PLAN_CARDS : PLAYER_PLAN_CARDS;
  const plans = (data?.plans || []).filter(plan => plan.productType === type && plan.active !== false);
  const features = getPlanFeatures(data?.features, type);
  const trialAvailable = Number(data?.trialDays) > 0;

  return <section className="lp-home-section lp-home-pricing" id="pricing" aria-labelledby="landing-pricing-title">
    <div className="lp-pricing-heading">
      <span className="lp-eyebrow">Your first step is free</span>
      <h2 id="landing-pricing-title">Find your style.<br /><em>Then find your plan.</em></h2>
      <p className="lp-modern-intro">Try the tools before you choose a subscription. Start with the workspace that fits you.</p>
    </div>
    {trialAvailable && <div className="lp-trial-banner">
      <span className="lp-trial-banner__icon"><Sparkles size={30} aria-hidden="true" /></span>
      <div><span className="lp-eyebrow">For eligible new accounts</span><h3>{data.trialDays} days to make it yours. Free.</h3>
        <p>{data.trialRequiresPaymentMethod === false ? 'No credit card required. ' : ''}No automatic renewal. Choose a paid plan only when you’re ready.</p>
      </div>
      <Link className="lp-btn lp-btn--streamer" to={`/premium?type=${type}`}>Start free trial <ArrowRight size={18} aria-hidden="true" /></Link>
    </div>}
    {isPending ? <p role="status">Loading current plans…</p> : isError ? <div className="lp-plans-fallback"><p>Current prices couldn’t be loaded.</p><button className="sr-button sr-button--quiet" onClick={() => refetch()}>Try again</button> <Link to="/premium">View plans & free trial</Link></div> : <>
      <div className="lp-pricing-choice">
        <div role="group" aria-label="Choose plan type" className="lp-plan-toggle">{['streamer', 'player'].map(value => {
          const option = data.productTypes.find(item => item.code === value && item.active !== false);
          return option && <button type="button" key={value} aria-pressed={type === value} onClick={() => setType(value)}>{option.title}</button>;
        })}</div>
        <p>{trialAvailable ? 'After your trial, subscribe only when you’re ready.' : 'Choose the subscription that fits your workflow.'}</p>
      </div>
      <div className="lp-pricing-cards" aria-live="polite" aria-label={`${product?.title || type} subscriptions`}>
        {plans.map((plan, index) => {
          const presentation = presentations.find(item => item.id === plan.id);
          const saving = planSavings(plan, data.plans);
          const card = { ...plan, savingsLabel: saving > 0 ? `Save ${formatCurrency(saving, plan.currency)}` : plan.savingsLabel, accent: presentation?.accent || ['cyan', 'violet', 'pink'][index % 3], displayTitle: presentation?.title || plan.title, presentationBadge: presentation?.badge };
          return <Link className={`premium-image-card premium-image-card--${card.accent}${plan.intervalMonths === 12 ? ' lp-plan-best-value' : ''}`} key={plan.id} to={`/premium?type=${type}`} aria-label={`View ${plan.title} plan`}>
            <PricingCardContent card={card} planFeatures={features} actionLabel="View plan" showMonthlyEquivalent />
          </Link>;
        })}
      </div>
      {!plans.length && <p>No plans are currently available for this workspace. Please check back shortly.</p>}
      <p className="lp-pricing-footnote"><Check size={16} aria-hidden="true" /><span><strong>Applicable taxes are added at checkout</strong> based on your billing location. Prices and billing periods match our subscription page.</span></p>
    </>}
  </section>;
}
