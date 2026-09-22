import { useEffect, useState } from 'react';
import { reviewRequest } from '../LandingPage/reviewApi';

export default function SubscriberReviewsAdmin() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { setReviews((await reviewRequest('admin')).reviews); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function change(review, retry = false) {
    setBusy(review.id); setError('');
    try {
      await reviewRequest('admin', { method: retry ? 'POST' : 'PATCH', body: { id: review.id, published: !review.published } });
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(null); }
  }
  return <section className="as-section">
    <h2>Subscriber reviews</h2><p>Latest 100 reviews. Hide spam or abusive content; keep criticism visible. Moderation never removes an earned reward.</p>
    <button type="button" className="as-secondary-btn" disabled={loading} onClick={load}>Refresh reviews</button>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading reviews…</p> : !reviews.length ? <p>No reviews yet.</p> : <div className="as-grid">{reviews.map((review) => <article className="as-panel" key={review.id}>
      <h3>{review.displayName} · {review.rating}/5</h3>
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{review.body}</p>
      <p>{review.productCode === 'streamer_premium' ? 'Streamer' : 'Player'} · {review.published ? 'Published' : 'Hidden'} · Reward: {review.rewardStatus}</p>
      <small>Reward period end: {new Date(review.rewardEnd).toLocaleDateString()}</small>
      <div className="as-check-row">
        <button type="button" className="as-secondary-btn" disabled={busy !== null} onClick={() => change(review)}>{review.published ? 'Hide review' : 'Publish review'}</button>
        {review.rewardStatus === 'pending' && <button type="button" className="as-primary-btn" disabled={busy !== null} onClick={() => change(review, true)}>{busy === review.id ? 'Applying…' : 'Retry reward'}</button>}
      </div>
    </article>)}</div>}
  </section>;
}
