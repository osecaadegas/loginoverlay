import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';

export default function LandingPlans() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['public', 'landing-subscriptions'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/premium?action=page', { signal });
      if (!response.ok) throw new Error('Pricing unavailable');
      return response.json();
    },
    staleTime: 60000, retry: false,
  });
  return <section className="lp-home-section lp-home-pricing" id="pricing">
    <span className="lp-eyebrow">Choose what you need</span><h2>One platform. Your kind of plan.</h2>
    <p className="lp-modern-intro">Start with a trial, then choose the subscription that fits your workflow. Manage your plan from your account.</p>
    {isPending ? <p role="status">Loading current plans…</p> : isError ? <div className="lp-plans-fallback"><p>Current prices couldn’t be loaded.</p><button className="sr-button sr-button--quiet" onClick={() => refetch()}>Try again</button> <Link to="/premium">View subscriptions</Link></div> : <>
      {data.trialDays > 0 && <p className="lp-trial-note"><Check size={16} aria-hidden="true" />{data.trialDays}-day trial for eligible new accounts{data.trialRequiresPaymentMethod === false ? ' · No card needed to start' : ''}</p>}
      <div className="lp-plan-products">{['player', 'streamer'].map((type) => {
        const product = data.productTypes?.find((item) => item.code === type);
        const plans = (data.plans || []).filter((plan) => plan.productType === type && plan.active);
        if (!product || !plans.length) return null;
        return <article className={`lp-plan-product lp-plan-product--${type}`} key={type}>
          <span className="lp-eyebrow">{type === 'streamer' ? 'For creators' : 'For personal tracking'}</span>
          <h3>{product.title}</h3><p>{product.description}</p>
          <ul>{(data.features || []).filter((feature) => feature.active && (type === 'streamer' ? feature.streamerAvailable : feature.playerAvailable)).sort((a, b) => type === 'streamer' ? Number(a.playerAvailable) - Number(b.playerAvailable) : 0).slice(0, 5).map((feature) => <li key={feature.id}><Check size={16} aria-hidden="true" />{feature.title}</li>)}</ul>
          <div className="lp-plan-options">{plans.map((plan) => <Link to={`/premium?type=${type}`} className="lp-plan-option" key={plan.id}>
            <span><strong>{plan.title}</strong>{plan.badge && <small>{plan.badge}</small>}</span>
            <span><b>{new Intl.NumberFormat('en-IE', { style: 'currency', currency: plan.currency }).format(plan.priceCents / 100)}</b><small> / {plan.intervalCount > 1 ? `${plan.intervalCount} ${plan.billingInterval}s` : plan.billingInterval}</small></span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>)}</div>
          <Link className="lp-plan-details" to={`/premium?type=${type}`}>Compare plan details <ArrowRight size={16} aria-hidden="true" /></Link>
        </article>;
      })}</div>
      {!data.plans?.length && <p>No subscription plans are currently available. Please check back shortly.</p>}
    </>}
  </section>;
}
