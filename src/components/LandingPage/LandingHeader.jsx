import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const links = [
  ['Features', '#features'], ['Widgets', '#widgets'], ['Pricing', '#pricing'],
  ['Streamer Deals', '/offers'], ['Reviews', '#reviews'], ['Discord', 'https://discord.gg/bkxAyTn73Y'],
];

export default function LandingHeader({ user, onLogin, onStart }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const toggle = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const dismiss = event => {
      if (event.type === 'keydown' && event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
      if (event.type === 'pointerdown' && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', dismiss);
    return () => { document.removeEventListener('keydown', dismiss); document.removeEventListener('pointerdown', dismiss); };
  }, [open]);
  const navigation = links.map(([label, href]) => href.startsWith('/')
    ? <Link key={href} to={href} onClick={() => setOpen(false)}>{label}</Link>
    : <a key={href} href={href} onClick={() => setOpen(false)} {...(href.startsWith('https') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{label}</a>);
  return <header className="lp-marketing-header" ref={root} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <div className="lp-marketing-header__row">
      <Link to="/" className="lp-marketing-brand" aria-label="Streamers Center home"><img src="/StreamerCenterLogo.png" alt="Streamers Center" width="180" height="36" /></Link>
      <nav className="lp-desktop-links" aria-label="Main navigation">{navigation}</nav>
      <div className="lp-header-actions">
        {!user && <button className="lp-header-login" onClick={onLogin}>Login</button>}
        <button className="lp-btn lp-btn--streamer lp-header-trial" onClick={onStart}><span className="lp-desktop-label">{user ? 'Open workspace' : 'Start free trial'}</span><span className="lp-mobile-label">{user ? 'Workspace' : 'Start free'}</span></button>
        <button ref={toggle} className="lp-menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="landing-mobile-menu" onClick={() => setOpen(value => !value)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
    </div>
    <div id="landing-mobile-menu" className="lp-mobile-menu" data-open={open} inert={open ? undefined : ''} aria-hidden={!open}>
      <nav aria-label="Mobile navigation">{navigation}{!user && <button onClick={() => { setOpen(false); onLogin(); }}>Login</button>}</nav>
    </div>
  </header>;
}
