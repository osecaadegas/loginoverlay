import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageSquare, ShieldCheck, Star } from 'lucide-react';
import { reviewRequest } from './reviewApi';
import './SubscriberReviews.css';

function Stars({ rating }) {
  return <span className="sr-stars" aria-label={`${rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={16} aria-hidden="true" fill={n <= rating ? 'currentColor' : 'none'} />)}</span>;
}

function ReviewForm({ userId, onSubmitted }) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const queryKey = ['account', userId, 'review'];
  const account = useQuery({ queryKey, queryFn: ({ signal }) => reviewRequest('mine', { signal }), staleTime: 0, retry: false });
  const mine = account.data?.review;

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const payload = await reviewRequest('public', { method: 'POST', body: { displayName, rating, body, consent } });
      queryClient.setQueryData(queryKey, { review: payload.review, eligible: false });
      setMessage(payload.message || 'Thank you. Your three free days have been added.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['account', userId, 'premium'] }),
        queryClient.invalidateQueries({ queryKey: ['account', userId, 'player-subscription'] }),
        onSubmitted(),
      ]);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (account.isPending) return <p role="status">Checking your subscription…</p>;
  if (account.isError) return <div><p role="alert">{account.error.message}</p><button className="sr-button" onClick={() => account.refetch()}>Try again</button></div>;
  if (mine) return <div className="sr-own">
    <ShieldCheck size={24} aria-hidden="true" /><h3>Thank you for sharing your experience.</h3>
    <Stars rating={mine.rating} /><p>{mine.body}</p>
    <p role="status">{message || (mine.rewardStatus === 'applied'
      ? `Your three-day reward was applied to your ${mine.productCode === 'streamer_premium' ? 'Streamer' : 'Player'} subscription. Extended period end: ${new Date(mine.rewardEnd).toLocaleDateString()}.`
      : 'Your review is saved. Your three free days are pending; retry to finish applying them.')}</p>
    {!mine.published && <p>Your review is currently hidden from the public page.</p>}
    {mine.rewardStatus !== 'applied' && <button className="sr-button" disabled={busy} onClick={submit}>{busy ? 'Applying reward…' : 'Retry reward'}</button>}
    {error && <p role="alert">{error}</p>}
    <Link to="/premium">View subscription</Link>
  </div>;
  if (!account.data?.eligible) return <div><h3>Reviews from subscribers.</h3><p>An active Player or Streamer subscription is needed to write a review. Free signup trials do not qualify.</p><Link className="sr-button" to="/premium">Explore subscriptions</Link></div>;
  return <form className="sr-form" onSubmit={submit}>
    <h3>How has your experience been?</h3>
    <p>Receive three extra days on your {account.data.productCode === 'streamer_premium' ? 'Streamer' : 'Player'} subscription. Every rating qualifies, once per account.</p>
    <fieldset disabled={busy}>
      <legend>Your rating</legend>
      <div className="sr-rating-input">{[1, 2, 3, 4, 5].map((value) => <label key={value}>
        <input type="radio" name="review-rating" required value={value} checked={rating === value} onChange={() => setRating(value)} />
        <span><Star size={22} fill={value <= rating ? 'currentColor' : 'none'} aria-hidden="true" /><span className="lp-sr-only">{value} {value === 1 ? 'star' : 'stars'}</span></span>
      </label>)}</div>
      <label className="sr-field">Public display name<input autoComplete="nickname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} maxLength={60} /></label>
      <label className="sr-field">Your review<textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={20} maxLength={1500} rows={4} placeholder="What works well? What could we improve?" /></label>
      <span className="sr-count">{body.length} / 1,500 characters · minimum 20</span>
      <label className="sr-consent"><input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />Publish my name and review, labelled as a review submitted for a three-day reward.</label>
      <p className="sr-terms">Your next renewal moves three days later at the same price. If you have scheduled cancellation, it stays scheduled at the extended period end. A reward may take a retry if billing is temporarily unavailable.</p>
      <button className="sr-button" disabled={busy}>{busy ? 'Saving your review…' : 'Publish review & get 3 days'}</button>
    </fieldset>
    {error && <p role="alert">{error}</p>}
  </form>;
}

export default function SubscriberReviews({ user, onLogin }) {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const reviews = useQuery({ queryKey: ['public', 'service-reviews', offset], queryFn: ({ signal }) => reviewRequest('public', { signal, offset }), retry: false, staleTime: 60000 });
  return <section className="lp-home-section sr-section" id="reviews" aria-labelledby="reviews-heading">
    <div className="sr-heading"><div><span className="lp-eyebrow">From the community</span><h2 id="reviews-heading">Your experience. In your words.</h2></div>
      {reviews.data?.summary?.count > 0 && <span className="sr-summary"><Star fill="currentColor" size={20} aria-hidden="true" /><strong>{Number(reviews.data.summary.average).toFixed(1)} / 5</strong><span>{reviews.data.summary.count} {reviews.data.summary.count === 1 ? 'review' : 'reviews'}</span></span>}
    </div>
    <p className="sr-disclosure">Reviews from verified subscribers. Authors are offered three free days for their first review, regardless of rating.</p>
    <div className="sr-layout"><div className="sr-feed" aria-live="polite">
      {reviews.isPending ? <p role="status">Loading reviews…</p> : reviews.isError ? <div><p>We couldn’t load the reviews.</p><button className="sr-button sr-button--quiet" onClick={() => reviews.refetch()}>Try again</button></div>
        : reviews.data.reviews.length === 0 ? <div className="sr-empty"><MessageSquare size={32} aria-hidden="true" /><h3>{offset ? 'No more reviews yet.' : 'Make room for the first review.'}</h3><p>Use the tools, then tell the next person what to expect. Honest feedback helps us improve.</p></div>
          : reviews.data.reviews.map((review) => <article className="sr-card" key={review.id}><Stars rating={review.rating} /><blockquote>{review.body}</blockquote><div className="sr-author"><span className="sr-avatar" aria-hidden="true">{review.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{review.display_name}</strong><span>{review.product_code === 'streamer_premium' ? 'Streamer' : 'Player'} subscriber · {new Date(review.created_at).toLocaleDateString()}</span></div></div><small><ShieldCheck size={14} aria-hidden="true" />Verified at submission · 3-day incentive</small></article>)}
      <div className="sr-pagination">{offset > 0 && <button className="sr-button sr-button--quiet" onClick={() => setOffset(Math.max(0, offset - 6))}>Previous reviews</button>}{reviews.data?.nextOffset != null && <button className="sr-button sr-button--quiet" onClick={() => setOffset(reviews.data.nextOffset)}>More reviews</button>}</div>
    </div><aside className="sr-write">{user ? <ReviewForm key={user.id} userId={user.id} onSubmitted={() => { setOffset(0); return queryClient.invalidateQueries({ queryKey: ['public', 'service-reviews'] }); }} /> : <div><span className="sr-reward">A thank-you from us · +3 days</span><h3>Help someone get started.</h3><p>Already a subscriber? Sign in, share an honest review and receive three extra days of access.</p><button className="sr-button" onClick={onLogin}>Sign in to leave a review</button><p className="sr-terms">One reward per account. All star ratings qualify.</p></div>}</aside></div>
  </section>;
}
