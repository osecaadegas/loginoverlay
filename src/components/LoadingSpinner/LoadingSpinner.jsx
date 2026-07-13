import './LoadingSpinner.css';

export default function LoadingSpinner({ text = 'Loading...', size = 'default', fullPage = false, className = '' }) {
  const shellClassName = [
    'app-loading-shell',
    fullPage ? 'app-loading-shell--full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={shellClassName} role="status" aria-live="polite" aria-label={text}>
      <div className={`app-loading app-loading--${size}`}>
        <div className="app-loading__ring app-loading__ring--one" />
        <div className="app-loading__ring app-loading__ring--two" />
        <div className="app-loading__ring app-loading__ring--three" />
        <span className="app-loading__text">{text}</span>
      </div>
    </div>
  );
}