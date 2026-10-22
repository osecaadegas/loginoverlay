import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getFeaturedOverlayThemes, isNewOverlayTheme, OVERLAY_SHOWCASE_CATALOG, OVERLAY_SHOWCASE_CATEGORIES } from './overlayShowcaseCatalog';
import './OverlayShowcase.css';

export default function OverlayShowcase() {
  const [category, setCategory] = useState('All');
  const [activeId, setActiveId] = useState(null);
  const isOpen = Boolean(activeId);
  const activeIdRef = useRef(null);
  const returnFocusRef = useRef(null);
  const dialogRef = useRef(null);
  const visible = useMemo(() => {
    const base = category === 'All' ? getFeaturedOverlayThemes(6) : OVERLAY_SHOWCASE_CATALOG.filter(item => item.published && item.thumbnail && item.fullPreview && item.category === category).sort((a,b)=>a.featuredRank-b.featuredRank);
    return base;
  }, [category]);
  const active = OVERLAY_SHOWCASE_CATALOG.find(item => item.id === activeId) || null;

  useEffect(() => {
    if (!active) return undefined;
    activeIdRef.current = active.id;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); setActiveId(null); return; }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const current = visible.findIndex(item => item.id === activeIdRef.current);
        const next = (current + (event.key === 'ArrowRight' ? 1 : -1) + visible.length) % visible.length;
        activeIdRef.current = visible[next].id;
        setActiveId(visible[next].id);
      }
      if (event.key === 'Tab') {
        const focusables = [...(dialogRef.current?.querySelectorAll('button,a[href]') || [])].filter(el => !el.disabled);
        if (focusables.length < 1) return;
        if (document.activeElement === dialogRef.current) { event.preventDefault(); (event.shiftKey ? focusables.at(-1) : focusables[0]).focus(); }
        else if (event.shiftKey && document.activeElement === focusables[0]) { event.preventDefault(); focusables.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === focusables.at(-1)) { event.preventDefault(); focusables[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown); returnFocusRef.current?.focus(); };
  }, [isOpen]);

  return <section className="lp-home-section lp-overlay-showcase" id="overlays" aria-labelledby="overlay-showcase-title">
    <div className="lp-overlay-showcase__heading"><div><span className="lp-eyebrow">Full-scene presets</span><h2 id="overlay-showcase-title">A scene that feels like yours.</h2><p>Actual editable preset previews with example content. Choose a composition, then edit every widget in the Streamers Center editor.</p></div><Link className="lp-overlay-showcase__all-link" to="/overlay-center">Browse all themes <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
    <div className="lp-overlay-showcase__filters" role="group" aria-label="Filter overlay themes">{OVERLAY_SHOWCASE_CATEGORIES.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <div className="lp-overlay-showcase__grid">{visible.map(theme => <article className="lp-scene-card" key={theme.id}>
      <button className="lp-scene-card__image-button" type="button" onClick={event => { returnFocusRef.current = event.currentTarget; setActiveId(theme.id); }} aria-label={`Enlarge ${theme.name} overlay preview`}>
        <img src={theme.thumbnail} srcSet={`${theme.thumbnail} 960w`} sizes="(max-width: 680px) 100vw, (max-width: 1024px) 50vw, 33vw" alt={`${theme.name} full-scene overlay preview`} width="960" height="540" loading="lazy" decoding="async" />
        {isNewOverlayTheme(theme) && <span className="lp-scene-card__new">New</span>}<span className="lp-scene-card__expand"><Expand size={16} /> View scene</span>
      </button>
      <div className="lp-scene-card__body"><div><span className="lp-scene-card__category">{theme.category}</span><h3>{theme.name}</h3></div><Link to={theme.destination} className="lp-scene-card__use">Use this theme <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </article>)}</div>
    {category === 'All' && <div className="lp-overlay-showcase__footer"><span>Six full-scene previews · {OVERLAY_SHOWCASE_CATALOG.filter(item => item.published).length} published presets</span><Link to="/overlay-center">Open the full theme library <ChevronRight size={16} aria-hidden="true" /></Link></div>}
    {active && <div className="lp-scene-lightbox" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setActiveId(null); }}><div className="lp-scene-lightbox__dialog" role="dialog" aria-modal="true" aria-labelledby="scene-dialog-title" tabIndex={-1} ref={dialogRef}>
      <div className="lp-scene-lightbox__top"><div><span>{active.category}</span><h2 id="scene-dialog-title">{active.name}</h2></div><button type="button" onClick={() => setActiveId(null)} aria-label="Close preview"><X /></button></div>
      <div className="lp-scene-lightbox__preview"><button type="button" onClick={() => { const i=visible.findIndex(item=>item.id===active.id); setActiveId(visible[(i-1+visible.length)%visible.length].id); }} aria-label="Previous theme"><ChevronLeft /></button><img src={active.fullPreview} alt={`${active.name} enlarged full-scene overlay preview`} width="1920" height="1080" loading="eager" decoding="async"/><button type="button" onClick={() => { const i=visible.findIndex(item=>item.id===active.id); setActiveId(visible[(i+1)%visible.length].id); }} aria-label="Next theme"><ChevronRight /></button></div>
      <div className="lp-scene-lightbox__bottom"><p>{active.description}</p><Link className="lp-scene-card__use" to={active.destination}>Use this theme <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </div></div>}
  </section>;
}
