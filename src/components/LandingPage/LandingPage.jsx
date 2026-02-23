import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import AuthModal from '../Auth/AuthModal';
import './LandingPage.css';

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [casinoOffers, setCasinoOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has verified age
    const ageVerified = localStorage.getItem('ageVerified');
    if (!ageVerified) {
      setShowAgeVerification(true);
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load offers
      const { data: offersData, error: offersError } = await supabase
        .from('casino_offers')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(6);

      if (!offersError && offersData) {
        setCasinoOffers(offersData);
      }

    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOfferClick = (bonusLink) => {
    if (bonusLink) {
      window.open(bonusLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAgeConfirm = () => {
    localStorage.setItem('ageVerified', 'true');
    setShowAgeVerification(false);
  };

  const handleAgeDeny = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <>
      {/* Age Verification Modal */}
      {showAgeVerification && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
          <div style={{ width: '100%', maxWidth: '448px', backgroundColor: '#581c87', borderRadius: '24px', padding: '32px', textAlign: 'center', border: '2px solid #a855f7' }}>
            
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>🔞</div>
            
            <h1 style={{ fontSize: '30px', fontWeight: '900', color: 'white', marginBottom: '16px' }}>
              Age Verification
            </h1>
            
            <p style={{ fontSize: '14px', color: '#d1d5db', marginBottom: '24px' }}>
              This website contains gambling content. You must be 18+ to enter.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={handleAgeConfirm}
                style={{ padding: '12px 16px', backgroundColor: '#22c55e', color: 'white', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#16a34a'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#22c55e'}
              >
                ✓ I'm 18+
              </button>
              <button
                onClick={handleAgeDeny}
                style={{ padding: '12px 16px', backgroundColor: '#374151', color: 'white', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#374151'}
              >
                ✗ Exit
              </button>
            </div>
            
            <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(168, 85, 247, 0.2)', fontSize: '11px', color: '#9ca3af' }}>
              18+ Only • Legal Compliance
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen">
        {/* Hero Section with Image */}
        <section className="hero-image-section">
          <div className="hero-image-container">
            <img src="/Hero.png" alt="Hero" className="hero-image" />
            <div className="hero-image-fade"></div>
          </div>
          
          <div className="hero-content-overlay">
            <div className="hero-social-icons">
              <a href="https://www.twitch.tv/osecaadegas95" target="_blank" rel="noopener noreferrer" className="hero-social-icon" title="Twitch">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                </svg>
              </a>
              <a href="https://www.youtube.com/@osecaadegas" target="_blank" rel="noopener noreferrer" className="hero-social-icon" title="YouTube">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/osecaadegas/" target="_blank" rel="noopener noreferrer" className="hero-social-icon" title="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://discord.gg/ASvCcpp5b8" target="_blank" rel="noopener noreferrer" className="hero-social-icon" title="Discord">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
              <a href="https://t.me/+6dgd1_FRNq03Nzc8" target="_blank" rel="noopener noreferrer" className="hero-social-icon" title="Telegram">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            </div>
            <div className="hero-scroll-indicator">
              <span>SCROLL FOR MORE</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </section>

        {/* Offers Section - List Style */}
        <section className="offers-section">
          <h2 className="offers-heading">Casinos & Offers</h2>
          <p className="offers-subheading">Best offers and bonuses exclusive for you</p>
          <div className="offers-container">
            {casinoOffers.map((offer) => (
              <div key={offer.id} className="offer-card" onClick={() => handleOfferClick(offer.bonus_link)}>
                <div className="offer-logo">
                  {offer.video_url ? (
                    <video
                      src={offer.video_url}
                      autoPlay muted loop playsInline
                      className="offer-logo-media"
                    />
                  ) : (
                    <img src={offer.list_image_url || offer.image_url || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&h=100&fit=crop'} alt={offer.casino_name} />
                  )}
                </div>
                <div className="offer-name">{offer.casino_name}</div>
                <div className="offer-details">
                  {offer.bonus_value && (
                    <div className="offer-detail">
                      <span className="offer-detail-label">BONUS</span>
                      <span className="offer-detail-value">{offer.bonus_value}</span>
                    </div>
                  )}
                  {offer.free_spins && (
                    <div className="offer-detail">
                      <span className="offer-detail-label">FREE SPINS</span>
                      <span className="offer-detail-value">{offer.free_spins}</span>
                    </div>
                  )}
                  {offer.cashback && (
                    <div className="offer-detail">
                      <span className="offer-detail-label">CASHBACK</span>
                      <span className="offer-detail-value">{offer.cashback}</span>
                    </div>
                  )}
                  {offer.promo_code && (
                    <div className="offer-detail">
                      <span className="offer-detail-label">PROMO CODE</span>
                      <span className="offer-detail-value promo-code">{offer.promo_code}</span>
                    </div>
                  )}
                </div>
                <div className="offer-actions">
                  <button className="offer-btn claim" onClick={(e) => { e.stopPropagation(); handleOfferClick(offer.bonus_link); }}>CLAIM BONUS</button>
                  <button className="offer-btn more" onClick={(e) => { e.stopPropagation(); navigate('/offers'); }}>🔍 SHOW MORE</button>
                </div>
              </div>
            ))}
          </div>
        </section>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
    </>
  );
}
